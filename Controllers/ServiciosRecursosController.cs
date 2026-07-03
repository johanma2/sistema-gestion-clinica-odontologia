using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class ServiciosRecursosController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("servicios-y-recursos/st-adm-10-servicios")]
    public IActionResult Stadm10Servicios() => View("~/Views/Servicios_Y_Recursos/st-adm-10-servicios/catalogoservicios.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("servicios-y-recursos/st-adm-16-configuracion-general")]
    public IActionResult Stadm16ConfiguracionGeneral() => View("~/Views/Servicios_Y_Recursos/st-adm-16-configuracion-general/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("servicios-y-recursos/st-odo-05-servicios")]
    public IActionResult Stodo05Servicios() => View("~/Views/Servicios_Y_Recursos/st-odo-05-servicios/index.cshtml");
}
