using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class GestionPacientesController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista,Profesional")]
    [Route("gestion-de-pacientes/st-adm-05-gestion-pacientes")]
    public IActionResult Stadm05GestionPacientes()
    {
        var pacientes = new List<SmileTrack_MVC.Models.ViewModels.PacienteViewModel>
        {
            new() { Id = 1, Initials = "PG", Name = "Pedro Garcia", Doc = "CC 1045678901", LastVisit = new DateTime(2026, 03, 20), Diagnosis = "Caries pieza 12", NextVisit = new DateTime(2025, 05, 01), Allergies = new List<string> { "Penicilina" }, Color = "blue", History = new List<SmileTrack_MVC.Models.ViewModels.PacienteHistorialViewModel> { new() { Date = new DateTime(2026, 03, 20), Procedure = "Resina clase II", Doctor = "Dr. Méndez" }, new() { Date = new DateTime(2026, 01, 15), Procedure = "Limpieza", Doctor = "Dra. López" } } },
            new() { Id = 2, Initials = "ML", Name = "Maria López", Doc = "CC 1023456789", LastVisit = new DateTime(2026, 03, 17), Diagnosis = "Limpieza dental", NextVisit = new DateTime(2026, 06, 20), Allergies = new List<string>(), Color = "green", History = new List<SmileTrack_MVC.Models.ViewModels.PacienteHistorialViewModel> { new() { Date = new DateTime(2026, 03, 17), Procedure = "Profilaxis", Doctor = "Dr. Méndez" } } },
            new() { Id = 3, Initials = "CR", Name = "Carlos Ruiz", Doc = "CC 1034567890", LastVisit = new DateTime(2026, 03, 17), Diagnosis = "Control ortodoncia", NextVisit = new DateTime(2026, 03, 24), Allergies = new List<string>(), Color = "yellow", History = new List<SmileTrack_MVC.Models.ViewModels.PacienteHistorialViewModel>() },
            new() { Id = 4, Initials = "AM", Name = "Ana Martínez", Doc = "CC 1056789012", LastVisit = new DateTime(2026, 03, 16), Diagnosis = "Endodoncia pieza 23", NextVisit = new DateTime(2025, 05, 10), Allergies = new List<string>(), Color = "purple", History = new List<SmileTrack_MVC.Models.ViewModels.PacienteHistorialViewModel>() },
            new() { Id = 5, Initials = "LH", Name = "Luis Herrera", Doc = "CC 1067890123", LastVisit = null, Diagnosis = "", NextVisit = null, Allergies = new List<string>(), Color = "slate", History = new List<SmileTrack_MVC.Models.ViewModels.PacienteHistorialViewModel>() }
        };

        return View("~/Views/Gestion_De_Pacientes/st-adm-05-gestion-pacientes/index.cshtml", pacientes);
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-pacientes/st-aux-03-preparacion-consulta")]
    public IActionResult Staux03PreparacionConsulta() => View("~/Views/Gestion_De_Pacientes/st-aux-03-preparacion-consulta/preparacion.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-pacientes/st-rec-02-registrar-paciente")]
    public IActionResult Strec02RegistrarPaciente() => View("~/Views/Gestion_De_Pacientes/st-rec-02-registrar-paciente/nuevo_paciente.cshtml");
}
