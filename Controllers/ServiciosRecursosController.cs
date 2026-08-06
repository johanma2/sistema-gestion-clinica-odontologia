using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Data;
using SmileTrack_MVC.Models.Entities;

namespace SmileTrack_MVC.Controllers;

public class ServiciosRecursosController : Controller
{
    private readonly AppDbContext _context;

    public ServiciosRecursosController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("servicios-y-recursos/st-adm-10-servicios")]
    public async Task<IActionResult> Stadm10Servicios()
    {
        var serviciosDb = await _context.Servicios.OrderBy(s => s.Nombre).ToListAsync();

        // La tabla Servicio del script SQL no maneja categoría/duración/ícono; se completan
        // con valores por defecto para no romper el diseño de tarjetas del catálogo.
        var servicios = serviciosDb.Select(s => new
        {
            id = s.IdServicio,
            name = s.Nombre,
            description = string.IsNullOrWhiteSpace(s.Descripcion) ? "Sin descripción registrada." : s.Descripcion,
            category = "general",
            duration = 30,
            cost = s.Precio,
            active = s.Estado == "activo",
            icon = "🦷"
        }).ToList();

        ViewData["ServiciosJson"] = System.Text.Json.JsonSerializer.Serialize(servicios);
        return View("~/Views/Servicios_Y_Recursos/st-adm-10-servicios/catalogoservicios.cshtml", serviciosDb);
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    [Route("servicios-y-recursos/st-adm-16-configuracion-general")]
    public async Task<IActionResult> Stadm16ConfiguracionGeneral()
    {
        var configsDb = await _context.ConfiguracionesGenerales.ToListAsync();
        if (!configsDb.Any())
        {
            configsDb = new List<ConfiguracionGeneral>
            {
                new() { Clave = "nombre_clinica", Valor = "SmileTrack Clínica Odontológica", Descripcion = "Nombre comercial", Modulo = "general" },
                new() { Clave = "nit_clinica", Valor = "901.482.350-4", Descripcion = "NIT de la clínica", Modulo = "general" },
                new() { Clave = "direccion_clinica", Valor = "Avenida de la Salud #45-12, Piso 4", Descripcion = "Dirección física", Modulo = "general" },
                new() { Clave = "correo_contacto", Valor = "contacto@smiletrack.co", Descripcion = "Correo principal", Modulo = "general" },
                new() { Clave = "telefono_contacto", Valor = "+57 601 555 0192", Descripcion = "Teléfono fijo", Modulo = "general" },
                new() { Clave = "cita_duracion_default", Valor = "30", Descripcion = "Duración por defecto de una cita (minutos)", Modulo = "citas" },
                new() { Clave = "horario_apertura", Valor = "07:00", Descripcion = "Hora de apertura", Modulo = "citas" },
                new() { Clave = "horario_cierre", Valor = "18:00", Descripcion = "Hora de cierre", Modulo = "citas" },
                new() { Clave = "notif_email", Valor = "true", Descripcion = "Notificaciones por correo", Modulo = "notificaciones" },
                new() { Clave = "notif_sms", Valor = "false", Descripcion = "Notificaciones por SMS", Modulo = "notificaciones" },
                new() { Clave = "notif_sistema", Valor = "true", Descripcion = "Notificaciones internas del sistema", Modulo = "notificaciones" }
            };
            _context.ConfiguracionesGenerales.AddRange(configsDb);
            await _context.SaveChangesAsync();
        }

        // El script.js de la vista trabaja con un objeto anidado (appointment/center/notifications)
        // en lugar de la lista plana clave-valor que maneja la BD; se traduce aquí.
        string ObtenerValor(string clave, string valorPorDefecto) =>
            configsDb.FirstOrDefault(c => c.Clave == clave)?.Valor ?? valorPorDefecto;

        var configAnidada = new
        {
            appointment = new
            {
                duration = int.TryParse(ObtenerValor("cita_duracion_default", "30"), out int dur) ? dur : 30,
                open = ObtenerValor("horario_apertura", "07:00"),
                close = ObtenerValor("horario_cierre", "18:00")
            },
            center = new
            {
                name = ObtenerValor("nombre_clinica", "SmileTrack Clínica Odontológica"),
                nit = ObtenerValor("nit_clinica", "901.482.350-4"),
                address = ObtenerValor("direccion_clinica", "Avenida de la Salud #45-12, Piso 4")
            },
            notifications = new
            {
                email = ObtenerValor("notif_email", "true") == "true",
                sms = ObtenerValor("notif_sms", "false") == "true",
                system = ObtenerValor("notif_sistema", "true") == "true"
            }
        };

        ViewData["ConfigsJson"] = System.Text.Json.JsonSerializer.Serialize(configAnidada);
        return View("~/Views/Servicios_Y_Recursos/st-adm-16-configuracion-general/index.cshtml", configsDb);
    }

    [HttpGet]
    [Authorize(Roles = "Profesional")]
    [Route("servicios-y-recursos/st-odo-05-servicios")]
    public async Task<IActionResult> Stodo05Servicios()
    {
        var serviciosDb = await _context.Servicios.Where(s => s.Estado == "activo").OrderBy(s => s.Nombre).ToListAsync();
        return View("~/Views/Servicios_Y_Recursos/st-odo-05-servicios/index.cshtml", serviciosDb);
    }

    // NOTA: Aún no existe una vista dedicada de Equipos ni de Inventario en el proyecto
    // (no hay .cshtml ni enlace en el sidebar para estas pantallas). Mientras esas vistas
    // no se construyan, se exponen como endpoints JSON de solo lectura para no apuntar
    // por error a la vista de "Catálogo de Servicios" con datos que no le corresponden.
    [HttpGet]
    [Authorize(Roles = "Administrador,Auxiliar")]
    [Route("servicios-y-recursos/api/equipos")]
    public async Task<IActionResult> ApiEquipos()
    {
        var equiposDb = await _context.Equipos.ToListAsync();
        if (!equiposDb.Any())
        {
            equiposDb = new List<Equipo>
            {
                new() { Nombre = "Unidad Odontológica Box 01", Modelo = "Sirona Intego", Serie = "SN-2024-001", Status = "operativo", Ubicacion = "Box 01" },
                new() { Nombre = "Autoclave de Esterilización 24L", Modelo = "Tuttnauer 2540M", Serie = "SN-2024-002", Status = "operativo", Ubicacion = "Central Esterilización" },
                new() { Nombre = "Rayos X Intraoral Digital", Modelo = "Carestream CS 2200", Serie = "SN-2024-003", Status = "mantenimiento", Ubicacion = "Box 03" }
            };
            _context.Equipos.AddRange(equiposDb);
            await _context.SaveChangesAsync();
        }

        return Json(equiposDb);
    }

    [HttpGet]
    [Authorize(Roles = "Auxiliar")]
    [Route("servicios-y-recursos/api/inventario")]
    public async Task<IActionResult> ApiInventario()
    {
        var inventarioDb = await _context.Inventarios.ToListAsync();
        if (!inventarioDb.Any())
        {
            inventarioDb = new List<Inventario>
            {
                new() { Codigo = "INS-001", Nombre = "Guantes de Nitrilo Talla M (Caja x 100)", Categoria = "Protección", StockActual = 45, StockMinimo = 10, UnidadMedida = "Cajas", PrecioUnitario = 35000, Estado = "disponible" },
                new() { Codigo = "INS-002", Nombre = "Resina Fotocurable A2 4g", Categoria = "Restauración", StockActual = 8, StockMinimo = 5, UnidadMedida = "Jeringas", PrecioUnitario = 85000, Estado = "disponible" },
                new() { Codigo = "INS-003", Nombre = "Anestesia Lidocaína 2% con Epinefrina", Categoria = "Anestesia", StockActual = 3, StockMinimo = 15, UnidadMedida = "Cajas x 50", PrecioUnitario = 120000, Estado = "alerta" }
            };
            _context.Inventarios.AddRange(inventarioDb);
            await _context.SaveChangesAsync();
        }

        return Json(inventarioDb);
    }
}
