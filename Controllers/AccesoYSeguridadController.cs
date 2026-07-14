using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models;

namespace SmileTrack_MVC.Controllers;

public class AccesoYSeguridadController : Controller
{
      private readonly AppDbContext _context;

    public AccesoYSeguridadController(AppDbContext context)
    {
        _context = context;
    }
    [HttpGet]
    [Route("acceso-y-seguridad/login")]
    public IActionResult Login() => View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");

  
    [HttpPost]
    [ValidateAntiForgeryToken]
    [Route("acceso-y-seguridad/login")]
    public async Task<IActionResult> LoginPost(string email, string password, string? rol)
    {
        var redirecciones = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "Administrador", "/gestion-de-citas/st-adm-01-dashboard" },
            { "Profesional", "/gestion-de-profesionales/st-odo-01-dashboard" },
            { "Recepcionista", "/gestion-de-citas/st-rec-01-dashboard" },
            { "Auxiliar", "/gestion-de-citas/st-aux-01-panel-operativo/panel-operativo" },
            { "Paciente", "/gestion-de-citas/st-pac-01-mis-citas" },
        };

        static string NormalizarRol(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor)) return string.Empty;

            return valor.Trim().ToLowerInvariant() switch
            {
                "administrador" or "admin" => "Administrador",
                "profesional" or "odontologo" or "doctor" => "Profesional",
                "recepcionista" => "Recepcionista",
                "auxiliar" => "Auxiliar",
                "paciente" => "Paciente",
                _ => valor.Trim()
            };
        }

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            ModelState.AddModelError("", "Correo y contraseña son obligatorios.");
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        var rolDesdeFormulario = NormalizarRol(rol);
        var rolNombre = !string.IsNullOrWhiteSpace(rolDesdeFormulario) && redirecciones.ContainsKey(rolDesdeFormulario)
            ? rolDesdeFormulario
            : "Paciente";

        var demoUsers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "admin@smiletrack.com", "Admin123!" },
            { "profesional@smiletrack.com", "Profesional123!" },
            { "recepcionista@smiletrack.com", "Recepcionista123!" },
            { "auxiliar@smiletrack.com", "Auxiliar123!" },
            { "paciente@smiletrack.com", "Paciente123!" },
        };

        Usuario? usuario = null;
        bool usarModoDemo = false;

        try
        {
            usuario = await _context.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.Correo == email && u.Estado == "activo");
        }
        catch (Exception)
        {
            usarModoDemo = true;
        }

        if (usarModoDemo)
        {
            if (!demoUsers.TryGetValue(email, out var demoPassword) || password != demoPassword)
            {
                ModelState.AddModelError("", "Correo o contraseña incorrectos.");
                return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
            }

            usuario = new Usuario
            {
                IdUsuario = 0,
                Nombre = "Usuario",
                Apellidos = "Demo",
                Correo = email,
                Contrasena = "",
                Estado = "activo"
            };
        }
        else
        {
            if (usuario == null || !BCrypt.Net.BCrypt.Verify(password, usuario.Contrasena))
            {
                ModelState.AddModelError("", "Correo o contraseña incorrectos.");
                return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
            }

            var rolDesdeBase = NormalizarRol(usuario.Rol?.NombreRol);
            if (!string.IsNullOrWhiteSpace(rolDesdeBase) && redirecciones.ContainsKey(rolDesdeBase))
            {
                rolNombre = rolDesdeBase;
            }
        }

        if (!redirecciones.TryGetValue(rolNombre, out var rutaDestino))
        {
            ModelState.AddModelError("", "El usuario no tiene un rol válido asignado.");
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
            new(ClaimTypes.Name, $"{usuario.Nombre} {usuario.Apellidos}"),
            new(ClaimTypes.Email, usuario.Correo),
            new(ClaimTypes.Role, rolNombre),
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal,
            new AuthenticationProperties { IsPersistent = true });

        if (!usarModoDemo)
        {
            usuario.UltimoLogin = DateTime.Now;
            await _context.SaveChangesAsync();
        }

        return Redirect(rutaDestino);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Route("acceso-y-seguridad/logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Redirect("/acceso-y-seguridad/login");
    }

    [HttpGet]
    [Route("acceso-y-seguridad/recover")]
    public IActionResult Recover() => View("~/Views/Acceso_Y_Seguridad/recover/index.cshtml");

    [HttpGet]
    [Route("acceso-y-seguridad/register")]
    public IActionResult Register() => View("~/Views/Acceso_Y_Seguridad/register/index.cshtml");

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Route("acceso-y-seguridad/register")]
    public IActionResult RegisterPost()
    {
        return Redirect("/acceso-y-seguridad/login");
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("acceso-y-seguridad/st-adm-02-gestion-usuarios")]
    public IActionResult Stadm02GestionUsuarios() => View("~/Views/Acceso_Y_Seguridad/st-adm-02-gestion-usuarios/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("acceso-y-seguridad/st-adm-03-gestion-roles")]
    public IActionResult Stadm03GestionRoles() => View("~/Views/Acceso_Y_Seguridad/st-adm-03-gestion-roles/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("acceso-y-seguridad/st-adm-04-matriz-permisos")]
    public IActionResult Stadm04MatrizPermisos() => View("~/Views/Acceso_Y_Seguridad/st-adm-04-matriz-permisos/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("acceso-y-seguridad/st-adm-15-bitacora")]
    public IActionResult Stadm15Bitacora() => View("~/Views/Acceso_Y_Seguridad/st-adm-15-bitacora/index.cshtml");
}
