using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Models.Entities;

namespace SmileTrack_MVC.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Profesional> Profesionales => Set<Profesional>();
    public DbSet<Servicio> Servicios => Set<Servicio>();
    public DbSet<Cita> Citas => Set<Cita>();

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
            entity.Property(p => p.Especialidad).HasColumnName("especialidad");
            entity.Property(p => p.Correo).HasColumnName("correo");
            entity.Property(p => p.Telefono).HasColumnName("telefono");
            entity.Property(p => p.Estado).HasColumnName("estado");

            entity.HasOne(p => p.Usuario)
                  .WithMany()
                  .HasForeignKey(p => p.IdUsuario)
                  .OnDelete(DeleteBehavior.SetNull);
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
    }
}
