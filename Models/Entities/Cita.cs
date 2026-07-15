using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmileTrack_MVC.Models.Entities
{
    [Table("Cita")]
    public class Cita
    {
        [Key]
        [Column("id_cita")]
        public int IdCita { get; set; }

        [Required]
        [Column("id_paciente")]
        public int IdPaciente { get; set; }

        [Column("id_profesional")]
        public int? IdProfesional { get; set; }

        [Column("id_servicio")]
        public int? IdServicio { get; set; }

        [Required]
        [Column("fecha_hora")]
        public DateTime FechaHora { get; set; }

        [Required]
        [Column("estado")]
        [StringLength(30)]
        public string Estado { get; set; } = "programada";

        [Column("notas")]
        public string? Notas { get; set; }

        [ForeignKey("IdPaciente")]
        public Paciente? Paciente { get; set; }

        [ForeignKey("IdProfesional")]
        public Profesional? Profesional { get; set; }

        [ForeignKey("IdServicio")]
        public Servicio? Servicio { get; set; }
    }
}
