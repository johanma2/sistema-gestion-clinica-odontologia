using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class CentroAyudaController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("centro-de-ayuda/st-rec-01-preguntas-frecuentes")]
    public IActionResult Strec01PreguntasFrecuentes() => Redirect("/centro-de-ayuda/guias-tutoriales");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("centro-de-ayuda/st-rec-02-reportar-incidencia")]
    public IActionResult Strec02ReportarIncidencia() => Redirect("/centro-de-ayuda/guias-tutoriales");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("centro-de-ayuda/st-adm-01-manuales-guias")]
    public IActionResult Stadm01ManualesGuias() => Redirect("/centro-de-ayuda/guias-tutoriales");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("centro-de-ayuda/st-adm-02-gestion-tickets")]
    public IActionResult Stadm02GestionTickets() => Redirect("/centro-de-ayuda/guias-tutoriales");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("centro-de-ayuda/st-adm-03-video-tutoriales")]
    public IActionResult Stadm03VideoTutoriales() => Redirect("/centro-de-ayuda/guias-tutoriales");
}
