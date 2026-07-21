using System.ComponentModel.DataAnnotations;

namespace SmileTrack_MVC.Models.ViewModels
{
    public class CitaViewModel
    {
        public int? IdCita { get; set; }

        [Required(ErrorMessage = "El paciente es obligatorio")]
        public int IdPaciente { get; set; }

        public int? IdProfesional { get; set; }

        [Required(ErrorMessage = "El servicio es obligatorio")]
        public int IdServicio { get; set; }

        [Required(ErrorMessage = "La fecha y hora son obligatorias")]
        public DateTime FechaHora { get; set; }

        public string? Estado { get; set; } = "programada";

        public string? Notas { get; set; }

        public string? ReturnUrl { get; set; }
    }
}
