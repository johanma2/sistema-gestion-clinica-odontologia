using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;

namespace SmileTrack_MVC.Controllers;

public class FacturacionPagosController : Controller
{
    private readonly AppDbContext _context;

    public FacturacionPagosController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Obtiene todas las facturas registradas. Si la tabla está vacía (primer arranque
    /// sin datos de facturación aún), siembra un pequeño conjunto de ejemplo para que
    /// las vistas de Facturación y Reportes Financieros no queden en blanco.
    /// </summary>
    private async Task<List<Factura>> ObtenerFacturasConSeedAsync()
    {
        var facturasDb = await _context.Facturas
            .Include(f => f.Paciente)
            .OrderByDescending(f => f.FechaFactura)
            .ToListAsync();

        if (!facturasDb.Any())
        {
            var adminUser = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == "admin@smiletrack.co");
            var pacientes = await _context.Pacientes.Take(5).ToListAsync();
            if (pacientes.Count > 0 && adminUser != null)
            {
                var f1 = new Factura { NumeroFactura = "FAC-2026-001", FechaFactura = DateTime.Today.AddDays(-5), Subtotal = 1200000, Total = 1200000, Estado = "parcial", IdPaciente = pacientes[0].IdPaciente, GeneradaPor = adminUser.IdUsuario, Notas = "Tratamiento ortodoncia" };
                var f2 = new Factura { NumeroFactura = "FAC-2026-002", FechaFactura = DateTime.Today.AddDays(-3), Subtotal = 850000, Total = 850000, Estado = "pendiente", IdPaciente = pacientes.Count > 1 ? pacientes[1].IdPaciente : pacientes[0].IdPaciente, GeneradaPor = adminUser.IdUsuario, Notas = "Limpieza y blanqueamiento" };
                var f3 = new Factura { NumeroFactura = "FAC-2026-003", FechaFactura = DateTime.Today.AddDays(-1), Subtotal = 560000, Total = 560000, Estado = "pagada", IdPaciente = pacientes.Count > 2 ? pacientes[2].IdPaciente : pacientes[0].IdPaciente, GeneradaPor = adminUser.IdUsuario, Notas = "Consulta general" };

                _context.Facturas.AddRange(f1, f2, f3);
                await _context.SaveChangesAsync();

                facturasDb = await _context.Facturas
                    .Include(f => f.Paciente)
                    .OrderByDescending(f => f.FechaFactura)
                    .ToListAsync();
            }
        }

        return facturasDb;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("facturacion-y-pagos/st-adm-12-facturacion")]
    public async Task<IActionResult> Stadm12Facturacion()
    {
        var facturasDb = await ObtenerFacturasConSeedAsync();

        var colores = new[] { "blue", "green", "purple", "orange", "red" };
        var facturas = facturasDb.Select((f, idx) => new
        {
            id = f.IdFactura,
            number = f.NumeroFactura,
            patient = f.Paciente != null ? $"{f.Paciente.Nombres} {f.Paciente.Apellidos}" : "Paciente",
            doc = f.Paciente != null ? f.Paciente.Documento : "N/A",
            date = f.FechaFactura.ToString("yyyy-MM-dd"),
            total = f.Total,
            pending = f.Estado == "pagada" ? 0 : f.Estado == "parcial" ? f.Total / 2 : f.Total,
            status = f.Estado,
            avatar = f.Paciente != null ? $"{f.Paciente.Nombres.FirstOrDefault()}{f.Paciente.Apellidos.FirstOrDefault()}".ToUpper() : "PA",
            color = colores[idx % colores.Length],
            history = new object[] { }
        }).ToList();

        ViewData["FacturasJson"] = System.Text.Json.JsonSerializer.Serialize(facturas);
        return View("~/Views/Facturacion_Y_Pagos/st-adm-12-facturacion/gestionfacturacion.cshtml", facturas);
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("facturacion-y-pagos/st-adm-13-reportes-financieros")]
    public async Task<IActionResult> Stadm13ReportesFinancieros()
    {
        var facturasDb = await ObtenerFacturasConSeedAsync();

        var income = facturasDb.Sum(f => f.Total);
        var received = facturasDb.Where(f => f.Estado == "pagada").Sum(f => f.Total)
                      + facturasDb.Where(f => f.Estado == "parcial").Sum(f => f.Total / 2);
        var pending = income - received;
        var margin = income > 0 ? Math.Round(received / income * 100, 0) : 0;

        var hoy = DateTime.Today;
        var nombresMeses = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };
        var barChart = new List<object>();
        for (var i = 5; i >= 0; i--)
        {
            var mesRef = hoy.AddMonths(-i);
            var totalMes = facturasDb
                .Where(f => f.FechaFactura.Year == mesRef.Year && f.FechaFactura.Month == mesRef.Month)
                .Sum(f => f.Total);
            barChart.Add(new
            {
                month = nombresMeses[mesRef.Month - 1],
                value = totalMes,
                label = totalMes >= 1000000 ? $"${totalMes / 1000000:0.#}M" : $"${totalMes:0}",
                active = i == 0
            });
        }

        var coloresDonut = new[] { "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#dc2626", "#0891b2" };
        var donutChart = facturasDb
            .GroupBy(f => string.IsNullOrWhiteSpace(f.Notas) ? "Servicios Generales" : f.Notas)
            .Select((g, idx) => new
            {
                label = g.Key,
                value = income > 0 ? (int)Math.Round(g.Sum(f => f.Total) / income * 100) : 0,
                color = coloresDonut[idx % coloresDonut.Length]
            })
            .ToList();

        var coloresAvatar = new[] { "blue", "green", "purple", "orange", "red" };
        var transactions = facturasDb.Select((f, idx) => new
        {
            id = f.IdFactura,
            number = f.NumeroFactura,
            patient = f.Paciente != null ? $"{f.Paciente.Nombres} {f.Paciente.Apellidos}" : "Paciente",
            service = string.IsNullOrWhiteSpace(f.Notas) ? "Servicio Odontológico" : f.Notas,
            date = f.FechaFactura.ToString("yyyy-MM-dd"),
            amount = f.Total,
            status = f.Estado == "pagada" ? "pagado" : f.Estado == "anulada" ? "anulado" : "pendiente",
            avatar = f.Paciente != null ? $"{f.Paciente.Nombres.FirstOrDefault()}{f.Paciente.Apellidos.FirstOrDefault()}".ToUpper() : "PA",
            color = coloresAvatar[idx % coloresAvatar.Length]
        }).ToList();

        var reporte = new
        {
            kpis = new { income, received, pending, margin },
            barChart,
            donutChart,
            transactions
        };

        ViewData["ReportesFinancierosJson"] = System.Text.Json.JsonSerializer.Serialize(reporte);
        ViewData["TotalIngresos"] = income;
        ViewData["TotalFacturas"] = facturasDb.Count;
        return View("~/Views/Facturacion_Y_Pagos/st-adm-13-reportes-financieros/index.cshtml");
    }

    [HttpGet]
    [Authorize(Roles = "Recepcionista")]
    [Route("facturacion-y-pagos/st-rec-04-generar-factura")]
    public async Task<IActionResult> Strec04GenerarFactura()
    {
        var pacientes = await _context.Pacientes.Where(p => p.Estado == "activo").ToListAsync();
        var servicios = await _context.Servicios.Where(s => s.Estado == "activo").ToListAsync();
        ViewData["Pacientes"] = pacientes;
        ViewData["Servicios"] = servicios;
        return View("~/Views/Facturacion_Y_Pagos/st-rec-04-generar-factura/index.cshtml");
    }
}
