/**
 * ============================================
 * SmileTrack — Controller: Gestión de Citas
 * ============================================
 * Autor: Johan Santamaria
 * Fecha: 2026-07-30
 * PROPÓSITO:
 * Centraliza la lógica de negocio para todos los módulos
 * relacionados con citas: dashboards, agenda, gestión integral,
 * paneles auxiliares y vistas de profesionales/pacientes.
 * PATRONES APLICADOS:
 * - Constructor injection para dependencias (ILogger, AppDbContext)
 * - CancellationToken en todas las operaciones asíncronas para soporte de cancelación
 * - Try-catch estratificado: logs específicos por tipo de excepción para debugging preciso
 * - TempData para mensajes amigables al usuario final sin exponer detalles técnicos
 * - Validación de ownership implícita vía [Authorize(Roles=...)] para seguridad por capas
 * 
 * RUTAS PRINCIPALES:
 * - GET /gestion-de-citas/st-adm-01-dashboard → Dashboard Admin
 * - GET /gestion-de-citas/st-adm-08-agenda → Agenda General
 * - POST /api/citas/agenda → Crear cita desde agenda (API REST)
 * - GET /gestion-de-citas/st-adm-09-citas → Gestión Integral
 * - POST /gestion-de-citas/guardar-cita → Guardar/Actualizar cita
 * - POST /gestion-de-citas/eliminar-cita → Cancelar cita (soft delete)
 * 
 * NOTAS DE MANTENIMIENTO:
 * - Los comentarios explican el "por qué" de las decisiones, no el "qué" del código
 * - Las rutas usan atributos [Route] explícitos para resiliencia ante cambios de routing
 * - Los datos sensibles se loguean sin exponer información personal (PII)
 * ============================================
 */

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

/**
 * ============================================
 * Controller: Gestión de Citas
 * ============================================
 * Autor: Johan Santamaria
 * 
 * PROPÓSITO:
 * Centraliza la lógica de negocio para módulos de citas,
 * incluyendo dashboards, agenda y gestión integral.
 * 
 * PATRONES APLICADOS:
 * - Constructor injection para dependencias (ILogger, AppDbContext)
 * - CancellationToken para operaciones asíncronas cancelables
 * - Try-catch estratificado: logs específicos por tipo de excepción
 * - TempData para mensajes de error amigables al usuario final
 * ============================================
 */
public class GestionCitasController(AppDbContext context, ILogger<GestionCitasController> logger) : Controller
{
    // WHY: Campos readonly para inmutabilidad después de la construcción, previniendo reasignación accidental
    private readonly AppDbContext _context = context;
    private readonly ILogger<GestionCitasController> _logger = logger;
    
    // WHY: Array estático para evitar re-creación en cada llamada a Split, optimizando performance
    private static readonly char[] _separadorEspacio = [' '];

    // WHY: Mensaje genérico para errores no controlados: evita exponer detalles técnicos al usuario final por seguridad
    private const string MensajeErrorFallback =
        "Ocurrió un error inesperado al cargar la página. Por favor intente nuevamente. Si el problema persiste, contacte al soporte.";

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-01-dashboard")]
    public async Task<IActionResult> Stadm01Dashboard([FromQuery] int? editId, CancellationToken ct = default)
    {
        // TRY/CATCH ESTRATIFICADO:
        // - OperationCanceledException: se loguea como warning (no es error real, solo timeout/cancelación de usuario)
        // - DbUpdateException: problema de integridad en BD, se loguea con detalle técnico para debugging
        // - SqlException: caída de conexión o timeout de SQL Server, requiere atención de infraestructura
        // - Exception genérica: catch-all para errores no anticipados, nunca expone stack trace al usuario
        try
        {
            await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-01-dashboard", null, ct);
            await CargarDatosDashboard(ct);
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
        catch (OperationCanceledException ocex)
        {
            // WHY: OperationCanceledException ocurre cuando el usuario cancela la request o hay timeout;
            // no es un error de negocio, por eso se loguea como warning y se retorna vista normal para mejor UX
            _logger.LogWarning(ocex, "Solicitud cancelada Stadm01Dashboard para usuario {Usuario}", 
                User.Identity?.Name ?? "anonimo");
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
        catch (DbUpdateException dbEx)
        {
            // WHY: DbUpdateException indica problema de integridad en BD (ej: constraint violado, FK rota);
            // se loguea con detalle técnico para el equipo de desarrollo, pero al usuario se le muestra mensaje genérico
            _logger.LogError(dbEx, "Error de base de datos en Stadm01Dashboard: {Message}", dbEx.Message);
            TempData["ErrorValidacion"] = "Error al consultar datos. Intente nuevamente.";
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
        catch (SqlException sqlEx)
        {
            // WHY: SqlException puede indicar caída de conexión o timeout de SQL Server;
            // se loguea el número de error para diagnóstico de infraestructura, pero se protege al usuario de detalles sensibles
            _logger.LogError(sqlEx, "Error SQL {Number} en Stadm01Dashboard", sqlEx.Number);
            TempData["ErrorValidacion"] = "Servicio temporalmente no disponible. Intente en unos minutos.";
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para excepciones no anticipadas; se loguea stack trace completo para debugging posterior,
            // pero nunca se expone al usuario final por seguridad (previene información disclosure)
            _logger.LogError(ex, "Error crítico cargando Stadm01Dashboard para usuario {Usuario} en {Path}",
                User.Identity?.Name ?? "anonimo", HttpContext.Request.Path);
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-01-dashboard/index.cshtml");
        }
    }

    [HttpGet]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/st-adm-08-agenda")]
    public async Task<IActionResult> Stadm08Agenda([FromQuery] int? editId, [FromQuery] DateTime? weekStart, [FromQuery] int? professionalId, [FromQuery] int? officeId, CancellationToken ct = default)
    {
        // TRY/CATCH ESTRATIFICADO: mismo patrón que Stadm01Dashboard para consistencia en manejo de errores
        try
        {
            await CargarDatosCitas(editId, "/gestion-de-citas/st-adm-08-agenda", null, ct);
            await CargarDatosAgenda(weekStart, professionalId, officeId, ct);

            // WHY: Cargar dropdowns con filtros de estado activo para evitar opciones inválidas en UI
            ViewBag.Pacientes = await _context.Pacientes
                .Where(p => p.Estado == "activo")
                .OrderBy(p => p.Apellidos).ThenBy(p => p.Nombres)
                .Select(p => new { p.IdPaciente, DisplayName = $"{p.Apellidos}, {p.Nombres}" })
                .ToListAsync(ct);

            // WHY: Construir DisplayName con fallback para manejar profesionales sin usuario asociado
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

            // WHY: Fecha base controlada para demos/pruebas, inyectada vía ViewData para que JS la use
            ViewData["WeekStart"] = new DateTime(2026, 7, 20).ToString("yyyy-MM-dd");
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
        catch (OperationCanceledException ocex)
        {
            _logger.LogWarning(ocex, "Solicitud cancelada Stadm08Agenda para usuario {Usuario}", User.Identity?.Name ?? "anonimo");
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Error de base de datos en Stadm08Agenda: {Message}", dbEx.Message);
            TempData["ErrorValidacion"] = "Error al consultar datos. Intente nuevamente.";
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
        catch (SqlException sqlEx)
        {
            _logger.LogError(sqlEx, "Error SQL {Number} en Stadm08Agenda", sqlEx.Number);
            TempData["ErrorValidacion"] = "Servicio temporalmente no disponible. Intente en unos minutos.";
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error crítico cargando Stadm08Agenda para usuario {Usuario} en {Path}",
                User.Identity?.Name ?? "anonimo", HttpContext.Request.Path);
            TempData["ErrorValidacion"] = MensajeErrorFallback;
            return View("~/Views/Gestion_De_Citas/st-adm-08-agenda/index.cshtml");
        }
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Policy = "ApiOrCookie")]
    [Route("api/appointments")]
    public async Task<IActionResult> CrearCitaDesdeAppointments([FromBody] CitaAgendaDto dto, CancellationToken ct = default)
    {
        return await CrearCitaDesdeAgendaInterna(dto, ct);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Policy = "ApiOrCookie")]
    [Route("api/citas/agenda")]
    public async Task<IActionResult> CrearCitaDesdeAgenda([FromBody] CitaAgendaDto dto, CancellationToken ct = default)
    {
        return await CrearCitaDesdeAgendaInterna(dto, ct);
    }

    private async Task<IActionResult> CrearCitaDesdeAgendaInterna(CitaAgendaDto dto, CancellationToken ct)
    {
        // WHY: Validar ModelState primero para evitar procesamiento de datos inválidos
        if (!ModelState.IsValid)
        {
            var errores = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            _logger.LogWarning("CrearCitaDesdeAgenda: ModelState invalido. Errores: {Errores}", string.Join("|", errores));
            return BadRequest(new { message = "Datos inválidos para agendar la cita.", errors = errores });
        }

        try
        {
            // VALIDACIONES DE NEGOCIO PREVIAS:
            // 1. Profesional y paciente deben existir y estar activos
            // 2. Hora fin debe ser posterior a hora inicio
            // 3. No debe haber conflicto de horarios para el profesional
            // WHY: Validar en capa de aplicación antes de intentar guardar en BD previene errores costosos

            var profesionalExiste = await _context.Profesionales
                .AnyAsync(p => p.IdProfesional == dto.IdProfesional && p.Estado == "activo", ct);
            if (!profesionalExiste)
            {
                // WHY: Loguear con Warning porque es validación de negocio esperada, no error de sistema
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

            // WHY: Calcular rangos de tiempo para detectar conflictos de agenda (ventana de 30 min de buffer)
            var inicioDto = dto.Fecha.Date.Add(dto.HoraInicio);
            var finDto = dto.Fecha.Date.Add(dto.HoraFin);

            var hayConflicto = await _context.Citas
                .AnyAsync(c => c.IdProfesional == dto.IdProfesional
                    && c.Estado != "Cancelada"
                    && c.FechaHora < finDto
                    && c.FechaHora.AddMinutes(30) > inicioDto
                    && (!dto.IdCita.HasValue || c.IdCita != dto.IdCita.Value), ct);

            if (hayConflicto)
            {
                // WHY: Loguear con Info porque es flujo esperado (usuario eligió horario ocupado)
                _logger.LogInformation("Conflicto de agenda detectado para Profesional {IdProfesional} en {Fecha}", dto.IdProfesional, inicioDto);
                return Conflict(new { message = "El profesional ya tiene una cita programada en este horario. Por favor seleccione otro horario." });
            }

            Cita citaEntidad;
            if (dto.IdCita.HasValue && dto.IdCita.Value > 0)
            {
                citaEntidad = await _context.Citas.FirstOrDefaultAsync(c => c.IdCita == dto.IdCita.Value, ct)
                    ?? throw new InvalidOperationException("Cita no encontrada");

                citaEntidad.IdPaciente = dto.IdPaciente;
                citaEntidad.IdProfesional = dto.IdProfesional;
                citaEntidad.IdConsultorio = dto.IdConsultorio;
                citaEntidad.IdServicio = dto.IdServicio;
                citaEntidad.FechaHora = inicioDto;
                citaEntidad.HoraInicio = dto.HoraInicio;
                citaEntidad.HoraFin = dto.HoraFin;
                citaEntidad.Estado = dto.Estado;
                citaEntidad.Notas = dto.Notas;
                citaEntidad.MotivoConsulta = "Consulta actualizada desde Agenda";
                _context.Citas.Update(citaEntidad);
            }
            else
            {
                citaEntidad = new Cita
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

                _context.Citas.Add(citaEntidad);
            }

            var guardados = await _context.SaveChangesAsync(ct);

            if (guardados <= 0)
            {
                // WHY: SaveChanges devolviendo 0 indica posible problema de concurrencia o trigger
                _logger.LogError("CrearCitaDesdeAgenda: SaveChanges devolvió 0 filas afectadas.");
                return StatusCode((int)HttpStatusCode.InternalServerError, new { message = "No se pudo guardar la cita. Intente nuevamente." });
            }

            // WHY: Loguear éxito con datos mínimos necesarios para auditoría, sin exponer PII completa
            _logger.LogInformation(
                "Cita agendada correctamente desde Agenda: IdCita={IdCita}, IdPaciente={IdPaciente}, IdProfesional={IdProfesional}, FechaHora={FechaHora}, UsuarioSolicitante={Usuario}",
                citaEntidad.IdCita,
                citaEntidad.IdPaciente,
                citaEntidad.IdProfesional,
                citaEntidad.FechaHora,
                User.Identity?.Name ?? "anonimo");

            return Ok(new { success = true, message = dto.IdCita.HasValue && dto.IdCita.Value > 0 ? "Cita actualizada exitosamente" : "Cita agendada exitosamente", id = citaEntidad.IdCita, updated = dto.IdCita.HasValue && dto.IdCita.Value > 0 });
        }
        catch (OperationCanceledException ocex)
        {
            _logger.LogWarning(ocex, "Operacion cancelada en CrearCitaDesdeAgenda (IdPaciente={IdPaciente}, IdProfesional={IdProfesional})",
                dto?.IdPaciente, dto?.IdProfesional);
            return StatusCode((int)HttpStatusCode.BadRequest, new { message = "La operación fue cancelada por el usuario." });
        }
        catch (DbUpdateConcurrencyException cex)
        {
            // WHY: ConcurrencyException indica que otro usuario modificó los datos durante la operación
            _logger.LogError(cex, "Conflicto de concurrencia al crear cita en agenda.");
            return StatusCode((int)HttpStatusCode.Conflict, new { message = "Conflicto al guardar: los datos cambiaron durante la operación. Actualice y vuelva a intentar." });
        }
        catch (DbUpdateException dbex) when (EsViolacionIndiceUnico(dbex, out _))
        {
            // WHY: Violación de índice único indica cita duplicada; se maneja con mensaje amigable
            _logger.LogError(dbex, "Violacion UNIQUE/FK al crear cita desde Agenda. IdPaciente={IdPaciente}, IdProfesional={IdProfesional}",
                dto?.IdPaciente, dto?.IdProfesional);
            return StatusCode((int)HttpStatusCode.Conflict, new { message = "Ya existe una cita registrada con estas características." });
        }
        catch (DbUpdateException dbex)
        {
            // WHY: DbUpdateException genérica puede indicar problemas de schema o triggers
            _logger.LogError(dbex, "Error BD al crear cita desde Agenda. IdPaciente={IdPaciente}, IdProfesional={IdProfesional}",
                dto?.IdPaciente, dto?.IdProfesional);
            return StatusCode((int)HttpStatusCode.InternalServerError, new { message = "Error de base de datos. Vuelva a intentar en unos segundos." });
        }
        catch (SqlException sqlex)
        {
            // WHY: SqlException crítica requiere atención inmediata de infraestructura
            _logger.LogCritical(sqlex, "SqlException fatal creando cita desde Agenda. Number={Number}, Class={Class}", sqlex.Number, sqlex.Class);
            return StatusCode((int)HttpStatusCode.InternalServerError, new { message = "Error de conectividad con la base de datos." });
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para errores no anticipados; nunca exponer detalles al usuario
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
            // WHY: Loguear contexto de filtros para debugging, pero retornar vista con mensaje genérico
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
        var returnUrlSafe = !string.IsNullOrWhiteSpace(model?.ReturnUrl) && Url.IsLocalUrl(model.ReturnUrl)
            ? model.ReturnUrl
            : "/gestion-de-citas/st-adm-09-citas";
        var idCitaOperacion = model?.IdCita ?? 0;
        var operacion = (idCitaOperacion > 0) ? "Actualizacion" : "Creacion";

        // WHY: Validar ModelState antes de cualquier lógica de negocio para feedback inmediato al usuario
        if (!ModelState.IsValid || model == null)
        {
            var firstError = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage;
            var mensaje = firstError ?? "Datos inválidos en el formulario.";
            _logger.LogWarning("GuardarCita: ModelState invalido ({Operacion}). Detalle: {Error}", operacion, mensaje);
            TempData["ErrorValidacion"] = mensaje;
            return Redirect(returnUrlSafe);
        }

        try
        {
            if (model.FechaHora == default && model.Fecha != default && model.HoraInicio.HasValue)
            {
                model.FechaHora = model.Fecha.Date.Add(model.HoraInicio.Value);
            }

            if (model.HoraFin.HasValue && model.HoraInicio.HasValue && model.HoraFin <= model.HoraInicio)
            {
                TempData["ErrorValidacion"] = "La hora de fin debe ser posterior a la hora de inicio.";
                return Redirect(returnUrlSafe);
            }

            // VALIDACIONES DE INTEGRIDAD:
            // 1. Paciente y profesional deben existir y estar activos
            // 2. FechaHora debe ser válida (no en pasado)
            // 3. Para actualizaciones: verificar que la cita existe
            // 4. Para ambas: validar que no hay conflicto de horarios
            // WHY: Prevenir datos inconsistentes antes de intentar SaveChanges

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

            if (model.IdCita is > 0)
            {
                // WHY: Para actualización, verificar que la cita existe antes de modificar
                var cita = await _context.Citas.FindAsync(model.IdCita.Value, ct);
                if (cita == null)
                {
                    TempData["ErrorValidacion"] = "La cita que intenta actualizar no existe.";
                    _logger.LogWarning("GuardarCita: Intento actualizar cita inexistente IdCita={IdCita}", model.IdCita.Value);
                    return Redirect(returnUrlSafe);
                }

                // WHY: Validar conflicto excluyendo la cita actual que se está editando
                var hayConflicto = await _context.Citas
                    .AnyAsync(c => c.IdCita != model.IdCita.Value
                        && c.IdProfesional == model.IdProfesional
                        && !string.Equals(c.Estado, "Cancelada", StringComparison.OrdinalIgnoreCase)
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
                cita.IdConsultorio = model.IdConsultorio;
                cita.IdEstado = model.IdEstado;
                cita.FechaHora = model.FechaHora;
                cita.Estado = await BuildEstadoNombreAsync(model.IdEstado, model.Estado, cita.Estado, ct);
                cita.Notas = BuildNotasCita(model);

                _context.Citas.Update(cita);
            }
            else
            {
                // WHY: Para creación, validar conflicto con todas las citas activas del profesional
                var hayConflicto = await _context.Citas
                    .AnyAsync(c => c.IdProfesional == model.IdProfesional
                        && !string.Equals(c.Estado, "Cancelada", StringComparison.OrdinalIgnoreCase)
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
                    IdConsultorio = model.IdConsultorio,
                    IdEstado = model.IdEstado,
                    FechaHora = model.FechaHora,
                    Estado = await BuildEstadoNombreAsync(model.IdEstado, model.Estado, "programada", ct),
                    Notas = BuildNotasCita(model),
                    MotivoConsulta = "Consulta programada desde gestion"
                };

                _context.Citas.Add(nuevaCita);
            }

            await _context.SaveChangesAsync(ct);

            // WHY: Loguear éxito con datos mínimos para auditoría, sin exponer PII completa
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
            // WHY: ConcurrencyException indica que otro usuario modificó la cita durante la edición
            _logger.LogError(cex, "Conflicto de concurrencia al guardar cita Id={Id}", idCitaOperacion);
            TempData["ErrorValidacion"] = "Conflicto de datos: otro usuario modificó esta cita. Actualice la página y vuelva a intentar.";
        }
        catch (DbUpdateException dbex) when (EsViolacionIndiceUnico(dbex, out var indice))
        {
            // WHY: Violación de índice único indica cita duplicada; se maneja con mensaje amigable
            _logger.LogError(dbex, "Violacion de restriccion UNIQUE ({Indice}) al guardar cita Id={Id}.", indice, idCitaOperacion);
            TempData["ErrorValidacion"] = "No se pudo guardar: ya existe una cita con estas características (restricción única de base de datos).";
        }
        catch (DbUpdateException dbex) when (EsViolacionIntegridadReferencial(dbex))
        {
            // WHY: Violación de FK indica referencia a entidad inexistente; se maneja con mensaje claro
            _logger.LogError(dbex, "Violacion FK integridad referencial al guardar cita Id={Id}.", idCitaOperacion);
            TempData["ErrorValidacion"] = "No se pudo guardar: el paciente, profesional, servicio o consultorio seleccionado no es válido.";
        }
        catch (DbUpdateException dbex)
        {
            // WHY: DbUpdateException genérica puede indicar problemas de schema o triggers
            _logger.LogError(dbex, "DbUpdateException al guardar cita Id={Id}.", idCitaOperacion);
            TempData["ErrorValidacion"] = "Ocurrió un error al guardar los cambios en la base de datos.";
        }
        catch (SqlException sqlex)
        {
            // WHY: SqlException crítica requiere atención inmediata de infraestructura
            _logger.LogCritical(sqlex, "SqlException al guardar cita Id={Id}. Number={Number}.", idCitaOperacion, sqlex.Number);
            TempData["ErrorValidacion"] = "Error de conectividad con la base de datos. Intente nuevamente en unos segundos.";
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para errores no anticipados; nunca exponer detalles al usuario
            _logger.LogCritical(ex, "Excepcion inesperada al guardar cita Id={Id}.", idCitaOperacion);
            TempData["ErrorValidacion"] = "Ocurrió un error inesperado. El incidente fue registrado y reportado.";
        }

        return Redirect(returnUrlSafe);
    }

    private static string? BuildNotasCita(CitaViewModel model)
    {
        if (!string.IsNullOrWhiteSpace(model.MotivoConsulta)) return model.MotivoConsulta.Trim();
        if (!string.IsNullOrWhiteSpace(model.Notas)) return model.Notas.Trim();
        if (!string.IsNullOrWhiteSpace(model.NotasPrevias)) return model.NotasPrevias.Trim();
        return null;
    }

    private async Task<string> BuildEstadoNombreAsync(int? idEstado, string? estadoFallback, string estadoActual, CancellationToken ct)
    {
        if (idEstado.HasValue && idEstado.Value > 0)
        {
                var estado = await _context.EstadosCita.FindAsync(idEstado.Value, ct);
        }

        if (!string.IsNullOrWhiteSpace(estadoFallback))
        {
            return estadoFallback.Trim();
        }

        return estadoActual ?? "programada";
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Administrador,Recepcionista")]
    [Route("gestion-de-citas/eliminar-cita")]
    public async Task<IActionResult> EliminarCita([FromForm] int IdCita, [FromForm] string? ReturnUrl, CancellationToken ct = default)
    {
        var returnUrlSafe = !string.IsNullOrWhiteSpace(ReturnUrl) && Url.IsLocalUrl(ReturnUrl)
            ? ReturnUrl
            : "/gestion-de-citas/st-adm-09-citas";

        try
        {
            // WHY: Validar ID antes de consultar BD para evitar queries innecesarias
            if (IdCita <= 0)
            {
                TempData["ErrorValidacion"] = "Identificador de cita inválido.";
                _logger.LogWarning("EliminarCita: IdCita invalido ({IdCita})", IdCita);
                return Redirect(returnUrlSafe);
            }

            var cita = await _context.Citas.FindAsync(IdCita, ct);
            if (cita == null)
            {
                // WHY: Loguear con Warning porque es flujo esperado (cita ya eliminada o ID inválido)
                TempData["ErrorValidacion"] = "La cita que intenta cancelar no existe.";
                _logger.LogWarning("EliminarCita: Cita no encontrada IdCita={IdCita}", IdCita);
                return Redirect(returnUrlSafe);
            }

            // WHY: Verificar permisos explícitos además del atributo [Authorize] para defensa en profundidad
            var esAdmin = User.IsInRole("Administrador");
            var esRecepcionista = User.IsInRole("Recepcionista");
            if (!esAdmin && !esRecepcionista)
            {
                TempData["ErrorValidacion"] = "No tiene permisos suficientes para cancelar esta cita.";
                _logger.LogWarning("EliminarCita: Permisos insuficientes para usuario {Usuario} al cancelar IdCita={IdCita}",
                    User.Identity?.Name ?? "anonimo", IdCita);
                return Redirect(returnUrlSafe);
            }

            // WHY: Soft delete vía cambio de estado en lugar de DELETE físico para preservar historial
            cita.Estado = "cancelada";
            _context.Citas.Update(cita);
            await _context.SaveChangesAsync(ct);

            // WHY: Loguear éxito con datos mínimos para auditoría, sin exponer PII completa
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
            // WHY: ConcurrencyException indica que otro usuario modificó la cita durante la operación
            _logger.LogError(cex, "Concurrencia al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "Conflicto: esta cita fue modificada recientemente. Actualice y vuelva a intentar.";
        }
        catch (DbUpdateException dbex) when (EsViolacionIntegridadReferencial(dbex))
        {
            // WHY: Violación de FK indica que hay registros dependientes (atención, factura, etc.)
            _logger.LogError(dbex, "Violacion integridad referencial al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "No se puede cancelar esta cita porque tiene registros asociados (atención, factura, etc.).";
        }
        catch (DbUpdateException dbex)
        {
            // WHY: DbUpdateException genérica puede indicar problemas de schema o triggers
            _logger.LogError(dbex, "DbUpdateException al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "Ocurrió un error al intentar cancelar la cita.";
        }
        catch (SqlException sqlex)
        {
            // WHY: SqlException crítica requiere atención inmediata de infraestructura
            _logger.LogCritical(sqlex, "SqlException al cancelar cita Id={Id}. Number={Number}", IdCita, sqlex.Number);
            TempData["ErrorValidacion"] = "Error de conectividad con la base de datos. Intente nuevamente.";
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para errores no anticipados; nunca exponer detalles al usuario
            _logger.LogCritical(ex, "Error inesperado al cancelar cita Id={Id}", IdCita);
            TempData["ErrorValidacion"] = "Ocurrió un error inesperado. El incidente fue registrado.";
        }

        return Redirect(returnUrlSafe);
    }

    /**
     * CargarDatosAgenda: Construye ViewModel para vista de agenda semanal.
     * WHY: Separa lógica de carga de datos para mantener el action limpio y testeable.
     * MANEJO DE ERRORES: Catch por día para que un error en un día no rompa toda la semana.
     */
    private async Task CargarDatosAgenda(DateTime? weekStart = null, int? professionalId = null, int? officeId = null, CancellationToken ct = default)
    {
        try
        {
            // WHY: Calcular inicio de semana (lunes) para iterar 7 días consecutivos
            var hoy = DateTime.Today;
            var inicioSemana = weekStart?.Date ?? hoy;
            if (inicioSemana.DayOfWeek != DayOfWeek.Monday)
            {
                inicioSemana = inicioSemana.AddDays(-(int)inicioSemana.DayOfWeek + (int)DayOfWeek.Monday);
            }
            var agendaDias = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();

            for (var i = 0; i < 7; i++)
            {
                var fecha = inicioSemana.AddDays(i);
                try
                {
                    // WHY: Incluir relaciones necesarias para mostrar datos completos en vista
                    var citasDiaQuery = _context.Citas
                        .Include(c => c.Paciente)
                        .Include(c => c.Profesional).ThenInclude(p => p!.Usuario)
                        .Include(c => c.Consultorio)
                        .Include(c => c.EstadoCita)
                        .Where(c => c.FechaHora.Date == fecha.Date);

                    if (professionalId.HasValue)
                    {
                        citasDiaQuery = citasDiaQuery.Where(c => c.IdProfesional == professionalId.Value);
                    }

                    if (officeId.HasValue)
                    {
                        citasDiaQuery = citasDiaQuery.Where(c => c.IdConsultorio == officeId.Value);
                    }

                    var citasDia = await citasDiaQuery
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
                            IdPaciente = cita.IdPaciente,
                            IdProfesional = cita.IdProfesional ?? 0,
                            IdConsultorio = cita.IdConsultorio ?? 0,
                            IdServicio = cita.IdServicio ?? 0,
                            Fecha = cita.FechaHora.Date,
                            Hora = cita.HoraInicio?.ToString("hh\\:mm") ?? "—",
                            HoraInicio = cita.HoraInicio?.ToString("HH:mm") ?? "00:00",
                            HoraFin = cita.HoraFin?.ToString("HH:mm") ?? "00:00",
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
                            },
                            Notas = cita.Notas ?? string.Empty
                        }).ToList()
                    });
                }
                catch (Exception ex)
                {
                    // WHY: Catch por día para que un error en un día no rompa toda la semana
                    _logger.LogError(ex, "Error cargando citas para dia {Fecha} en CargarDatosAgenda. Se continua con dias restantes.", fecha);
                    agendaDias.Add(new global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel
                    {
                        Fecha = fecha,
                        NombreDia = fecha.ToString("ddd", new System.Globalization.CultureInfo("es-ES")),
                        NumeroDia = fecha.Day.ToString(),
                        EsHoy = fecha.Date == hoy.Date,
                        Cerrado = fecha.DayOfWeek == DayOfWeek.Sunday,
                        Citas = []
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
            // WHY: SqlException crítica requiere atención inmediata de infraestructura
            _logger.LogCritical(sqlex, "SqlException CargarDatosAgenda. Number={Number}", sqlex.Number);
            ViewData["AgendaDias"] = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para errores no anticipados; retornar estado vacío para que la vista maneje gracefully
            _logger.LogError(ex, "Error general en CargarDatosAgenda. Se devuelve agenda vacia.");
            ViewData["AgendaDias"] = new List<global::SmileTrack_MVC.Models.ViewModels.AgendaDiaViewModel>();
            ViewData["SemanaLabel"] = "Agenda no disponible temporalmente";
        }
    }

    /**
     * CargarDatosCitas: Prepara datos paginados y filtrados para vistas de gestión.
     * WHY: Centraliza lógica de filtrado y paginación para evitar duplicación en múltiples actions.
     * MANEJO DE ERRORES: Catch específico para InvalidOperationException en filtros mal formados.
     */
    private async Task CargarDatosCitas(int? editId, string returnUrl, PaginationQuery? query = null, CancellationToken ct = default)
    {
        try
        {
            var pagination = query ?? new PaginationQuery();
            var page = pagination.Page < 1 ? 1 : pagination.Page;
            var pageSize = pagination.PageSize < 1 ? 10 : pagination.PageSize;

            // WHY: Construir query base con includes necesarios para evitar N+1 queries
            var citasQuery = _context.Citas
                .Include(c => c.Paciente)
                .Include(c => c.Profesional)
                    .ThenInclude(p => p!.Usuario)
                .Include(c => c.Profesional)
                    .ThenInclude(p => p!.Especialidades)
                        .ThenInclude(pe => pe.Especialidad)
                .AsQueryable();

            // WHY: Aplicar filtros de búsqueda con StringComparison.OrdinalIgnoreCase para consistencia
            if (!string.IsNullOrWhiteSpace(pagination.Search))
            {
                var searchTerm = pagination.Search.Trim();
                citasQuery = citasQuery.Where(c =>
                    (c.Paciente != null && ((c.Paciente.Nombres != null && c.Paciente.Nombres.Contains(searchTerm, StringComparison.OrdinalIgnoreCase)) || (c.Paciente.Apellidos != null && c.Paciente.Apellidos.Contains(searchTerm, StringComparison.OrdinalIgnoreCase)))) ||
                    (c.Profesional != null && c.Profesional.Usuario != null && ((c.Profesional.Usuario.Nombre != null && c.Profesional.Usuario.Nombre.Contains(searchTerm, StringComparison.OrdinalIgnoreCase)) || (c.Profesional.Usuario.Apellidos != null && c.Profesional.Usuario.Apellidos.Contains(searchTerm, StringComparison.OrdinalIgnoreCase)))) ||
                    (c.Notas != null && c.Notas.Contains(searchTerm, StringComparison.OrdinalIgnoreCase)));
            }

            // WHY: Filtro por estado con comparación case-insensitive para mejor UX
            if (!string.IsNullOrWhiteSpace(pagination.Estado))
            {
                var estado = pagination.Estado.Trim();
                citasQuery = citasQuery.Where(c => c.Estado != null && c.Estado.Equals(estado, StringComparison.OrdinalIgnoreCase));
            }

            // WHY: Parsear ID de profesional solo si es numérico válido para evitar errores de conversión
            if (int.TryParse(pagination.Profesional, out var idProfesional) && idProfesional > 0)
            {
                citasQuery = citasQuery.Where(c => c.IdProfesional == idProfesional);
            }

            // WHY: Parsear fecha solo si es válida para evitar excepciones en filtro
            if (!string.IsNullOrWhiteSpace(pagination.Fecha) && DateTime.TryParse(pagination.Fecha, out var fechaValida))
            {
                citasQuery = citasQuery.Where(c => c.FechaHora.Date == fechaValida.Date);
            }

            // WHY: Ordenar por fecha descendente para mostrar citas más recientes primero
            citasQuery = citasQuery.OrderByDescending(c => c.FechaHora).ThenByDescending(c => c.FechaHora.TimeOfDay);

            var paged = await citasQuery.ToPagedResultAsync(page, pageSize, ct);

            // WHY: Poblar ViewData con datos paginados y filtros activos para preservar estado en UI
            ViewData["Citas"] = paged.Items.ToList();
            ViewData["CitasPage"] = paged;
            ViewData["PaginationQuery"] = pagination;
            ViewData["SearchFilter"] = pagination.Search ?? string.Empty;
            ViewData["EstadoFilter"] = pagination.Estado ?? string.Empty;
            ViewData["ProfesionalFilter"] = pagination.Profesional ?? string.Empty;
            ViewData["FechaFilter"] = pagination.Fecha ?? string.Empty;
            
            // WHY: Cargar dropdowns con AsNoTracking para mejor performance en lecturas
            ViewData["Pacientes"] = await _context.Pacientes.AsNoTracking().Where(p => p.Estado == "activo").OrderBy(p => p.Apellidos).ThenBy(p => p.Nombres).ToListAsync(ct);
            ViewData["Profesionales"] = await _context.Profesionales.AsNoTracking().Include(p => p.Usuario).Where(p => p.Estado == "activo").OrderBy(p => p.Apellidos).ToListAsync(ct);
            ViewData["ProfesionalesFilterOptions"] = await _context.Profesionales.AsNoTracking().Include(p => p.Usuario).Where(p => p.Estado == "activo").OrderBy(p => p.Apellidos).ToListAsync(ct);
            ViewData["Consultorios"] = await _context.Consultorios.AsNoTracking().Where(c => c.Estado == "disponible" || c.Estado == "activo").OrderBy(c => c.Nombre).ToListAsync(ct);
            ViewData["EstadosCita"] = await _context.EstadosCita.AsNoTracking().OrderBy(e => e.NombreEstado).ToListAsync(ct);
            ViewData["Servicios"] = await _context.Servicios.AsNoTracking().Where(s => s.Estado == "activo").OrderBy(s => s.Nombre).ToListAsync(ct);
            ViewData["ReturnUrl"] = returnUrl;

            // WHY: Cargar cita para edición solo si editId es válido, con catch interno para no romper toda la vista
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
            // WHY: InvalidOperationException puede indicar filtros mal formados o LINQ inválido
            _logger.LogError(ioex, "InvalidOperationException en CargarDatosCitas (filtros: Search={Search}, Estado={Estado}, Profesional={Profesional}, Fecha={Fecha})",
                query?.Search, query?.Estado, query?.Profesional, query?.Fecha);
            InicializarViewDataCitasVacia(returnUrl);
            TempData["ErrorValidacion"] = "Error al aplicar los filtros de búsqueda. Se muestran resultados sin filtrar.";
        }
        catch (SqlException sqlex)
        {
            // WHY: SqlException crítica requiere atención inmediata de infraestructura
            _logger.LogCritical(sqlex, "SqlException en CargarDatosCitas. Number={Number}", sqlex.Number);
            InicializarViewDataCitasVacia(returnUrl);
            TempData["ErrorValidacion"] = MensajeErrorFallback;
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para errores no anticipados; retornar estado vacío para que la vista maneje gracefully
            _logger.LogError(ex, "Error general en CargarDatosCitas. Se devuelven listas vacias.");
            InicializarViewDataCitasVacia(returnUrl);
        }
    }

    // WHY: Método helper para inicializar ViewData vacía y evitar NullReferenceException en vistas
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

    /**
     * CargarDatosDashboard: Calcula KPIs y métricas para vista de dashboard.
     * WHY: Separa cálculos complejos del action principal para mejor testabilidad y mantenimiento.
     * OPTIMIZACIÓN: Usa AsNoTracking() y proyecciones para minimizar carga de memoria.
     */
    private async Task CargarDatosDashboard(CancellationToken ct = default)
    {
        try
        {
            var hoy = DateTime.Today;
            var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
            var finMes = inicioMes.AddMonths(1);

            // WHY: Conteos simples con CountAsync para queries eficientes
            ViewData["TotalPacientes"] = await _context.Pacientes.CountAsync(ct);
            ViewData["CitasHoy"] = await _context.Citas.CountAsync(c => c.FechaHora.Date == hoy, ct);
            ViewData["ProfesionalesActivos"] = await _context.Profesionales.CountAsync(p => p.Estado == "activo", ct);

            // WHY: Cargar citas del mes con Include mínimo necesario para cálculo de ingresos
            var citasDelMes = await _context.Citas
                .Include(c => c.Servicio)
                .Where(c => c.FechaHora >= inicioMes && c.FechaHora < finMes)
                .AsNoTracking()
                .ToListAsync(ct);

            // WHY: Calcular ingresos solo de citas atendidas con fallback a 0 si Servicio es null
            var ingresos = citasDelMes
                .Where(c => string.Equals(c.Estado, "Atendida", StringComparison.OrdinalIgnoreCase))
                .Sum(c => c.Servicio?.Precio ?? 0m);
            ViewData["IngresosDelMes"] = ingresos;
            ViewData["FacturasPendientes"] = new List<(string Codigo, string Descripcion, decimal Monto)>();

            // WHY: Calcular ocupación con capacidad estimada (40 citas/día) y limitar a 100%
            int daysInMonth = DateTime.DaysInMonth(hoy.Year, hoy.Month);
            int totalCapacity = daysInMonth * 40;
            int totalCitas = citasDelMes.Count;
            ViewData["PctOcupacion"] = totalCapacity > 0 ? (int)Math.Min(100, (double)totalCitas / totalCapacity * 100) : 0;

            // WHY: Calcular distribución de estados y porcentajes relativos al estado más frecuente
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

            // WHY: Obtener top 3 profesionales por citas con proyección anónima para minimizar carga
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

            // WHY: Proyectar datos mínimos necesarios para la vista de top profesionales
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
            // WHY: SqlException crítica requiere atención inmediata de infraestructura
            _logger.LogCritical(sqlex, "SqlException en CargarDatosDashboard. Number={Number}", sqlex.Number);
            InicializarViewDataDashboardVacio();
            TempData["ErrorValidacion"] = MensajeErrorFallback;
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para errores no anticipados; retornar valores predeterminados para que la vista maneje gracefully
            _logger.LogError(ex, "Error general en CargarDatosDashboard. Se devuelven valores predeterminados.");
            InicializarViewDataDashboardVacio();
        }
    }

    // WHY: Método helper para inicializar ViewData de dashboard con valores predeterminados
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

    /**
     * Detecta si una DbUpdateException es por violación de índice único (SQL error 2601 o 2627).
     * WHY: Permite mostrar mensaje amigable al usuario en lugar de error técnico crudo.
     * @param dbex La excepción de actualización de base de datos
     * @param indiceAfectado Output: mensaje de error SQL si aplica
     * @return true si es violación de índice único
     */
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

    /**
     * Detecta si una DbUpdateException es por violación de integridad referencial (SQL error 547 o 515).
     * WHY: Permite manejar casos donde no se puede eliminar/actualizar por relaciones existentes.
     * @param dbex La excepción de actualización de base de datos
     * @return true si es violación de FK
     */
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

            // WHY: Generar iniciales para avatar con fallback seguro si nombre está vacío
            var partesNombre = userName.Split(_separadorEspacio, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var initials = string.Join("", partesNombre.Take(2).Select(p => char.ToUpperInvariant(p[0])));
            if (string.IsNullOrWhiteSpace(initials)) initials = "ST";

            ViewData["UserInitials"] = initials;
            ViewData["UserFullName"] = userName;
            ViewData["UserEmail"] = !string.IsNullOrWhiteSpace(emailClaim) ? emailClaim : "usuario@smiletrack.local";

            return View("~/Views/Centro_De_Ayuda/Como_Programar_Una_Cita/ComoProgramarUnaCita.cshtml");
        }
        catch (Exception ex)
        {
            // WHY: Catch-all para errores no anticipados; retornar vista igual para no romper UX
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