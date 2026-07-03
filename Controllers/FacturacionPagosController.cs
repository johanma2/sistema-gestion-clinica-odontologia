using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class FacturacionPagosController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("facturacion-y-pagos/st-adm-12-facturacion")]
    public IActionResult Stadm12Facturacion() => View("~/Views/Facturacion_Y_Pagos/st-adm-12-facturacion/gestionfacturacion.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("facturacion-y-pagos/st-adm-13-reportes-financieros")]
    public IActionResult Stadm13ReportesFinancieros() => View("~/Views/Facturacion_Y_Pagos/st-adm-13-reportes-financieros/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("facturacion-y-pagos/st-rec-04-generar-factura")]
    public IActionResult Strec04GenerarFactura() => View("~/Views/Facturacion_Y_Pagos/st-rec-04-generar-factura/index.cshtml");
}
