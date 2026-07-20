using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Models.Shared;
using SmileTrack_MVC.Models.ViewModels;

namespace SmileTrack_MVC.Controllers;

public class GestionCitasController : Controller
{
    private readonly AppDbContext _context;

    public GestionCitasController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-01-dashboard")]
    public async Task<IActionResult> Stadm01Dashboard([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-01-dashboard");
        await CargarDatosDashboard();
        return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
    }
    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-08-agenda")]
    public async Task<IActionResult> Stadm08Agenda([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-08-agenda");
        await CargarDatosAgenda();
        return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-09-citas")]
    public async Task<IActionResult> Stadm09Citas([FromQuery] int? editId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string? estado = null, [FromQuery] string? profesional = null, [FromQuery] string? fecha = null)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-09-citas", new PaginationQuery
        {
            Page = page,
            PageSize = pageSize,
            Search = search,
            Estado = estado,
            Profesional = profesional,
            Fecha = fecha
        });
        return View("~/Views/Gestion_De_Citas/st-adm-09-citas/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-01-panel-operativo/panel-operativo")]
    public async Task<IActionResult> Staux01PanelOperativo([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-01-panel-operativo/panel-operativo");
        return View("~/Views/Gestion_De_Citas/st-aux-01-panel-operativo/panel-operativo.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-02-agenda-apoyo")]
    public async Task<IActionResult> Staux02AgendaApoyo([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-02-agenda-apoyo");
        return View("~/Views/Gestion_De_Citas/st-aux-02-agenda-apoyo/agenda-apoyo.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-05-historial-parcial")]
    public async Task<IActionResult> Staux05HistorialParcial([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-05-historial-parcial");
        return View("~/Views/Gestion_De_Citas/st-aux-05-historial-parcial/historial-parcial.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-06-asistencia-procedi")]
    public async Task<IActionResult> Staux06AsistenciaProcedi([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-06-asistencia-procedi");
        return View("~/Views/Gestion_De_Citas/st-aux-06-asistencia-procedi/asistencia-proc.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-09-estado-consultorio")]
    public async Task<IActionResult> Staux09EstadoConsultorio([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-09-estado-consultorio");
        return View("~/Views/Gestion_De_Citas/st-aux-09-estado-consultorio/estado-consultorio.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar,Recepcionista")]
    [Route("gestion-de-citas/st-aux-10-citas-finalizadas")]
    public async Task<IActionResult> Staux10CitasFinalizadas([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-10-citas-finalizadas");
        return View("~/Views/Gestion_De_Citas/st-aux-10-citas-finalizadas/citas-finalizadas.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-citas/st-odo-02-agenda")]
    public async Task<IActionResult> Stodo02Agenda([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-odo-02-agenda");
        return View("~/Views/Gestion_De_Citas/st-odo-02-agenda/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("gestion-de-citas/st-pac-01-mis-citas")]
    public async Task<IActionResult> Stpac01MisCitas([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-pac-01-mis-citas");
        return View("~/Views/Gestion_De_Citas/st-pac-01-mis-citas/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("gestion-de-citas/st-pac-03-notificaciones")]
    public async Task<IActionResult> Stpac03Notificaciones([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-pac-03-notificaciones");
        return View("~/Views/Gestion_De_Citas/st-pac-03-notificaciones/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-01-dashboard")]
    public async Task<IActionResult> Strec01Dashboard([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-rec-01-dashboard");
        return View("~/Views/Gestion_De_Citas/st-rec-01-dashboard/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-03-gestion-citas")]
    public async Task<IActionResult> Strec03GestionCitas([FromQuery] int? editId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string? estado = null, [FromQuery] string? profesional = null, [FromQuery] string? fecha = null)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-rec-03-gestion-citas", new PaginationQuery
        {
            Page = page,
            PageSize = pageSize,
            Search = search,
            Estado = estado,
            Profesional = profesional,
            Fecha = fecha
        });
        return View("~/Views/Gestion_De_Citas/st-rec-03-gestion-citas/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-05-recordatorios")]
    public async Task<IActionResult> Strec05Recordatorios([FromQuery] int? editId)
    {
        await CargarDatosCitas(editId, "/gestion-de-citas/st-rec-05-recordatorios");
        return View("~/Views/Gestion_De_Citas/st-rec-05-recordatorios/index.cshtml");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/guardar-cita")]
    public async Task<IActionResult> GuardarCita([FromForm] int? IdCita, [FromForm] int IdPaciente, [FromForm] int? IdProfesional, [FromForm] int? IdServicio, [FromForm] DateTime FechaHora, [FromForm] string Estado, [FromForm] string? Notas, [FromForm] string? ReturnUrl)
    {
        if (IdCita.HasValue && IdCita.Value > 0)
        {
            var cita = await _context.Citas.FindAsync(IdCita.Value);
            if (cita != null)
            {
                cita.IdPaciente = IdPaciente;
                cita.IdProfesional = IdProfesional;
                cita.IdServicio = IdServicio;
                cita.FechaHora = FechaHora;
                cita.Estado = string.IsNullOrWhiteSpace(Estado) ? "programada" : Estado;
                cita.Notas = Notas;
                _context.Citas.Update(cita);
            }
        }
        else
        {
            _context.Citas.Add(new Cita
            {
                IdPaciente = IdPaciente,
                IdProfesional = IdProfesional,
                IdServicio = IdServicio,
                FechaHora = FechaHora,
                Estado = string.IsNullOrWhiteSpace(Estado) ? "programada" : Estado,
                Notas = Notas
            });
        }

        await _context.SaveChangesAsync();
        return Redirect(string.IsNullOrWhiteSpace(ReturnUrl) ? "/gestion-de-citas/st-adm-09-citas" : ReturnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/eliminar-cita")]
    public async Task<IActionResult> EliminarCita([FromForm] int IdCita, [FromForm] string? ReturnUrl)
    {
        var cita = await _context.Citas.FindAsync(IdCita);
        if (cita != null)
        {
            _context.Citas.Remove(cita);
            await _context.SaveChangesAsync();
        }

        return Redirect(string.IsNullOrWhiteSpace(ReturnUrl) ? "/gestion-de-citas/st-adm-09-citas" : ReturnUrl);
    }

    /// <summary>
    /// Compone la agenda semanal usando las citas registradas en la base de datos.
    /// </summary>
    private async Task CargarDatosAgenda()
    {
        var hoy = DateTime.Today;
        var inicioSemana = hoy.AddDays(-(int)hoy.DayOfWeek + (int)DayOfWeek.Monday);
        var agendaDias = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();

        for (var i = 0; i < 7; i++)
        {
            var fecha = inicioSemana.AddDays(i);
            var citasDia = await _context.Citas
                .Include(c => c.Paciente)
                .Include(c => c.Profesional)
                .ThenInclude(p => p!.Usuario)
                .Include(c => c.Servicio)
                .Where(c => c.FechaHora.Date == fecha.Date)
                .OrderBy(c => c.FechaHora)
                .ToListAsync();

            agendaDias.Add(new global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel
            {
                Fecha = fecha,
                NombreDia = fecha.ToString("ddd", new System.Globalization.CultureInfo("es-ES")),
                NumeroDia = fecha.Day.ToString(),
                EsHoy = fecha.Date == hoy.Date,
                Cerrado = fecha.DayOfWeek == DayOfWeek.Sunday,
                Citas = citasDia.Select(cita => new global::SmileTrack_MVC.Models.ViewModels.AgendaCitaViewModel
                {
                    Id = cita.IdCita,
                    Hora = cita.FechaHora.ToString("HH:mm"),
                    Paciente = $"{cita.Paciente?.Nombres} {cita.Paciente?.Apellidos}".Trim(),
                    Servicio = cita.Servicio?.Nombre ?? "Consulta",
                    Consultorio = cita.Profesional != null ? "Box general" : "Sin asignar",
                    Estado = cita.Estado,
                    ClaseEstado = cita.Estado switch
                    {
                        "atendida" => "attended",
                        "cancelada" => "cancelled",
                        "programada" => "confirmed",
                        _ => "confirmed"
                    }
                }).ToList()
            });
        }

        ViewData["AgendaDias"] = agendaDias;
        ViewData["SemanaLabel"] = $"{inicioSemana:dd/MM} - {inicioSemana.AddDays(6):dd/MM}";
    }

    /// <summary>
    /// Carga las citas paginadas y los datos de apoyo para las vistas de gestión.
    /// </summary>
    private async Task CargarDatosCitas(int? editId, string returnUrl, PaginationQuery? query = null)
    {
        var pagination = query ?? new PaginationQuery();
        var page = pagination.Page < 1 ? 1 : pagination.Page;
        var pageSize = pagination.PageSize < 1 ? 10 : pagination.PageSize;

        var citasQuery = _context.Citas
            .Include(c => c.Paciente)
            .Include(c => c.Profesional)
            .ThenInclude(p => p!.Usuario)
            .Include(c => c.Servicio)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(pagination.Search))
        {
            var searchTerm = pagination.Search.Trim().ToLower();
            citasQuery = citasQuery.Where(c =>
                (c.Paciente != null && ((c.Paciente.Nombres != null && c.Paciente.Nombres.ToLower().Contains(searchTerm)) || (c.Paciente.Apellidos != null && c.Paciente.Apellidos.ToLower().Contains(searchTerm)))) ||
                (c.Profesional != null && c.Profesional.Usuario != null && ((c.Profesional.Usuario.Nombre != null && c.Profesional.Usuario.Nombre.ToLower().Contains(searchTerm)) || (c.Profesional.Usuario.Apellidos != null && c.Profesional.Usuario.Apellidos.ToLower().Contains(searchTerm)))) ||
                (c.Notas != null && c.Notas.ToLower().Contains(searchTerm)));
        }

        if (!string.IsNullOrWhiteSpace(pagination.Estado))
        {
            var estado = pagination.Estado.Trim().ToLower();
            citasQuery = citasQuery.Where(c => c.Estado != null && c.Estado.ToLower() == estado);
        }

        if (int.TryParse(pagination.Profesional, out var idProfesional))
        {
            citasQuery = citasQuery.Where(c => c.IdProfesional == idProfesional);
        }

        if (!string.IsNullOrWhiteSpace(pagination.Fecha) && DateTime.TryParse(pagination.Fecha, out var fecha))
        {
            citasQuery = citasQuery.Where(c => c.FechaHora.Date == fecha.Date);
        }

        citasQuery = citasQuery.OrderByDescending(c => c.FechaHora);

        var paged = await citasQuery.ToPagedResultAsync(page, pageSize);

        ViewData["Citas"] = paged.Items.ToList();
        ViewData["CitasPage"] = paged;
        ViewData["PaginationQuery"] = pagination;
        ViewData["SearchFilter"] = pagination.Search ?? string.Empty;
        ViewData["EstadoFilter"] = pagination.Estado ?? string.Empty;
        ViewData["ProfesionalFilter"] = pagination.Profesional ?? string.Empty;
        ViewData["FechaFilter"] = pagination.Fecha ?? string.Empty;
        ViewData["Pacientes"] = await _context.Pacientes.OrderBy(p => p.Nombres).ThenBy(p => p.Apellidos).ToListAsync();
        ViewData["Profesionales"] = await _context.Profesionales.Include(p => p.Usuario).OrderBy(p => p.Usuario != null ? p.Usuario.Nombre : "").ToListAsync();
        ViewData["ProfesionalesFilterOptions"] = await _context.Profesionales.Include(p => p.Usuario).OrderBy(p => p.Usuario != null ? p.Usuario.Nombre : "").ToListAsync();
        ViewData["Servicios"] = await _context.Servicios.Where(s => s.Estado == "activo").OrderBy(s => s.Nombre).ToListAsync();
        ViewData["ReturnUrl"] = returnUrl;

        if (editId.HasValue && editId.Value > 0)
        {
            ViewData["EditingCita"] = await _context.Citas.FindAsync(editId.Value);
        }
        else
        {
            ViewData["EditingCita"] = null;
        }
    }

    /// <summary>
    /// Calcula los indicadores del dashboard de citas para la vista administrativa.
    /// </summary>
    private async Task CargarDatosDashboard()
    {
        var hoy = DateTime.Today;
        var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
        var finMes = inicioMes.AddMonths(1);

        ViewData["TotalPacientes"] = await _context.Pacientes.CountAsync();
        ViewData["CitasHoy"] = await _context.Citas.CountAsync(c => c.FechaHora.Date == hoy);
        ViewData["ProfesionalesActivos"] = await _context.Profesionales.CountAsync();

        ViewData["IngresosDelMes"] = 0m;
        ViewData["FacturasPendientes"] = new List<(string Codigo, string Descripcion, decimal Monto)>();

        var citasDelMes = await _context.Citas
            .Where(c => c.FechaHora >= inicioMes && c.FechaHora < finMes)
            .ToListAsync();

        int atendidas = citasDelMes.Count(c => string.Equals(c.Estado, "atendida", StringComparison.OrdinalIgnoreCase));
        int confirmadas = citasDelMes.Count(c => string.Equals(c.Estado, "confirmada", StringComparison.OrdinalIgnoreCase));
        int programadas = citasDelMes.Count(c => string.Equals(c.Estado, "programada", StringComparison.OrdinalIgnoreCase));
        int canceladas = citasDelMes.Count(c => string.Equals(c.Estado, "cancelada", StringComparison.OrdinalIgnoreCase));
        int maxEstado = new[] { atendidas, confirmadas, programadas, canceladas }.DefaultIfEmpty(0).Max();

        ViewData["CitasAtendidas"] = atendidas;
        ViewData["CitasConfirmadas"] = confirmadas;
        ViewData["CitasProgramadas"] = programadas;
        ViewData["CitasCanceladas"] = canceladas;
        ViewData["PctAtendidas"] = maxEstado > 0 ? atendidas * 100 / maxEstado : 0;
        ViewData["PctConfirmadas"] = maxEstado > 0 ? confirmadas * 100 / maxEstado : 0;
        ViewData["PctProgramadas"] = maxEstado > 0 ? programadas * 100 / maxEstado : 0;
        ViewData["PctCanceladas"] = maxEstado > 0 ? canceladas * 100 / maxEstado : 0;

        var topIds = await _context.Citas
            .Where(c => c.FechaHora >= inicioMes && c.FechaHora < finMes && c.IdProfesional != null)
            .GroupBy(c => c.IdProfesional)
            .Select(g => new { IdProfesional = g.Key, Total = g.Count() })
            .OrderByDescending(g => g.Total)
            .Take(3)
            .ToListAsync();

        var idsList = topIds.Select(t => t.IdProfesional).Where(t => t.HasValue).Select(t => t!.Value).ToList();
        var profesionales = await _context.Profesionales
            .Include(p => p.Usuario)
            .Where(p => idsList.Contains(p.IdProfesional))
            .ToListAsync();

        var topProfesionales = topIds.Select(t => new
        {
            Nombre = profesionales.FirstOrDefault(p => p.IdProfesional == t.IdProfesional)?.Usuario?.Nombre ?? "Sin nombre",
            Especialidad = profesionales.FirstOrDefault(p => p.IdProfesional == t.IdProfesional)?.Especialidades.FirstOrDefault(pe => pe.Principal)?.Especialidad?.Nombre ?? "General",
            TotalCitas = t.Total
        }).ToList();

        ViewData["TopProfesionales"] = topProfesionales;
    }
}
