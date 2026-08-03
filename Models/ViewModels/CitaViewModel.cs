using System.ComponentModel.DataAnnotations;

namespace SmileTrack_MVC.Models.ViewModels
{
    public class CitaViewModel
    {
        public int? IdCita { get; set; }

        [Required(ErrorMessage = "El paciente es obligatorio")]
        [Range(1, int.MaxValue, ErrorMessage = "Seleccione un paciente válido")]
        public int IdPaciente { get; set; }

        [Required(ErrorMessage = "El profesional es obligatorio")]
        [Range(1, int.MaxValue, ErrorMessage = "Seleccione un profesional válido")]
        public int? IdProfesional { get; set; }

        [Required(ErrorMessage = "El consultorio es obligatorio")]
        [Range(1, int.MaxValue, ErrorMessage = "Seleccione un consultorio válido")]
        public int? IdConsultorio { get; set; }

        [Required(ErrorMessage = "El servicio es obligatorio")]
        public int IdServicio { get; set; }

        [Required(ErrorMessage = "La fecha y hora son obligatorias")]
        [DataType(DataType.DateTime, ErrorMessage = "Formato de fecha y hora inválido")]
        public DateTime FechaHora { get; set; }

        public string? Estado { get; set; } = "programada";

        [StringLength(500, ErrorMessage = "Las notas no pueden superar los 500 caracteres")]
        public string? Notas { get; set; }

        public string? ReturnUrl { get; set; }
    }
}
