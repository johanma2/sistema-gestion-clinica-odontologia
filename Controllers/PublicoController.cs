using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class PublicoController : Controller
{
    [Route("/")]
    [Route("homepage")]
    public IActionResult Homepage() => View("~/Views/Publico/homepage.cshtml");

    [Route("shared")]
    public IActionResult Shared() => View("~/Views/Shared/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("dev/generar-hash")]
    public IActionResult GenerarHash(string pwd = "Admin123!")
    {
        var hash = BCrypt.Net.BCrypt.HashPassword(pwd);
        return Content($"Contraseña: {pwd}\nHash: {hash}");
    }
}
