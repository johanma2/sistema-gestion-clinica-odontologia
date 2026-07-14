namespace SmileTrack_MVC.Models;

public class Usuario
{
    public int IdUsuario { get; set; }
    public int? CreadoPor { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellidos { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string Contrasena { get; set; } = string.Empty; // hash BCrypt
    public int IdRol { get; set; }
    public Rol? Rol { get; set; }
    public string Estado { get; set; } = "activo";
    public DateTime? FechaNacimiento { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
    public DateTime? UltimoLogin { get; set; }
}