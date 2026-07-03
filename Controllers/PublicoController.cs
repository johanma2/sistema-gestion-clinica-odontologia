using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class PublicoController : Controller
{
    [Route("/")]
    [Route("homepage")]
    public IActionResult Homepage() => View("~/Views/Publico/homepage.cshtml");

    [Route("shared")]
    public IActionResult Shared() => View("~/Views/shared/index.cshtml");
}
