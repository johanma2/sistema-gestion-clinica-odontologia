using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;
using SmileTrack_MVC.Models.Shared;
using SmileTrack_MVC.Models.ViewModels;
using System.Net;

namespace SmileTrack_MVC.Controllers;

public class GestionCitasController : Controller
{
    private readonly AppDbContext _context;
    private readonly ILogger<GestionCitasController> _logger;

    public GestionCitasController(AppDbContext context, ILogger<GestionCitasController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private const string MensajeErrorFallback =
        "Ocurrió un error inesperado al cargar la página. Por favor intente nuevamente. Si el problema persiste, contacte al soporte.";

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-01-dashboard")]
    public async Task<IActionResult> Stadm01Dashboard([FromQuery] int? editId, CancellationToken ct = default)
    {
        try
        {
            await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-01-dashboard", null, ct);
            await CargarDatosDashboard(ct);
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
        catch (OperationCanceledException ocex)
        {
            _logger.LogWarning(ocex, "Solicitud cancelada Stadm01Dashboard");
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cargando Stadm01Dashboard para usuario {Usuario}",
                User.Identity?.Name ?? "anonimo");
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-08-agenda")]
    public async Task<IActionResult> Stadm08Agenda([FromQuery] int? editId, CancellationToken ct = default)
    {
        try
        {
            await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-08-agenda", null, ct);
            await CargarDatosAgenda(ct);

            ViewBag.Pacientes = await _context.Pacientes
                .Where(p => p.Estado == "activo")
                .OrderBy(p => p.Apellidos).ThenBy(p => p.Nombres)
                .Select(p => new { p.IdPaciente, DisplayName = $"{p.Apellidos}, {p.Nombres}" })
                .ToListAsync(ct);

            ViewBag.Profesionales = await _context.Profesionales
                .Include(p => p.Usuario)
                .Where(p => p.Estado == "activo")
                .Select(p => new
                {
                    p.IdProfesional,
                    DisplayName = (p.Nombres + " " + p.Apellidos).Trim() != string.Empty
                        ? (p.Nombres + " " + p.Apellidos).Trim()
                        : (p.Usuario != null ? (p.Usuario.Nombre + " " + p.Usuario.Apellidos).Trim() : "Sin Nombre")
                })
                .OrderBy(p => p.DisplayName)
                .ToListAsync(ct);

            ViewBag.Consultorios = await _context.Consultorios
                .Where(c => c.Estado == "disponible" || c.Estado == "activo")
                .Select(c => new { c.IdConsultorio, c.Nombre })
                .OrderBy(c => c.Nombre)
                .ToListAsync(ct);

            ViewBag.Servicios = await _context.Servicios
                .Where(s => s.Estado == "activo")
                .Select(s => new { s.IdServicio, s.Nombre })
                .ToListAsync(ct);

            ViewData["WeekStart"] = new DateTime(2026, 7, 20).ToString("yyyy-MM-dd");
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
        catch (OperationCanceledException ocex)
        {
            _logger.LogWarning(ocex, "Solicitud cancelada Stadm08Agenda");
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cargando Stadm08Agenda para usuario {Usuario}",
                User.Identity?.Name ?? "anonimo");
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
    }

    [HttpPost]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("api/citas/agenda")]
    public async Task<IActionResult> CrearCitaDesdeAgenda([FromBody] CitaAgendaDto dto, CancellationToken ct = default)
    {
        if (!ModelState.IsValid)
        {
            var errores = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            _logger.LogWarning("CrearCitaDesdeAgenda: ModelState invalido. Errores: {Errores}", string.Join("|", errores));
            return BadRequest(new { message = "Datos inválidos para agendar la cita.", errors = errores });
        }

        try
        {
            var profesionalExiste = await _context.Profesionales
                .AnyAsync(p => p.IdProfesional == dto.IdProfesional && p.Estado == "activo", ct);
            if (!profesionalExiste)
            {
                _logger.LogWarning("CrearCitaDesdeAgenda: Profesional {IdProfesional} no existe o inactivo", dto.IdProfesional);
                return BadRequest(new { message = "El profesional seleccionado no está disponible." });
            }

            var pacienteExiste = await _context.Pacientes
                .AnyAsync(p => p.IdPaciente == dto.IdPaciente && p.Estado == "activo", ct);
            if (!pacienteExiste)
            {
                _logger.LogWarning("CrearCitaDesdeAgenda: Paciente {IdPaciente} no existe o inactivo", dto.IdPaciente);
                return BadRequest(new { message = "El paciente seleccionado no es válido." });
            }

            if (dto.HoraFin <= dto.HoraInicio)
            {
                return BadRequest(new { message = "La hora de fin debe ser posterior a la hora de inicio." });
            }

            var inicioDto = dto.Fecha.Date.Add(dto.HoraInicio);
            var finDto = dto.Fecha.Date.Add(dto.HoraFin);

            var hayConflicto = await _context.Citas
                .AnyAsync(c => c.IdProfesional == dto.IdProfesional
                    && c.Estado != "Cancelada"
                    && c.FechaHora < finDto
                    && c.FechaHora.AddMinutes(30) > inicioDto, ct);

            if (hayConflicto)
            {
                _logger.LogInformation("Conflicto de agenda detectado para Profesional {IdProfesional} en {Fecha}", dto.IdProfesional, inicioDto);
                return Conflict(new { message = "El profesional ya tiene una cita programada en este horario. Por favor seleccione otro horario." });
            }

            var nuevaCita = new Cita
            {
                IdPaciente = dto.IdPaciente,
                IdProfesional = dto.IdProfesional,
                IdConsultorio = dto.IdConsultorio,
                IdServicio = dto.IdServicio,
                FechaHora = inicioDto,
                HoraInicio = dto.HoraInicio,
                HoraFin = dto.HoraFin,
                Estado = dto.Estado,
                Notas = dto.Notas,
                MotivoConsulta = "Consulta generada desde Agenda"
            };

            _context.Citas.Add(nuevaCita);
            var guardados = await _context.SaveChangesAsync(ct);

            if (guardados <= 0)
            {
                _logger.LogError("CrearCitaDesdeAgenda: SaveChanges devolvió 0 filas afectadas.");
                return StatusCode((int)HttpStatusCode.InternalServerError, new { message = "No se pudo guardar la cita. Intente nuevamente." });
            }

            _logger.LogInformation(
                "Cita agendada correctamente desde Agenda: IdCita={IdCita}, IdPaciente={IdPaciente}, IdProfesional={IdProfesional}, FechaHora={FechaHora}, UsuarioSolicitante={Usuario}",
                nuevaCita.IdCita,
                nuevaCita.IdPaciente,
                nuevaCita.IdProfesional,
                nuevaCita.FechaHora,
                User.Identity?.Name ?? "anonimo");

            return Ok(new { message = "Cita agendada exitosamente", id = nuevaCita.IdCita });
        }
        catch (OperationCanceledException ocex)
        {
            _logger.LogWarning(ocex, "Operacion cancelada en CrearCitaDesdeAgenda (IdPaciente={IdPaciente}, IdProfesional={IdProfesional})",
                dto?.IdPaciente, dto?.IdProfesional);
            return StatusCode((int)HttpStatusCode.BadRequest, new { message = "La operación fue cancelada por el usuario." });
        }
        catch (DbUpdateConcurrencyException cex)
        {
            _logger.LogError(cex, "Conflicto de concurrencia al crear cita en agenda.");
            return StatusCode((int)HttpStatusCode.Conflict, new { message = "Conflicto al guardar: los datos cambiaron durante la operación. Actualice y vuelva a intentar." });
        }
        catch (DbUpdateException dbex) when (EsViolacionIndiceUnico(dbex, out _))
        {
            _logger.LogError(dbex, "Violacion UNIQUE/FK al crear cita desde Agenda. IdPaciente={IdPaciente}, IdProfesional={IdProfesional}",
                dto?.IdPaciente, dto?.IdProfesional);
            return StatusCode((int)HttpStatusCode.Conflict, new { message = "Ya existe una cita registrada con estas características." });
        }
        catch (DbUpdateException dbex)
        {
            _logger.LogError(dbex, "Error BD al crear cita desde Agenda. IdPaciente={IdPaciente}, IdProfesional={IdProfesional}",
                dto?.IdPaciente, dto?.IdProfesional);
            return StatusCode((int)HttpStatusCode.InternalServerError, new { message = "Error de base de datos. Vuelva a intentar en unos segundos." });
        }
        catch (SqlException sqlex)
        {
            _logger.LogCritical(sqlex, "SqlException fatal creando cita desde Agenda. Number={Number}, Class={Class}", sqlex.Number, sqlex.Class);
            return StatusCode((int)HttpStatusCode.InternalServerError, new { message = "Error de conectividad con la base de datos." });
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Error inesperado al crear cita desde Agenda. IdPaciente={IdPaciente}, IdProfesional={IdProfesional}",
                dto?.IdPaciente, dto?.IdProfesional);
            return StatusCode((int)HttpStatusCode.InternalServerError, new { message = "Error interno del servidor. El incidente fue registrado." });
        }
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-09-citas")]
    public async Task<IActionResult> Stadm09Citas([FromQuery] int? editId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string? estado = null, [FromQuery] string? profesional = null, [FromQuery] string? fecha = null, CancellationToken ct = default)
    {
        try
        {
            await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-09-citas", new PaginationQuery
            {
                Page = page,
                PageSize = pageSize,
                Search = search,
                Estado = estado,
                Profesional = profesional,
                Fecha = fecha
            }, ct);
            return View("~/Views/Gestion_De_Citas/st-adm-09-citas/index.cshtml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cargando Stadm09Citas (pagina={Pagina}, search={Search})", page, search);
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-09-citas/index.cshtml");
        }
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-01-panel-operativo/panel-operativo")]
    public async Task<IActionResult> Staux01PanelOperativo([FromQuery] int? editId, CancellationToken ct = default)
    {
        try
        {
            await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-01-panel-operativo/panel-operativo", null, ct);
            return View("~/Views/Gestion_De_Citas/st-aux-01-panel-operativo/panel-operativo.cshtml");
        }
        catch (Exception ex) { _logger.LogError(ex, "Error Staux01PanelOperativo"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-aux-01-panel-operativo/panel-operativo.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-02-agenda-apoyo")]
    public async Task<IActionResult> Staux02AgendaApoyo([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-02-agenda-apoyo", null, ct); return View("~/Views/Gestion_De_Citas/st-aux-02-agenda-apoyo/agenda-apoyo.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Staux02AgendaApoyo"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-aux-02-agenda-apoyo/agenda-apoyo.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-05-historial-parcial")]
    public async Task<IActionResult> Staux05HistorialParcial([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-05-historial-parcial", null, ct); return View("~/Views/Gestion_De_Citas/st-aux-05-historial-parcial/historial-parcial.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Staux05HistorialParcial"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-aux-05-historial-parcial/historial-parcial.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-06-asistencia-procedi")]
    public async Task<IActionResult> Staux06AsistenciaProcedi([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-06-asistencia-procedi", null, ct); return View("~/Views/Gestion_De_Citas/st-aux-06-asistencia-procedi/asistencia-proc.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Staux06AsistenciaProcedi"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-aux-06-asistencia-procedi/asistencia-proc.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("gestion-de-citas/st-aux-09-estado-consultorio")]
    public async Task<IActionResult> Staux09EstadoConsultorio([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-09-estado-consultorio", null, ct); return View("~/Views/Gestion_De_Citas/st-aux-09-estado-consultorio/estado-consultorio.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Staux09EstadoConsultorio"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-aux-09-estado-consultorio/estado-consultorio.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar,Recepcionista")]
    [Route("gestion-de-citas/st-aux-10-citas-finalizadas")]
    public async Task<IActionResult> Staux10CitasFinalizadas([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-aux-10-citas-finalizadas", null, ct); return View("~/Views/Gestion_De_Citas/st-aux-10-citas-finalizadas/citas-finalizadas.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Staux10CitasFinalizadas"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-aux-10-citas-finalizadas/citas-finalizadas.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("gestion-de-citas/st-odo-02-agenda")]
    public async Task<IActionResult> Stodo02Agenda([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-odo-02-agenda", null, ct); return View("~/Views/Gestion_De_Citas/st-odo-02-agenda/index.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Stodo02Agenda"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-odo-02-agenda/index.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("gestion-de-citas/st-pac-01-mis-citas")]
    public async Task<IActionResult> Stpac01MisCitas([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-pac-01-mis-citas", null, ct); return View("~/Views/Gestion_De_Citas/st-pac-01-mis-citas/index.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Stpac01MisCitas"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-pac-01-mis-citas/index.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Paciente")]
    [Route("gestion-de-citas/st-pac-03-notificaciones")]
    public async Task<IActionResult> Stpac03Notificaciones([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-pac-03-notificaciones", null, ct); return View("~/Views/Gestion_De_Citas/st-pac-03-notificaciones/index.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Stpac03Notificaciones"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-pac-03-notificaciones/index.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-01-dashboard")]
    public async Task<IActionResult> Strec01Dashboard([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-rec-01-dashboard", null, ct); return View("~/Views/Gestion_De_Citas/st-rec-01-dashboard/index.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Strec01Dashboard"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-rec-01-dashboard/index.cshtml"); }
    }

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-03-gestion-citas")]
    public async Task<IActionResult> Strec03GestionCitas([FromQuery] int? editId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string? estado = null, [FromQuery] string? profesional = null, [FromQuery] string? fecha = null, CancellationToken ct = default)
    {
        try
        {
            await CargarDatosCitas(editId, "/gestion-de-citas/st-rec-03-gestion-citas", new PaginationQuery
            {
                Page = page,
                PageSize = pageSize,
                Search = search,
                Estado = estado,
                Profesional = profesional,
                Fecha = fecha
            }, ct);
            return View("~/Views/Gestion_De_Citas/st-rec-03-gestion-citas/index.cshtml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cargando Strec03GestionCitas (pagina={Pagina})", page);
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-rec-03-gestion-citas/index.cshtml");
        }
    }

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("gestion-de-citas/st-rec-05-recordatorios")]
    public async Task<IActionResult> Strec05Recordatorios([FromQuery] int? editId, CancellationToken ct = default)
    {
        try { await CargarDatosCitas(editId, "/gestion-de-citas/st-rec-05-recordatorios", null, ct); return View("~/Views/Gestion_De_Citas/st-rec-05-recordatorios/index.cshtml"); }
        catch (Exception ex) { _logger.LogError(ex, "Error Strec05Recordatorios"); TempData["ErrorValidacion"] = MensajeErrorFallback; return View("~/Views/Gestion_De_Citas/st-rec-05-recordatorios/index.cshtml"); }
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/guardar-cita")]
    public async Task<IActionResult> GuardarCita([FromForm] CitaViewModel model, CancellationToken ct = default)
    {
        var returnUrlSafe = string.IsNullOrWhiteSpace(model.ReturnUrl) ? "/gestion-de-citas/st-adm-09-citas" : model.ReturnUrl;
        var idCitaOperacion = model?.IdCita ?? 0;
        var operacion = (idCitaOperacion > 0) ? "Actualizacion" : "Creacion";

        if (!ModelState.IsValid)
        {
            var firstError = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage;
            var mensaje = firstError ?? "Datos inválidos en el formulario.";
            _logger.LogWarning("GuardarCita: ModelState invalido ({Operacion}). Detalle: {Error}", operacion, mensaje);
            TempData["ErrorValidacion"] = mensaje;
            return Redirect(returnUrlSafe);
        }

        try
        {
            if (model!.IdPaciente <= 0 || !await _context.Pacientes.AnyAsync(p => p.IdPaciente == model.IdPaciente && p.Estado == "activo", ct))
            {
                TempData["ErrorValidacion"] = "El paciente seleccionado no existe o se encuentra inactivo.";
                _logger.LogWarning("GuardarCita: Paciente {IdPaciente} no valido en operacion {Operacion}", model.IdPaciente, operacion);
                return Redirect(returnUrlSafe);
            }

            if (model.IdProfesional <= 0 || !await _context.Profesionales.AnyAsync(p => p.IdProfesional == model.IdProfesional && p.Estado == "activo", ct))
            {
                TempData["ErrorValidacion"] = "El profesional seleccionado no existe o se encuentra inactivo.";
                _logger.LogWarning("GuardarCita: Profesional {IdProfesional} no valido en operacion {Operacion}", model.IdProfesional, operacion);
                return Redirect(returnUrlSafe);
            }

            if (model.FechaHora == default || model.FechaHora < DateTime.Now.AddMinutes(-5))
            {
                TempData["ErrorValidacion"] = "La fecha y hora de la cita no son válidas o corresponden a un horario pasado.";
                return Redirect(returnUrlSafe);
            }

            if (model.IdCita.HasValue && model.IdCita.Value > 0)
            {
                var cita = await _context.Citas.FindAsync([model.IdCita.Value], ct);
                if (cita == null)
                {
                    TempData["ErrorValidacion"] = "La cita que intenta actualizar no existe.";
                    _logger.LogWarning("GuardarCita: Intento actualizar cita inexistente IdCita={IdCita}", model.IdCita.Value);
                    return Redirect(returnUrlSafe);
                }

                var hayConflicto = await _context.Citas
                    .AnyAsync(c => c.IdCita != model.IdCita.Value
                        && c.IdProfesional == model.IdProfesional
                        && c.Estado != "Cancelada"
                        && c.FechaHora < model.FechaHora.AddMinutes(30)
                        && c.FechaHora.AddMinutes(30) > model.FechaHora, ct);

                if (hayConflicto)
                {
                    TempData["ErrorValidacion"] = "El profesional ya tiene una cita asignada en este horario. Seleccione otro horario.";
                    _logger.LogInformation("Conflicto de disponibilidad al actualizar IdCita={IdCita}, IdProfesional={IdProfesional}, Fecha={Fecha}",
                        model.IdCita.Value, model.IdProfesional, model.FechaHora);
                    return Redirect(returnUrlSafe);
                }

                cita.IdPaciente = model.IdPaciente;
                cita.IdProfesional = model.IdProfesional;
                cita.IdServicio = model.IdServicio;
                cita.FechaHora = model.FechaHora;
                cita.Estado = model.Estado ?? "programada";
                cita.Notas = string.IsNullOrWhiteSpace(model.Notas) ? null : model.Notas;

                _context.Citas.Update(cita);
            }
            else
            {
                var hayConflicto = await _context.Citas
                    .AnyAsync(c => c.IdProfesional == model.IdProfesional
                        && c.Estado != "Cancelada"
                        && c.FechaHora < model.FechaHora.AddMinutes(30)
                        && c.FechaHora.AddMinutes(30) > model.FechaHora, ct);

                if (hayConflicto)
                {
                    TempData["ErrorValidacion"] = "El profesional ya tiene una cita asignada en este horario. Seleccione otro horario.";
                    return Redirect(returnUrlSafe);
                }

                var nuevaCita = new Cita
                {
                    IdPaciente = model.IdPaciente,
                    IdProfesional = model.IdProfesional,
                    IdServicio = model.IdServicio,
                    FechaHora = model.FechaHora,
                    Estado = model.Estado ?? "programada",
                    Notas = string.IsNullOrWhiteSpace(model.Notas) ? null : model.Notas,
                    MotivoConsulta = "Consulta programada desde gestion"
                };

                _context.Citas.Add(nuevaCita);
            }

            await _context.SaveChangesAsync(ct);

            _logger.LogInformation(
                "{Operacion} de cita correcta: IdCita={IdCita}, IdPaciente={IdPaciente}, IdProfesional={IdProfesional}, FechaHora={FechaHora}, Estado={Estado}, Usuario={Usuario}",
                operacion,
                idCitaOperacion > 0 ? idCitaOperacion : "nuevo",
                model.IdPaciente,
                model.IdProfesional,
                model.FechaHora,
                model.Estado ?? "programada",
                User.Identity?.Name ?? "anonimo");

            TempData["MensajeExito"] = operacion == "Creacion"
                ? "La cita se ha agendado correctamente."
                : "La cita se ha actualizado correctamente.";
        }
        catch (OperationCanceledException ocex)
        {
            _logger.LogWarning(ocex, "Operacion cancelada al guardar cita (Id={Id})", idCitaOperacion);
            TempData["ErrorValidacion"] = "La operación fue cancelada antes de finalizar.";
        }
        catch (DbUpdateConcurrencyException cex)
        {
            _logger.LogError(cex, "Conflicto de concurrencia al guardar cita Id={Id}", idCitaOperacion);
            TempData["ErrorValidacion"] = "Conflicto de datos: otro usuario modificó esta cita. Actualice la página y vuelva a intentar.";
        }
        catch (DbUpdateException dbex) when (EsViolacionIndiceUnico(dbex, out var indice))
        {
            _logger.LogError(dbex, "Violacion de restriccion UNIQUE ({Indice}) al guardar cita Id={Id}.", indice, idCitaOperacion);
            TempData["ErrorValidacion"] = "No se pudo guardar: ya existe una cita con estas características (restricción única de base de datos).";
        }
        catch (DbUpdateException dbex) when (EsViolacionIntegridadReferencial(dbex))
        {
            _logger.LogError(dbex, "Violacion FK integridad referencial al guardar cita Id={Id}.", idCitaOperacion);
            TempData["ErrorValidacion"] = "No se pudo guardar: el paciente, profesional, servicio o consultorio seleccionado no es válido.";
        }
        catch (DbUpdateException dbex)
        {
            _logger.LogError(dbex, "DbUpdateException al guardar cita Id={Id}.", idCitaOperacion);
            TempData["ErrorValidacion"] = "Ocurrió un error al guardar los cambios en la base de datos.";
        }
        catch (SqlException sqlex)
        {
            _logger.LogCritical(sqlex, "SqlException al guardar cita Id={Id}. Number={Number}.", idCitaOperacion, sqlex.Number);
            TempData["ErrorValidacion"] = "Error de conectividad con la base de datos. Intente nuevamente en unos segundos.";
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Excepcion inesperada al guardar cita Id={Id}.", idCitaOperacion);
            TempData["ErrorValidacion"] = "Ocurrió un error inesperado. El incidente fue registrado y reportado.";
        }

        return Redirect(returnUrlSafe);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/eliminar-cita")]
    public async Task<IActionResult> EliminarCita([FromForm] int IdCita, [FromForm] string? ReturnUrl, CancellationToken ct = default)
    {
        var returnUrlSafe = string.IsNullOrWhiteSpace(ReturnUrl) ? "/gestion-de-citas/st-adm-09-citas" : ReturnUrl;

        try
        {
            if (IdCita <= 0)
            {
                TempData["ErrorValidacion"] = "Identificador de cita inválido.";
                _logger.LogWarning("EliminarCita: IdCita invalido ({IdCita})", IdCita);
                return Redirect(returnUrlSafe);
            }

            var cita = await _context.Citas.FindAsync([IdCita], ct);
            if (cita == null)
            {
                TempData["ErrorValidacion"] = "La cita que intenta cancelar no existe.";
                _logger.LogWarning("EliminarCita: Cita no encontrada IdCita={IdCita}", IdCita);
                return Redirect(returnUrlSafe);
            }

            var esAdmin = User.IsInRole("Administrador");
            var esRecepcionista = User.IsInRole("Recepcionista");
            if (!esAdmin && !esRecepcionista)
            {
                TempData["ErrorValidacion"] = "No tiene permisos suficientes para cancelar esta cita.";
                _logger.LogWarning("EliminarCita: Permisos insuficientes para usuario {Usuario} al cancelar IdCita={IdCita}",
                    User.Identity?.Name ?? "anonimo", IdCita);
                return Redirect(returnUrlSafe);
            }

            cita.Estado = "cancelada";
            _context.Citas.Update(cita);
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Cita cancelada correctamente: IdCita={IdCita}, IdPaciente={IdPaciente}, IdProfesional={IdProfesional}, FechaHora={FechaHora}, UsuarioCancelador={Usuario}",
                cita.IdCita,
                cita.IdPaciente,
                cita.IdProfesional,
                cita.FechaHora,
                User.Identity?.Name ?? "anonimo");

            TempData["MensajeExito"] = "La cita fue cancelada exitosamente.";
        }
        catch (OperationCanceledException ocex)
        {
            _logger.LogWarning(ocex, "Operacion cancelada en EliminarCita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "La operación fue cancelada.";
        }
        catch (DbUpdateConcurrencyException cex)
        {
            _logger.LogError(cex, "Concurrencia al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "Conflicto: esta cita fue modificada recientemente. Actualice y vuelva a intentar.";
        }
        catch (DbUpdateException dbex) when (EsViolacionIntegridadReferencial(dbex))
        {
            _logger.LogError(dbex, "Violacion integridad referencial al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "No se puede cancelar esta cita porque tiene registros asociados (atención, factura, etc.).";
        }
        catch (DbUpdateException dbex)
        {
            _logger.LogError(dbex, "DbUpdateException al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "Ocurrió un error al intentar cancelar la cita.";
        }
        catch (SqlException sqlex)
        {
            _logger.LogCritical(sqlex, "SqlException al cancelar cita Id={Id}. Number={Number}", IdCita, sqlex.Number);
            TempData["ErrorValidacion"] = "Error de conectividad con la base de datos. Intente nuevamente.";
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Error inesperado al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "Ocurrió un error inesperado. El incidente fue registrado.";
        }

        return Redirect(returnUrlSafe);
    }

    private async Task CargarDatosAgenda(CancellationToken ct = default)
    {
        try
        {
            var hoy = DateTime.Today;
            var inicioSemana = hoy.AddDays(-(int)hoy.DayOfWeek + (int)DayOfWeek.Monday);
            var agendaDias = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();

            for (var i = 0; i < 7; i++)
            {
                var fecha = inicioSemana.AddDays(i);
                try
                {
                    var citasDia = await _context.Citas
                        .Include(c => c.Paciente)
                        .Include(c => c.Profesional)
                        .ThenInclude(p => p!.Usuario)
                        .Include(c => c.Consultorio)
                        .Include(c => c.EstadoCita)
                        .Where(c => c.FechaHora.Date == fecha.Date)
                        .OrderBy(c => c.FechaHora).ThenBy(c => c.FechaHora.TimeOfDay)
                        .ToListAsync(ct);

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
                            Hora = cita.HoraInicio?.ToString("hh\\:mm") ?? "—",
                            Paciente = $"{cita.Paciente?.Nombres} {cita.Paciente?.Apellidos}".Trim(),
                            Servicio = cita.MotivoConsulta ?? "Consulta",
                            Consultorio = cita.Consultorio?.Nombre ?? "Sin asignar",
                            Estado = cita.EstadoCita?.NombreEstado ?? "Sin estado",
                            ClaseEstado = (cita.EstadoCita?.NombreEstado ?? "").ToLowerInvariant() switch
                            {
                                "atendida" => "attended",
                                "cancelada" => "cancelled",
                                "agendada" => "confirmed",
                                _ => "confirmed"
                            }
                        }).ToList()
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error cargando citas para dia {Fecha} en CargarDatosAgenda. Se continua con dias restantes.", fecha);
                    agendaDias.Add(new global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel
                    {
                        Fecha = fecha,
                        NombreDia = fecha.ToString("ddd", new System.Globalization.CultureInfo("es-ES")),
                        NumeroDia = fecha.Day.ToString(),
                        EsHoy = fecha.Date == hoy.Date,
                        Cerrado = fecha.DayOfWeek == DayOfWeek.Sunday,
                        Citas = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaCitaViewModel>()
                    });
                }
            }

            ViewData["AgendaDias"] = agendaDias;
            ViewData["SemanaLabel"] = $"{inicioSemana:dd/MM} - {inicioSemana.AddDays(6):dd/MM}";
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("CargarDatosAgenda: operacion cancelada");
            ViewData["AgendaDias"] = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();
        }
        catch (SqlException sqlex)
        {
            _logger.LogCritical(sqlex, "SqlException CargarDatosAgenda. Number={Number}", sqlex.Number);
            ViewData["AgendaDias"] = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error general en CargarDatosAgenda. Se devuelve agenda vacia.");
            ViewData["AgendaDias"] = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();
            ViewData["SemanaLabel"] = "Agenda no disponible temporalmente";
        }
    }

    private async Task CargarDatosCitas(int? editId, string returnUrl, PaginationQuery? query = null, CancellationToken ct = default)
    {
        try
        {
            var pagination = query ?? new PaginationQuery();
            var page = pagination.Page < 1 ? 1 : pagination.Page;
            var pageSize = pagination.PageSize < 1 ? 10 : pagination.PageSize;

            var citasQuery = _context.Citas
                .Include(c => c.Paciente)
                .Include(c => c.Profesional)
                    .ThenInclude(p => p!.Usuario)
                .Include(c => c.Profesional)
                    .ThenInclude(p => p!.Especialidades)
                        .ThenInclude(pe => pe.Especialidad)
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

            if (int.TryParse(pagination.Profesional, out var idProfesional) && idProfesional > 0)
            {
                citasQuery = citasQuery.Where(c => c.IdProfesional == idProfesional);
            }

            if (!string.IsNullOrWhiteSpace(pagination.Fecha) && DateTime.TryParse(pagination.Fecha, out var fechaValida))
            {
                citasQuery = citasQuery.Where(c => c.FechaHora.Date == fechaValida.Date);
            }

            citasQuery = citasQuery.OrderByDescending(c => c.FechaHora).ThenByDescending(c => c.FechaHora.TimeOfDay);

            var paged = await citasQuery.ToPagedResultAsync(page, pageSize, ct);

            ViewData["Citas"] = paged.Items.ToList();
            ViewData["CitasPage"] = paged;
            ViewData["PaginationQuery"] = pagination;
            ViewData["SearchFilter"] = pagination.Search ?? string.Empty;
            ViewData["EstadoFilter"] = pagination.Estado ?? string.Empty;
            ViewData["ProfesionalFilter"] = pagination.Profesional ?? string.Empty;
            ViewData["FechaFilter"] = pagination.Fecha ?? string.Empty;
            ViewData["Pacientes"] = await _context.Pacientes.AsNoTracking().Where(p => p.Estado == "activo").OrderBy(p => p.Apellidos).ThenBy(p => p.Nombres).ToListAsync(ct);
            ViewData["Profesionales"] = await _context.Profesionales.AsNoTracking().Include(p => p.Usuario).Where(p => p.Estado == "activo").OrderBy(p => p.Apellidos).ToListAsync(ct);
            ViewData["ProfesionalesFilterOptions"] = await _context.Profesionales.AsNoTracking().Include(p => p.Usuario).Where(p => p.Estado == "activo").OrderBy(p => p.Apellidos).ToListAsync(ct);
            ViewData["Consultorios"] = await _context.Consultorios.AsNoTracking().Where(c => c.Estado == "disponible" || c.Estado == "activo").OrderBy(c => c.Nombre).ToListAsync(ct);
            ViewData["EstadosCita"] = await _context.EstadosCita.AsNoTracking().OrderBy(e => e.NombreEstado).ToListAsync(ct);
            ViewData["Servicios"] = await _context.Servicios.AsNoTracking().Where(s => s.Estado == "activo").OrderBy(s => s.Nombre).ToListAsync(ct);
            ViewData["ReturnUrl"] = returnUrl;

            if (editId > 0)
            {
                try
                {
                    ViewData["EditingCita"] = await _context.Citas.AsNoTracking().FirstOrDefaultAsync(c => c.IdCita == editId.Value, ct);
                }
                catch (Exception exEditar)
                {
                    _logger.LogWarning(exEditar, "Error cargando cita para editar IdCita={IdCita}", editId.Value);
                    ViewData["EditingCita"] = null;
                }
            }
            else
            {
                ViewData["EditingCita"] = null;
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("CargarDatosCitas: operacion cancelada");
            InicializarViewDataCitasVacia(returnUrl);
        }
        catch (InvalidOperationException ioex)
        {
            _logger.LogError(ioex, "InvalidOperationException en CargarDatosCitas (filtros: Search={Search}, Estado={Estado}, Profesional={Profesional}, Fecha={Fecha})",
                query?.Search, query?.Estado, query?.Profesional, query?.Fecha);
            InicializarViewDataCitasVacia(returnUrl);
            TempData["ErrorValidacion"] = "Error al aplicar los filtros de búsqueda. Se muestran resultados sin filtrar.";
        }
        catch (SqlException sqlex)
        {
            _logger.LogCritical(sqlex, "SqlException en CargarDatosCitas. Number={Number}", sqlex.Number);
            InicializarViewDataCitasVacia(returnUrl);
            TempData["ErrorValidacion"] = MensajeErrorFallback;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error general en CargarDatosCitas. Se devuelven listas vacias.");
            InicializarViewDataCitasVacia(returnUrl);
        }
    }

    private void InicializarViewDataCitasVacia(string returnUrl)
    {
        ViewData["Citas"] = new List<Cita>();
        ViewData["CitasPage"] = PagedResult<Cita>.Empty(1, 10);
        ViewData["PaginationQuery"] = new PaginationQuery();
        ViewData["SearchFilter"] = string.Empty;
        ViewData["EstadoFilter"] = string.Empty;
        ViewData["ProfesionalFilter"] = string.Empty;
        ViewData["FechaFilter"] = string.Empty;
        ViewData["Pacientes"] = new List<Paciente>();
        ViewData["Profesionales"] = new List<Profesional>();
        ViewData["ProfesionalesFilterOptions"] = new List<Profesional>();
        ViewData["Consultorios"] = new List<Consultorio>();
        ViewData["EstadosCita"] = new List<EstadoCita>();
        ViewData["Servicios"] = new List<Servicio>();
        ViewData["ReturnUrl"] = returnUrl;
        ViewData["EditingCita"] = null;
    }

    private async Task CargarDatosDashboard(CancellationToken ct = default)
    {
        try
        {
            var hoy = DateTime.Today;
            var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
            var finMes = inicioMes.AddMonths(1);

            ViewData["TotalPacientes"] = await _context.Pacientes.CountAsync(ct);
            ViewData["CitasHoy"] = await _context.Citas.CountAsync(c => c.FechaHora.Date == hoy, ct);
            ViewData["ProfesionalesActivos"] = await _context.Profesionales.CountAsync(p => p.Estado == "activo", ct);

            var citasDelMes = await _context.Citas
                .Include(c => c.Servicio)
                .Where(c => c.FechaHora >= inicioMes && c.FechaHora < finMes)
                .AsNoTracking()
                .ToListAsync(ct);

            var ingresos = citasDelMes
                .Where(c => string.Equals(c.Estado, "Atendida", StringComparison.OrdinalIgnoreCase))
                .Sum(c => c.Servicio?.Precio ?? 0m);
            ViewData["IngresosDelMes"] = ingresos;
            ViewData["FacturasPendientes"] = new List<(string Codigo, string Descripcion, decimal Monto)>();

            int daysInMonth = DateTime.DaysInMonth(hoy.Year, hoy.Month);
            int totalCapacity = daysInMonth * 40;
            int totalCitas = citasDelMes.Count;
            ViewData["PctOcupacion"] = totalCapacity > 0 ? (int)Math.Min(100, (double)totalCitas / totalCapacity * 100) : 0;

            int atendidas = citasDelMes.Count(c => string.Equals(c.Estado, "Atendida", StringComparison.OrdinalIgnoreCase));
            int confirmadas = citasDelMes.Count(c => string.Equals(c.Estado, "Confirmada", StringComparison.OrdinalIgnoreCase));
            int programadas = citasDelMes.Count(c => string.Equals(c.Estado, "Agendada", StringComparison.OrdinalIgnoreCase));
            int canceladas = citasDelMes.Count(c => string.Equals(c.Estado, "Cancelada", StringComparison.OrdinalIgnoreCase));
            int maxEstado = new[] { atendidas, confirmadas, programadas, canceladas }.DefaultIfEmpty(0).Max();

            ViewData["CitasAtendidas"] = atendidas;
            ViewData["CitasConfirmadas"] = confirmadas;
            ViewData["CitasProgramadas"] = programadas;
            ViewData["CitasCanceladas"] = canceladas;
            ViewData["PctAtendidas"] = maxEstado > 0 ? (int)Math.Round(atendidas * 100.0 / maxEstado, 0) : 0;
            ViewData["PctConfirmadas"] = maxEstado > 0 ? (int)Math.Round(confirmadas * 100.0 / maxEstado, 0) : 0;
            ViewData["PctProgramadas"] = maxEstado > 0 ? (int)Math.Round(programadas * 100.0 / maxEstado, 0) : 0;
            ViewData["PctCanceladas"] = maxEstado > 0 ? (int)Math.Round(canceladas * 100.0 / maxEstado, 0) : 0;

            var topIds = await _context.Citas
                .Where(c => c.FechaHora >= inicioMes && c.FechaHora < finMes && c.IdProfesional != null && c.IdProfesional != 0)
                .GroupBy(c => c.IdProfesional)
                .Select(g => new { IdProfesional = g.Key, Total = g.Count() })
                .OrderByDescending(g => g.Total)
                .Take(3)
                .ToListAsync(ct);

            var idsList = topIds.Select(t => t.IdProfesional).ToList();
            var profesionales = await _context.Profesionales
                .Include(p => p.Usuario)
                .Include(p => p.Especialidades).ThenInclude(pe => pe.Especialidad)
                .Where(p => idsList.Contains(p.IdProfesional))
                .AsNoTracking()
                .ToListAsync(ct);

            var topProfesionales = topIds.Select(t => new
            {
                Nombre = profesionales.FirstOrDefault(p => p.IdProfesional == t.IdProfesional)?.Usuario?.Nombre ?? "Sin nombre",
                Especialidad = profesionales.FirstOrDefault(p => p.IdProfesional == t.IdProfesional)?.Especialidades.FirstOrDefault(pe => pe.Principal)?.Especialidad?.Nombre ?? "General",
                TotalCitas = t.Total
            }).ToList();

            ViewData["TopProfesionales"] = topProfesionales;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("CargarDatosDashboard cancelado");
            InicializarViewDataDashboardVacio();
        }
        catch (SqlException sqlex)
        {
            _logger.LogCritical(sqlex, "SqlException en CargarDatosDashboard. Number={Number}", sqlex.Number);
            InicializarViewDataDashboardVacio();
            TempData["ErrorValidacion"] = MensajeErrorFallback;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error general en CargarDatosDashboard. Se devuelven valores predeterminados.");
            InicializarViewDataDashboardVacio();
        }
    }

    private void InicializarViewDataDashboardVacio()
    {
        ViewData["TotalPacientes"] = 0;
        ViewData["CitasHoy"] = 0;
        ViewData["ProfesionalesActivos"] = 0;
        ViewData["IngresosDelMes"] = 0m;
        ViewData["FacturasPendientes"] = new List<(string, string, decimal)>();
        ViewData["PctOcupacion"] = 0;
        ViewData["CitasAtendidas"] = 0;
        ViewData["CitasConfirmadas"] = 0;
        ViewData["CitasProgramadas"] = 0;
        ViewData["CitasCanceladas"] = 0;
        ViewData["PctAtendidas"] = 0;
        ViewData["PctConfirmadas"] = 0;
        ViewData["PctProgramadas"] = 0;
        ViewData["PctCanceladas"] = 0;
        ViewData["TopProfesionales"] = new List<object>();
    }

    private static bool EsViolacionIndiceUnico(DbUpdateException dbex, out string? indiceAfectado)
    {
        indiceAfectado = null;
        var sqlEx = dbex.InnerException as SqlException ?? dbex.InnerException?.InnerException as SqlException;
        if (sqlEx == null) return false;
        if (sqlEx.Number == 2601 || sqlEx.Number == 2627)
        {
            indiceAfectado = sqlEx.Message;
            return true;
        }
        return false;
    }

    private static bool EsViolacionIntegridadReferencial(DbUpdateException dbex)
    {
        var sqlEx = dbex.InnerException as SqlException ?? dbex.InnerException?.InnerException as SqlException;
        if (sqlEx == null) return false;
        return sqlEx.Number is 547 or 515;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista,Profesional,Auxiliar")]
    [Route("centro-de-ayuda/como-programar-cita")]
    public IActionResult CentroDeAyudaComoProgramarCita()
    {
        try
        {
            var userName = User.Identity?.Name ?? "Usuario SmileTrack";
            var emailClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

            var partesNombre = userName.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var initials = string.Join("", partesNombre.Take(2).Select(p => char.ToUpperInvariant(p[0])));
            if (string.IsNullOrWhiteSpace(initials)) initials = "ST";

            ViewData["UserInitials"] = initials;
            ViewData["UserFullName"] = userName;
            ViewData["UserEmail"] = !string.IsNullOrWhiteSpace(emailClaim) ? emailClaim : "usuario@smiletrack.local";

            return View("~/Views/Centro_De_Ayuda/Como_Programar_Una_Cita/ComoProgramarUnaCita.cshtml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error CentroDeAyudaComoProgramarCita");
            return View("~/Views/Centro_De_Ayuda/Como_Programar_Una_Cita/ComoProgramarUnaCita.cshtml");
        }
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista,Profesional,Auxiliar")]
    [Route("centro-de-ayuda/guias-tutoriales")]
    public IActionResult CentroDeAyudaGuiasTutoriales()
    {
        return View("~/Views/Centro_De_Ayuda/Guias_Tutoriales_y_Soporte/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista,Profesional,Auxiliar")]
    [Route("centro-de-ayuda/soporte")]
    public IActionResult CentroDeAyudaSoporte()
    {
        return View("~/Views/Centro_De_Ayuda/Guia De Usuario/SoporteTicket.cshtml");
    }
}
