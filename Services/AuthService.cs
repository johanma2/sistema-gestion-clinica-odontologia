using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Models.ViewModels;
using SmileTrack_MVC.Services.Email;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace SmileTrack_MVC.Services
{
    public class AuthService : IAuthService
    {
        private const string MensajeErrorSeguridad = "No fue posible completar la operación. Por favor intente nuevamente en unos momentos.";
        private const string MensajeCredencialesInvalidas = "Correo o contraseña incorrectos";
        private const int MaxLoginFailedAttempts = 3;
        private const string MensajeCuentaBloqueada = "Cuenta bloqueada por 3 intentos fallidos. Contacta al administrador para reactivarla.";
        private const string MensajeUsuarioNoDisponible = "El acceso no está disponible en este momento. Intente nuevamente más tarde.";
        private const string MensajeRecuperacionGenerico = "Si el correo está registrado, recibirás un código.";
        private const string MensajeCodigoInvalidoOExpirado = "Código inválido o expirado.";
        private const string MensajeTokenRecuperacionInvalido = "La sesión de recuperación no es válida o expiró. Solicita un nuevo código.";
        private const int VigenciaCodigoRecuperacionMinutos = 15;
        private const int VentanaRateLimitMinutos = 10;
        private const int MaxSolicitudesRecuperacionPorVentana = 2;
        private const int MaxIntentosCodigoRecuperacion = 3;
        private static readonly EmailAddressAttribute ValidadorCorreo = new();
        private static readonly Regex RegexContrasenaRecuperacion = new(
            @"^(?=.{8,}$)(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$",
            RegexOptions.Compiled,
            TimeSpan.FromMilliseconds(500));

        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly ILogger<AuthService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IEmailService _emailService;
        private readonly IDataProtector _passwordRecoveryProtector;

        public AuthService(
            IConfiguration configuration,
            AppDbContext context,
            ILogger<AuthService> logger,
            IHttpContextAccessor httpContextAccessor,
            IEmailService emailService,
            IDataProtectionProvider dataProtectionProvider)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _passwordRecoveryProtector = (dataProtectionProvider ?? throw new ArgumentNullException(nameof(dataProtectionProvider)))
                .CreateProtector("SmileTrack.PasswordRecovery");
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
        {
            string ipCliente = ObtenerIpCliente();
            string correoNormalizado = request?.Correo?.Trim() ?? string.Empty;
            string rolSolicitado = request?.Rol?.Trim() ?? string.Empty;

            try
            {
                _logger.LogInformation("Intento de inicio de sesión recibido. Correo={Correo}, RolSolicitado={Rol}, IpCliente={IpCliente}",
                    correoNormalizado, rolSolicitado, ipCliente);

                if (request is null ||
                    string.IsNullOrWhiteSpace(request.Correo) ||
                    string.IsNullOrWhiteSpace(request.Contrasena))
                {
                    _logger.LogWarning("Login fallido: campos obligatorios vacíos. IpCliente={IpCliente}", ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Correo y contraseña son obligatorios."
                    };
                }

                Usuario? user;
                try
                {
                    user = await _context.Usuarios
                        .Include(u => u.Rol)
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.Correo == request.Correo, ct);
                }
                catch (SqlException sqlEx)
                {
                    _logger.LogCritical(sqlEx, "Fallo SQL al consultar usuario en Login. Correo={Correo}, Rol={Rol}, IpCliente={IpCliente}, NumeroError={NumError}",
                        correoNormalizado, rolSolicitado, ipCliente, sqlEx.Number);
                    return new AuthResponse { Success = false, Message = MensajeUsuarioNoDisponible };
                }

                if (user == null || user.Rol == null)
                {
                    _logger.LogWarning("Login fallido: usuario no encontrado. Correo={Correo}, RolSolicitadoUI={Rol}, IpCliente={IpCliente}",
                        correoNormalizado, rolSolicitado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = MensajeCredencialesInvalidas
                    };
                }

                // Si el flujo superior envía un Rol por request (usado para logging y compatibilidad),
                // no se usa para filtrar la búsqueda, solo se valida coincidencia y se loguea.
                if (!string.IsNullOrWhiteSpace(rolSolicitado) &&
                    !string.Equals(rolSolicitado, user.Rol.NombreRol, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("Login: el usuario seleccionó el rol '{RolSolicitado}' en UI pero su cuenta tiene '{RolReal}'. " +
                        "Se continúa el login con el rol real asignado. IdUsuario={IdUsuario}, Correo={Correo}",
                        rolSolicitado, user.Rol.NombreRol, user.IdUsuario, correoNormalizado);
                }

                if (!string.Equals(user.Estado, "activo", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Login fallido: usuario inactivo. IdUsuario={IdUsuario}, Correo={Correo}, Estado={Estado}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, user.Estado, ipCliente);

                    if (user.IntentosFallidos >= MaxLoginFailedAttempts)
                    {
                        return new AuthResponse
                        {
                            Success = false,
                            Message = MensajeCuentaBloqueada
                        };
                    }

                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Su cuenta se encuentra inactiva. Contacte al administrador del sistema."
                    };
                }

                bool isPasswordValid;
                try
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Contrasena, user.Contrasena);
                }
                catch (FormatException fEx)
                {
                    _logger.LogCritical(fEx, "Hash de contraseña inválido en BD para usuario. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeCredencialesInvalidas };
                }
                catch (Exception bcEx)
                {
                    _logger.LogError(bcEx, "Error inesperado al verificar contraseña BCrypt. IdUsuario={IdUsuario}, IpCliente={IpCliente}",
                        user.IdUsuario, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeCredencialesInvalidas };
                }

                if (!isPasswordValid)
                {
                    var usuarioActualizar = await _context.Usuarios.FindAsync(new object[] { user.IdUsuario }, ct);
                    var estaBloqueada = false;
                    if (usuarioActualizar != null)
                    {
                        usuarioActualizar.IntentosFallidos += 1;
                        if (usuarioActualizar.IntentosFallidos >= MaxLoginFailedAttempts)
                        {
                            usuarioActualizar.Estado = "inactivo";
                            estaBloqueada = true;
                            _logger.LogWarning("Cuenta bloqueada por intentos fallidos. IdUsuario={IdUsuario}, Correo={Correo}, IntentosFallidos={IntentosFallidos}, IpCliente={IpCliente}",
                                user.IdUsuario, correoNormalizado, usuarioActualizar.IntentosFallidos, ipCliente);
                        }
                        _context.Usuarios.Update(usuarioActualizar);
                        try
                        {
                            await _context.SaveChangesAsync(ct);
                        }
                        catch (DbUpdateConcurrencyException)
                        {
                            _logger.LogWarning("Login: concurrencia al actualizar intentos fallidos. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                                user.IdUsuario, correoNormalizado, ipCliente);
                        }
                        catch (SqlException sqlEx)
                        {
                            _logger.LogError(sqlEx, "Login: SQL error actualizando intentos fallidos. IdUsuario={IdUsuario}, NumeroError={NumError}",
                                user.IdUsuario, sqlEx.Number);
                        }
                    }

                    _logger.LogWarning("Login fallido: contraseña incorrecta. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = estaBloqueada ? MensajeCuentaBloqueada : MensajeCredencialesInvalidas
                    };
                }

                var usuarioLogin = await _context.Usuarios.FindAsync(new object[] { user.IdUsuario }, ct);
                if (usuarioLogin != null)
                {
                    usuarioLogin.UltimoLogin = DateTime.UtcNow;
                    usuarioLogin.IntentosFallidos = 0;
                    _context.Usuarios.Update(usuarioLogin);
                    try
                    {
                        await _context.SaveChangesAsync(ct);
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        _logger.LogWarning("Login: concurrencia al actualizar UltimoLogin. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                            user.IdUsuario, correoNormalizado, ipCliente);
                    }
                    catch (SqlException sqlEx)
                    {
                        _logger.LogError(sqlEx, "Login: SQL error actualizando UltimoLogin. IdUsuario={IdUsuario}, NumeroError={NumError}",
                            user.IdUsuario, sqlEx.Number);
                    }
                }

                string token = GenerateJwtToken(user.Correo, user.Rol.NombreRol, user.IdUsuario);
                var userPayload = new
                {
                    idUsuario = user.IdUsuario,
                    correo = user.Correo,
                    rol = user.Rol.NombreRol,
                    nombre = user.Nombre,
                    apellidos = user.Apellidos
                };

                _logger.LogInformation("Inicio de sesión exitoso. IdUsuario={IdUsuario}, Correo={Correo}, Rol={Rol}, IpCliente={IpCliente}",
                    user.IdUsuario, correoNormalizado, user.Rol.NombreRol, ipCliente);

                return new AuthResponse
                {
                    Success = true,
                    Message = "Inicio de sesión exitoso.",
                    Token = token,
                    User = userPayload
                };
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Login cancelado por el cliente. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = "Operación cancelada." };
            }
            catch (ArgumentException argEx)
            {
                _logger.LogWarning(argEx, "Parámetro inválido en Login. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeCredencialesInvalidas };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en LoginAsync. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
        {
            string ipCliente = ObtenerIpCliente();
            string correoNormalizado = request?.Correo?.Trim() ?? string.Empty;

            try
            {
                _logger.LogInformation("Intento de registro recibido. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);

                if (request is null)
                {
                    _logger.LogWarning("Registro fallido: solicitud nula. IpCliente={IpCliente}", ipCliente);
                    return new AuthResponse { Success = false, Message = "Todos los campos son obligatorios." };
                }

                if (string.IsNullOrWhiteSpace(request.Correo) ||
                    string.IsNullOrWhiteSpace(request.Contrasena) ||
                    string.IsNullOrWhiteSpace(request.Nombre))
                {
                    _logger.LogWarning("Registro fallido: campos obligatorios vacíos. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Todos los campos son obligatorios."
                    };
                }

                if (string.IsNullOrWhiteSpace(request.TipoDocumento) || string.IsNullOrWhiteSpace(request.NumeroDocumento))
                {
                    _logger.LogWarning("Registro fallido: documento incompleto. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "El documento es obligatorio para completar el registro."
                    };
                }

                if (!Regex.IsMatch(request.Contrasena, @"^(?=.{8,}).+$", RegexOptions.None, TimeSpan.FromMilliseconds(500)))
                {
                    _logger.LogWarning("Registro fallido: contraseña muy corta. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "La contraseña debe tener al menos 8 caracteres."
                    };
                }

                bool existeCorreo;
                try
                {
                    existeCorreo = await _context.Usuarios.AnyAsync(u => u.Correo == request.Correo, ct);
                }
                catch (SqlException sqlEx)
                {
                    _logger.LogCritical(sqlEx, "Fallo SQL al verificar correo duplicado. Correo={Correo}, IpCliente={IpCliente}, NumError={NumError}",
                        correoNormalizado, ipCliente, sqlEx.Number);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                if (existeCorreo)
                {
                    _logger.LogWarning("Registro fallido: correo duplicado. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "El correo ya se encuentra registrado en el sistema."
                    };
                }

                var roleName = string.IsNullOrWhiteSpace(request.Rol) ? "Paciente" : request.Rol;
                var role = await _context.Roles.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.NombreRol == roleName, ct);

                if (role == null)
                {
                    _logger.LogWarning("Registro fallido: rol inexistente. RolSolicitado={Rol}, IpCliente={IpCliente}", roleName, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = $"El rol '{roleName}' no es válido."
                    };
                }

                var names = request.Nombre.Split(new[] { ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
                var firstName = names.Length > 0 ? names[0] : request.Nombre;
                var lastName = names.Length > 1 ? names[1] : "SmileTrack";

                string hashContrasena;
                try
                {
                    hashContrasena = BCrypt.Net.BCrypt.HashPassword(request.Contrasena, workFactor: 11);
                }
                catch (Exception bcEx)
                {
                    _logger.LogError(bcEx, "Error al generar hash BCrypt. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                var newUser = new Usuario
                {
                    Nombre = firstName,
                    Apellidos = string.IsNullOrWhiteSpace(lastName) ? "SmileTrack" : lastName,
                    Correo = request.Correo,
                    Contrasena = hashContrasena,
                    IdRol = role.IdRol,
                    Estado = "activo",
                    FechaCreacion = DateTime.UtcNow
                };

                using var tx = await _context.Database.BeginTransactionAsync(ct);
                int idUsuarioCreado = 0;

                try
                {
                    _context.Usuarios.Add(newUser);
                    await _context.SaveChangesAsync(ct);
                    idUsuarioCreado = newUser.IdUsuario;

                    if (roleName.Equals("Paciente", StringComparison.OrdinalIgnoreCase))
                    {
                        var newPaciente = new Paciente
                        {
                            IdUsuario = newUser.IdUsuario,
                            TipoDocumento = string.IsNullOrWhiteSpace(request.TipoDocumento) ? "CC" : request.TipoDocumento,
                            Documento = string.IsNullOrWhiteSpace(request.NumeroDocumento)
                                ? "TEMP" + newUser.IdUsuario
                                : request.NumeroDocumento,
                            Nombres = firstName,
                            Apellidos = string.IsNullOrWhiteSpace(lastName) ? "Paciente" : lastName,
                            FechaNacimiento = DateTime.UtcNow.AddYears(-20).Date,
                            Correo = request.Correo,
                            Telefono = request.Telefono,
                            Estado = "activo",
                            FechaRegistro = DateTime.UtcNow.Date
                        };
                        _context.Pacientes.Add(newPaciente);
                        await _context.SaveChangesAsync(ct);
                    }

                    await tx.CommitAsync(ct);
                }
                catch (DbUpdateException dbEx) when (EsViolacionIndiceUnico(dbEx, out var nombreIndice))
                {
                    await tx.RollbackAsync(ct);
                    _logger.LogWarning(dbEx, "Registro fallido: violación UNIQUE. Correo={Correo}, Indice={Indice}, IpCliente={IpCliente}",
                        correoNormalizado, nombreIndice ?? "desconocido", ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "El correo o documento ya se encuentran registrados."
                    };
                }
                catch (DbUpdateException dbEx) when (EsViolacionIntegridadReferencial(dbEx))
                {
                    await tx.RollbackAsync(ct);
                    _logger.LogError(dbEx, "Registro fallido: violación FK. Correo={Correo}, IdRol={IdRol}, IpCliente={IpCliente}",
                        correoNormalizado, role.IdRol, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }
                catch (DbUpdateConcurrencyException concEx)
                {
                    await tx.RollbackAsync(ct);
                    _logger.LogWarning(concEx, "Registro: conflicto concurrencia. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = "Conflicto temporal, intente nuevamente." };
                }
                catch (SqlException sqlEx)
                {
                    await tx.RollbackAsync(ct);
                    _logger.LogCritical(sqlEx, "Registro fallido SQL. Correo={Correo}, NumeroError={NumError}, IpCliente={IpCliente}",
                        correoNormalizado, sqlEx.Number, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }
                catch (Exception innerEx)
                {
                    await tx.RollbackAsync(ct);
                    _logger.LogError(innerEx, "Registro fallido (transacción rollback). Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                string token = GenerateJwtToken(newUser.Correo, role.NombreRol, newUser.IdUsuario);
                var userPayload = new
                {
                    idUsuario = newUser.IdUsuario,
                    correo = newUser.Correo,
                    rol = role.NombreRol,
                    nombre = newUser.Nombre,
                    apellidos = newUser.Apellidos
                };

                _logger.LogInformation("Registro exitoso. IdUsuario={IdUsuario}, Correo={Correo}, Rol={Rol}, EsPaciente={EsPaciente}, IpCliente={IpCliente}",
                    newUser.IdUsuario, correoNormalizado, role.NombreRol,
                    roleName.Equals("Paciente", StringComparison.OrdinalIgnoreCase), ipCliente);

                return new AuthResponse
                {
                    Success = true,
                    Message = "Registro exitoso.",
                    Token = token,
                    User = userPayload
                };
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Registro cancelado por el cliente. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = "Operación cancelada." };
            }
            catch (RegexMatchTimeoutException)
            {
                _logger.LogWarning("Timeout validación regex contraseña en Registro. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en RegisterAsync. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
        }

        public async Task<AuthResponse> RecoverPasswordAsync(RecoverPasswordRequest request, CancellationToken ct = default)
        {
            string ipCliente = ObtenerIpCliente();
            string correoNormalizado = NormalizarCorreo(request?.Correo);

            try
            {
                _logger.LogInformation("Solicitud de recuperación de contraseña. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);

                if (string.IsNullOrWhiteSpace(correoNormalizado))
                {
                    _logger.LogWarning("Recuperar contraseña: correo vacío. IpCliente={IpCliente}", ipCliente);
                    return new AuthResponse { Success = false, Message = "El correo es obligatorio." };
                }

                if (!EsCorreoValido(correoNormalizado))
                {
                    return new AuthResponse { Success = false, Message = "Ingresa un correo electrónico válido." };
                }

                var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == correoNormalizado, ct);
                if (user == null)
                {
                    await RegistrarAuditoriaRecuperacionAsync(null, correoNormalizado, "solicitud", ipCliente, ct);
                    _logger.LogWarning("Recuperar contraseña: correo no registrado. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse { Success = true, Message = MensajeRecuperacionGenerico };
                }

                var limiteVentana = DateTime.UtcNow.AddMinutes(-VentanaRateLimitMinutos);
                var solicitudesRecientes = await _context.AuditoriasRecuperacion
                    .AsNoTracking()
                    .CountAsync(a =>
                        a.CorreoSolicitado == correoNormalizado &&
                        a.Accion == "solicitud" &&
                        a.Fecha >= limiteVentana,
                        ct);

                if (solicitudesRecientes >= MaxSolicitudesRecuperacionPorVentana)
                {
                    await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "rate_limit_excedido", ipCliente, ct);
                    _logger.LogWarning("Rate limit de recuperación excedido. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, ipCliente);
                    return new AuthResponse { Success = true, Message = MensajeRecuperacionGenerico };
                }

                var code = RandomNumberGenerator.GetInt32(0, 1000000).ToString("D6");
                var ahora = DateTime.UtcNow;
                var recoveryCode = new CodigoRecuperacion
                {
                    IdUsuario = user.IdUsuario,
                    CodigoHash = BCrypt.Net.BCrypt.HashPassword(code, workFactor: 11),
                    FechaCreacion = ahora,
                    FechaExpiracion = ahora.AddMinutes(VigenciaCodigoRecuperacionMinutos),
                    IntentosFallidos = 0,
                    Usado = false,
                    IpOrigen = ipCliente
                };

                _context.CodigosRecuperacion.Add(recoveryCode);

                try
                {
                    await _context.SaveChangesAsync(ct);
                }
                catch (DbUpdateConcurrencyException concEx)
                {
                    _logger.LogWarning(concEx, "Recuperar contraseña: concurrencia guardando código. IdUsuario={IdUsuario}, IpCliente={IpCliente}",
                        user.IdUsuario, ipCliente);
                    return new AuthResponse { Success = true, Message = MensajeRecuperacionGenerico };
                }
                catch (SqlException sqlEx)
                {
                    _logger.LogError(sqlEx, "Recuperar contraseña: SQL error guardando código. IdUsuario={IdUsuario}, NumeroError={NumError}, IpCliente={IpCliente}",
                        user.IdUsuario, sqlEx.Number, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                bool envioExitoso = true;
                string? motivoFalloEnvio = null;
                try
                {
                    await _emailService.SendRecoveryCodeAsync(user.Correo, code, ct);
                }
                catch (Exception mailEx)
                {
                    envioExitoso = false;
                    motivoFalloEnvio = mailEx.InnerException?.Message ?? mailEx.Message;

                    _logger.LogCritical(mailEx,
                        "Recuperar contraseña: FALLO ENVÍO DE CORREO. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente} " +
                        "Motivo={Motivo}. ATENCIÓN: Revisa inmediatamente la configuración SMTP en appsettings.Local.json " +
                        "(Password: debes poner la App Password de Gmail de 16 caracteres).",
                        user.IdUsuario, correoNormalizado, ipCliente, motivoFalloEnvio);

                    try
                    {
                        await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "envio_fallido", ipCliente, ct);
                    }
                    catch (Exception audEx)
                    {
                        _logger.LogWarning(audEx, "No se pudo registrar auditoria 'envio_fallido' (no crítico). IdUsuario={IdUsuario}", user.IdUsuario);
                    }
                }

                if (envioExitoso)
                {
                    _logger.LogInformation("Código de recuperación GENERADO y ENVIADO exitosamente. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, ipCliente);
                }
                else
                {
                    _logger.LogError(
                        "Código de recuperación GENERADO en BD pero el CORREO NO FUE ENVIADO. " +
                        "IdUsuario={IdUsuario}, Correo={Correo}, IdCodigoRecuperacion={IdCodigo}, MotivoFallo={Motivo}",
                        user.IdUsuario, correoNormalizado, recoveryCode.IdCodigo, motivoFalloEnvio ?? "desconocido");

                    return new AuthResponse
                    {
                        Success = false,
                        Message = "No fue posible enviar el correo de recuperación. Verifica la configuración SMTP e intenta nuevamente."
                    };
                }

                await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "solicitud", ipCliente, ct);

                return new AuthResponse { Success = true, Message = MensajeRecuperacionGenerico };
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Recuperar contraseña cancelado. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = "Operación cancelada." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en RecoverPasswordAsync. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
        }

        public async Task<AuthResponse> VerifyRecoveryCodeAsync(VerifyRecoveryCodeRequest request, CancellationToken ct = default)
        {
            string ipCliente = ObtenerIpCliente();
            string correoNormalizado = NormalizarCorreo(request?.Correo);

            try
            {
                if (string.IsNullOrWhiteSpace(correoNormalizado) || string.IsNullOrWhiteSpace(request?.Codigo))
                {
                    return new AuthResponse { Success = false, Message = "Todos los campos son obligatorios." };
                }

                if (!EsCorreoValido(correoNormalizado))
                {
                    return new AuthResponse { Success = false, Message = "Ingresa un correo electrónico válido." };
                }

                if (!Regex.IsMatch(request.Codigo.Trim(), @"^\d{6}$", RegexOptions.None, TimeSpan.FromMilliseconds(200)))
                {
                    return new AuthResponse { Success = false, Message = "Ingresa un código válido de 6 dígitos." };
                }

                var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == correoNormalizado, ct);
                if (user == null)
                {
                    await RegistrarAuditoriaRecuperacionAsync(null, correoNormalizado, "codigo_fallido", ipCliente, ct);
                    return new AuthResponse { Success = false, Message = MensajeCodigoInvalidoOExpirado };
                }

                var codigoRecuperacion = await _context.CodigosRecuperacion
                    .Where(c => c.IdUsuario == user.IdUsuario && !c.Usado)
                    .OrderByDescending(c => c.FechaCreacion)
                    .FirstOrDefaultAsync(ct);

                if (codigoRecuperacion == null)
                {
                    await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "codigo_fallido", ipCliente, ct);
                    return new AuthResponse { Success = false, Message = MensajeCodigoInvalidoOExpirado };
                }

                if (codigoRecuperacion.FechaExpiracion < DateTime.UtcNow)
                {
                    codigoRecuperacion.Usado = true;
                    _context.CodigosRecuperacion.Update(codigoRecuperacion);
                    await _context.SaveChangesAsync(ct);
                    await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "codigo_fallido", ipCliente, ct);
                    return new AuthResponse { Success = false, Message = MensajeCodigoInvalidoOExpirado };
                }

                var codigoValido = BCrypt.Net.BCrypt.Verify(request.Codigo.Trim(), codigoRecuperacion.CodigoHash);
                if (!codigoValido)
                {
                    codigoRecuperacion.IntentosFallidos += 1;

                    if (codigoRecuperacion.IntentosFallidos >= MaxIntentosCodigoRecuperacion)
                    {
                        codigoRecuperacion.Usado = true;
                    }

                    _context.CodigosRecuperacion.Update(codigoRecuperacion);
                    await _context.SaveChangesAsync(ct);
                    await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "codigo_fallido", ipCliente, ct);

                    if (codigoRecuperacion.IntentosFallidos >= MaxIntentosCodigoRecuperacion)
                    {
                        await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "bloqueo_por_intentos", ipCliente, ct);
                        return new AuthResponse
                        {
                            Success = false,
                            Message = "Demasiados intentos fallidos, solicita un nuevo código."
                        };
                    }

                    return new AuthResponse { Success = false, Message = MensajeCodigoInvalidoOExpirado };
                }

                await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, correoNormalizado, "codigo_verificado", ipCliente, ct);

                return new AuthResponse
                {
                    Success = true,
                    Message = "Código verificado correctamente.",
                    RecoveryToken = GenerarTokenRecuperacion(codigoRecuperacion)
                };
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Verificación de código cancelada. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = "Operación cancelada." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en VerifyRecoveryCodeAsync. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
        }

        public async Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
        {
            string ipCliente = ObtenerIpCliente();

            try
            {
                _logger.LogInformation("Solicitud de restablecimiento de contraseña recibida. IpCliente={IpCliente}", ipCliente);

                if (request is null ||
                    string.IsNullOrWhiteSpace(request.TokenTemporal) ||
                    string.IsNullOrWhiteSpace(request.NuevaContrasena) ||
                    string.IsNullOrWhiteSpace(request.ConfirmarContrasena))
                {
                    return new AuthResponse { Success = false, Message = "Todos los campos son obligatorios." };
                }

                if (!string.Equals(request.NuevaContrasena, request.ConfirmarContrasena, StringComparison.Ordinal))
                {
                    return new AuthResponse { Success = false, Message = "La nueva contraseña y la confirmación no coinciden." };
                }

                if (!RegexContrasenaRecuperacion.IsMatch(request.NuevaContrasena))
                {
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "La nueva contraseña debe tener al menos 8 caracteres e incluir una letra, un número y un símbolo."
                    };
                }

                var tokenRecuperacion = LeerTokenRecuperacion(request.TokenTemporal);
                if (tokenRecuperacion == null || tokenRecuperacion.ExpiraUnix < DateTimeOffset.UtcNow.ToUnixTimeSeconds())
                {
                    return new AuthResponse { Success = false, Message = MensajeTokenRecuperacionInvalido };
                }

                var codigoRecuperacion = await _context.CodigosRecuperacion
                    .FirstOrDefaultAsync(c =>
                        c.IdCodigo == tokenRecuperacion.IdCodigo &&
                        c.IdUsuario == tokenRecuperacion.IdUsuario,
                        ct);

                if (codigoRecuperacion == null || codigoRecuperacion.Usado || codigoRecuperacion.FechaExpiracion < DateTime.UtcNow)
                {
                    return new AuthResponse { Success = false, Message = MensajeTokenRecuperacionInvalido };
                }

                var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.IdUsuario == codigoRecuperacion.IdUsuario, ct);
                if (user == null)
                {
                    return new AuthResponse { Success = false, Message = MensajeTokenRecuperacionInvalido };
                }

                string nuevoHash;
                try
                {
                    nuevoHash = BCrypt.Net.BCrypt.HashPassword(request.NuevaContrasena, workFactor: 11);
                }
                catch (Exception bcEx)
                {
                    _logger.LogError(bcEx, "Error al generar hash BCrypt en reset. IdUsuario={IdUsuario}, IpCliente={IpCliente}",
                        user.IdUsuario, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                user.Contrasena = nuevoHash;
                user.CodigoRecuperacion = null;
                user.FechaExpiracionCodigo = null;
                user.IntentosFallidos = 0;
                codigoRecuperacion.Usado = true;

                _context.Usuarios.Update(user);
                _context.CodigosRecuperacion.Update(codigoRecuperacion);

                try
                {
                    await _context.SaveChangesAsync(ct);
                    await RegistrarAuditoriaRecuperacionAsync(user.IdUsuario, user.Correo, "password_restablecida", ipCliente, ct);
                }
                catch (DbUpdateConcurrencyException concEx)
                {
                    _logger.LogWarning(concEx, "Restablecer: concurrencia al guardar nueva contraseña. IdUsuario={IdUsuario}, IpCliente={IpCliente}",
                        user.IdUsuario, ipCliente);
                    return new AuthResponse { Success = false, Message = "Conflicto temporal, intente nuevamente." };
                }
                catch (SqlException sqlEx)
                {
                    _logger.LogCritical(sqlEx, "Restablecer: SQL error guardando contraseña. IdUsuario={IdUsuario}, NumError={NumError}, IpCliente={IpCliente}",
                        user.IdUsuario, sqlEx.Number, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                _logger.LogInformation("Contraseña restablecida exitosamente. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                    user.IdUsuario, user.Correo, ipCliente);

                return new AuthResponse
                {
                    Success = true,
                    Message = "La contraseña ha sido restablecida exitosamente."
                };
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Restablecer contraseña cancelado. IpCliente={IpCliente}", ipCliente);
                return new AuthResponse { Success = false, Message = "Operación cancelada." };
            }
            catch (RegexMatchTimeoutException)
            {
                _logger.LogWarning("Timeout validando la nueva contraseña en recuperación. IpCliente={IpCliente}", ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en ResetPasswordAsync. IpCliente={IpCliente}", ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
        }

        private sealed record RecoveryTokenPayload(int IdCodigo, int IdUsuario, long ExpiraUnix);

        private static string NormalizarCorreo(string? correo)
        {
            return correo?.Trim() ?? string.Empty;
        }

        private static bool EsCorreoValido(string correo)
        {
            return !string.IsNullOrWhiteSpace(correo) && ValidadorCorreo.IsValid(correo);
        }

        private async Task RegistrarAuditoriaRecuperacionAsync(int? idUsuario, string correoSolicitado, string accion, string ipCliente, CancellationToken ct)
        {
            var auditoria = new AuditoriaRecuperacion
            {
                IdUsuario = idUsuario,
                CorreoSolicitado = correoSolicitado,
                Accion = accion,
                IpOrigen = ipCliente,
                Fecha = DateTime.UtcNow
            };

            _context.AuditoriasRecuperacion.Add(auditoria);
            await _context.SaveChangesAsync(ct);
        }

        private string GenerarTokenRecuperacion(CodigoRecuperacion codigoRecuperacion)
        {
            var expiraUnix = new DateTimeOffset(codigoRecuperacion.FechaExpiracion).ToUnixTimeSeconds();
            var payload = $"{codigoRecuperacion.IdCodigo}|{codigoRecuperacion.IdUsuario}|{expiraUnix}|{Guid.NewGuid():N}";
            return _passwordRecoveryProtector.Protect(payload);
        }

        private RecoveryTokenPayload? LeerTokenRecuperacion(string tokenTemporal)
        {
            try
            {
                var payload = _passwordRecoveryProtector.Unprotect(tokenTemporal);
                var parts = payload.Split('|', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length != 4)
                {
                    return null;
                }

                if (!int.TryParse(parts[0], out var idCodigo) ||
                    !int.TryParse(parts[1], out var idUsuario) ||
                    !long.TryParse(parts[2], out var expiraUnix))
                {
                    return null;
                }

                return new RecoveryTokenPayload(idCodigo, idUsuario, expiraUnix);
            }
            catch
            {
                return null;
            }
        }

        public async Task<AuthResponse> ChangePasswordAsync(ChangePasswordRequest request, CancellationToken ct = default)
        {
            string ipCliente = ObtenerIpCliente();

            try
            {
                _logger.LogInformation("Solicitud de cambio de contraseña. IdUsuario={IdUsuario}, IpCliente={IpCliente}", request?.IdUsuario, ipCliente);

                if (request is null ||
                    request.IdUsuario <= 0 ||
                    string.IsNullOrWhiteSpace(request.ContrasenaActual) ||
                    string.IsNullOrWhiteSpace(request.NuevaContrasena) ||
                    string.IsNullOrWhiteSpace(request.ConfirmarContrasena))
                {
                    return new AuthResponse { Success = false, Message = "Todos los campos son obligatorios." };
                }

                if (!string.Equals(request.NuevaContrasena, request.ConfirmarContrasena, StringComparison.Ordinal))
                {
                    return new AuthResponse { Success = false, Message = "Las contraseñas no coinciden." };
                }

                if (request.NuevaContrasena.Length < 8)
                {
                    return new AuthResponse { Success = false, Message = "La nueva contraseña debe tener al menos 8 caracteres." };
                }

                var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.IdUsuario == request.IdUsuario, ct);
                if (user == null)
                {
                    return new AuthResponse { Success = false, Message = "Usuario no encontrado." };
                }

                if (!string.Equals(user.Estado, "activo", StringComparison.OrdinalIgnoreCase))
                {
                    return new AuthResponse { Success = false, Message = "La cuenta no está activa." };
                }

                var isCurrentPasswordValid = BCrypt.Net.BCrypt.Verify(request.ContrasenaActual, user.Contrasena);
                if (!isCurrentPasswordValid)
                {
                    _logger.LogWarning("Cambio de contraseña fallido: contraseña actual incorrecta. IdUsuario={IdUsuario}, IpCliente={IpCliente}",
                        user.IdUsuario, ipCliente);
                    return new AuthResponse { Success = false, Message = "La contraseña actual es incorrecta." };
                }

                if (BCrypt.Net.BCrypt.Verify(request.NuevaContrasena, user.Contrasena))
                {
                    return new AuthResponse { Success = false, Message = "La nueva contraseña no puede ser igual a la anterior." };
                }

                string nuevoHash;
                try
                {
                    nuevoHash = BCrypt.Net.BCrypt.HashPassword(request.NuevaContrasena, workFactor: 11);
                }
                catch (Exception bcEx)
                {
                    _logger.LogError(bcEx, "Error al generar hash BCrypt en cambio de contraseña. IdUsuario={IdUsuario}, IpCliente={IpCliente}",
                        user.IdUsuario, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                user.Contrasena = nuevoHash;
                user.IntentosFallidos = 0;
                user.CodigoRecuperacion = null;
                _context.Usuarios.Update(user);

                try
                {
                    await _context.SaveChangesAsync(ct);
                }
                catch (DbUpdateConcurrencyException concEx)
                {
                    _logger.LogWarning(concEx, "Cambio de contraseña: concurrencia. IdUsuario={IdUsuario}, IpCliente={IpCliente}", user.IdUsuario, ipCliente);
                    return new AuthResponse { Success = false, Message = "Conflicto temporal, intente nuevamente." };
                }
                catch (SqlException sqlEx)
                {
                    _logger.LogError(sqlEx, "Cambio de contraseña: SQL error. IdUsuario={IdUsuario}, NumError={NumError}, IpCliente={IpCliente}",
                        user.IdUsuario, sqlEx.Number, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                _logger.LogInformation("Cambio de contraseña exitoso. IdUsuario={IdUsuario}, IpCliente={IpCliente}", user.IdUsuario, ipCliente);
                return new AuthResponse { Success = true, Message = "Contraseña actualizada correctamente." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en ChangePasswordAsync. IdUsuario={IdUsuario}, IpCliente={IpCliente}", request?.IdUsuario, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
        }

        private static string HashRecoveryCode(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return string.Empty;
            }

            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(code.Trim()));
            return Convert.ToHexString(bytes);
        }

        private string ObtenerIpCliente()
        {
            try
            {
                var ctx = _httpContextAccessor.HttpContext;
                if (ctx == null) return "desconocido";

                if (ctx.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) &&
                    !string.IsNullOrWhiteSpace(xff))
                {
                    var primerIp = xff.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries)[0].Trim();
                    if (!string.IsNullOrWhiteSpace(primerIp)) return primerIp;
                }

                var remoteIp = ctx.Connection.RemoteIpAddress;
                if (remoteIp != null) return remoteIp.ToString();

                return "no-disponible";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo obtener la IP del cliente en AuthService.");
                return "error-obtencion-ip";
            }
        }

        private string GenerateJwtToken(string correo, string rol, int idUsuario = 0)
        {
            try
            {
                var jwtKey = _configuration["Jwt:Key"] ?? "TuClaveSecretaSuperSegura123!_CambiaEstoEnProduccion_SmileTrack2025";
                var jwtIssuer = _configuration["Jwt:Issuer"] ?? "SmileTrack";
                var jwtAudience = _configuration["Jwt:Audience"] ?? "SmileTrackClient";
                var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var minutes) && minutes > 0 ? minutes : 60;

                if (jwtKey.Length < 32)
                {
                    _logger.LogWarning("Jwt:Key tiene longitud insuficiente ({Longitud}). Usando clave de respaldo segura.", jwtKey.Length);
                    jwtKey = "TuClaveSecretaSuperSegura123!_CambiaEstoEnProduccion_SmileTrack2025";
                }

                var claims = new List<Claim>
                {
                    new(ClaimTypes.Name, correo),
                    new(ClaimTypes.Email, correo),
                    new(ClaimTypes.NameIdentifier, idUsuario > 0 ? idUsuario.ToString() : "0"),
                    new("role", rol),
                    new(JwtRegisteredClaimNames.Sub, correo),
                    new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
                };

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    issuer: jwtIssuer,
                    audience: jwtAudience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                    signingCredentials: creds);

                return new JwtSecurityTokenHandler().WriteToken(token);
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "Error generando JWT. Correo={Correo}, Rol={Rol}", correo, rol);
                throw new InvalidOperationException("No se pudo generar el token de autenticación.", ex);
            }
        }

        private static bool EsViolacionIndiceUnico(DbUpdateException ex, out string? nombreIndice)
        {
            nombreIndice = null;
            if (ex?.InnerException is not SqlException sqlEx) return false;
            if (sqlEx.Number is 2601 or 2627)
            {
                nombreIndice = sqlEx.Message;
                return true;
            }
            return false;
        }

        private static bool EsViolacionIntegridadReferencial(DbUpdateException ex)
        {
            if (ex?.InnerException is not SqlException sqlEx) return false;
            return sqlEx.Number is 547 or 515;
        }
    }
}
