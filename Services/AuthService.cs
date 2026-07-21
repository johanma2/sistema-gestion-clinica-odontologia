using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace SmileTrack_MVC.Services
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;

        public AuthService(IConfiguration configuration, AppDbContext context)
        {
            _configuration = configuration;
            _context = context;
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Correo) || string.IsNullOrWhiteSpace(request.Contrasena) || string.IsNullOrWhiteSpace(request.Rol))
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Correo, contraseña y rol son obligatorios."
                };
            }

            var user = await _context.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.Correo == request.Correo && u.Rol.NombreRol == request.Rol);

            if (user == null || user.Estado != "activo")
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Usuario no encontrado o inactivo."
                };
            }

            // Validar contraseña
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Contrasena, user.Contrasena);
            if (!isPasswordValid)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Contraseña incorrecta."
                };
            }

            // Actualizar último login
            user.UltimoLogin = DateTime.UtcNow;
            _context.Usuarios.Update(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user.Correo, user.Rol.NombreRol);
            var userPayload = new
            {
                correo = user.Correo,
                rol = user.Rol.NombreRol,
                nombre = user.Nombre
            };

            return new AuthResponse
            {
                Success = true,
                Message = "Inicio de sesión exitoso.",
                Token = token,
                User = userPayload
            };
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Correo) || string.IsNullOrWhiteSpace(request.Contrasena) || string.IsNullOrWhiteSpace(request.Nombre))
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Todos los campos son obligatorios."
                };
            }

            if (string.IsNullOrWhiteSpace(request.TipoDocumento) || string.IsNullOrWhiteSpace(request.NumeroDocumento))
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "El documento es obligatorio para completar el registro."
                };
            }

            var existingUser = await _context.Usuarios.AnyAsync(u => u.Correo == request.Correo);
            if (existingUser)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "El correo ya está registrado."
                };
            }

            var roleName = string.IsNullOrWhiteSpace(request.Rol) ? "Paciente" : request.Rol;
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.NombreRol == roleName);
            if (role == null)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = $"El rol '{roleName}' no existe."
                };
            }

            var names = request.Nombre.Split(' ', 2);
            var firstName = names[0];
            var lastName = names.Length > 1 ? names[1] : string.Empty;

            var newUser = new Usuario
            {
                Nombre = firstName,
                Apellidos = string.IsNullOrWhiteSpace(lastName) ? "SmileTrack" : lastName,
                Correo = request.Correo,
                Contrasena = BCrypt.Net.BCrypt.HashPassword(request.Contrasena),
                IdRol = role.IdRol,
                Estado = "activo",
                FechaCreacion = DateTime.UtcNow
            };

            _context.Usuarios.Add(newUser);
            await _context.SaveChangesAsync();

            // Si es un paciente, registrar también en la tabla Paciente
            if (roleName.Equals("Paciente", StringComparison.OrdinalIgnoreCase))
            {
                var newPaciente = new Paciente
                {
                    IdUsuario = newUser.IdUsuario,
                    TipoDocumento = string.IsNullOrWhiteSpace(request.TipoDocumento) ? "CC" : request.TipoDocumento,
                    Documento = string.IsNullOrWhiteSpace(request.NumeroDocumento) ? "CC" + new Random().Next(10000000, 99999999).ToString() : request.NumeroDocumento,
                    Nombres = firstName,
                    Apellidos = string.IsNullOrWhiteSpace(lastName) ? "Paciente" : lastName,
                    FechaNacimiento = DateTime.UtcNow.AddYears(-20).Date,
                    Correo = request.Correo,
                    Telefono = request.Telefono,
                    Estado = "activo",
                    FechaRegistro = DateTime.UtcNow.Date
                };
                _context.Pacientes.Add(newPaciente);
                await _context.SaveChangesAsync();
            }

            var token = GenerateJwtToken(newUser.Correo, role.NombreRol);
            var userPayload = new
            {
                correo = newUser.Correo,
                rol = role.NombreRol,
                nombre = newUser.Nombre
            };

            return new AuthResponse
            {
                Success = true,
                Message = "Registro exitoso.",
                Token = token,
                User = userPayload
            };
        }

        public async Task<AuthResponse> RecoverPasswordAsync(RecoverPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Correo))
            {
                return new AuthResponse { Success = false, Message = "El correo es obligatorio." };
            }

            var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == request.Correo);
            if (user == null)
            {
                return new AuthResponse { Success = false, Message = "El correo no está registrado en el sistema." };
            }

            var code = new Random().Next(100000, 999999).ToString();
            user.CodigoRecuperacion = code;
            user.FechaExpiracionCodigo = DateTime.UtcNow.AddMinutes(15);

            _context.Usuarios.Update(user);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                Success = true,
                Message = $"Código de verificación generado y enviado. (Código para pruebas: {code})"
            };
        }

        public async Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Correo) || string.IsNullOrWhiteSpace(request.Codigo) || string.IsNullOrWhiteSpace(request.NuevaContrasena))
            {
                return new AuthResponse { Success = false, Message = "Todos los campos son obligatorios." };
            }

            var user = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == request.Correo);
            if (user == null)
            {
                return new AuthResponse { Success = false, Message = "Usuario no encontrado." };
            }

            if (user.CodigoRecuperacion != request.Codigo)
            {
                return new AuthResponse { Success = false, Message = "El código de verificación es inválido." };
            }

            if (!user.FechaExpiracionCodigo.HasValue || user.FechaExpiracionCodigo.Value < DateTime.UtcNow)
            {
                return new AuthResponse { Success = false, Message = "El código ha expirado." };
            }

            user.Contrasena = BCrypt.Net.BCrypt.HashPassword(request.NuevaContrasena);
            user.CodigoRecuperacion = null;
            user.FechaExpiracionCodigo = null;

            _context.Usuarios.Update(user);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                Success = true,
                Message = "La contraseña ha sido restablecida exitosamente."
            };
        }

        private string GenerateJwtToken(string correo, string rol)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? "TuClaveSecretaSuperSegura123!_CambiaEstoEnProduccion";
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "SmileTrack";
            var jwtAudience = _configuration["Jwt:Audience"] ?? "SmileTrackClient";
            var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var minutes) ? minutes : 60;

            var claims = new List<Claim>
            {
                new(ClaimTypes.Name, correo),
                new(ClaimTypes.Email, correo),
                new("role", rol),
                new(JwtRegisteredClaimNames.Sub, correo),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
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
    }
}
