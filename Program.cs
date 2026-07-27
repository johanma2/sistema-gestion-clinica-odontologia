using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllersWithViews();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    connectionString = "Server=(localdb)\\mssqllocaldb;Database=SmileTrackDB;Trusted_Connection=True;TrustServerCertificate=True;";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure()));

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
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Aplica las migraciones de EF Core pendientes (crea o actualiza el
        // esquema de forma versionada). Reemplaza a EnsureCreatedAsync(),
        // que no es apta para un entorno "real"/productivo porque ignora
        // el historial de migraciones.
        await db.Database.MigrateAsync();

        // Siembra datos ficticios/base de forma idempotente.
        await SmileTrack_MVC.Data.DbInitializer.SeedAsync(db);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "No se pudo inicializar la base de datos durante el inicio.");
    }
}

app.Run();