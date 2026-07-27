using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace SmileTrack_MVC.Services
{
    public class AuthService : IAuthService
    {
        private const string MensajeErrorSeguridad = "No fue posible completar la operación. Por favor intente nuevamente en unos momentos.";
        private const string MensajeCredencialesInvalidas = "Correo, contraseña o rol incorrectos. Verifique sus credenciales.";
        private const string MensajeUsuarioNoDisponible = "El acceso no está disponible en este momento. Intente nuevamente más tarde.";

        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly ILogger<AuthService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuthService(
            IConfiguration configuration,
            AppDbContext context,
            ILogger<AuthService> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
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
                    string.IsNullOrWhiteSpace(request.Contrasena) ||
                    string.IsNullOrWhiteSpace(request.Rol))
                {
                    _logger.LogWarning("Login fallido: campos obligatorios vacíos. IpCliente={IpCliente}", ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "Correo, contraseña y rol son obligatorios."
                    };
                }

                Usuario? user;
                try
                {
                    user = await _context.Usuarios
                        .Include(u => u.Rol)
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.Correo == request.Correo && u.Rol.NombreRol == request.Rol, ct);
                }
                catch (SqlException sqlEx)
                {
                    _logger.LogCritical(sqlEx, "Fallo SQL al consultar usuario en Login. Correo={Correo}, Rol={Rol}, IpCliente={IpCliente}, NumeroError={NumError}",
                        correoNormalizado, rolSolicitado, ipCliente, sqlEx.Number);
                    return new AuthResponse { Success = false, Message = MensajeUsuarioNoDisponible };
                }

                if (user == null)
                {
                    _logger.LogWarning("Login fallido: usuario+rol no encontrado. Correo={Correo}, Rol={Rol}, IpCliente={IpCliente}",
                        correoNormalizado, rolSolicitado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = MensajeCredencialesInvalidas
                    };
                }

                if (!string.Equals(user.Estado, "activo", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Login fallido: usuario inactivo. IdUsuario={IdUsuario}, Correo={Correo}, Estado={Estado}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, user.Estado, ipCliente);
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
                    _logger.LogWarning("Login fallido: contraseña incorrecta. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, ipCliente);
                    return new AuthResponse
                    {
                        Success = false,
                        Message = MensajeCredencialesInvalidas
                    };
                }

                var usuarioActualizar = await _context.Usuarios.FindAsync(new object[] { user.IdUsuario }, ct);
                if (usuarioActualizar != null)
                {
                    usuarioActualizar.UltimoLogin = DateTime.UtcNow;
                    _context.Usuarios.Update(usuarioActualizar);
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
            string correoNormalizado = request?.Correo?.Trim() ?? string.Empty;

            try
            {
                _logger.LogInformation("Solicitud de recuperación de contraseña. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);

                if (string.IsNullOrWhiteSpace(request?.Correo))
                {
                    _logger.LogWarning("Recuperar contraseña: correo vacío. IpCliente={IpCliente}", ipCliente);
                    return new AuthResponse { Success = false, Message = "El correo es obligatorio." };
                }

                var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == request.Correo, ct);
                if (user == null)
                {
                    _logger.LogWarning("Recuperar contraseña: correo no registrado. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse
                    {
                        Success = true,
                        Message = "Si el correo se encuentra registrado, recibirá un código de verificación en breve."
                    };
                }

                var code = new Random().Next(100000, 999999).ToString();
                user.CodigoRecuperacion = code;
                user.FechaExpiracionCodigo = DateTime.UtcNow.AddMinutes(15);

                _context.Usuarios.Update(user);

                try
                {
                    await _context.SaveChangesAsync(ct);
                }
                catch (DbUpdateConcurrencyException concEx)
                {
                    _logger.LogWarning(concEx, "Recuperar contraseña: concurrencia actualizando código. IdUsuario={IdUsuario}, IpCliente={IpCliente}",
                        user.IdUsuario, ipCliente);
                    return new AuthResponse
                    {
                        Success = true,
                        Message = "Si el correo se encuentra registrado, recibirá un código de verificación en breve."
                    };
                }
                catch (SqlException sqlEx)
                {
                    _logger.LogError(sqlEx, "Recuperar contraseña: SQL error guardando código. IdUsuario={IdUsuario}, NumeroError={NumError}, IpCliente={IpCliente}",
                        user.IdUsuario, sqlEx.Number, ipCliente);
                    return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
                }

                _logger.LogInformation("Código de recuperación generado correctamente. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                    user.IdUsuario, correoNormalizado, ipCliente);

                return new AuthResponse
                {
                    Success = true,
                    Message = $"Si el correo se encuentra registrado, recibirá un código de verificación. (Código pruebas: {code})"
                };
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

        public async Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
        {
            string ipCliente = ObtenerIpCliente();
            string correoNormalizado = request?.Correo?.Trim() ?? string.Empty;

            try
            {
                _logger.LogInformation("Solicitud de restablecimiento de contraseña. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);

                if (string.IsNullOrWhiteSpace(request?.Correo) ||
                    string.IsNullOrWhiteSpace(request.Codigo) ||
                    string.IsNullOrWhiteSpace(request.NuevaContrasena))
                {
                    _logger.LogWarning("Restablecer contraseña: campos obligatorios vacíos. IpCliente={IpCliente}", ipCliente);
                    return new AuthResponse { Success = false, Message = "Todos los campos son obligatorios." };
                }

                if (request.NuevaContrasena.Length < 8)
                {
                    _logger.LogWarning("Restablecer contraseña: longitud mínima. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = "La nueva contraseña debe tener al menos 8 caracteres." };
                }

                var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == request.Correo, ct);
                if (user == null)
                {
                    _logger.LogWarning("Restablecer: usuario no encontrado. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = "Solicitud inválida." };
                }

                if (!string.Equals(user.CodigoRecuperacion, request.Codigo, StringComparison.Ordinal))
                {
                    _logger.LogWarning("Restablecer: código inválido. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = "El código de verificación es inválido." };
                }

                if (!user.FechaExpiracionCodigo.HasValue || user.FechaExpiracionCodigo.Value < DateTime.UtcNow)
                {
                    _logger.LogWarning("Restablecer: código expirado. IdUsuario={IdUsuario}, Correo={Correo}, IpCliente={IpCliente}",
                        user.IdUsuario, correoNormalizado, ipCliente);
                    return new AuthResponse { Success = false, Message = "El código ha expirado, solicite uno nuevo." };
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

                _context.Usuarios.Update(user);

                try
                {
                    await _context.SaveChangesAsync(ct);
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
                    user.IdUsuario, correoNormalizado, ipCliente);

                return new AuthResponse
                {
                    Success = true,
                    Message = "La contraseña ha sido restablecida exitosamente."
                };
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Restablecer contraseña cancelado. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = "Operación cancelada." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en ResetPasswordAsync. Correo={Correo}, IpCliente={IpCliente}", correoNormalizado, ipCliente);
                return new AuthResponse { Success = false, Message = MensajeErrorSeguridad };
            }
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
