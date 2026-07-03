using Microsoft.AspNetCore.Mvc;

namespace SmileTrack_MVC.Controllers;

public class ViewProxyController : Controller
{
    [HttpGet("/ViewProxy/Render/{**path}")]
    public IActionResult Render(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !path.EndsWith(".cshtml", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound();
        }

        var normalizedPath = path
            .Replace('\\', '/')
            .Trim('/')
            .Replace("//", "/");

        if (normalizedPath.Contains("..", StringComparison.Ordinal))
        {
            return NotFound();
        }

        var viewPath = normalizedPath.StartsWith("Views/", StringComparison.OrdinalIgnoreCase)
            ? $"~/{normalizedPath}"
            : $"~/Views/{normalizedPath}";

        return View(viewPath);
    }
}
