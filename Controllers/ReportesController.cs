using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.ViewModels;

namespace SmileTrack_MVC.Controllers;

[Authorize]
public class ReportesController : Controller
{
    private readonly AppDbContext _context;

    public ReportesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Route("reportes/vista-admin")]
    [Route("reportes")]
    public async Task<IActionResult> VistaAdmin(string? categoria)
    {
        var userName = User.Identity?.Name ?? "Administrador";
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Administrador";

        var totalPacientes = await _context.Pacientes.CountAsync();
        var totalCitas = await _context.Citas.CountAsync();

        var model = new ReportesViewModel
        {
            NombreUsuario = userName,
            Rol = userRole,
            FotoPerfilUrl = "/images/Imagenes/Logos/logo.jpg",
            UltimaActualizacion = DateTime.Now.AddMinutes(-5),

            IngresosTotales = 45200000m,
            VariacionIngresos = 12.5,
            NuevosPacientes = totalPacientes > 0 ? totalPacientes : 48,
            VariacionPacientes = 8.2,
            CitasCompletadas = totalCitas > 0 ? totalCitas : 342,
            VariacionCitas = 5.4,
            TasaRetencion = 89.0,
            VariacionRetencion = 2.1,
            TasaInasistencia = 4.5,
            VariacionInasistencia = -1.2,
            OcupacionAgenda = 92.0,
            VariacionOcupacion = 3.8,

            FiltroCategoria = string.IsNullOrWhiteSpace(categoria) ? "todos" : categoria.ToLower(),

            CrecimientoClinica = new List<CrecimientoItemViewModel>
            {
                new() { Mes = "Ene", ValorActual = 65, ValorAnterior = 50 },
                new() { Mes = "Feb", ValorActual = 72, ValorAnterior = 55 },
                new() { Mes = "Mar", ValorActual = 80, ValorAnterior = 60 },
                new() { Mes = "Abr", ValorActual = 78, ValorAnterior = 62 },
                new() { Mes = "May", ValorActual = 88, ValorAnterior = 70 },
                new() { Mes = "Jun", ValorActual = 95, ValorAnterior = 75 },
                new() { Mes = "Jul", ValorActual = 92, ValorAnterior = 80 }
            },

            DistribucionServicios = new List<DistribucionServicioViewModel>
            {
                new() { Nombre = "Limpieza dental", Porcentaje = 35, Color = "#6366f1" },
                new() { Nombre = "Ortodoncia", Porcentaje = 25, Color = "#10b981" },
                new() { Nombre = "Endodoncia", Porcentaje = 20, Color = "#f59e0b" },
                new() { Nombre = "Blanqueamiento", Porcentaje = 12, Color = "#8b5cf6" },
                new() { Nombre = "Otros", Porcentaje = 8, Color = "#ec4899" }
            },

            IngresosPorProfesional = new List<IngresoProfesionalViewModel>
            {
                new() { Nombre = "Dr. Ricardo Méndez", Monto = 18500000m, Porcentaje = 41.0 },
                new() { Nombre = "Dra. Elena Sotelo", Monto = 14200000m, Porcentaje = 31.4 },
                new() { Nombre = "Dr. Carlos Ruiz", Monto = 12500000m, Porcentaje = 27.6 }
            },

            EstadoCitas = new List<EstadoCitaViewModel>
            {
                new() { Estado = "Completadas", Cantidad = 310, Porcentaje = 75.6 },
                new() { Estado = "Programadas", Cantidad = 65, Porcentaje = 15.8 },
                new() { Estado = "Canceladas", Cantidad = 20, Porcentaje = 4.9 },
                new() { Estado = "Inasistencias", Cantidad = 15, Porcentaje = 3.7 }
            },

            Procedimientos = new List<ProcedimientoReporteViewModel>
            {
                new() { Nombre = "Limpieza Profiláctica Completa", Icono = "clean_hands", Cantidad = 124, IngresosGenerados = 9920000m, PrecioPromedio = 80000m, Tendencia = 14.2 },
                new() { Nombre = "Ajuste de Ortodoncia", Icono = "dentistry", Cantidad = 98, IngresosGenerados = 19600000m, PrecioPromedio = 200000m, Tendencia = 8.5 },
                new() { Nombre = "Tratamiento de Conducto", Icono = "health_and_safety", Cantidad = 45, IngresosGenerados = 20250000m, PrecioPromedio = 450000m, Tendencia = -2.1 },
                new() { Nombre = "Blanqueamiento LED", Icono = "auto_awesome", Cantidad = 32, IngresosGenerados = 11200000m, PrecioPromedio = 350000m, Tendencia = 18.9 }
            },

            ReportesRecientes = new List<ReporteRecienteItemViewModel>
            {
                new() { Id = 1, Nombre = "Consolidado Mensual de Ingresos - Julio", Categoria = "Financiero", Icono = "payments", FechaGenerado = DateTime.Now.AddDays(-1), Estado = "Listo" },
                new() { Id = 2, Nombre = "Estadísticas de Retención y Nuevos Pacientes", Categoria = "Pacientes", Icono = "group", FechaGenerado = DateTime.Now.AddDays(-3), Estado = "Listo" },
                new() { Id = 3, Nombre = "Eficiencia de Consultorios y Ocupación", Categoria = "Operativo", Icono = "meeting_room", FechaGenerado = DateTime.Now.AddDays(-5), Estado = "Listo" },
                new() { Id = 4, Nombre = "Inventario e Insumos Dentales Utilizados", Categoria = "Logística", Icono = "inventory_2", FechaGenerado = DateTime.Now.AddDays(-7), Estado = "Listo" }
            }
        };

        if (!string.IsNullOrWhiteSpace(categoria) && !categoria.Equals("todos", StringComparison.OrdinalIgnoreCase))
        {
            model.ReportesRecientes = model.ReportesRecientes
                .Where(r => r.Categoria.Equals(categoria, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return View("~/Views/Reportes/vista_admin/index.cshtml", model);
    }

    [HttpGet]
    [Route("reportes/vista-prof")]
    public async Task<IActionResult> VistaProf()
    {
        var userName = User.Identity?.Name ?? "Profesional";
        var totalPacientes = await _context.Pacientes.CountAsync();
        var totalCitas = await _context.Citas.CountAsync();

        var model = new ReportesProfesionalViewModel
        {
            DoctorName = userName,
            DoctorRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Odontólogo(a)",

            TotalCitas = totalCitas > 0 ? totalCitas : 128,
            TendenciaCitas = 8.4,
            Ingresos = 18500000m,
            TendenciaIngresos = 12.1,
            PacientesUnicos = totalPacientes > 0 ? totalPacientes : 64,
            Cancelaciones = 9,
            TasaCancelacion = 4.2,

            DuracionPromedio = "28 min",
            TasaPuntualidad = 96,
            SatisfaccionPaciente = "4.8/5",
            ResenasTotales = 57,
            CitasHoy = 6,
            CitasManana = 8,

            Tratamientos = new List<TratamientoProfViewModel>
            {
                new() { Nombre = "Ortodoncia", Cantidad = 42, Porcentaje = 33 },
                new() { Nombre = "Limpieza dental", Cantidad = 35, Porcentaje = 27 },
                new() { Nombre = "Endodoncia", Cantidad = 18, Porcentaje = 14 },
                new() { Nombre = "Blanqueamiento", Cantidad = 12, Porcentaje = 9 }
            },

            PacientesFrecuentes = new List<PacienteFrecuenteViewModel>
            {
                new() { Iniciales = "MJ", Color = "blue",   Nombre = "María Jiménez", Tipo = "Fiel",       TipoClase = "patient-badge--loyal",     Citas = 14, Periodo = "últimos 6 meses" },
                new() { Iniciales = "CR", Color = "purple", Nombre = "Carlos Rodríguez", Tipo = "Recurrente", TipoClase = "patient-badge--recurrent", Citas = 9,  Periodo = "últimos 6 meses" },
                new() { Iniciales = "LP", Color = "blue",   Nombre = "Laura Pérez",   Tipo = "Recurrente", TipoClase = "patient-badge--recurrent", Citas = 7,  Periodo = "últimos 6 meses" }
            },

            ProximosDias = new List<ProximoDiaViewModel>
            {
                new() { DiaNombre = "Hoy",     Fecha = DateTime.Now.ToString("dd MMM"),                CantidadCitas = 6, EsHoy = true },
                new() { DiaNombre = "Mañana",  Fecha = DateTime.Now.AddDays(1).ToString("dd MMM"),     CantidadCitas = 8 },
                new() { DiaNombre = "Jueves",  Fecha = DateTime.Now.AddDays(2).ToString("dd MMM"),     CantidadCitas = 5 },
                new() { DiaNombre = "Viernes", Fecha = DateTime.Now.AddDays(3).ToString("dd MMM"),     CantidadCitas = 10, EsPico = true }
            },

            UltimasCitas = new List<CitaRecienteViewModel>
            {
                new() { NombrePaciente = "María Jiménez",    IdPaciente = 1021, Servicio = "Ajuste de ortodoncia", Hora = "09:00 am", Estado = "Completada", EstadoClase = "status--completed" },
                new() { NombrePaciente = "Carlos Rodríguez",  IdPaciente = 1034, Servicio = "Limpieza dental",      Hora = "10:30 am", Estado = "Pendiente",  EstadoClase = "status--pending" },
                new() { NombrePaciente = "Laura Pérez",       IdPaciente = 1052, Servicio = "Endodoncia",           Hora = "12:00 pm", Estado = "Cancelada",  EstadoClase = "status--cancelled" }
            }
        };

        return View("~/Views/Reportes/vista_prof/index.cshtml", model);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [Route("reportes/descargar/{id}")]
    public IActionResult DescargarReporte(int id)
    {
        var contenidoDummy = $"SmileTrack Reporte #{id}\nGenerado el: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\nEstado: Exportado exitosamente.";
        var bytes = System.Text.Encoding.UTF8.GetBytes(contenidoDummy);
        return File(bytes, "text/csv", $"Reporte_{id}_{DateTime.Now:yyyyMMdd}.csv");
    }

    [HttpGet]
    [Route("reportes/procedimientos")]
    public IActionResult TodosProcedimientos()
    {
        return RedirectToAction(nameof(VistaAdmin));
    }

    [HttpGet]
    [Route("reportes/lista")]
    public IActionResult TodosReportes()
    {
        return RedirectToAction(nameof(VistaAdmin));
    }
}
