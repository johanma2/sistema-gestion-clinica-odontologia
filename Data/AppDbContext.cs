using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Models.Entities;

namespace SmileTrack_MVC.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Profesional> Profesionales => Set<Profesional>();
    public DbSet<Especialidad> Especialidades => Set<Especialidad>();
    public DbSet<Profesional_Especialidad> ProfesionalEspecialidades => Set<Profesional_Especialidad>();
    public DbSet<Servicio> Servicios => Set<Servicio>();
    public DbSet<Consultorio> Consultorios => Set<Consultorio>();
    public DbSet<EstadoCita> EstadosCita => Set<EstadoCita>();
    public DbSet<Cita> Citas => Set<Cita>();
    public DbSet<HistoriaClinica> HistoriasClinicas => Set<HistoriaClinica>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("Usuario", tableBuilder => tableBuilder.UseSqlOutputClause(false));
            entity.HasKey(u => u.IdUsuario);
            entity.Property(u => u.IdUsuario).HasColumnName("id_usuario");
            entity.Property(u => u.CreadoPor).HasColumnName("creado_por");
            entity.Property(u => u.Nombre).HasColumnName("nombre");
            entity.Property(u => u.Apellidos).HasColumnName("apellidos");
            entity.Property(u => u.Correo).HasColumnName("correo");
            entity.Property(u => u.Contrasena).HasColumnName("contrasena");
            entity.Property(u => u.IdRol).HasColumnName("id_rol");
            entity.Property(u => u.Estado).HasColumnName("estado");
            entity.Property(u => u.FechaNacimiento).HasColumnName("fecha_nacimiento");
            entity.Property(u => u.FechaCreacion).HasColumnName("fecha_creacion");
            entity.Property(u => u.UltimoLogin).HasColumnName("ultimo_login");
            entity.Property(u => u.CodigoRecuperacion).HasColumnName("codigo_recuperacion");
            entity.Property(u => u.FechaExpiracionCodigo).HasColumnName("fecha_expiracion_codigo");

            entity.HasOne(u => u.Rol)
                  .WithMany()
                  .HasForeignKey(u => u.IdRol);
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.ToTable("Rol");
            entity.HasKey(r => r.IdRol);
            entity.Property(r => r.IdRol).HasColumnName("id_rol");
            entity.Property(r => r.NombreRol).HasColumnName("nombre_rol");
            entity.Property(r => r.Descripcion).HasColumnName("descripcion");
        });

        modelBuilder.Entity<Paciente>(entity =>
        {
            entity.ToTable("Paciente");
            entity.HasKey(p => p.IdPaciente);
            entity.Property(p => p.IdPaciente).HasColumnName("id_paciente");
            entity.Property(p => p.IdUsuario).HasColumnName("id_usuario");
            entity.Property(p => p.TipoDocumento).HasColumnName("tipo_documento");
            entity.Property(p => p.Documento).HasColumnName("documento");
            entity.Property(p => p.Nombres).HasColumnName("nombres");
            entity.Property(p => p.Apellidos).HasColumnName("apellidos");
            entity.Property(p => p.FechaNacimiento).HasColumnName("fecha_nacimiento");
            entity.Property(p => p.Genero).HasColumnName("genero");
            entity.Property(p => p.Telefono).HasColumnName("telefono");
            entity.Property(p => p.Correo).HasColumnName("correo");
            entity.Property(p => p.Direccion).HasColumnName("direccion");
            entity.Property(p => p.Ciudad).HasColumnName("ciudad");
            entity.Property(p => p.GrupoSanguineo).HasColumnName("grupo_sanguineo");
            entity.Property(p => p.Alergias).HasColumnName("alergias");
            entity.Property(p => p.AntecedentesMedicos).HasColumnName("antecedentes_medicos");
            entity.Property(p => p.ContactoEmergencia).HasColumnName("contacto_emergencia");
            entity.Property(p => p.TelefonoEmergencia).HasColumnName("telefono_emergencia");
            entity.Property(p => p.FechaRegistro).HasColumnName("fecha_registro");
            entity.Property(p => p.Estado).HasColumnName("estado");
            entity.Property(p => p.ArchivoAdjunto).HasColumnName("archivo_adjunto");
        });

        modelBuilder.Entity<Profesional>(entity =>
        {
            entity.ToTable("Profesional");
            entity.HasKey(p => p.IdProfesional);
            entity.Property(p => p.IdProfesional).HasColumnName("id_profesional");
            entity.Property(p => p.IdUsuario).HasColumnName("id_usuario");
            entity.Property(p => p.Nombres).HasColumnName("nombres");
            entity.Property(p => p.Apellidos).HasColumnName("apellidos");
            entity.Property(p => p.RegistroMedico).HasColumnName("registro_medico");
            entity.Property(p => p.Descripcion).HasColumnName("descripcion");
            entity.Property(p => p.Categoria).HasColumnName("categoria");
            entity.Property(p => p.Telefono).HasColumnName("telefono");
            entity.Property(p => p.Estado).HasColumnName("estado");
            entity.Property(p => p.FechaIngreso).HasColumnName("fecha_ingreso");

            entity.HasOne(p => p.Usuario)
                  .WithMany()
                  .HasForeignKey(p => p.IdUsuario)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(p => p.Especialidades)
                  .WithOne(pe => pe.Profesional)
                  .HasForeignKey(pe => pe.IdProfesional)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Especialidad>(entity =>
        {
            entity.ToTable("Especialidad");
            entity.HasKey(e => e.IdEspecialidad);
            entity.Property(e => e.IdEspecialidad).HasColumnName("id_especialidad");
            entity.Property(e => e.Nombre).HasColumnName("nombre");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
        });

        modelBuilder.Entity<Profesional_Especialidad>(entity =>
        {
            entity.ToTable("Profesional_Especialidad");
            entity.HasKey(pe => new { pe.IdProfesional, pe.IdEspecialidad });
            entity.Property(pe => pe.IdProfesional).HasColumnName("id_profesional");
            entity.Property(pe => pe.IdEspecialidad).HasColumnName("id_especialidad");
            entity.Property(pe => pe.Principal).HasColumnName("principal");

            entity.HasOne(pe => pe.Profesional)
                  .WithMany(p => p.Especialidades)
                  .HasForeignKey(pe => pe.IdProfesional)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pe => pe.Especialidad)
                  .WithMany()
                  .HasForeignKey(pe => pe.IdEspecialidad)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Servicio>(entity =>
        {
            entity.ToTable("Servicio");
            entity.HasKey(s => s.IdServicio);
            entity.Property(s => s.IdServicio).HasColumnName("id_servicio");
            entity.Property(s => s.Nombre).HasColumnName("nombre");
            entity.Property(s => s.Descripcion).HasColumnName("descripcion");
            entity.Property(s => s.Precio).HasColumnName("precio").HasPrecision(12, 2);
            entity.Property(s => s.Estado).HasColumnName("estado");
        });

        modelBuilder.Entity<Consultorio>(entity =>
        {
            entity.ToTable("Consultorio");
            entity.HasKey(c => c.IdConsultorio);
            entity.Property(c => c.IdConsultorio).HasColumnName("id_consultorio");
            entity.Property(c => c.Nombre).HasColumnName("nombre");
            entity.Property(c => c.Ubicacion).HasColumnName("ubicacion");
            entity.Property(c => c.Tipo).HasColumnName("tipo");
            entity.Property(c => c.NombreEstado).HasColumnName("nombre_estado");
            entity.Property(c => c.Capacidad).HasColumnName("capacidad");
            entity.Property(c => c.Estado).HasColumnName("estado");
        });

        modelBuilder.Entity<EstadoCita>(entity =>
        {
            entity.ToTable("Estado_Cita");
            entity.HasKey(e => e.IdEstado);
            entity.Property(e => e.IdEstado).HasColumnName("id_estado");
            entity.Property(e => e.NombreEstado).HasColumnName("nombre_estado");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
        });

        modelBuilder.Entity<Cita>(entity =>
        {
            entity.ToTable("Cita");
            entity.HasKey(c => c.IdCita);
            entity.Property(c => c.IdCita).HasColumnName("id_cita");
            entity.Property(c => c.IdPaciente).HasColumnName("id_paciente");
            entity.Property(c => c.IdProfesional).HasColumnName("id_profesional");
            entity.Property(c => c.IdServicio).HasColumnName("id_servicio");
            entity.Property(c => c.FechaHora).HasColumnName("fecha_hora");
            entity.Property(c => c.Estado).HasColumnName("estado");
            entity.Property(c => c.Notas).HasColumnName("notas");

            entity.HasOne(c => c.Paciente)
                  .WithMany()
                  .HasForeignKey(c => c.IdPaciente)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(c => c.Profesional)
                  .WithMany()
                  .HasForeignKey(c => c.IdProfesional)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(c => c.Servicio)
                  .WithMany()
                  .HasForeignKey(c => c.IdServicio)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<HistoriaClinica>(entity =>
        {
            entity.ToTable("Historia_Clinica");
            entity.HasKey(h => h.IdHistoria);
            entity.Property(h => h.IdHistoria).HasColumnName("id_historia");
            entity.Property(h => h.IdPaciente).HasColumnName("id_paciente");
            entity.Property(h => h.FechaApertura).HasColumnName("fecha_apertura");
            entity.Property(h => h.ObservacionesGenerales).HasColumnName("observaciones_generales");
            entity.Property(h => h.Activa).HasColumnName("activa");

            entity.HasOne(h => h.Paciente)
                  .WithOne()
                  .HasForeignKey<HistoriaClinica>(h => h.IdPaciente)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
