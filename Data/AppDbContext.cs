using Microsoft.EntityFrameworkCore;
using SmileTrack_MVC.Models;

namespace SmileTrack_MVC.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Rol> Roles => Set<Rol>();

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
    }
}
