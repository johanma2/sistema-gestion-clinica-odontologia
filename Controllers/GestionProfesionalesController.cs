using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class GestionProfesionalesController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-profesionales/st-adm-07-gestion-profesionales")]
    public IActionResult Stadm07GestionProfesionales() => View("~/Views/Gestion_De_Profesionales/st-adm-07-gestion-profesionales/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador,Profesional")]
    [Route("gestion-de-profesionales/st-adm-14-reportes-clinicos")]
    public IActionResult Stadm14ReportesClinicos() => View("~/Views/Gestion_De_Profesionales/st-adm-14-reportes-clinicos/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-profesionales/st-odo-01-dashboard")]
    public IActionResult Stodo01Dashboard() => View("~/Views/Gestion_De_Profesionales/st-odo-01-dashboard/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-profesionales/st-odo-08-mis-reportes")]
    public IActionResult Stodo08MisReportes() => View("~/Views/Gestion_De_Profesionales/st-odo-08-mis-reportes/mis-reportes.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-profesionales/st-odo-09-perfil-profesional")]
    public IActionResult Stodo09PerfilProfesional() => View("~/Views/Gestion_De_Profesionales/st-odo-09-perfil-profesional/index.cshtml");
}
