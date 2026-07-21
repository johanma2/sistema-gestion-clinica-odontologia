using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmileTrack_MVC.Migrations
{
    /// <inheritdoc />
    public partial class ActualizarCitasModeloNuevo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[FK_Cita_Profesional_id_profesional]', N'F') IS NOT NULL
BEGIN
    ALTER TABLE [Cita] DROP CONSTRAINT [FK_Cita_Profesional_id_profesional];
END;
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[FK_Cita_Servicio_id_servicio]', N'F') IS NOT NULL
BEGIN
    ALTER TABLE [Cita] DROP CONSTRAINT [FK_Cita_Servicio_id_servicio];
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'estado') IS NOT NULL
BEGIN
    DECLARE @var sysname;
    SELECT @var = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'estado');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var + '];');
    ALTER TABLE [Cita] DROP COLUMN [estado];
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'notas_previas') IS NULL AND COL_LENGTH('Cita', 'notas') IS NOT NULL
BEGIN
    EXEC sp_rename N'[Cita].[notas]', N'notas_previas', 'COLUMN';
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'id_estado') IS NULL AND COL_LENGTH('Cita', 'id_servicio') IS NOT NULL
BEGIN
    EXEC sp_rename N'[Cita].[id_servicio]', N'id_estado', 'COLUMN';
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'fecha') IS NULL AND COL_LENGTH('Cita', 'fecha_hora') IS NOT NULL
BEGIN
    EXEC sp_rename N'[Cita].[fecha_hora]', N'fecha', 'COLUMN';
END;
");


            migrationBuilder.AlterColumn<int>(
                name: "id_usuario",
                table: "Profesional",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "id_profesional",
                table: "Cita",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'archivo_adjunto') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [archivo_adjunto] nvarchar(255) NULL;
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'creado_por') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [creado_por] int NULL;
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'fecha_creacion') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [fecha_creacion] datetime2 NULL;
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'hora_fin') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [hora_fin] time NULL;
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'hora_inicio') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [hora_inicio] time NULL;
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'id_consultorio') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [id_consultorio] int NULL;
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'motivo_consulta') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [motivo_consulta] nvarchar(max) NULL;
END;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('Cita', 'tipo_cita') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [tipo_cita] nvarchar(20) NULL;
END;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Consultorio')
BEGIN
    CREATE TABLE [Consultorio] (
        [id_consultorio] int NOT NULL IDENTITY(1,1),
        [nombre] nvarchar(100) NOT NULL,
        [ubicacion] nvarchar(150) NULL,
        [tipo] nvarchar(50) NULL,
        [nombre_estado] nvarchar(50) NULL,
        [capacidad] int NULL,
        [estado] nvarchar(15) NOT NULL,
        CONSTRAINT [PK_Consultorio] PRIMARY KEY ([id_consultorio])
    );
END;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Estado_Cita')
BEGIN
    CREATE TABLE [Estado_Cita] (
        [id_estado] int NOT NULL IDENTITY(1,1),
        [nombre_estado] nvarchar(50) NOT NULL,
        [descripcion] nvarchar(150) NULL,
        CONSTRAINT [PK_Estado_Cita] PRIMARY KEY ([id_estado])
    );
END;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cita_id_consultorio' AND object_id = OBJECT_ID('Cita'))
BEGIN
    CREATE INDEX [IX_Cita_id_consultorio] ON [Cita] ([id_consultorio]);
END;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_Consultorio_id_consultorio')
BEGIN
    ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Consultorio_id_consultorio] FOREIGN KEY ([id_consultorio]) REFERENCES [Consultorio] ([id_consultorio]) ON DELETE SET NULL;
END;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_Estado_Cita_id_estado')
BEGIN
    ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Estado_Cita_id_estado] FOREIGN KEY ([id_estado]) REFERENCES [Estado_Cita] ([id_estado]) ON DELETE SET NULL;
END;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_Profesional_id_profesional')
BEGIN
    ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Profesional_id_profesional] FOREIGN KEY ([id_profesional]) REFERENCES [Profesional] ([id_profesional]) ON DELETE NO ACTION;
END;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cita_Consultorio_id_consultorio",
                table: "Cita");

            migrationBuilder.DropForeignKey(
                name: "FK_Cita_Estado_Cita_id_estado",
                table: "Cita");

            migrationBuilder.DropForeignKey(
                name: "FK_Cita_Profesional_id_profesional",
                table: "Cita");

            migrationBuilder.DropTable(
                name: "Consultorio");

            migrationBuilder.DropTable(
                name: "Estado_Cita");

            migrationBuilder.DropIndex(
                name: "IX_Cita_id_consultorio",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "archivo_adjunto",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "creado_por",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "fecha_creacion",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "hora_fin",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "hora_inicio",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "id_consultorio",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "motivo_consulta",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "tipo_cita",
                table: "Cita");

            migrationBuilder.RenameColumn(
                name: "notas_previas",
                table: "Cita",
                newName: "notas");

            migrationBuilder.RenameColumn(
                name: "id_estado",
                table: "Cita",
                newName: "id_servicio");

            migrationBuilder.RenameColumn(
                name: "fecha",
                table: "Cita",
                newName: "fecha_hora");

            migrationBuilder.RenameIndex(
                name: "IX_Cita_id_estado",
                table: "Cita",
                newName: "IX_Cita_id_servicio");

            migrationBuilder.AlterColumn<int>(
                name: "id_usuario",
                table: "Profesional",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "id_profesional",
                table: "Cita",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "estado",
                table: "Cita",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_Cita_Profesional_id_profesional",
                table: "Cita",
                column: "id_profesional",
                principalTable: "Profesional",
                principalColumn: "id_profesional",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Cita_Servicio_id_servicio",
                table: "Cita",
                column: "id_servicio",
                principalTable: "Servicio",
                principalColumn: "id_servicio",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
