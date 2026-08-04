using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Text;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Services.Email;
using System.Security.Claims;
using System.Net;
using System.Net.Sockets;
using System.Globalization;
using System.Text.Json;
using System.IO;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

// NOTA sobre orden de configuración: CADA NUEVA FUENTE AGREGADA SOBRESCRIBE A LAS ANTERIORES.
// WebApplication.CreateBuilder(args) YA registra automáticamente:
//   1) appsettings.json
//   2) appsettings.{Environment}.json
//   3) User Secrets (SI environment = Development)
//   4) Variables de entorno
//   5) Argumentos de línea de comandos
//
// Orden que queremos para evitar perder el Password de user-secrets:
//   (automáticos por el builder)
//   + appsettings.Local.json   ← valores locales específicos de la máquina
//   + user-secrets (explicito, por si el builder no lo cargó)
//   + variables de entorno y CLI (van implícitas después, pero las re-confirmamos)
// Así: Smtp:Password de user-secrets NUNCA será sobreescrito por un "" del json.

builder.Configuration.Sources.Clear();

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>(optional: true, reloadOnChange: true);
}

builder.Configuration
    .AddEnvironmentVariables()
    .AddCommandLine(args);

builder.Services.AddControllersWithViews();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "XSRF-TOKEN";
    options.Cookie.HttpOnly = false;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

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

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection.GetValue<string>("Key") ?? "TuClaveSecretaSuperSegura123!_CambiaEstoEnProduccion_SmileTrack2025";
var jwtIssuer = jwtSection.GetValue<string>("Issuer") ?? "SmileTrack";
var jwtAudience = jwtSection.GetValue<string>("Audience") ?? "SmileTrackClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
})
    .AddCookie(options =>
    {
        options.LoginPath = "/acceso-y-seguridad/login";
        options.AccessDeniedPath = "/acceso-y-seguridad/login";
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events = new CookieAuthenticationEvents
        {
            OnValidatePrincipal = async context =>
            {
                var principal = context.Principal;
                if (principal == null)
                {
                    context.RejectPrincipal();
                    return;
                }

                var userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(userIdValue, out var userId))
                {
                    context.RejectPrincipal();
                    return;
                }

                var lastLogoutClaim = principal.FindFirst("LastLogoutUtc")?.Value;
                using var scope = context.HttpContext.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var user = await db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.IdUsuario == userId, context.HttpContext.RequestAborted);
                if (user == null)
                {
                    context.RejectPrincipal();
                    return;
                }

                if (!string.Equals(user.Estado, "activo", StringComparison.OrdinalIgnoreCase))
                {
                    context.RejectPrincipal();
                    return;
                }

                if (user.UltimoLogout.HasValue && !string.IsNullOrWhiteSpace(lastLogoutClaim))
                {
                    if (DateTime.TryParse(lastLogoutClaim, null, DateTimeStyles.RoundtripKind, out var claimLogoutUtc) && user.UltimoLogout.Value > claimLogoutUtc)
                    {
                        context.RejectPrincipal();
                        return;
                    }
                }
            }
        };
    })
    .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token))
                {
                    context.Token = context.Request.Cookies["SmileTrack-JWT"];
                }
                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var principal = context.Principal;
                if (principal == null)
                {
                    context.Fail("Token inválido.");
                    return;
                }

                var userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(userIdValue, out var userId))
                {
                    context.Fail("Usuario inválido en token.");
                    return;
                }

                using var scope = context.HttpContext.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var usuario = await db.Usuarios.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.IdUsuario == userId, context.HttpContext.RequestAborted);

                if (usuario == null || !string.Equals(usuario.Estado, "activo", StringComparison.OrdinalIgnoreCase))
                {
                    context.Fail("Usuario inactivo o inexistente.");
                    return;
                }

                var issuedAtClaim = principal.FindFirst(JwtRegisteredClaimNames.Iat)?.Value;
                if (!string.IsNullOrWhiteSpace(issuedAtClaim) &&
                    long.TryParse(issuedAtClaim, out var issuedAtSeconds) &&
                    usuario.UltimoLogout.HasValue)
                {
                    var tokenIssuedUtc = DateTimeOffset.FromUnixTimeSeconds(issuedAtSeconds).UtcDateTime;
                    if (usuario.UltimoLogout.Value > tokenIssuedUtc)
                    {
                        context.Fail("Token revocado por logout.");
                        return;
                    }
                }
            }
        };

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ApiOrCookie", policy =>
    {
        policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, CookieAuthenticationDefaults.AuthenticationScheme);
        policy.RequireAuthenticatedUser();
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<SmileTrack_MVC.Services.IAuthService, SmileTrack_MVC.Services.AuthService>();
builder.Services.Configure<SmileTrack_MVC.Services.Email.EmailServiceOptions>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddScoped<SmileTrack_MVC.Services.Email.IEmailService, SmileTrack_MVC.Services.Email.EmailService>();

var urlsConfig = builder.Configuration.GetValue<string>("Urls") ?? "http://localhost:5000";
var configuredUrls = urlsConfig.Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
var candidateUrls = new[]
{
    "http://localhost:5000",
    "http://localhost:5001",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5001"
};
var selectedUrl = SelectFirstAvailableUrl(configuredUrls.Concat(candidateUrls).Distinct().ToArray());
builder.WebHost.UseUrls(selectedUrl);

var app = builder.Build();

app.Logger.LogInformation("Usando URL de escucha: {Url}", selectedUrl);
await WaitForSqlServerAsync(connectionString, app.Logger);
await EnsureDatabaseSchemaAsync(app.Services, app.Logger);

app.Use(async (context, next) =>
{
    var requestId = context.TraceIdentifier;
    if (context.Request.Headers.TryGetValue("X-Request-ID", out var incomingId) && !string.IsNullOrWhiteSpace(incomingId))
    {
        requestId = incomingId.ToString().Trim();
    }
    context.Response.Headers["X-Request-ID"] = requestId;

    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        if (ex is OperationCanceledException ocex)
        {
            logger.LogWarning(ocex, "Solicitud cancelada por el cliente: {Metodo} {Ruta}", context.Request.Method, context.Request.Path);
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            return;
        }

        logger.LogError(ex, "Excepcion NO MANEJADA en pipeline: {Metodo} {Ruta} - {Mensaje}",
            context.Request.Method, context.Request.Path, ex.Message);

        if (context.Response.HasStarted)
        {
            logger.LogWarning(ex, "Ya se habia iniciado la respuesta; no se puede reescribir error para RequestId {RequestId}", requestId);
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

    app.Use(async (context, next) =>
    {
        if (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method))
        {
            var antiforgery = context.RequestServices.GetRequiredService<IAntiforgery>();
            var tokens = antiforgery.GetAndStoreTokens(context);
            if (!string.IsNullOrWhiteSpace(tokens.CookieToken))
            {
                context.Response.Cookies.Append("XSRF-TOKEN", tokens.CookieToken, new CookieOptions
                {
                    HttpOnly = false,
                    SameSite = SameSiteMode.Lax,
                    Secure = context.Request.IsHttps
                });
            }

            context.Items["AntiforgeryRequestToken"] = tokens.RequestToken;
        }

        await next();
    });

    app.UseAuthentication();
    app.UseAuthorization();

    // InferirModuloDesdeRuta removed — unused helper created earlier; keeping codebase minimal avoids dead code warnings

    app.MapControllers();

    app.MapControllerRoute(
        name: "viewproxy",
        pattern: "ViewProxy/Render/{**path}",
        defaults: new { controller = "ViewProxy", action = "Render" });

    app.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}");

static async Task EnsureDatabaseSchemaAsync(IServiceProvider services, ILogger logger)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        await db.Database.EnsureCreatedAsync();

        var scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "Database", "SCRIPT_SQL_UNICO_SMILETRACK.sql");

        if (File.Exists(scriptPath))
        {
            var sql = await File.ReadAllTextAsync(scriptPath);
            var batches = Regex.Split(sql, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
            foreach (var batch in batches)
            {
                var trimmed = batch.Trim();
                if (string.IsNullOrWhiteSpace(trimmed))
                    continue;

                await db.Database.ExecuteSqlRawAsync(trimmed);
            }

            logger.LogInformation("✅ Script unificado ejecutado desde {ScriptPath}", scriptPath);
        }
        else
        {
            // Fallback: apply minimal column fixes required by the runtime model
            var statements = new[]
            {
                """
                IF COL_LENGTH(N'dbo.Usuario', N'codigo_recuperacion') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Usuario] ADD [codigo_recuperacion] VARCHAR(255) NULL;
                END
                """,
                """
                IF COL_LENGTH(N'dbo.Usuario', N'fecha_expiracion_codigo') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Usuario] ADD [fecha_expiracion_codigo] DATETIME NULL;
                END
                """,
                """
                IF COL_LENGTH(N'dbo.Usuario', N'intentos_fallidos') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Usuario] ADD [intentos_fallidos] INT NOT NULL CONSTRAINT [DF_Usuario_IntentosFallidos] DEFAULT 0;
                END
                """,
                """
                IF COL_LENGTH(N'dbo.Usuario', N'ultimo_logout') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Usuario] ADD [ultimo_logout] DATETIME NULL;
                END
                """,
                """
                IF COL_LENGTH(N'dbo.Cita', N'estado') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Cita] ADD [estado] VARCHAR(30) NOT NULL CONSTRAINT [DF_Cita_Estado] DEFAULT 'programada';
                END
                """,
                """
                IF COL_LENGTH(N'dbo.Cita', N'notas') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Cita] ADD [notas] NVARCHAR(MAX) NULL;
                END
                """
            };

            foreach (var statement in statements)
            {
                await db.Database.ExecuteSqlRawAsync(statement);
            }

            logger.LogInformation("✅ Esquema de base de datos verificado y corregido para login y citas (fallback).");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "No fue posible ajustar automáticamente el esquema de base de datos. El login puede seguir fallando si la tabla Usuario/Cita no tiene las columnas esperadas.");
    }
}

static string SelectFirstAvailableUrl(string[] urls)
{
    foreach (var url in urls)
    {
        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            if (IsPortAvailable(uri.Host, uri.Port))
            {
                return url;
            }
        }
    }

    return urls[0];
}

static bool IsPortAvailable(string host, int port)
{
    try
    {
        var ipAddress = IPAddress.Loopback;
        if (!string.IsNullOrWhiteSpace(host) && host != "localhost" && host != "127.0.0.1" && host != "::1")
        {
            ipAddress = Dns.GetHostAddresses(host).FirstOrDefault(a => a.AddressFamily == AddressFamily.InterNetwork) ?? IPAddress.Loopback;
        }

        var listener = new TcpListener(ipAddress, port);
        listener.Start();
        listener.Stop();
        return true;
    }
    catch
    {
        return false;
    }
}

static async Task WaitForSqlServerAsync(string connectionString, ILogger logger)
{
    const int maxAttempts = 12;
    var delay = TimeSpan.FromSeconds(2);

    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            logger.LogInformation("🔌 Probando conexión a SQL Server (intento {Intento}/{MaxIntentos})...", attempt, maxAttempts);
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();
            logger.LogInformation("✅ Conexión a SQL Server establecida.");
            return;
        }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            logger.LogWarning(ex, "No se pudo conectar a SQL Server en el intento {Intento}. Reintentando en {Retraso}s...", attempt, delay.TotalSeconds);
            await Task.Delay(delay);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "No se pudo conectar a SQL Server después de {Intentos} intentos.", maxAttempts);
            throw;
        }
    }
}

// ⚡ Seed en background: el servidor arranca INMEDIATAMENTE
// La inicialización de BD ocurre en paralelo sin bloquear el startup
_ = Task.Run(async () =>
{
    await Task.Delay(500); // pequeña pausa para que el servidor arranque primero
    using var scope = app.Services.CreateScope();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        // Solo verificar si la BD existe y tiene datos (1 sola query)
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await db.Database.EnsureCreatedAsync();
        sw.Stop();
        logger.LogInformation("⏱ EnsureCreated tardó {Ms}ms", sw.ElapsedMilliseconds);

        // Migración idempotente para asegurar columnas y tablas faltantes en esquemas existentes
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                IF COL_LENGTH(N'dbo.Usuario', N'intentos_fallidos') IS NULL
                    ALTER TABLE dbo.Usuario ADD intentos_fallidos INT NOT NULL DEFAULT 0;
                IF COL_LENGTH(N'dbo.Usuario', N'ultimo_logout') IS NULL
                    ALTER TABLE dbo.Usuario ADD ultimo_logout DATETIME NULL;
                IF COL_LENGTH(N'dbo.Usuario', N'codigo_recuperacion') IS NULL
                    ALTER TABLE dbo.Usuario ADD codigo_recuperacion VARCHAR(10) NULL;
                IF COL_LENGTH(N'dbo.Usuario', N'fecha_expiracion_codigo') IS NULL
                    ALTER TABLE dbo.Usuario ADD fecha_expiracion_codigo DATETIME NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Auditoria') AND type = N'U')
                BEGIN
                    CREATE TABLE dbo.Auditoria (
                        id_auditoria INT IDENTITY(1,1) PRIMARY KEY,
                        id_usuario INT NULL,
                        tabla_afectada VARCHAR(100) NOT NULL,
                        id_registro INT NULL,
                        accion VARCHAR(45) NOT NULL,
                        ip_origen VARCHAR(45) NULL,
                        datos_anteriores VARCHAR(MAX) NULL,
                        datos_nuevos VARCHAR(MAX) NULL,
                        descripcion VARCHAR(255) NULL,
                        fecha DATETIME NOT NULL DEFAULT GETDATE(),
                        CONSTRAINT FK_Auditoria_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Factura') AND type = N'U')
                BEGIN
                    CREATE TABLE dbo.Factura (
                        id_factura INT IDENTITY(1,1) PRIMARY KEY,
                        numero_factura VARCHAR(20) NOT NULL UNIQUE,
                        fecha_factura DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
                        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                        total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                        estado VARCHAR(10) NOT NULL DEFAULT 'pendiente',
                        id_paciente INT NOT NULL,
                        notas VARCHAR(MAX) NULL,
                        generada_por INT NOT NULL,
                        CONSTRAINT FK_Factura_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente),
                        CONSTRAINT FK_Factura_GeneradaPor FOREIGN KEY (generada_por) REFERENCES Usuario(id_usuario)
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.PQR') AND type = N'U')
                BEGIN
                    CREATE TABLE dbo.PQR (
                        id_pqr INT IDENTITY(1,1) PRIMARY KEY,
                        id_paciente INT NOT NULL,
                        id_usuario INT NULL,
                        tipo VARCHAR(20) NOT NULL,
                        asunto VARCHAR(200) NOT NULL,
                        descripcion VARCHAR(MAX) NOT NULL,
                        estado VARCHAR(20) NOT NULL DEFAULT 'recibida',
                        prioridad VARCHAR(10) NOT NULL DEFAULT 'media',
                        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
                        fecha_respuesta DATETIME NULL,
                        respuesta VARCHAR(MAX) NULL,
                        atendida_por INT NULL,
                        evidencia_adjunto VARCHAR(255) NULL,
                        CONSTRAINT FK_PQR_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente) ON DELETE NO ACTION,
                        CONSTRAINT FK_PQR_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE NO ACTION
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Inventario') AND type = N'U')
                BEGIN
                    CREATE TABLE dbo.Inventario (
                        id_item INT IDENTITY(1,1) PRIMARY KEY,
                        codigo VARCHAR(50) NOT NULL UNIQUE,
                        nombre VARCHAR(150) NOT NULL,
                        categoria VARCHAR(100) NULL,
                        stock_actual INT NOT NULL DEFAULT 0,
                        stock_minimo INT NOT NULL DEFAULT 0,
                        unidad_medida VARCHAR(50) NULL,
                        precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                        fecha_vencimiento DATE NULL,
                        estado VARCHAR(20) NOT NULL DEFAULT 'disponible'
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Equipo') AND type = N'U')
                BEGIN
                    CREATE TABLE dbo.Equipo (
                        id_equipo INT IDENTITY(1,1) PRIMARY KEY,
                        nombre VARCHAR(150) NOT NULL,
                        modelo VARCHAR(100) NULL,
                        serie VARCHAR(100) NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'operativo',
                        ultimo_mantenimiento DATE NULL,
                        proximo_mantenimiento DATE NULL,
                        ubicacion VARCHAR(150) NULL
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Configuracion_General') AND type = N'U')
                BEGIN
                    CREATE TABLE dbo.Configuracion_General (
                        id_configuracion INT IDENTITY(1,1) PRIMARY KEY,
                        clave VARCHAR(100) NOT NULL UNIQUE,
                        valor VARCHAR(MAX) NOT NULL,
                        descripcion VARCHAR(255) NULL,
                        modulo VARCHAR(50) NOT NULL DEFAULT 'general'
                    );
                END
            ");
        }
        catch (Exception exMigration)
        {
            logger.LogWarning(exMigration, "⚠️ No se pudieron aplicar algunas alteraciones de columnas/tablas automáticas: {Mensaje}", exMigration.Message);
        }

        logger.LogInformation("🌱 Ejecutando seed inicial de la BD...");

        var requiredRoles = new[]
        {
            new { Name = "Administrador", Description = "Acceso total" },
            new { Name = "Profesional", Description = "Gestión clínica" },
            new { Name = "Paciente", Description = "Paciente de la clínica" },
            new { Name = "Recepcionista", Description = "Gestión de citas" },
            new { Name = "Auxiliar", Description = "Apoyo clínico" }
        };

        foreach (var roleDefinition in requiredRoles)
        {
            if (!await db.Roles.AnyAsync(r => r.NombreRol == roleDefinition.Name))
            {
                db.Roles.Add(new Rol { NombreRol = roleDefinition.Name, Descripcion = roleDefinition.Description });
            }
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
        var fakePacienteIds = fakePacientes.Select(p => p.IdPaciente).ToArray();
        var pacientesConHistoria = await db.HistoriasClinicas
            .Where(h => fakePacienteIds.Contains(h.IdPaciente))
            .Select(h => h.IdPaciente)
            .Distinct()
            .ToListAsync();

        var pacientesRemovibles = fakePacientes
            .Where(p => !pacientesConHistoria.Contains(p.IdPaciente))
            .ToList();

        if (pacientesRemovibles.Count > 0)
        {
            db.Pacientes.RemoveRange(pacientesRemovibles);
            await db.SaveChangesAsync();
        }
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
        var profRoleUser = await db.Usuarios.FirstOrDefaultAsync(u => u.Correo == "prof@smiletrack.co");
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
        logger.LogWarning(ex, "⚠️ Error al inicializar la base de datos en background: {Mensaje}", ex.Message);
    }
});

app.Run();