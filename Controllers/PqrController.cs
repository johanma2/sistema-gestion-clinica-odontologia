using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class PqrController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Paciente,Administrador,Profesional,Recepcionista,Auxiliar")]
    [Route("gestion-de-pqr/st-pac-04-nueva-pqr")]
    public IActionResult Stpac04NuevaPqr() => View("~/Views/Gestion_De_PQR/st-pac-04-nueva-pqr/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-pqr/st-adm-17-gestion-pqr")]
    public IActionResult Stadm17GestionPqr() => View("~/Views/Gestion_De_PQR/st-adm-17-gestion-pqr/index.cshtml");
}
