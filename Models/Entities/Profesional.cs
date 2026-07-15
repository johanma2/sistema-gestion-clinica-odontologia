using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmileTrack_MVC.Models.Entities
{
    [Table("Profesional")]
    public class Profesional
    {
        [Key]
        [Column("id_profesional")]
        public int IdProfesional { get; set; }

        [Column("id_usuario")]
        public int? IdUsuario { get; set; }

        [Column("especialidad")]
        [StringLength(100)]
        public string? Especialidad { get; set; }

        [Column("correo")]
        [StringLength(150)]
        public string? Correo { get; set; }

        [Column("telefono")]
        [StringLength(20)]
        public string? Telefono { get; set; }

        [Required]
        [Column("estado")]
        [StringLength(10)]
        public string Estado { get; set; } = "activo";

        [ForeignKey("IdUsuario")]
        public Usuario? Usuario { get; set; }

        [NotMapped]
        public string NombreProfesional => Usuario != null ? $"{Usuario.Nombre} {Usuario.Apellidos}".Trim() : (Especialidad ?? "Profesional");
    }
}
