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
    public async Task<IActionResult> Stadm14ReportesClinicos([FromQuery] int? editId, [FromQuery] string? search = null, [FromQuery] string? profesional = null, [FromQuery] string? mes = null)
    {
        await CargarDatosProfesionales(editId, "/gestion-de-profesionales/st-adm-14-reportes-clinicos");
        await CargarDatosReportesClinicos(search, profesional, mes);
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
    public async Task<IActionResult> GuardarProfesional([FromForm] int? IdProfesional, [FromForm] int? IdUsuario, [FromForm] string? Nombres, [FromForm] string? Apellidos, [FromForm] string? RegistroMedico, [FromForm] string? Categoria, [FromForm] string? Telefono, [FromForm] int? IdEspecialidad, [FromForm] string? Descripcion, [FromForm] string Estado, [FromForm] string? ReturnUrl)
    {
        var estado = string.IsNullOrWhiteSpace(Estado) ? "activo" : Estado;
        var idUsuario = IdUsuario ?? 0;

        Profesional profesional;
        if (IdProfesional.HasValue && IdProfesional.Value > 0)
        {
            profesional = await _context.Profesionales.Include(p => p.Especialidades).FirstOrDefaultAsync(p => p.IdProfesional == IdProfesional.Value) ?? new Profesional();
            profesional.IdUsuario = idUsuario;
            profesional.Nombres = Nombres ?? string.Empty;
            profesional.Apellidos = Apellidos ?? string.Empty;
            profesional.RegistroMedico = RegistroMedico ?? string.Empty;
            profesional.Categoria = Categoria;
            profesional.Telefono = Telefono;
            profesional.Descripcion = Descripcion;
            profesional.Estado = estado;
            profesional.FechaIngreso = profesional.FechaIngreso ?? DateTime.Today;
            if (profesional.IdProfesional == 0)
            {
                _context.Profesionales.Add(profesional);
            }
            else
            {
                _context.Profesionales.Update(profesional);
            }
        }
        else
        {
            profesional = new Profesional
            {
                IdUsuario = idUsuario,
                Nombres = Nombres ?? string.Empty,
                Apellidos = Apellidos ?? string.Empty,
                RegistroMedico = RegistroMedico ?? string.Empty,
                Categoria = Categoria,
                Telefono = Telefono,
                Descripcion = Descripcion,
                Estado = estado,
                FechaIngreso = DateTime.Today
            };
            _context.Profesionales.Add(profesional);
        }

        await _context.SaveChangesAsync();

        if (IdEspecialidad.HasValue && IdEspecialidad.Value > 0)
        {
            var relaciones = await _context.ProfesionalEspecialidades.Where(pe => pe.IdProfesional == profesional.IdProfesional).ToListAsync();
            _context.ProfesionalEspecialidades.RemoveRange(relaciones);
            _context.ProfesionalEspecialidades.Add(new Profesional_Especialidad
            {
                IdProfesional = profesional.IdProfesional,
                IdEspecialidad = IdEspecialidad.Value,
                Principal = true
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
    private async Task CargarDatosReportesClinicos(string? search = null, string? profesional = null, string? mes = null)
    {
        var hoy = DateTime.Today;
        var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
        var finMes = inicioMes.AddMonths(1);

        var citasQuery = _context.Citas
            .Include(c => c.Paciente)
            .Include(c => c.Profesional)
            .ThenInclude(p => p!.Usuario)
            .Include(c => c.Servicio)
            .Where(c => c.Paciente != null)
            .AsQueryable();

        var citas = await citasQuery.OrderByDescending(c => c.FechaHora).ToListAsync();

        var profesionalesOptions = citas
            .Where(c => c.Profesional?.Usuario != null)
            .Select(c => $"{c.Profesional!.Usuario!.Nombre} {c.Profesional.Usuario.Apellidos}".Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => name)
            .ToList();

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
            .AsEnumerable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            reportes = reportes.Where(r => r.NombrePaciente.ToLower().Contains(searchLower) || r.Documento.ToLower().Contains(searchLower));
        }

        if (!string.IsNullOrWhiteSpace(profesional))
        {
            reportes = reportes.Where(r => r.ProfesionalNombre == profesional);
        }

        if (!string.IsNullOrWhiteSpace(mes) && DateTime.TryParseExact(mes, "yyyy-MM", null, System.Globalization.DateTimeStyles.None, out var filterMonth))
        {
            var filterStart = filterMonth;
            var filterEnd = filterMonth.AddMonths(1);
            reportes = reportes.Where(r => r.UltimaConsulta >= filterStart && r.UltimaConsulta < filterEnd);
        }

        reportes = reportes.Take(15).ToList();

        ViewData["ReportesClinicos"] = reportes.ToList();
        ViewData["ProfesionalesReportes"] = profesionalesOptions;
        ViewData["TotalPacientesReportes"] = await _context.Pacientes.CountAsync();
        ViewData["ConsultasMes"] = citas.Count(c => c.FechaHora >= inicioMes && c.FechaHora < finMes);
        ViewData["SatisfaccionPromedio"] = 92 + (reportes.Count() % 5);
        
        ViewData["SearchFilter"] = search;
        ViewData["ProfesionalFilter"] = profesional;
        ViewData["MesFilter"] = mes;
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
            .Include(p => p.Especialidades)
            .ThenInclude(pe => pe.Especialidad)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var searchTerm = pagination.Search.Trim().ToLower();
            profesionalesQuery = profesionalesQuery.Where(p =>
                (p.Usuario != null && ((p.Usuario.Nombre != null && p.Usuario.Nombre.ToLower().Contains(searchTerm)) || (p.Usuario.Apellidos != null && p.Usuario.Apellidos.ToLower().Contains(searchTerm)))) ||
                (p.Nombres != null && p.Nombres.ToLower().Contains(searchTerm)) ||
                (p.Apellidos != null && p.Apellidos.ToLower().Contains(searchTerm)) ||
                (p.RegistroMedico != null && p.RegistroMedico.ToLower().Contains(searchTerm)) ||
                (p.Especialidades.Any(pe => pe.Especialidad != null && pe.Especialidad.Nombre.ToLower().Contains(searchTerm))));
        }

        if (!string.IsNullOrWhiteSpace(pagination.Profesional))
        {
            var especialidad = pagination.Profesional.Trim().ToLower();
            profesionalesQuery = profesionalesQuery.Where(p => p.Especialidades.Any(pe => pe.Especialidad != null && pe.Especialidad.Nombre.ToLower() == especialidad));
        }

        if (!string.IsNullOrWhiteSpace(pagination.Estado))
        {
            var estado = pagination.Estado.Trim().ToLower();
            profesionalesQuery = profesionalesQuery.Where(p => p.Estado != null && p.Estado.ToLower() == estado);
        }

        profesionalesQuery = profesionalesQuery.OrderBy(p => p.Apellidos).ThenBy(p => p.Nombres);

        var paged = await profesionalesQuery.ToPagedResultAsync(page, pageSize);

        ViewData["Profesionales"] = paged.Items.ToList();
        ViewData["ProfesionalesPage"] = paged;
        ViewData["PaginationQuery"] = pagination;
        ViewData["SearchFilter"] = pagination.Search ?? string.Empty;
        ViewData["EspecialidadFilter"] = pagination.Profesional ?? string.Empty;
        ViewData["EstadoFilter"] = pagination.Estado ?? string.Empty;
        ViewData["Especialidades"] = await _context.Especialidades.OrderBy(e => e.Nombre).ToListAsync();
        ViewData["Usuarios"] = await _context.Usuarios
            .Include(u => u.Rol)
            .Where(u => u.Rol != null && u.Rol.NombreRol == "Profesional")
            .OrderBy(u => u.Nombre).ThenBy(u => u.Apellidos)
            .ToListAsync();
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
