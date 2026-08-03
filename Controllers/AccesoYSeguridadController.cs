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
    public async Task<IActionResult> Login(string? returnUrl = null)
    {
        // Limpiar cualquier estado de autenticación previo antes de mostrar la página de login.
        // Esto evita que cookies de sesión antiguas puedan contaminar la siguiente petición POST,
        // especialmente en contextos donde el cliente mantiene un .AspNetCore.Cookies / SmileTrack-JWT
        // viejo que podría provocar rechazos de solicitud por encabezados demasiado grandes o
        // sesiones inconsistentes.
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        Response.Cookies.Delete("SmileTrack-JWT");

        ViewData["ReturnUrl"] = returnUrl;
        return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
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

        ViewData["ReturnUrl"] = returnUrl;
        var accept = HttpContext.Request.Headers["Accept"].ToString();
        var wantsJson = accept?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true;

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            ModelState.AddModelError("", "Correo y contraseña son obligatorios.");
            if (wantsJson)
            {
                return BadRequest(new { success = false, message = "Correo y contraseña son obligatorios." });
            }
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        var correo = email.Trim();
        var usuario = await _context.Usuarios
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Correo == correo);

        if (usuario == null)
        {
            if (wantsJson)
            {
                return Unauthorized(new { success = false, message = "Correo o contraseña incorrectos." });
            }
            ModelState.AddModelError("", "Correo o contraseña incorrectos.");
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        // El rol siempre se toma de la base de datos (fuente de verdad), nunca del botón que el
        // usuario haya presionado en pantalla. Si el usuario selecciona un rol distinto en el
        // formulario, se IGNORA la selección de la UI, se usa el rol real asignado en BD y se
        // le deja ingresar sin bloqueos. Así, incluso sin hacer clic en el selector de roles,
        // el login funciona automáticamente.
        var rolSeleccionado = NormalizarRol(rol);
        var rolNombre = NormalizarRol(usuario.Rol?.NombreRol);

        if (!redirecciones.TryGetValue(rolNombre, out var redirectUrl))
        {
            if (wantsJson)
            {
                return BadRequest(new { success = false, message = "El usuario no tiene un rol válido asignado." });
            }
            ModelState.AddModelError("", "El usuario no tiene un rol válido asignado.");
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        if (!string.IsNullOrWhiteSpace(rolSeleccionado) &&
            !string.Equals(rolSeleccionado, rolNombre, StringComparison.OrdinalIgnoreCase))
        {
            TempData["InfoMessage"] = $"Se detectó que seleccionaste el rol '{rolSeleccionado}', pero tu cuenta corresponde a '{rolNombre}'. Has iniciado sesión con tu rol real.";
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
            var status = authResult.Message.Contains("bloqueada", StringComparison.OrdinalIgnoreCase)
                ? StatusCodes.Status403Forbidden
                : StatusCodes.Status401Unauthorized;

            if (wantsJson)
            {
                return StatusCode(status, new { success = false, message = authResult.Message });
            }

            Response.StatusCode = status;
            ViewData["ErrorStatus"] = status;
            ModelState.AddModelError("", authResult.Message);
            return View("~/Views/Acceso_Y_Seguridad/login/index.cshtml");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
            new(ClaimTypes.Name, $"{usuario.Nombre} {usuario.Apellidos}"),
            new(ClaimTypes.Email, usuario.Correo),
            new(ClaimTypes.Role, rolNombre),
            new("SessionIssuedUtc", DateTime.UtcNow.ToString("O")),
            new("LastLogoutUtc", usuario.UltimoLogout?.ToString("O") ?? DateTime.MinValue.ToString("O")),
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

        // Si el cliente solicita JSON (API client), devolvemos token y redirect en JSON
        if (wantsJson)
        {
            return Json(new { success = true, token = authResult.Token, redirectUrl = redirectUrl });
        }

        // Guardar el JWT en cookie httpOnly separada cuando exista.
        if (!string.IsNullOrWhiteSpace(authResult.Token))
        {
            Response.Cookies.Append("SmileTrack-JWT", authResult.Token, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddMinutes(60)
            });
        }

        string destino;
        var rr = returnUrl ?? string.Empty;
        if (IsLocalUrl(rr) && !rr.StartsWith("/acceso-y-seguridad/login", StringComparison.OrdinalIgnoreCase))
        {
            destino = rr;
        }
        else
        {
            destino = redirectUrl;
        }

        if (wantsJson)
        {
            return Json(new { success = true, token = authResult.Token, redirectUrl = destino });
        }

        return LocalRedirect(destino);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Route("acceso-y-seguridad/logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(userId, out var idUsuario))
        {
            var usuario = await _context.Usuarios.FindAsync(idUsuario);
            if (usuario != null)
            {
                usuario.UltimoLogout = DateTime.UtcNow;
                _context.Usuarios.Update(usuario);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    // No bloquear la salida si falla el registro de logout.
                    var logger = HttpContext.RequestServices.GetService<ILogger<AccesoYSeguridadController>>();
                    logger?.LogWarning(ex, "No se pudo registrar UltimoLogout al cerrar sesión para IdUsuario={IdUsuario}", idUsuario);
                }
            }
        }

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        Response.Cookies.Delete("SmileTrack-JWT");
        return Redirect("/acceso-y-seguridad/login");
    }

    [HttpGet]
    [Route("acceso-y-seguridad/recover")]
    public IActionResult Recover() => View("~/Views/Acceso_Y_Seguridad/recover/index.cshtml");

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Route("acceso-y-seguridad/recover/send-code")]
    public async Task<IActionResult> RecoverSendCode([FromBody] Models.ViewModels.RecoverPasswordRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Correo))
        {
            return BadRequest(new { Success = false, Message = "El correo es obligatorio." });
        }

        var result = await _authService.RecoverPasswordAsync(request);
        return Ok(new { result.Success, result.Message });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Route("acceso-y-seguridad/recover/reset-password")]
    public async Task<IActionResult> RecoverResetPassword([FromBody] Models.ViewModels.ResetPasswordRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Correo) || string.IsNullOrWhiteSpace(request.Codigo) || string.IsNullOrWhiteSpace(request.NuevaContrasena))
        {
            return BadRequest(new { Success = false, Message = "Todos los campos son obligatorios." });
        }

        var result = await _authService.ResetPasswordAsync(request);
        return Ok(new { result.Success, result.Message });
    }

    [HttpGet]
    [Authorize]
    [Route("acceso-y-seguridad/cambiar-contrasena")]
    public IActionResult ChangePassword() => View("~/Views/Acceso_Y_Seguridad/change-password/index.cshtml");

    [HttpPost]
    [Authorize]
    [ValidateAntiForgeryToken]
    [Route("acceso-y-seguridad/cambiar-contrasena")]
    public async Task<IActionResult> ChangePasswordPost(string contrasenaActual, string nuevaContrasena, string confirmarContrasena)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var idUsuario))
        {
            return RedirectToAction("Login");
        }

        var response = await _authService.ChangePasswordAsync(new Models.ViewModels.ChangePasswordRequest
        {
            IdUsuario = idUsuario,
            ContrasenaActual = contrasenaActual,
            NuevaContrasena = nuevaContrasena,
            ConfirmarContrasena = confirmarContrasena
        });

        if (!response.Success)
        {
            ModelState.AddModelError(string.Empty, response.Message);
            return View("~/Views/Acceso_Y_Seguridad/change-password/index.cshtml");
        }

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        TempData["SuccessMessage"] = response.Message;
        return RedirectToAction("Login");
    }

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
    public async Task<IActionResult> Stadm02GestionUsuarios()
    {
        var usuariosDb = await _context.Usuarios.Include(u => u.Rol).ToListAsync();
        var rolesColor = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "Administrador", "purple" },
            { "Recepcionista", "orange" },
            { "Profesional", "green" },
            { "Auxiliar", "pink" },
            { "Paciente", "blue" }
        };

        var usuarios = usuariosDb.Select(u => new
        {
            id = u.IdUsuario,
            name = $"{u.Nombre} {u.Apellidos}".Trim(),
            initials = $"{u.Nombre?.Trim().FirstOrDefault()}{u.Apellidos?.Trim().FirstOrDefault()}".ToUpper(),
            email = u.Correo,
            role = u.Rol?.NombreRol ?? "Sin Rol",
            status = string.IsNullOrWhiteSpace(u.Estado) ? "Activo" : char.ToUpper(u.Estado[0]) + u.Estado[1..],
            lastAccess = u.UltimoLogin,
            color = u.Rol != null && rolesColor.TryGetValue(u.Rol.NombreRol, out var col) ? col : "blue"
        }).ToList();

        ViewData["UsuariosJson"] = System.Text.Json.JsonSerializer.Serialize(usuarios);
        return View("~/Views/Acceso_Y_Seguridad/st-adm-02-gestion-usuarios/index.cshtml", usuarios);
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("acceso-y-seguridad/st-adm-03-gestion-roles")]
    public async Task<IActionResult> Stadm03GestionRoles()
    {
        var rolesDb = await _context.Roles.ToListAsync();
        ViewData["RolesJson"] = System.Text.Json.JsonSerializer.Serialize(rolesDb);
        return View("~/Views/Acceso_Y_Seguridad/st-adm-03-gestion-roles/index.cshtml", rolesDb);
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("acceso-y-seguridad/st-adm-04-matriz-permisos")]
    public IActionResult Stadm04MatrizPermisos() => Redirect("/acceso-y-seguridad/st-adm-03-gestion-roles");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("acceso-y-seguridad/st-adm-15-bitacora")]
    public async Task<IActionResult> Stadm15Bitacora()
    {
        var bitacoraDb = await _context.Auditorias
            .Include(a => a.Usuario)
            .OrderByDescending(a => a.Fecha)
            .Take(100)
            .Select(a => new
            {
                id = a.IdAuditoria,
                usuario = a.Usuario != null ? $"{a.Usuario.Nombre} {a.Usuario.Apellidos}" : "Sistema",
                accion = a.Accion,
                tabla = a.TablaAfectada,
                descripcion = a.Descripcion ?? $"Registro en {a.TablaAfectada}",
                ip = a.IpOrigen ?? "127.0.0.1",
                fecha = a.Fecha
            })
            .ToListAsync();

        ViewData["BitacoraJson"] = System.Text.Json.JsonSerializer.Serialize(bitacoraDb);
        return View("~/Views/Acceso_Y_Seguridad/st-adm-15-bitacora/index.cshtml", bitacoraDb);
    }
}

