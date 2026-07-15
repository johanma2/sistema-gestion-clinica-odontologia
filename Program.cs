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
    await db.Database.EnsureCreatedAsync();

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

    if (adminRole != null && pacienteRole != null)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Correo == "admin@smiletrack.co"))
        {
            db.Usuarios.Add(new Usuario
            {
                Nombre = "Admin",
                Apellidos = "SmileTrack",
                Correo = "admin@smiletrack.co",
                Contrasena = BCrypt.Net.BCrypt.HashPassword("123456"),
                IdRol = adminRole.IdRol,
                Estado = "activo",
                FechaCreacion = DateTime.UtcNow
            });
        }

        if (!await db.Usuarios.AnyAsync(u => u.Correo == "pac@smiletrack.co"))
        {
            db.Usuarios.Add(new Usuario
            {
                Nombre = "Paciente",
                Apellidos = "Prueba",
                Correo = "pac@smiletrack.co",
                Contrasena = BCrypt.Net.BCrypt.HashPassword("123456"),
                IdRol = pacienteRole.IdRol,
                Estado = "activo",
                FechaCreacion = DateTime.UtcNow
            });
        }
    }

    if (profesionalRole != null && !await db.Usuarios.AnyAsync(u => u.Correo == "prof@smiletrack.co"))
    {
        db.Usuarios.Add(new Usuario
        {
            Nombre = "Profesional",
            Apellidos = "Prueba",
            Correo = "prof@smiletrack.co",
            Contrasena = BCrypt.Net.BCrypt.HashPassword("123456"),
            IdRol = profesionalRole.IdRol,
            Estado = "activo",
            FechaCreacion = DateTime.UtcNow
        });
    }

    if (recepcionistaRole != null && !await db.Usuarios.AnyAsync(u => u.Correo == "recep@smiletrack.co"))
    {
        db.Usuarios.Add(new Usuario
        {
            Nombre = "Recepcionista",
            Apellidos = "Prueba",
            Correo = "recep@smiletrack.co",
            Contrasena = BCrypt.Net.BCrypt.HashPassword("123456"),
            IdRol = recepcionistaRole.IdRol,
            Estado = "activo",
            FechaCreacion = DateTime.UtcNow
        });
    }

    if (auxiliarRole != null && !await db.Usuarios.AnyAsync(u => u.Correo == "aux@smiletrack.co"))
    {
        db.Usuarios.Add(new Usuario
        {
            Nombre = "Auxiliar",
            Apellidos = "Prueba",
            Correo = "aux@smiletrack.co",
            Contrasena = BCrypt.Net.BCrypt.HashPassword("123456"),
            IdRol = auxiliarRole.IdRol,
            Estado = "activo",
            FechaCreacion = DateTime.UtcNow
        });
    }

    await db.SaveChangesAsync();
}

app.Run();
