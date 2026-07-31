using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.ViewModels;
using SmileTrack_MVC.Services;

namespace SmileTrack_MVC.Controllers;

public class AccesoYSeguridadController(AppDbContext context, IAuthService authService) : Controller
{
       private readonly AppDbContext _context = context;
       private readonly IAuthService _authService = authService;

    [HttpGet]
    [Route("acceso-y-seguridad/login")]
    public IActionResult Login() => View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");

    [HttpPost]
    [Route("acceso-y-seguridad/login")]
    public async Task<IActionResult> LoginPost(string email, string password, string? rol, string? returnUrl)
    {
        static bool IsLocalUrl(string? url) => !string.IsNullOrEmpty(url) && url.StartsWith('/') && !url.StartsWith("//");

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

        var correo = email.Trim();
        var usuario = await _context.Usuarios
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Correo == correo);

        if (usuario == null)
        {
            ModelState.AddModelError("", "Correo o contraseña incorrectos.");
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        // El rol siempre se toma de la base de datos (fuente de verdad), nunca del botón que el
        // usuario haya presionado en pantalla. Antes se confiaba en el valor enviado por el
        // formulario, lo que permitía iniciar sesión con un rol distinto al asignado realmente
        // y hacía que la información propia del rol correcto "desapareciera".
        var rolSeleccionado = NormalizarRol(rol);
        var rolNombre = NormalizarRol(usuario.Rol?.NombreRol);

        if (!redirecciones.TryGetValue(rolNombre, out var redirectUrl))
        {
            ModelState.AddModelError("", "El usuario no tiene un rol válido asignado.");
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        if (!string.IsNullOrWhiteSpace(rolSeleccionado) &&
            !string.Equals(rolSeleccionado, rolNombre, StringComparison.OrdinalIgnoreCase))
        {
            ModelState.AddModelError("", $"Esta cuenta no tiene el rol '{rolSeleccionado}'. Ingresa seleccionando '{rolNombre}'.");
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        // La contraseña, el estado de la cuenta (activo/inactivo) y el registro de auditoría del
        // intento de inicio de sesión quedan a cargo de AuthService, que ya centraliza ese manejo
        // (incluye manejo de errores de BD y logging) en vez de duplicarlo aquí.
        var authResult = await _authService.LoginAsync(new LoginRequest
        {
            Correo = correo,
            Contrasena = password,
            Rol = rolNombre,
        });

        if (!authResult.Success)
        {
            ModelState.AddModelError("", authResult.Message);
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
            new(ClaimTypes.Name, $"{usuario.Nombre} {usuario.Apellidos}"),
            new(ClaimTypes.Email, usuario.Correo),
            new(ClaimTypes.Role, rolNombre),
        };

        // Se agrega el id de la ficha de Paciente/Profesional vinculada al usuario como claim,
        // para que quede disponible en toda la sesión (Views, Controllers) sin tener que volver
        // a buscarla por correo en cada pantalla. Esto evita que se "pierda" esa información al
        // navegar entre las distintas vistas de un mismo rol.
        if (string.Equals(rolNombre, "Paciente", StringComparison.OrdinalIgnoreCase))
        {
            var idPaciente = await _context.Pacientes
                .Where(p => p.IdUsuario == usuario.IdUsuario)
                .Select(p => (int?)p.IdPaciente)
                .FirstOrDefaultAsync();

            if (idPaciente.HasValue)
            {
                claims.Add(new Claim("IdPaciente", idPaciente.Value.ToString()));
            }
        }
        else if (string.Equals(rolNombre, "Profesional", StringComparison.OrdinalIgnoreCase))
        {
            var idProfesional = await _context.Profesionales
                .Where(p => p.IdUsuario == usuario.IdUsuario)
                .Select(p => (int?)p.IdProfesional)
                .FirstOrDefaultAsync();

            if (idProfesional.HasValue)
            {
                claims.Add(new Claim("IdProfesional", idProfesional.Value.ToString()));
            }
        }

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal,
            new AuthenticationProperties { IsPersistent = true });

        var destino = (IsLocalUrl(returnUrl) && !returnUrl.StartsWith("/acceso-y-seguridad/login", StringComparison.OrdinalIgnoreCase))
            ? returnUrl
            : redirectUrl;
        return Redirect(destino!);
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
