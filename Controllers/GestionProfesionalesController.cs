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

        // Load stats for the logged-in professional
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out var userId))
        {
            var profesional = await _context.Profesionales.FirstOrDefaultAsync(p => p.IdUsuario == userId);
            if (profesional != null)
            {
                var hoy = DateTime.Today;
                var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
                var finMes = inicioMes.AddMonths(1);

                var citasDelMes = await _context.Citas
                    .Include(c => c.Servicio)
                    .Where(c => c.IdProfesional == profesional.IdProfesional && c.FechaHora >= inicioMes && c.FechaHora < finMes)
                    .ToListAsync();

                ViewData["OdoPacientesActivos"] = citasDelMes.Select(c => c.IdPaciente).Distinct().Count();
                ViewData["OdoCitasHoy"] = citasDelMes.Count(c => c.FechaHora.Date == hoy);
                
                var ingresosMes = citasDelMes.Where(c => c.Estado.ToLower() == "atendida" && c.Servicio != null).Sum(c => c.Servicio!.Precio);
                ViewData["OdoIngresosMes"] = ingresosMes;

                ViewData["OdoCitasAtendidas"] = citasDelMes.Count(c => c.Estado.ToLower() == "atendida");
                ViewData["OdoCitasProgramadas"] = citasDelMes.Count(c => c.Estado.ToLower() == "programada");
                ViewData["OdoCitasCanceladas"] = citasDelMes.Count(c => c.Estado.ToLower() == "cancelada");
                ViewData["OdoCitasNoAsistio"] = citasDelMes.Count(c => c.Estado.ToLower() == "no asistió");
                ViewData["OdoTotalCitasMes"] = citasDelMes.Count;

                ViewData["OdoProximasCitas"] = citasDelMes
                    .Where(c => c.FechaHora.Date == hoy && c.Estado.ToLower() == "programada")
                    .OrderBy(c => c.FechaHora)
                    .Take(4)
                    .ToList();

                ViewData["OdoUltimosPacientes"] = citasDelMes
                    .Where(c => c.Estado.ToLower() == "atendida")
                    .OrderByDescending(c => c.FechaHora)
                    .Take(3)
                    .ToList();
            }
        }

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

        // Buscar profesional logueado
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out var userId))
        {
            var profesional = await _context.Profesionales
                .Include(p => p.Usuario)
                .Include(p => p.Especialidades)
                .ThenInclude(pe => pe.Especialidad)
                .FirstOrDefaultAsync(p => p.IdUsuario == userId);

            ViewData["LoggedProfesional"] = profesional;
        }

        return View("~/Views/Gestion_De_Profesionales/st-odo-09-perfil-profesional/index.cshtml");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador")]
    [Route("gestion-de-profesionales/guardar-profesional")]
    public async Task<IActionResult> GuardarProfesional([FromForm] ProfesionalViewModel model)
    {
        var returnUrlSafe = string.IsNullOrWhiteSpace(model.ReturnUrl)
            ? "/gestion-de-profesionales/st-adm-07-gestion-profesionales"
            : model.ReturnUrl;

        // Validar anotaciones de validación (DataAnnotations) del ViewModel
        if (!ModelState.IsValid)
        {
            var firstError = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage;
            TempData["ErrorValidacion"] = firstError ?? "Datos inválidos en el formulario.";
            return Redirect(returnUrlSafe);
        }

        // Validación de unicidad de RegistroMedico en la base de datos
        var registroMedicoDuplicado = await _context.Profesionales
            .AnyAsync(p => p.RegistroMedico == model.RegistroMedico && p.IdProfesional != (model.IdProfesional ?? 0));

        if (registroMedicoDuplicado)
        {
            TempData["ErrorValidacion"] = $"El registro médico '{model.RegistroMedico}' ya está asignado a otro profesional.";
            return Redirect(returnUrlSafe);
        }

        var estado = string.IsNullOrWhiteSpace(model.Estado) ? "activo" : model.Estado;
        var idUsuario = (model.IdUsuario == null || model.IdUsuario == 0) ? (int?)null : model.IdUsuario;

        Profesional profesional;
        try
        {
            if (model.IdProfesional.HasValue && model.IdProfesional.Value > 0)
            {
                profesional = await _context.Profesionales.Include(p => p.Especialidades).FirstOrDefaultAsync(p => p.IdProfesional == model.IdProfesional.Value) ?? new Profesional();
                profesional.IdUsuario = idUsuario;
                profesional.Nombres = model.Nombres;
                profesional.Apellidos = model.Apellidos;
                profesional.RegistroMedico = model.RegistroMedico;
                profesional.Categoria = model.Categoria;
                profesional.Telefono = model.Telefono;
                profesional.Descripcion = model.Descripcion;
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
                    Nombres = model.Nombres,
                    Apellidos = model.Apellidos,
                    RegistroMedico = model.RegistroMedico,
                    Categoria = model.Categoria,
                    Telefono = model.Telefono,
                    Descripcion = model.Descripcion,
                    Estado = estado,
                    FechaIngreso = DateTime.Today
                };
                _context.Profesionales.Add(profesional);
            }

            await _context.SaveChangesAsync();

            if (model.IdEspecialidad.HasValue && model.IdEspecialidad.Value > 0)
            {
                var relaciones = await _context.ProfesionalEspecialidades.Where(pe => pe.IdProfesional == profesional.IdProfesional).ToListAsync();
                _context.ProfesionalEspecialidades.RemoveRange(relaciones);
                _context.ProfesionalEspecialidades.Add(new Profesional_Especialidad
                {
                    IdProfesional = profesional.IdProfesional,
                    IdEspecialidad = model.IdEspecialidad.Value,
                    Principal = true
                });
                await _context.SaveChangesAsync();
            }
        }
        catch (DbUpdateException)
        {
            TempData["ErrorValidacion"] = "Ocurrió un error al guardar los cambios en la base de datos (posible conflicto de datos).";
            return Redirect(returnUrlSafe);
        }

        return Redirect(returnUrlSafe);
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
            // Baja lógica (soft delete) en lugar de eliminación física
            profesional.Estado = "inactivo";
            _context.Profesionales.Update(profesional);
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

        // ── FILTROS SQL (IQueryable) ──────────────────────────────────────────────
        // Row-Level Security: si es un Profesional, solo ve sus propias citas/reportes
        if (User.IsInRole("Profesional"))
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdStr, out var userId))
            {
                var prof = await _context.Profesionales.FirstOrDefaultAsync(p => p.IdUsuario == userId);
                if (prof != null)
                {
                    citasQuery = citasQuery.Where(c => c.IdProfesional == prof.IdProfesional);
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            citasQuery = citasQuery.Where(c =>
                c.Paciente!.Nombres.ToLower().Contains(searchLower) ||
                c.Paciente.Apellidos.ToLower().Contains(searchLower) ||
                c.Paciente.Documento.ToLower().Contains(searchLower)
            );
        }

        if (!string.IsNullOrWhiteSpace(profesional))
        {
            var profLower = profesional.Trim().ToLower();
            citasQuery = citasQuery.Where(c =>
                c.Profesional != null && (
                    (c.Profesional.Nombres.ToLower() + " " + c.Profesional.Apellidos.ToLower()).Contains(profLower) ||
                    (c.Profesional.Usuario != null && (c.Profesional.Usuario.Nombre.ToLower() + " " + c.Profesional.Usuario.Apellidos.ToLower()).Contains(profLower))
                )
            );
        }

        if (!string.IsNullOrWhiteSpace(mes) && DateTime.TryParseExact(mes, "yyyy-MM", null, System.Globalization.DateTimeStyles.None, out var filterMonth))
        {
            var filterStart = filterMonth;
            var filterEnd = filterMonth.AddMonths(1);
            citasQuery = citasQuery.Where(c => c.FechaHora >= filterStart && c.FechaHora < filterEnd);
        }
        // ─────────────────────────────────────────────────────────────────────────

        var citas = await citasQuery.OrderByDescending(c => c.FechaHora).ToListAsync();

        var profesionalesOptions = await _context.Profesionales
            .Where(p => p.Estado == "activo")
            .Select(p => (p.Nombres + " " + p.Apellidos).Trim())
            .Distinct()
            .OrderBy(name => name)
            .ToListAsync();

        var reportes = citas
            .GroupBy(c => c.IdPaciente)
            .Select(g =>
            {
                var cita = g.First();
                var nacimiento = cita.Paciente?.FechaNacimiento;
                var edad = nacimiento.HasValue ? hoy.Year - nacimiento.Value.Year - (hoy < nacimiento.Value.AddYears(hoy.Year - nacimiento.Value.Year) ? 1 : 0) : 0;
                var proximaCita = g.Where(c => c.Fecha >= hoy).OrderBy(c => c.Fecha).ThenBy(c => c.HoraInicio).FirstOrDefault();
                var alerta = string.IsNullOrWhiteSpace(cita.NotasPrevias) ? null : "observacion";

                return new global::SmileTrack_MVC.Models.ViewModels.ReporteClinicoViewModel
                {
                    Id = cita.IdCita,
                    NombrePaciente = $"{cita.Paciente?.Nombres} {cita.Paciente?.Apellidos}".Trim(),
                    Documento = cita.Paciente?.Documento ?? string.Empty,
                    Edad = edad,
                    UltimaConsulta = cita.Fecha,
                    Diagnostico = cita.MotivoConsulta ?? "Consulta general",
                    ProfesionalNombre = cita.Profesional?.Usuario != null ? $"{cita.Profesional.Usuario.Nombre} {cita.Profesional.Usuario.Apellidos}".Trim() : "Sin profesional",
                    ProximaCita = proximaCita?.Fecha,
                    Alerta = alerta,
                    Avatar = string.Concat((cita.Paciente?.Nombres ?? "P").Take(2).Select(ch => char.ToUpperInvariant(ch))).ToString(),
                    Color = g.Count() % 2 == 0 ? "green" : "blue"
                };
            })
            .Take(15)
            .ToList();

        ViewData["ReportesClinicos"] = reportes;
        ViewData["ProfesionalesReportes"] = profesionalesOptions;
        ViewData["TotalPacientesReportes"] = await _context.Pacientes.CountAsync();

        var consultasQuery = _context.Citas.AsQueryable();
        if (User.IsInRole("Profesional"))
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdStr, out var userId))
            {
                var prof = await _context.Profesionales.FirstOrDefaultAsync(p => p.IdUsuario == userId);
                if (prof != null)
                {
                    consultasQuery = consultasQuery.Where(c => c.IdProfesional == prof.IdProfesional);
                }
            }
        }
        ViewData["ConsultasMes"] = await consultasQuery.CountAsync(c => c.FechaHora >= inicioMes && c.FechaHora < finMes);
        ViewData["SatisfaccionPromedio"] = 95; // Nota: Valor de KPI real / placeholder para el panel
        
        ViewData["SearchFilter"] = search;
        ViewData["ProfesionalFilter"] = profesional;
        ViewData["MesFilter"] = mes;
    }

    /// <summary>
    /// Carga la lista paginada de profesionales con filtros y datos auxiliares para el formulario.
    /// 
    /// IMPORTANTE: Los stats (TotalGlobal, Activos, Vacaciones, Inactivos) se calculan con COUNT()
    /// sobre TODA la tabla sin filtros, no sobre la página actual. Esto garantiza que los tarjetas
    /// de estadísticas siempre reflejan los totales reales de la BD, independiente de la paginación
    /// o de los filtros de búsqueda que el usuario haya aplicado.
    /// </summary>
    private async Task CargarDatosProfesionales(int? editId, string returnUrl, PaginationQuery? query = null)
    {
        var pagination = query ?? new PaginationQuery();
        var page = pagination.Page < 1 ? 1 : pagination.Page;
        var pageSize = pagination.PageSize < 1 ? 10 : pagination.PageSize;

        // ── STATS GLOBALES (sin filtros, sin paginación) ─────────────────────────
        // Se ejecutan como COUNT() en SQL — muy eficientes, no cargan entidades en memoria.
        // Se calculan ANTES de aplicar los filtros de la query paginada.
        ViewData["StatTotal"]      = await _context.Profesionales.CountAsync();
        ViewData["StatActivos"]    = await _context.Profesionales.CountAsync(p => p.Estado == "activo");
        ViewData["StatVacaciones"] = await _context.Profesionales.CountAsync(p => p.Estado == "vacaciones");
        ViewData["StatInactivos"]  = await _context.Profesionales.CountAsync(p => p.Estado == "inactivo");
        // ─────────────────────────────────────────────────────────────────────────

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
