using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class PerfilesController : Controller
{
    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("perfiles/st-aux-11-perfil-auxiliar")]
    public IActionResult Staux11PerfilAuxiliar() => View("~/Views/Perfiles/st-aux-11-perfil-auxiliar/mi-perfil.cshtml");

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("perfiles/st-pac-perfil-paciente")]
    // Archivo renombrado de "perfil paciente.cshtml" a "perfil-paciente.cshtml" para eliminar espacio en nombre de archivo
    public IActionResult StpacPerfilPaciente() => View("~/Views/Perfiles/st-pac-perfil-Paciente/perfil-paciente.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("perfiles/st-rec-06-perfil-recepcionista")]
    public IActionResult Strec06PerfilRecepcionista() => View("~/Views/Perfiles/st-rec-06-perfil-recepcionista/perfilrecepcionista.cshtml");
}
