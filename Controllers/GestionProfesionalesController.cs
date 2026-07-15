using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Models.Shared;
using SmileTrack_MVC.Models.ViewModels;

namespace SmileTrack_MVC.Controllers;

public class GestionProfesionalesController : Controller
{
    private readonly AppDbContext _context;

    public GestionProfesionalesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-profesionales/st-adm-07-gestion-profesionales")]
    public async Task<IActionResult> Stadm07GestionProfesionales([FromQuery] int? editId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string? especialidad = null, [FromQuery] string? estado = null)
    {
        await CargarDatosProfesionales(editId, "/gestion-de-profesionales/st-adm-07-gestion-profesionales", new PaginationQuery
        {
            Page = page,
            PageSize = pageSize,
            Search = search,
            Estado = estado,
            Profesional = especialidad
        });
        return View("~/Views/Gestion_De_Profesionales/st-adm-07-gestion-profesionales/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Profesional")]
    [Route("gestion-de-profesionales/st-adm-14-reportes-clinicos")]
    public async Task<IActionResult> Stadm14ReportesClinicos([FromQuery] int? editId)
    {
        await CargarDatosProfesionales(editId, "/gestion-de-profesionales/st-adm-14-reportes-clinicos");
        await CargarDatosReportesClinicos();
        return View("~/Views/Gestion_De_Profesionales/st-adm-14-reportes-clinicos/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-profesionales/st-odo-01-dashboard")]
    public async Task<IActionResult> Stodo01Dashboard([FromQuery] int? editId)
    {
        await CargarDatosProfesionales(editId, "/gestion-de-profesionales/st-odo-01-dashboard");
        return View("~/Views/Gestion_De_Profesionales/st-odo-01-dashboard/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-profesionales/st-odo-08-mis-reportes")]
    public async Task<IActionResult> Stodo08MisReportes([FromQuery] int? editId)
    {
        await CargarDatosProfesionales(editId, "/gestion-de-profesionales/st-odo-08-mis-reportes");
        return View("~/Views/Gestion_De_Profesionales/st-odo-08-mis-reportes/mis-reportes.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-profesionales/st-odo-09-perfil-profesional")]
    public async Task<IActionResult> Stodo09PerfilProfesional([FromQuery] int? editId)
    {
        await CargarDatosProfesionales(editId, "/gestion-de-profesionales/st-odo-09-perfil-profesional");
        return View("~/Views/Gestion_De_Profesionales/st-odo-09-perfil-profesional/index.cshtml");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-profesionales/guardar-profesional")]
    public async Task<IActionResult> GuardarProfesional([FromForm] int? IdProfesional, [FromForm] int? IdUsuario, [FromForm] string? Especialidad, [FromForm] string? Correo, [FromForm] string? Telefono, [FromForm] string Estado, [FromForm] string? ReturnUrl)
    {
        if (IdProfesional.HasValue && IdProfesional.Value > 0)
        {
            var profesional = await _context.Profesionales.FindAsync(IdProfesional.Value);
            if (profesional != null)
            {
                profesional.IdUsuario = IdUsuario;
                profesional.Especialidad = Especialidad;
                profesional.Correo = Correo;
                profesional.Telefono = Telefono;
                profesional.Estado = string.IsNullOrWhiteSpace(Estado) ? "activo" : Estado;
                _context.Profesionales.Update(profesional);
            }
        }
        else
        {
            _context.Profesionales.Add(new Profesional
            {
                IdUsuario = IdUsuario,
                Especialidad = Especialidad,
                Correo = Correo,
                Telefono = Telefono,
                Estado = string.IsNullOrWhiteSpace(Estado) ? "activo" : Estado
            });
        }

        await _context.SaveChangesAsync();
        return Redirect(string.IsNullOrWhiteSpace(ReturnUrl) ? "/gestion-de-profesionales/st-adm-07-gestion-profesionales" : ReturnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-profesionales/eliminar-profesional")]
    public async Task<IActionResult> EliminarProfesional([FromForm] int IdProfesional, [FromForm] string? ReturnUrl)
    {
        var profesional = await _context.Profesionales.FindAsync(IdProfesional);
        if (profesional != null)
        {
            _context.Profesionales.Remove(profesional);
            await _context.SaveChangesAsync();
        }

        return Redirect(string.IsNullOrWhiteSpace(ReturnUrl) ? "/gestion-de-profesionales/st-adm-07-gestion-profesionales" : ReturnUrl);
    }

    /// <summary>
    /// Prepara los datos de reportes clínicos para la vista administrativa.
    /// </summary>
    private async Task CargarDatosReportesClinicos()
    {
        var hoy = DateTime.Today;
        var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
        var finMes = inicioMes.AddMonths(1);

        var citas = await _context.Citas
            .Include(c => c.Paciente)
            .Include(c => c.Profesional)
            .ThenInclude(p => p!.Usuario)
            .Include(c => c.Servicio)
            .Where(c => c.Paciente != null)
            .OrderByDescending(c => c.FechaHora)
            .ToListAsync();

        var reportes = citas
            .GroupBy(c => c.IdPaciente)
            .Select(g =>
            {
                var cita = g.OrderByDescending(c => c.FechaHora).First();
                var nacimiento = cita.Paciente?.FechaNacimiento;
                var edad = nacimiento.HasValue ? hoy.Year - nacimiento.Value.Year - (hoy < nacimiento.Value.AddYears(hoy.Year - nacimiento.Value.Year) ? 1 : 0) : 0;
                var proximaCita = g.Where(c => c.FechaHora >= hoy).OrderBy(c => c.FechaHora).FirstOrDefault();
                var alerta = string.IsNullOrWhiteSpace(cita.Notas) ? null : "observacion";

                return new global::SmileTrack_MVC.Models.ViewModels.ReporteClinicoViewModel
                {
                    Id = cita.IdCita,
                    NombrePaciente = $"{cita.Paciente?.Nombres} {cita.Paciente?.Apellidos}".Trim(),
                    Documento = cita.Paciente?.Documento ?? string.Empty,
                    Edad = edad,
                    UltimaConsulta = cita.FechaHora,
                    Diagnostico = cita.Servicio?.Nombre ?? "Consulta general",
                    ProfesionalNombre = cita.Profesional?.Usuario != null ? $"{cita.Profesional.Usuario.Nombre} {cita.Profesional.Usuario.Apellidos}".Trim() : "Sin profesional",
                    ProximaCita = proximaCita?.FechaHora,
                    Alerta = alerta,
                    Avatar = string.Concat((cita.Paciente?.Nombres ?? "P").Take(2).Select(ch => char.ToUpperInvariant(ch))).ToString(),
                    Color = g.Count() % 2 == 0 ? "green" : "blue"
                };
            })
            .Take(10)
            .ToList();

        var profesionales = citas
            .Where(c => c.Profesional?.Usuario != null)
            .Select(c => $"{c.Profesional!.Usuario!.Nombre} {c.Profesional.Usuario.Apellidos}")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => name)
            .ToList();

        ViewData["ReportesClinicos"] = reportes;
        ViewData["ProfesionalesReportes"] = profesionales;
        ViewData["TotalPacientesReportes"] = await _context.Pacientes.CountAsync();
        ViewData["ConsultasMes"] = citas.Count(c => c.FechaHora >= inicioMes && c.FechaHora < finMes);
        ViewData["SatisfaccionPromedio"] = 92 + (reportes.Count % 5);
    }

    /// <summary>
    /// Carga la lista paginada de profesionales con filtros y datos auxiliares para el formulario.
    /// </summary>
    private async Task CargarDatosProfesionales(int? editId, string returnUrl, PaginationQuery? query = null)
    {
        var pagination = query ?? new PaginationQuery();
        var page = pagination.Page < 1 ? 1 : pagination.Page;
        var pageSize = pagination.PageSize < 1 ? 10 : pagination.PageSize;

        var profesionalesQuery = _context.Profesionales
            .Include(p => p.Usuario)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var searchTerm = pagination.Search.Trim().ToLower();
            profesionalesQuery = profesionalesQuery.Where(p =>
                (p.Usuario != null && ((p.Usuario.Nombre != null && p.Usuario.Nombre.ToLower().Contains(searchTerm)) || (p.Usuario.Apellidos != null && p.Usuario.Apellidos.ToLower().Contains(searchTerm)))) ||
                (p.Especialidad != null && p.Especialidad.ToLower().Contains(searchTerm)) ||
                (p.Correo != null && p.Correo.ToLower().Contains(searchTerm)));
        }

        if (!string.IsNullOrWhiteSpace(pagination.Profesional))
        {
            var especialidad = pagination.Profesional.Trim().ToLower();
            profesionalesQuery = profesionalesQuery.Where(p => p.Especialidad != null && p.Especialidad.ToLower() == especialidad);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Estado))
        {
            var estado = pagination.Estado.Trim().ToLower();
            profesionalesQuery = profesionalesQuery.Where(p => p.Estado != null && p.Estado.ToLower() == estado);
        }

        profesionalesQuery = profesionalesQuery.OrderBy(p => p.Especialidad);

        var paged = await profesionalesQuery.ToPagedResultAsync(page, pageSize);

        ViewData["Profesionales"] = paged.Items.ToList();
        ViewData["ProfesionalesPage"] = paged;
        ViewData["PaginationQuery"] = pagination;
        ViewData["SearchFilter"] = pagination.Search ?? string.Empty;
        ViewData["EspecialidadFilter"] = pagination.Profesional ?? string.Empty;
        ViewData["EstadoFilter"] = pagination.Estado ?? string.Empty;
        ViewData["Especialidades"] = await _context.Profesionales.Where(p => !string.IsNullOrWhiteSpace(p.Especialidad)).Select(p => p.Especialidad!).Distinct().OrderBy(e => e).ToListAsync();
        ViewData["Usuarios"] = await _context.Usuarios.OrderBy(u => u.Nombre).ThenBy(u => u.Apellidos).ToListAsync();
        ViewData["ReturnUrl"] = returnUrl;

        if (editId.HasValue && editId.Value > 0)
        {
            ViewData["EditingProfesional"] = await _context.Profesionales.FindAsync(editId.Value);
        }
        else
        {
            ViewData["EditingProfesional"] = null;
        }
    }
}
