using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Models.ViewModels;

namespace SmileTrack_MVC.Controllers;

public class HistoriaClinicaController(AppDbContext context) : Controller
{
    private readonly AppDbContext _context = context;

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("historia-clinica/st-adm-historial")]
    public IActionResult StadmHistorial() => View("~/Views/Historia_Clinica/st-adm-historial/historial-adm.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("historia-clinica/st-aux-07-control-postoperato")]
    public IActionResult Staux07ControlPostoperato() => View("~/Views/Historia_Clinica/st-aux-07-control-postoperato/control-post.cshtml");

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("historia-clinica/st-aux-08-documentos-clinicos")]
    public IActionResult Staux08DocumentosClinicos() => View("~/Views/Historia_Clinica/st-aux-08-documentos-clinicos/documentos-cli.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-03-historial")]
    public async Task<IActionResult> Stodo03Historial([FromQuery] int? pacienteId, [FromQuery] int? historiaId)
    {
        var vm = await BuildOdontogramaViewModelAsync(pacienteId, historiaId);
        return View("~/Views/Historia_Clinica/st-odo-03-historial/gestion-historial.cshtml", vm);
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-04-odontograma")]
    public async Task<IActionResult> Stodo04Odontograma([FromQuery] int? pacienteId, [FromQuery] int? historiaId)
    {
        var vm = await BuildOdontogramaViewModelAsync(pacienteId, historiaId);
        return View("~/Views/Historia_Clinica/st-odo-04-odontograma/odontograma-digital.cshtml", vm);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-04-odontograma/guardar")]
    public async Task<IActionResult> GuardarOdontograma([FromBody] OdontogramaGuardarRequest request)
    {
        if (request is null)
        {
            return Json(new { success = false, message = "No se recibieron datos del odontograma." });
        }

        int? pacienteId = request.PacienteId ?? await ObtenerPacientePredeterminadoAsync();
        if (pacienteId is null)
            return Json(new { success = false, message = "No hay pacientes registrados en el sistema." });
        var historia = await _context.HistoriasClinicas.FirstOrDefaultAsync(h => h.IdPaciente == pacienteId && h.Activa)
        ?? await CrearHistoriaClinicaAsync(pacienteId.Value);

        historia.ObservacionesGenerales = JsonSerializer.Serialize(new
        {
            registros = request.Registros,
            mapeoFDI = request.MapeoFDI,
            actualizadoEn = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return Json(new { success = true, historiaId = historia.IdHistoria, message = "Odontograma guardado correctamente." });
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-06-pacientes")]
    public IActionResult Stodo06Pacientes() => View("~/Views/Historia_Clinica/st-odo-06-pacientes/index.cshtml");

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("historia-clinica/st-odo-07-seguimiento-tratamiento")]
    public IActionResult Stodo07SeguimientoTratamiento() => View("~/Views/Historia_Clinica/st-odo-07-seguimiento-tratamiento/tratamientos.cshtml");

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("historia-clinica/st-rec-historial")]
    public IActionResult StrecHistorial() => View("~/Views/Historia_Clinica/st-rec-historial/historial-rec.cshtml");

    [HttpGet]
[Authorize(Roles = "Paciente")]
[Route("historia-clinica/st-pac-02-historial")]
public async Task<IActionResult> Stpac02Historial()
{
        string? userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    int? idUsuario = int.TryParse(userIdStr, out int uid) ? uid : null;

    var paciente = idUsuario.HasValue
        ? await _context.Pacientes.FirstOrDefaultAsync(p => p.IdUsuario == idUsuario)
        : null;

    paciente ??= await _context.Pacientes.OrderBy(p => p.IdPaciente).FirstOrDefaultAsync();

    var vm = new HistorialPacienteViewModel();

    if (paciente is not null)
    {
        vm.Odontograma = await BuildOdontogramaViewModelAsync(paciente.IdPaciente, null);

        vm.GrupoSanguineo = string.IsNullOrWhiteSpace(paciente.GrupoSanguineo) ? "N/D" : paciente.GrupoSanguineo;
        vm.Alergias = string.IsNullOrWhiteSpace(paciente.Alergias)
            ? []
            : paciente.Alergias.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        vm.AntecedentesMedicos = string.IsNullOrWhiteSpace(paciente.AntecedentesMedicos)
            ? "Sin antecedentes registrados"
            : paciente.AntecedentesMedicos;

        var citas = await _context.Citas
            .Include(c => c.Servicio)
            .Include(c => c.Profesional)
            .Where(c => c.IdPaciente == paciente.IdPaciente)
            .OrderByDescending(c => c.FechaHora)
            .ToListAsync();

        var ahora = DateTime.Now;

        var proxima = citas
            .Where(c => c.FechaHora > ahora && c.Estado != "Cancelada")
            .OrderBy(c => c.FechaHora)
            .FirstOrDefault();

        vm.ProximaCitaFecha = proxima?.FechaHora;
        vm.ProximaCitaProfesional = proxima?.Profesional is not null
            ? $"Dr(a). {proxima.Profesional.Nombres} {proxima.Profesional.Apellidos}"
            : null;

        vm.Registros = citas
            .Where(c => c.FechaHora <= ahora)
            .Select(c => new RegistroHistorialItem
            {
                Fecha = c.FechaHora,
                Tipo = InferirTipoServicio(c.Servicio?.Nombre),
                Descripcion = c.Servicio?.Nombre ?? c.Notas ?? "Consulta",
                Doctor = c.Profesional is not null ? $"Dr(a). {c.Profesional.Nombres} {c.Profesional.Apellidos}" : "Sin asignar",
                Estado = c.Estado
            })
            .ToList();
    }

    return View("~/Views/Historia_Clinica/st-pac-02-historial/index.cshtml", vm);
}

private static string InferirTipoServicio(string? nombreServicio)
{
    if (string.IsNullOrWhiteSpace(nombreServicio)) return "consulta";
        string n = nombreServicio.ToLowerInvariant();
    if (n.Contains("limpieza") || n.Contains("profilaxis")) return "limpieza";
    if (n.Contains("radiograf")) return "radiografia";
    if (n.Contains("ortodon") || n.Contains("endodon") || n.Contains("implante") || n.Contains("cirugia") || n.Contains("resina") || n.Contains("extrac")) return "tratamiento";
    return "consulta";
}
    private async Task<OdontogramaViewModel> BuildOdontogramaViewModelAsync(int? pacienteId, int? historiaId)
    {
        var paciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.IdPaciente == pacienteId)
            ?? await _context.Pacientes.OrderBy(p => p.IdPaciente).FirstOrDefaultAsync();

        // Si no hay pacientes aún (seed en background puede estar en progreso), retornar ViewModel seguro
        if (paciente is null)
        {
            return new OdontogramaViewModel
            {
                PacienteId = null,
                HistoriaId = null,
                PacienteNombre = "Sin paciente asignado",
                CodigoHC = "HC-SIN-ASIGNAR",
                FechaNacimiento = string.Empty,
                ProfesionalNombre = User.FindFirst(ClaimTypes.Name)?.Value ?? "Profesional",
                ProfesionalCorreo = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty,
                ObservacionesGenerales = null
            };
        }

        var historia = await _context.HistoriasClinicas.FirstOrDefaultAsync(h => h.IdHistoria == historiaId)
            ?? await _context.HistoriasClinicas.FirstOrDefaultAsync(h => h.IdPaciente == paciente.IdPaciente && h.Activa)
            ?? await CrearHistoriaClinicaAsync(paciente.IdPaciente);

        string profesionalNombre = User.FindFirst(ClaimTypes.Name)?.Value ?? "Profesional";
        string profesionalCorreo = User.FindFirst(ClaimTypes.Email)?.Value ?? "";

        return new OdontogramaViewModel
        {
            PacienteId = paciente.IdPaciente,
            HistoriaId = historia.IdHistoria,
            PacienteNombre = paciente.NombresCompleto,
            CodigoHC = $"HC-{historia.IdHistoria:0000}",
            FechaNacimiento = paciente.FechaNacimiento.ToString("yyyy-MM-dd"),
            ProfesionalNombre = profesionalNombre,
            ProfesionalCorreo = profesionalCorreo,
            ObservacionesGenerales = historia.ObservacionesGenerales
        };
    }

    private async Task<HistoriaClinica> CrearHistoriaClinicaAsync(int pacienteId)
    {
        var historiaExistente = await _context.HistoriasClinicas.FirstOrDefaultAsync(h => h.IdPaciente == pacienteId && h.Activa);
        if (historiaExistente is not null)
        {
            return historiaExistente;
        }

        var historia = new HistoriaClinica
        {
            IdPaciente = pacienteId,
            FechaApertura = DateTime.UtcNow,
            Activa = true,
            ObservacionesGenerales = string.Empty
        };

        _context.HistoriasClinicas.Add(historia);
        await _context.SaveChangesAsync();
        return historia;
    }

    private async Task<int?> ObtenerPacientePredeterminadoAsync()
    {
        var paciente = await _context.Pacientes.OrderBy(p => p.IdPaciente).FirstOrDefaultAsync();
        return paciente?.IdPaciente;
    }
}