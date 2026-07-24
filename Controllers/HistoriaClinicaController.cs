using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class HistoriaClinicaController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("historia-clinica/st-adm-historial")]
    public IActionResult StadmHistorial() => View("~/Views/Historia_Clinica/st-adm-historial/historial-adm.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("historia-clinica/st-aux-07-control-postoperato")]
    public IActionResult Staux07ControlPostoperato() => View("~/Views/Historia_Clinica/st-aux-07-control-postoperato/control-post.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("historia-clinica/st-aux-08-documentos-clinicos")]
    public IActionResult Staux08DocumentosClinicos() => View("~/Views/Historia_Clinica/st-aux-08-documentos-clinicos/documentos-cli.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-03-historial")]
    public IActionResult Stodo03Historial() => View("~/Views/Historia_Clinica/st-odo-03-historial/gestion-historial.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-04-odontograma")]
    public IActionResult Stodo04Odontograma() => View("~/Views/Historia_Clinica/st-odo-04-odontograma/odontograma-digital.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-06-pacientes")]
    public IActionResult Stodo06Pacientes() => View("~/Views/Historia_Clinica/st-odo-06-pacientes/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-07-seguimiento-tratamiento")]
    public IActionResult Stodo07SeguimientoTratamiento() => View("~/Views/Historia_Clinica/st-odo-07-seguimiento-tratamiento/tratamientos.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("historia-clinica/st-rec-historial")]
    public IActionResult StrecHistorial() => View("~/Views/Historia_Clinica/st-rec-historial/historial-rec.cshtml");

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("historia-clinica/st-pac-02-historial")]
    public IActionResult Stpac02Historial() => View("~/Views/Historia_Clinica/st-pac-02-historial/index.cshtml");
}
