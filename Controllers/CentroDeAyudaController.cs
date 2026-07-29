using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class CentroAyudaController : Controller
{
    // --- Sección para Recepcionistas ---

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("centro-de-ayuda/st-rec-01-preguntas-frecuentes")]
    public IActionResult Strec01PreguntasFrecuentes() => View("~/Views/Centro_Ayuda/st-rec-01-preguntas-frecuentes/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("centro-de-ayuda/st-rec-02-reportar-incidencia")]
    public IActionResult Strec02ReportarIncidencia() => View("~/Views/Centro_Ayuda/st-rec-02-reportar-incidencia/index.cshtml");

    // --- Sección para Administradores ---

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("centro-de-ayuda/st-adm-01-manuales-guias")]
    public IActionResult Stadm01ManualesGuias() => View("~/Views/Centro_Ayuda/st-adm-01-manuales-guias/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("centro-de-ayuda/st-adm-02-gestion-tickets")]
    public IActionResult Stadm02GestionTickets() => View("~/Views/Centro_Ayuda/st-adm-02-gestion-tickets/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("centro-de-ayuda/st-adm-03-video-tutoriales")]
    public IActionResult Stadm03VideoTutoriales() => View("~/Views/Centro_Ayuda/st-adm-03-video-tutoriales/index.cshtml");
}