using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Models.Entities;

namespace SmileTrack_MVC.Data;

/// <summary>
/// Centraliza la siembra (seed) de datos ficticios de SmileTrack.
/// Se ejecuta al arrancar la aplicación (ver Program.cs) después de aplicar
/// las migraciones de EF Core (db.Database.MigrateAsync()).
/// Es idempotente: cada bloque solo inserta si la tabla está vacía o si
/// falta el registro puntual que verifica.
/// </summary>
public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var roles = await SeedRolesAsync(db);
        var usuarios = await SeedUsuariosAsync(db, roles);
        var especialidades = await SeedEspecialidadesAsync(db);
        var servicios = await SeedServiciosAsync(db);
        var consultorios = await SeedConsultoriosAsync(db);
        await SeedEstadosCitaAsync(db);
        var pacientes = await SeedPacientesAsync(db, usuarios);
        var profesionales = await SeedProfesionalesAsync(db, usuarios, especialidades);
        await SeedHistoriasClinicasAsync(db, pacientes);
        await SeedCitasAsync(db, pacientes, profesionales, servicios);
    }

    private static async Task<Dictionary<string, Rol>> SeedRolesAsync(AppDbContext db)
    {
        var definiciones = new (string Nombre, string Descripcion)[]
        {
            ("Administrador", "Acceso total al sistema"),
            ("Profesional", "Gestión clínica y de pacientes"),
            ("Paciente", "Consulta de su propia información"),
            ("Recepcionista", "Gestión de citas y agenda"),
            ("Auxiliar", "Apoyo clínico y administrativo"),
        };

        foreach (var (nombre, descripcion) in definiciones)
        {
            if (!await db.Roles.AnyAsync(r => r.NombreRol == nombre))
            {
                db.Roles.Add(new Rol { NombreRol = nombre, Descripcion = descripcion });
            }
        }
        await db.SaveChangesAsync();

        return await db.Roles.ToDictionaryAsync(r => r.NombreRol);
    }

    private static async Task<Dictionary<string, Usuario>> SeedUsuariosAsync(AppDbContext db, Dictionary<string, Rol> roles)
    {
        var demo = new (string Correo, string Nombre, string Apellidos, string Rol)[]
        {
            ("admin@smiletrack.co", "Admin", "SmileTrack", "Administrador"),
            ("pac@smiletrack.co", "Paciente", "Prueba", "Paciente"),
            ("prof@smiletrack.co", "Profesional", "Prueba", "Profesional"),
            ("recep@smiletrack.co", "Recepcionista", "Prueba", "Recepcionista"),
            ("aux@smiletrack.co", "Auxiliar", "Prueba", "Auxiliar"),
        };

        foreach (var (correo, nombre, apellidos, rolNombre) in demo)
        {
            if (!roles.TryGetValue(rolNombre, out var rol)) continue;

            var existente = await db.Usuarios.FirstOrDefaultAsync(u => u.Correo == correo);
            if (existente == null)
            {
                db.Usuarios.Add(new Usuario
                {
                    Nombre = nombre,
                    Apellidos = apellidos,
                    Correo = correo,
                    Contrasena = BCrypt.Net.BCrypt.HashPassword("123456"),
                    IdRol = rol.IdRol,
                    Estado = "activo",
                    FechaCreacion = DateTime.UtcNow
                });
            }
        }
        await db.SaveChangesAsync();

        return await db.Usuarios.ToDictionaryAsync(u => u.Correo);
    }

    private static async Task<Dictionary<string, Especialidad>> SeedEspecialidadesAsync(AppDbContext db)
    {
        var definiciones = new (string Nombre, string Descripcion)[]
        {
            ("Odontología General", "Atención dental primaria y preventiva"),
            ("Ortodoncia", "Corrección de la posición dental"),
            ("Endodoncia", "Tratamiento de conductos radiculares"),
            ("Periodoncia", "Enfermedades de encías y tejidos de soporte"),
            ("Rehabilitación Oral y Estética Dental", "Restauración funcional y estética"),
            ("Cirugía Oral", "Procedimientos quirúrgicos orales"),
            ("Odontopediatría", "Odontología para niños y adolescentes"),
        };

        foreach (var (nombre, descripcion) in definiciones)
        {
            if (!await db.Especialidades.AnyAsync(e => e.Nombre == nombre))
            {
                db.Especialidades.Add(new Especialidad { Nombre = nombre, Descripcion = descripcion });
            }
        }
        await db.SaveChangesAsync();

        return await db.Especialidades.ToDictionaryAsync(e => e.Nombre);
    }

    private static async Task<List<Servicio>> SeedServiciosAsync(AppDbContext db)
    {
        var definiciones = new (string Nombre, string Descripcion, decimal Precio)[]
        {
            ("Limpieza dental", "Elimina el sarro y la placa bacteriana", 80000),
            ("Blanqueamiento", "Recupera el brillo natural de los dientes", 350000),
            ("Ortodoncia - Consulta", "Corrección de la posición dental", 200000),
            ("Endodoncia", "Tratamiento de conductos radiculares", 450000),
            ("Implante dental", "Reemplazo de piezas perdidas", 2800000),
            ("Odontopediatría", "Cuidado dental especializado para niños", 60000),
            ("Extracción simple", "Extracción de pieza dental sin complicaciones", 120000),
            ("Resina dental", "Restauración estética de una pieza dañada", 90000),
            ("Profilaxis y flúor", "Prevención de caries en niños y adultos", 70000),
            ("Cirugía de terceros molares", "Extracción quirúrgica de muelas del juicio", 650000),
        };

        foreach (var (nombre, descripcion, precio) in definiciones)
        {
            if (!await db.Servicios.AnyAsync(s => s.Nombre == nombre))
            {
                db.Servicios.Add(new Servicio { Nombre = nombre, Descripcion = descripcion, Precio = precio, Estado = "activo" });
            }
        }
        await db.SaveChangesAsync();

        return await db.Servicios.ToListAsync();
    }

    private static async Task<List<Consultorio>> SeedConsultoriosAsync(AppDbContext db)
    {
        var definiciones = new (string Nombre, string Ubicacion, string Tipo)[]
        {
            ("Box 01 - General", "Planta 1 - Ala Sur", "Consulta General"),
            ("Box 02 - Ortodoncia", "Planta 1 - Ala Norte", "Ortodoncia"),
            ("Box 03 - Cirugía", "Planta 2 - Ala Central", "Cirugía y Procedimientos"),
            ("Box 04 - Odontopediatría", "Planta 1 - Ala Este", "Odontopediatría"),
            ("Box 05 - Rehabilitación Oral", "Planta 2 - Ala Oeste", "Rehabilitación Oral"),
        };

        foreach (var (nombre, ubicacion, tipo) in definiciones)
        {
            if (!await db.Consultorios.AnyAsync(c => c.Nombre == nombre))
            {
                db.Consultorios.Add(new Consultorio
                {
                    Nombre = nombre,
                    Ubicacion = ubicacion,
                    Tipo = tipo,
                    NombreEstado = "Disponible",
                    Capacidad = 1,
                    Estado = "disponible"
                });
            }
        }
        await db.SaveChangesAsync();

        return await db.Consultorios.ToListAsync();
    }

    private static async Task SeedEstadosCitaAsync(AppDbContext db)
    {
        var definiciones = new (string Nombre, string Descripcion)[]
        {
            ("Agendada", "Cita programada y pendiente"),
            ("Confirmada", "Cita confirmada por el paciente o la clínica"),
            ("En consulta", "Paciente en consulta en este momento"),
            ("Atendida", "Cita atendida y finalizada"),
            ("Cancelada", "Cita cancelada"),
            ("No asistio", "El paciente no asistió a la cita"),
        };

        foreach (var (nombre, descripcion) in definiciones)
        {
            if (!await db.EstadosCita.AnyAsync(e => e.NombreEstado == nombre))
            {
                db.EstadosCita.Add(new EstadoCita { NombreEstado = nombre, Descripcion = descripcion });
            }
        }
        await db.SaveChangesAsync();
    }

    private static async Task<List<Paciente>> SeedPacientesAsync(AppDbContext db, Dictionary<string, Usuario> usuarios)
    {
        if (await db.Pacientes.CountAsync() >= 15)
        {
            return await db.Pacientes.ToListAsync();
        }

        int? idUsuarioDemo = usuarios.TryGetValue("pac@smiletrack.co", out var uPac) ? uPac.IdUsuario : null;

        var definiciones = new (string Doc, string Nombres, string Apellidos, DateTime Nace, string Genero, string Correo, string Ciudad)[]
        {
            ("10239485", "Julián", "Restrepo", new DateTime(1995, 4, 12), "M", "julian.restrepo@ejemplo.com", "Bogotá"),
            ("52109432", "Lucía", "Torres", new DateTime(1990, 8, 25), "F", "lucia.torres@ejemplo.com", "Bogotá"),
            ("88764321", "Mariana", "Esparza", new DateTime(1985, 11, 30), "F", "mariana.esparza@ejemplo.com", "Medellín"),
            ("11098452", "Sebastián", "Correa", new DateTime(2002, 2, 14), "M", "sebastian.correa@ejemplo.com", "Cali"),
            ("10345678", "Andrea", "Gómez", new DateTime(1998, 6, 3), "F", "andrea.gomez@ejemplo.com", "Bogotá"),
            ("10456789", "Camilo", "Vargas", new DateTime(1993, 9, 21), "M", "camilo.vargas@ejemplo.com", "Bucaramanga"),
            ("10567890", "Valentina", "Ríos", new DateTime(2010, 1, 17), "F", "valentina.rios@ejemplo.com", "Bogotá"),
            ("10678901", "Santiago", "Peña", new DateTime(1988, 12, 5), "M", "santiago.pena@ejemplo.com", "Cali"),
            ("10789012", "Isabella", "Suárez", new DateTime(2015, 3, 9), "F", "isabella.suarez@ejemplo.com", "Medellín"),
            ("10890123", "Nicolás", "Cárdenas", new DateTime(1979, 7, 22), "M", "nicolas.cardenas@ejemplo.com", "Bogotá"),
            ("10901234", "Daniela", "Morales", new DateTime(2001, 10, 11), "F", "daniela.morales@ejemplo.com", "Barranquilla"),
            ("11012345", "Felipe", "Ortiz", new DateTime(1996, 5, 27), "M", "felipe.ortiz@ejemplo.com", "Bogotá"),
            ("11123456", "Gabriela", "Muñoz", new DateTime(1992, 2, 2), "F", "gabriela.munoz@ejemplo.com", "Cali"),
            ("11234567", "Tomás", "Herrera", new DateTime(1983, 8, 14), "M", "tomas.herrera@ejemplo.com", "Medellín"),
            ("11345678", "Paula", "Jiménez", new DateTime(2005, 4, 30), "F", "paula.jimenez@ejemplo.com", "Bogotá"),
        };

        var nuevos = new List<Paciente>();
        foreach (var (doc, nombres, apellidos, nace, genero, correo, ciudad) in definiciones)
        {
            if (await db.Pacientes.AnyAsync(p => p.Documento == doc)) continue;

            nuevos.Add(new Paciente
            {
                IdUsuario = doc == "10239485" ? idUsuarioDemo : null,
                TipoDocumento = "CC",
                Documento = doc,
                Nombres = nombres,
                Apellidos = apellidos,
                FechaNacimiento = nace,
                Genero = genero,
                Correo = correo,
                Telefono = "300" + Random.Shared.Next(1000000, 9999999),
                Ciudad = ciudad,
                Direccion = $"Calle {Random.Shared.Next(10, 150)} # {Random.Shared.Next(10, 99)}-{Random.Shared.Next(10, 99)}",
                GrupoSanguineo = new[] { "O+", "O-", "A+", "A-", "B+", "AB+" }[Random.Shared.Next(6)],
                ContactoEmergencia = "Familiar de " + nombres,
                TelefonoEmergencia = "301" + Random.Shared.Next(1000000, 9999999),
                FechaRegistro = DateTime.UtcNow.Date.AddDays(-Random.Shared.Next(5, 400)),
                Estado = "activo"
            });
        }

        if (nuevos.Count > 0)
        {
            db.Pacientes.AddRange(nuevos);
            await db.SaveChangesAsync();
        }

        return await db.Pacientes.ToListAsync();
    }

    private static async Task<List<Profesional>> SeedProfesionalesAsync(AppDbContext db, Dictionary<string, Usuario> usuarios, Dictionary<string, Especialidad> especialidades)
    {
        if (await db.Profesionales.CountAsync() >= 8)
        {
            return await db.Profesionales.ToListAsync();
        }

        int? idUsuarioDemo = usuarios.TryGetValue("prof@smiletrack.co", out var uProf) ? uProf.IdUsuario : null;

        var definiciones = new (string Nombres, string Apellidos, string Registro, string Categoria, string Especialidad)[]
        {
            ("Ricardo", "Méndez", "RM-001", "Odontólogo General", "Odontología General"),
            ("Elena", "Sotelo", "RM-002", "Ortodoncista", "Ortodoncia"),
            ("Carlos", "Ruiz", "RM-003", "Endodoncista", "Endodoncia"),
            ("Verónica", "Lozano", "RM-004", "Periodoncista", "Periodoncia"),
            ("Andrés", "Beltrán", "RM-005", "Cirujano Oral", "Cirugía Oral"),
            ("Mónica", "Salazar", "RM-006", "Odontopediatra", "Odontopediatría"),
            ("Diego", "Fajardo", "RM-007", "Rehabilitador Oral", "Rehabilitación Oral y Estética Dental"),
            ("Laura", "Cifuentes", "RM-008", "Odontóloga General", "Odontología General"),
        };

        var nuevos = new List<Profesional>();
        foreach (var (nombres, apellidos, registro, categoria, especialidad) in definiciones)
        {
            if (await db.Profesionales.AnyAsync(p => p.RegistroMedico == registro)) continue;

            nuevos.Add(new Profesional
            {
                IdUsuario = registro == "RM-001" ? idUsuarioDemo : null,
                Nombres = nombres,
                Apellidos = apellidos,
                RegistroMedico = registro,
                Categoria = categoria,
                Descripcion = $"Especialista en {especialidad.ToLowerInvariant()}",
                Telefono = "310" + Random.Shared.Next(1000000, 9999999),
                Estado = "activo",
                FechaIngreso = DateTime.UtcNow.Date.AddDays(-Random.Shared.Next(60, 1200))
            });
        }

        if (nuevos.Count > 0)
        {
            db.Profesionales.AddRange(nuevos);
            await db.SaveChangesAsync();
        }

        var todos = await db.Profesionales.ToListAsync();

        foreach (var (nombres, apellidos, registro, categoria, especialidadNombre) in definiciones)
        {
            var profesional = todos.FirstOrDefault(p => p.RegistroMedico == registro);
            if (profesional == null || !especialidades.TryGetValue(especialidadNombre, out var especialidad)) continue;

            var yaAsociado = await db.ProfesionalEspecialidades
                .AnyAsync(pe => pe.IdProfesional == profesional.IdProfesional && pe.IdEspecialidad == especialidad.IdEspecialidad);

            if (!yaAsociado)
            {
                db.ProfesionalEspecialidades.Add(new Profesional_Especialidad
                {
                    IdProfesional = profesional.IdProfesional,
                    IdEspecialidad = especialidad.IdEspecialidad,
                    Principal = true
                });
            }
        }
        await db.SaveChangesAsync();

        return todos;
    }

    private static async Task SeedHistoriasClinicasAsync(AppDbContext db, List<Paciente> pacientes)
    {
        foreach (var paciente in pacientes)
        {
            if (await db.HistoriasClinicas.AnyAsync(h => h.IdPaciente == paciente.IdPaciente)) continue;

            db.HistoriasClinicas.Add(new HistoriaClinica
            {
                IdPaciente = paciente.IdPaciente,
                FechaApertura = paciente.FechaRegistro,
                ObservacionesGenerales = "Paciente sin antecedentes relevantes registrados al momento de apertura.",
                Activa = true
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedCitasAsync(AppDbContext db, List<Paciente> pacientes, List<Profesional> profesionales, List<Servicio> servicios)
    {
        if (await db.Citas.CountAsync() >= 20 || pacientes.Count == 0 || profesionales.Count == 0)
        {
            return;
        }

        var estados = new[] { "Agendada", "Confirmada", "Atendida", "Cancelada", "No asistio" };
        var notas = new[]
        {
            "Primera consulta de valoración.",
            "Control de tratamiento en curso.",
            "Paciente reporta molestia leve.",
            "Seguimiento post-procedimiento.",
            "Cita de rutina, sin novedades."
        };

        var nuevas = new List<Cita>();
        int cantidad = 25;

        for (int i = 0; i < cantidad; i++)
        {
            var paciente = pacientes[Random.Shared.Next(pacientes.Count)];
            var profesional = profesionales[Random.Shared.Next(profesionales.Count)];
            var servicio = servicios.Count > 0 ? servicios[Random.Shared.Next(servicios.Count)] : null;
            var estado = estados[Random.Shared.Next(estados.Length)];

            // La mitad de las citas quedan en el pasado (para reportes/estadísticas)
            // y la otra mitad en el futuro (para agenda próxima).
            int offsetDias = i % 2 == 0 ? -Random.Shared.Next(1, 60) : Random.Shared.Next(1, 45);
            var fechaHora = DateTime.UtcNow.Date
                .AddDays(offsetDias)
                .AddHours(8 + Random.Shared.Next(0, 9))
                .AddMinutes(Random.Shared.Next(0, 2) * 30);

            nuevas.Add(new Cita
            {
                IdPaciente = paciente.IdPaciente,
                IdProfesional = profesional.IdProfesional,
                IdServicio = servicio?.IdServicio,
                FechaHora = fechaHora,
                Estado = offsetDias < 0 && estado == "Agendada" ? "Atendida" : estado,
                Notas = notas[Random.Shared.Next(notas.Length)]
            });
        }

        db.Citas.AddRange(nuevas);
        await db.SaveChangesAsync();
    }
}