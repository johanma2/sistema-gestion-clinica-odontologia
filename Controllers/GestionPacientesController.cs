using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.ViewModels;

namespace SmileTrack_MVC.Controllers;

public class GestionPacientesController : Controller
{
    private readonly AppDbContext _context;

    public GestionPacientesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista,Profesional")]
    [Route("gestion-de-pacientes/st-adm-05-gestion-pacientes")]
    public async Task<IActionResult> Stadm05GestionPacientes()
    {
        string[] colores = new[] { "blue", "green", "yellow", "purple", "slate" };
        var ahora = DateTime.Now;

        var pacientesDb = await _context.Pacientes
            .Where(p => p.Estado == "activo")
            .OrderBy(p => p.Apellidos).ThenBy(p => p.Nombres)
            .ToListAsync();

        var idsPacientes = pacientesDb.Select(p => p.IdPaciente).ToList();

        // Traemos todas las citas de estos pacientes de una sola vez (evita N+1 queries)
        var citas = await _context.Citas
            .Include(c => c.Servicio)
            .Include(c => c.Profesional)
            .Where(c => idsPacientes.Contains(c.IdPaciente))
            .OrderByDescending(c => c.FechaHora)
            .ToListAsync();

        var pacientes = new List<PacienteViewModel>();

        for (int i = 0; i < pacientesDb.Count; i++)
        {
            var p = pacientesDb[i];
            var citasPaciente = citas.Where(c => c.IdPaciente == p.IdPaciente).ToList();

            var ultima = citasPaciente
                .Where(c => c.FechaHora <= ahora)
                .OrderByDescending(c => c.FechaHora)
                .FirstOrDefault();

            var proxima = citasPaciente
                .Where(c => c.FechaHora > ahora && c.Estado != "Cancelada")
                .OrderBy(c => c.FechaHora)
                .FirstOrDefault();

            var alergias = string.IsNullOrWhiteSpace(p.Alergias)
                ? new List<string>()
                : p.Alergias
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

            char inicialNombre = p.Nombres.Trim().FirstOrDefault();
            char inicialApellido = p.Apellidos.Trim().FirstOrDefault();
            string iniciales = $"{inicialNombre}{inicialApellido}".ToUpperInvariant();

            pacientes.Add(new PacienteViewModel
            {
                Id = p.IdPaciente,
                Initials = string.IsNullOrWhiteSpace(iniciales) ? "??" : iniciales,
                Name = $"{p.Nombres} {p.Apellidos}".Trim(),
                Doc = $"{p.TipoDocumento} {p.Documento}",
                LastVisit = ultima?.FechaHora,
                Diagnosis = ultima?.Servicio?.Nombre ?? ultima?.Notas ?? string.Empty,
                NextVisit = proxima?.FechaHora,
                Allergies = alergias,
                Color = colores[i % colores.Length],
                History = citasPaciente
                    .Where(c => c.FechaHora <= ahora)
                    .OrderByDescending(c => c.FechaHora)
                    .Select(c => new PacienteHistorialViewModel
                    {
                        Date = c.FechaHora,
                        Procedure = c.Servicio?.Nombre ?? c.Notas ?? "Consulta",
                        Doctor = c.Profesional != null
                            ? $"{c.Profesional.Nombres} {c.Profesional.Apellidos}"
                            : "Sin asignar"
                    })
                    .ToList()
            });
        }

        return View("~/Views/Gestion_De_Pacientes/st-adm-05-gestion-pacientes/index.cshtml", pacientes);
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-pacientes/st-aux-03-preparacion-consulta")]
    public IActionResult Staux03PreparacionConsulta() => View("~/Views/Gestion_De_Pacientes/st-aux-03-preparacion-consulta/preparacion.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-pacientes/st-rec-02-registrar-paciente")]
    public IActionResult Strec02RegistrarPaciente() => View("~/Views/Gestion_De_Pacientes/st-rec-02-registrar-paciente/nuevo_paciente.cshtml");
}