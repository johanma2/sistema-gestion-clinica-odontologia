using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class GestionCitasController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-citas/st-adm-01-dashboard")]
    public IActionResult Stadm01Dashboard() => View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-citas/st-adm-08-agenda")]
    public IActionResult Stadm08Agenda() => View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-citas/st-adm-09-citas")]
    public IActionResult Stadm09Citas() => View("~/Views/Gestion_De_Citas/st-adm-09-citas/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-01-panel-operativo/panel-operativo")]
    public IActionResult Staux01PanelOperativo() => View("~/Views/Gestion_De_Citas/st-aux-01-panel-operativo/panel-operativo.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-02-agenda-apoyo")]
    public IActionResult Staux02AgendaApoyo() => View("~/Views/Gestion_De_Citas/st-aux-02-agenda-apoyo/agenda-apoyo.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-05-historial-parcial")]
    public IActionResult Staux05HistorialParcial() => View("~/Views/Gestion_De_Citas/st-aux-05-historial-parcial/historial-parcial.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-06-asistencia-procedi")]
    public IActionResult Staux06AsistenciaProcedi() => View("~/Views/Gestion_De_Citas/st-aux-06-asistencia-procedi/asistencia-proc.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-09-estado-consultorio")]
    public IActionResult Staux09EstadoConsultorio() => View("~/Views/Gestion_De_Citas/st-aux-09-estado-consultorio/estado-consultorio.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar,Recepcionista")]
    [Route("gestion-de-citas/st-aux-10-citas-finalizadas")]
    public IActionResult Staux10CitasFinalizadas() => View("~/Views/Gestion_De_Citas/st-aux-10-citas-finalizadas/citas-finalizadas.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-citas/st-odo-02-agenda")]
    public IActionResult Stodo02Agenda() => View("~/Views/Gestion_De_Citas/st-odo-02-agenda/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("gestion-de-citas/st-pac-01-mis-citas")]
    public IActionResult Stpac01MisCitas() => View("~/Views/Gestion_De_Citas/st-pac-01-mis-citas/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("gestion-de-citas/st-pac-03-notificaciones")]
    public IActionResult Stpac03Notificaciones() => View("~/Views/Gestion_De_Citas/st-pac-03-notificaciones/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-01-dashboard")]
    public IActionResult Strec01Dashboard() => View("~/Views/Gestion_De_Citas/st-rec-01-dashboard/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-03-gestion-citas")]
    public IActionResult Strec03GestionCitas() => View("~/Views/Gestion_De_Citas/st-rec-03-gestion-citas/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-05-recordatorios")]
    public IActionResult Strec05Recordatorios() => View("~/Views/Gestion_De_Citas/st-rec-05-recordatorios/index.cshtml");
}
