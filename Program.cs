using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Serilog;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using System.Security.Claims;
using System.Net;
using System.Text.Json;

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog(dispose: true);

    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

    builder.Services.AddControllersWithViews();
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        connectionString = "Server=(localdb)\\mssqllocaldb;Database=SmileTrackDB;Trusted_Connection=True;TrustServerCertificate=True;";
    }

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(3),
            errorNumbersToAdd: null)));

    builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
        .AddCookie(options =>
        {
            options.LoginPath = "/acceso-y-seguridad/login";
            options.AccessDeniedPath = "/acceso-y-seguridad/login";
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;
        });
    builder.Services.AddAuthorization();

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<SmileTrack_MVC.Services.IAuthService, SmileTrack_MVC.Services.AuthService>();

    var app = builder.Build();

    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} respondio {StatusCode} en {Elapsed:0.0000} ms";
        options.GetLevel = (_, dur, ex) =>
            ex != null ? Serilog.Events.LogEventLevel.Error :
            dur > 1000 ? Serilog.Events.LogEventLevel.Warning :
            Serilog.Events.LogEventLevel.Information;
    });

    app.Use(async (context, next) =>
    {
        var requestId = context.TraceIdentifier;
        if (context.Request.Headers.TryGetValue("X-Request-ID", out var incomingId) && !string.IsNullOrWhiteSpace(incomingId))
        {
            requestId = incomingId.ToString().Trim();
        }
        context.Response.Headers["X-Request-ID"] = requestId;

        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonimo";
        var userRol = context.User.FindFirst(ClaimTypes.Role)?.Value ?? "sin-rol";
        var modulo = InferirModuloDesdeRuta(context.Request.Path.Value);
        var ipCliente = context.Connection.RemoteIpAddress?.ToString() ?? "desconocida";
        if (ipCliente == "::1") ipCliente = "127.0.0.1";

        using (Serilog.Context.LogContext.PushProperty("RequestId", requestId))
        using (Serilog.Context.LogContext.PushProperty("UsuarioId", userId))
        using (Serilog.Context.LogContext.PushProperty("UsuarioRol", userRol))
        using (Serilog.Context.LogContext.PushProperty("Modulo", modulo))
        using (Serilog.Context.LogContext.PushProperty("IpCliente", ipCliente))
        {
            try
            {
                await next();
            }
            catch (Exception ex)
            {
                if (ex is OperationCanceledException)
                {
                    Log.Warning("Solicitud cancelada por el cliente: {Metodo} {Ruta}", context.Request.Method, context.Request.Path);
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    return;
                }

                Log.Fatal(ex, "Excepcion NO MANEJADA en pipeline: {Metodo} {Ruta} - {Mensaje}",
                    context.Request.Method, context.Request.Path, ex.Message);

                if (context.Response.HasStarted)
                {
                    Log.Warning("Ya se habia iniciado la respuesta; no se puede reescribir error para RequestId {RequestId}", requestId);
                    throw;
                }

                var esApi = context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
                          || (context.Request.Headers.Accept.ToString().Contains("application/json", StringComparison.OrdinalIgnoreCase));

                context.Response.Clear();
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

                if (esApi)
                {
                    context.Response.ContentType = "application/problem+json; charset=utf-8";
                    var problem = new
                    {
                        type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
                        title = "Error interno del servidor",
                        status = 500,
                        detail = app.Environment.IsDevelopment()
                            ? $"Se presento un error inesperado. RequestId: {requestId}. Detalle: {ex.Message}"
                            : $"Se presento un error inesperado. Proporcione este codigo al soporte: {requestId}",
                        instance = context.Request.Path.Value,
                        requestId
                    };
                    await context.Response.WriteAsync(JsonSerializer.Serialize(problem, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                }
                else
                {
                    context.Response.ContentType = "text/html; charset=utf-8";
                    var mensajeHtml = $@"
<!DOCTYPE html>
<html lang='es'>
<head><meta charset='utf-8'><title>Error Interno - SmileTrack</title>
<style>
body{{font-family:system-ui,Arial,sans-serif;background:#f8fafc;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:24px;}}
.card{{background:#fff;border-radius:12px;box-shadow:0 10px 25px rgba(15,23,42,.12);max-width:520px;padding:32px;text-align:center;}}
.code{{background:#fee2e2;color:#b91c1c;font-family:ui-monospace,Consolas,monospace;padding:6px 12px;border-radius:6px;display:inline-block;margin:8px 0 12px;}}
a{{color:#0f766e;text-decoration:none;font-weight:600;}}
</style></head>
<body><div class='card'>
<h2 style='margin:0 0 8px;color:#0f172a;'>😔 Ocurrió un error inesperado</h2>
<p style='color:#475569;'>Nuestro equipo ha registrado el problema y trabajará en resolverlo.</p>
<p>Código de referencia:</p>
<div class='code' title='Proporcione este código al soporte'>{requestId}</div>
<p><a href='javascript:history.back()'>← Volver a la página anterior</a></p>
</div></body></html>";
                    await context.Response.WriteAsync(mensajeHtml);
                }
            }
        }
    });

    if (!app.Environment.IsDevelopment())
    {
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

    static string InferirModuloDesdeRuta(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return "sin-ruta";
        var p = path.ToLowerInvariant();
        if (p.Contains("gestion-de-citas") || p.Contains("/api/citas")) return "GestionCitas";
        if (p.Contains("gestion-de-profesionales")) return "GestionProfesionales";
        if (p.Contains("gestion-de-pacientes")) return "GestionPacientes";
        if (p.Contains("facturacion") || p.Contains("pagos")) return "FacturacionPagos";
        if (p.Contains("historia") || p.Contains("clinica")) return "HistoriaClinica";
        if (p.Contains("acceso") || p.Contains("login") || p.Contains("register") || p.Contains("recover")) return "Autenticacion";
        if (p.Contains("pqr")) return "PQR";
        if (p.Contains("servicios") || p.Contains("recursos")) return "ServiciosRecursos";
        if (p.Contains("perfil")) return "Perfiles";
        return "General";
    }

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
    try
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
    var oldServices = await db.Servicios.ToListAsync();
    if (oldServices.Any(s => s.Nombre == "Consulta general"))
    {
        db.Servicios.RemoveRange(oldServices);
        await db.SaveChangesAsync();
    }

    if (!await db.Servicios.AnyAsync())
    {
        db.Servicios.AddRange(
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Limpieza dental", Descripcion = "Elimina el sarro y placa bacteriana", Precio = 80000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Blanqueamiento", Descripcion = "Recupera el brillo natural", Precio = 350000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Ortodoncia", Descripcion = "Corrección de la posición dental", Precio = 200000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Endodoncia", Descripcion = "Tratamiento de conductos", Precio = 450000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Implantes", Descripcion = "Reemplaza piezas perdidas", Precio = 2800000, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Servicio { Nombre = "Odontopediatría", Descripcion = "Cuidado dental especializado para niños", Precio = 60000, Estado = "activo" }
        );
        await db.SaveChangesAsync();
    }

    // ─── Seed de Pacientes Reales ───────────────────────────────
    var fakePacientes = await db.Pacientes.Where(p => p.Nombres == "Paciente" && p.Apellidos == "Prueba").ToListAsync();
    if (fakePacientes.Count > 0)
    {
        db.Pacientes.RemoveRange(fakePacientes);
        await db.SaveChangesAsync();
    }

    if (!await db.Pacientes.AnyAsync())
    {
        db.Pacientes.AddRange(
            new SmileTrack_MVC.Models.Entities.Paciente { TipoDocumento = "CC", Documento = "10239485", Nombres = "Julián", Apellidos = "Restrepo", FechaNacimiento = new DateTime(1995, 4, 12), Genero = "M", Correo = "julian@ejemplo.com", FechaRegistro = DateTime.UtcNow.Date, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Paciente { TipoDocumento = "CC", Documento = "52109432", Nombres = "Lucía", Apellidos = "Torres", FechaNacimiento = new DateTime(1990, 8, 25), Genero = "F", Correo = "lucia@ejemplo.com", FechaRegistro = DateTime.UtcNow.Date, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Paciente { TipoDocumento = "CC", Documento = "88764321", Nombres = "Mariana", Apellidos = "Esparza", FechaNacimiento = new DateTime(1985, 11, 30), Genero = "F", Correo = "mariana@ejemplo.com", FechaRegistro = DateTime.UtcNow.Date, Estado = "activo" },
            new SmileTrack_MVC.Models.Entities.Paciente { TipoDocumento = "CC", Documento = "11098452", Nombres = "Sebastián", Apellidos = "Correa", FechaNacimiento = new DateTime(2002, 2, 14), Genero = "M", Correo = "sebastian@ejemplo.com", FechaRegistro = DateTime.UtcNow.Date, Estado = "activo" }
        );
        await db.SaveChangesAsync();
    }

    // ─── Seed de Profesionales Reales ────────────────────────────
    var fakeProfesionales = await db.Profesionales.Where(p => p.Nombres == "Doctor" && p.Apellidos == "Prueba").ToListAsync();
    if (fakeProfesionales.Count > 0)
    {
        db.Profesionales.RemoveRange(fakeProfesionales);
        await db.SaveChangesAsync();
    }

    if (!await db.Profesionales.AnyAsync())
    {
        var profRoleUser = await db.Usuarios.FirstOrDefaultAsync(u => u.Correo == "doc@smiletrack.co");
        var espGen = await db.Especialidades.FirstOrDefaultAsync(e => e.Nombre == "Odontología General");
        var espOrt = await db.Especialidades.FirstOrDefaultAsync(e => e.Nombre == "Ortodoncia");

        var p1 = new SmileTrack_MVC.Models.Entities.Profesional { IdUsuario = profRoleUser?.IdUsuario ?? 1, Nombres = "Ricardo", Apellidos = "Méndez", RegistroMedico = "RM-001", Categoria = "Odontólogo General", Telefono = "3100000001", Estado = "activo", FechaIngreso = DateTime.UtcNow.Date };
        var p2 = new SmileTrack_MVC.Models.Entities.Profesional { IdUsuario = profRoleUser?.IdUsuario ?? 1, Nombres = "Elena", Apellidos = "Sotelo", RegistroMedico = "RM-002", Categoria = "Ortodoncista", Telefono = "3100000002", Estado = "activo", FechaIngreso = DateTime.UtcNow.Date };
        var p3 = new SmileTrack_MVC.Models.Entities.Profesional { IdUsuario = profRoleUser?.IdUsuario ?? 1, Nombres = "Carlos", Apellidos = "Ruiz", RegistroMedico = "RM-003", Categoria = "Endodoncista", Telefono = "3100000003", Estado = "activo", FechaIngreso = DateTime.UtcNow.Date };

        db.Profesionales.AddRange(p1, p2, p3);
        await db.SaveChangesAsync();

        if (espGen != null) db.ProfesionalEspecialidades.Add(new SmileTrack_MVC.Models.Entities.Profesional_Especialidad { IdProfesional = p1.IdProfesional, IdEspecialidad = espGen.IdEspecialidad, Principal = true });
        if (espOrt != null) db.ProfesionalEspecialidades.Add(new SmileTrack_MVC.Models.Entities.Profesional_Especialidad { IdProfesional = p2.IdProfesional, IdEspecialidad = espOrt.IdEspecialidad, Principal = true });
        await db.SaveChangesAsync();
    }

    // ─── Seed de Consultorios ─────────────────────────────────────
    if (!await db.Consultorios.AnyAsync())
    {
        db.Consultorios.AddRange(
            new SmileTrack_MVC.Models.Entities.Consultorio
            {
                Nombre = "Box 01 - General",
                Ubicacion = "Planta 1 - Ala Sur",
                Tipo = "Consulta General",
                NombreEstado = "Disponible",
                Capacidad = 1,
                Estado = "disponible"
            },
            new SmileTrack_MVC.Models.Entities.Consultorio
            {
                Nombre = "Box 02 - Ortodoncia",
                Ubicacion = "Planta 1 - Ala Norte",
                Tipo = "Ortodoncia",
                NombreEstado = "Disponible",
                Capacidad = 1,
                Estado = "disponible"
            },
            new SmileTrack_MVC.Models.Entities.Consultorio
            {
                Nombre = "Box 03 - Cirugía",
                Ubicacion = "Planta 2 - Ala Central",
                Tipo = "Cirugía y Procedimientos",
                NombreEstado = "Disponible",
                Capacidad = 1,
                Estado = "disponible"
            }
        );
        await db.SaveChangesAsync();
    }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "No se pudo inicializar la base de datos durante el inicio.");
    }
}

app.Run();
