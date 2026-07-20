using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    connectionString = "Server=(localdb)\\MSSQLLocalDB;Database=SmileTrackDB;Trusted_Connection=True;TrustServerCertificate=True;";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/acceso-y-seguridad/login";
        options.AccessDeniedPath = "/acceso-y-seguridad/login";
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value;
    if (!string.IsNullOrWhiteSpace(path) &&
        path.EndsWith(".cshtml", StringComparison.OrdinalIgnoreCase) &&
        !path.StartsWith("/ViewProxy/Render/", StringComparison.OrdinalIgnoreCase))
    {
        var normalized = path.Trim('/');
        context.Request.Path = $"/ViewProxy/Render/{normalized}";
    }

    await next();
});

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapControllerRoute(
    name: "viewproxy",
    pattern: "ViewProxy/Render/{**path}",
    defaults: new { controller = "ViewProxy", action = "Render" });

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();


    if (!await db.Roles.AnyAsync())
    {
        db.Roles.AddRange(
            new Rol { NombreRol = "Administrador", Descripcion = "Acceso total" },
            new Rol { NombreRol = "Profesional", Descripcion = "Gestión clínica" },
            new Rol { NombreRol = "Paciente", Descripcion = "Paciente de la clínica" },
            new Rol { NombreRol = "Recepcionista", Descripcion = "Gestión de citas" },
            new Rol { NombreRol = "Auxiliar", Descripcion = "Apoyo clínico" });
    }

    await db.SaveChangesAsync();

    var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.NombreRol == "Administrador");
    var pacienteRole = await db.Roles.FirstOrDefaultAsync(r => r.NombreRol == "Paciente");
    var profesionalRole = await db.Roles.FirstOrDefaultAsync(r => r.NombreRol == "Profesional");
    var recepcionistaRole = await db.Roles.FirstOrDefaultAsync(r => r.NombreRol == "Recepcionista");
    var auxiliarRole = await db.Roles.FirstOrDefaultAsync(r => r.NombreRol == "Auxiliar");

    static async Task<Usuario?> EnsureUserAsync(AppDbContext db, string correo, string nombre, string apellidos, int rolId, string? password = null)
    {
        var existing = await db.Usuarios.FirstOrDefaultAsync(u => u.Correo == correo);
        if (existing != null)
        {
            if (!string.IsNullOrWhiteSpace(password))
            {
                existing.Contrasena = BCrypt.Net.BCrypt.HashPassword(password);
            }
            existing.Estado = "activo";
            existing.IdRol = rolId;
            existing.Nombre = nombre;
            existing.Apellidos = apellidos;
            await db.SaveChangesAsync();
            return existing;
        }

        var user = new Usuario
        {
            Nombre = nombre,
            Apellidos = apellidos,
            Correo = correo,
            Contrasena = BCrypt.Net.BCrypt.HashPassword(password ?? "123456"),
            IdRol = rolId,
            Estado = "activo",
            FechaCreacion = DateTime.UtcNow
        };
        db.Usuarios.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    if (adminRole != null && pacienteRole != null)
    {
        await EnsureUserAsync(db, "admin@smiletrack.co", "Admin", "SmileTrack", adminRole.IdRol, "123456");
        await EnsureUserAsync(db, "pac@smiletrack.co", "Paciente", "Prueba", pacienteRole.IdRol, "123456");
    }

    if (profesionalRole != null)
    {
        await EnsureUserAsync(db, "prof@smiletrack.co", "Profesional", "Prueba", profesionalRole.IdRol, "123456");
    }

    if (recepcionistaRole != null)
    {
        await EnsureUserAsync(db, "recep@smiletrack.co", "Recepcionista", "Prueba", recepcionistaRole.IdRol, "123456");
    }

    if (auxiliarRole != null)
    {
        await EnsureUserAsync(db, "aux@smiletrack.co", "Auxiliar", "Prueba", auxiliarRole.IdRol, "123456");
    }

    // ─── PASO 2: Seed de Especialidades ───────────────────────────
    if (!await db.Especialidades.AnyAsync())
    {
        db.Especialidades.AddRange(
            new SmileTrack_MVC.Models.Entities.Especialidad { Nombre = "Odontología General", Descripcion = "Atención dental primaria y preventiva" },
            new SmileTrack_MVC.Models.Entities.Especialidad { Nombre = "Ortodoncia", Descripcion = "Corrección de la posición dental" },
            new SmileTrack_MVC.Models.Entities.Especialidad { Nombre = "Endodoncia", Descripcion = "Tratamiento de conductos radiculares" },
            new SmileTrack_MVC.Models.Entities.Especialidad { Nombre = "Periodoncia", Descripcion = "Enfermedades de encías y tejidos de soporte" },
            new SmileTrack_MVC.Models.Entities.Especialidad { Nombre = "Rehabilitación Oral y Estética Dental", Descripcion = "Restauración funcional y estética" },
            new SmileTrack_MVC.Models.Entities.Especialidad { Nombre = "Cirugía Oral", Descripcion = "Procedimientos quirúrgicos orales" },
            new SmileTrack_MVC.Models.Entities.Especialidad { Nombre = "Odontopediatría", Descripcion = "Odontología para niños y adolescentes" }
        );
        await db.SaveChangesAsync();
    }

    // ─── Seed de Servicios ────────────────────────────────────────
    if (!await db.Servicios.AnyAsync())
    {
        db.Servicios.AddRange(
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Limpieza dental", Descripcion = "Profilaxis y prevención", Precio = 80000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Blanqueamiento dental", Descripcion = "Estética dental", Precio = 350000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Ortodoncia", Descripcion = "Alineación y corrección dental", Precio = 200000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Endodoncia", Descripcion = "Tratamiento de conductos", Precio = 450000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Extracción dental", Descripcion = "Extracción de piezas dentales", Precio = 120000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Consulta general", Descripcion = "Valoración y diagnóstico", Precio = 50000, Estado = "activo" }
        );
        await db.SaveChangesAsync();
    }

    // ─── Seed de Paciente de prueba ───────────────────────────────
    if (!await db.Pacientes.AnyAsync(p => p.Documento == "0000000001"))
    {
        try
        {
            db.Pacientes.Add(new SmileTrack_MVC.Models.Entities.Paciente
            {
                TipoDocumento = "CC",
                Documento = "0000000001",
                Nombres = "Paciente",
                Apellidos = "Prueba",
                FechaNacimiento = new DateTime(2000, 1, 1),
                Genero = "M",
                Correo = "pac@smiletrack.co",
                FechaRegistro = DateTime.UtcNow.Date,
                Estado = "activo"
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Seed] Paciente de prueba omitido: {ex.Message}");
        }
    }

}

app.Run();
