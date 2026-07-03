using System.ComponentModel.DataAnnotations;

namespace SmileTrack_MVC.Models.Entities;

public class Paciente
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string Nombre { get; set; }

    [StringLength(50)]
    public string Documento { get; set; }

    [StringLength(150)]
    public string? Correo { get; set; }

    [StringLength(20)]
    public string? Telefono { get; set; }

    public DateTime? FechaNacimiento { get; set; }
}
