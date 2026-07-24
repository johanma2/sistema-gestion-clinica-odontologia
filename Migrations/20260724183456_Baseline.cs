using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmileTrack_MVC.Migrations
{
    /// <inheritdoc />
    public partial class Baseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cita_id_estado' AND object_id = OBJECT_ID('Cita'))
BEGIN
    EXEC sp_rename N'[Cita].[IX_Cita_id_estado]', N'IX_Cita_id_servicio', 'INDEX';
END;
");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cita_Profesional_id_profesional",
                table: "Cita");

            migrationBuilder.DropForeignKey(
                name: "FK_Cita_Servicio_id_servicio",
                table: "Cita");

            migrationBuilder.DropColumn(
                name: "estado",
                table: "Cita");

            migrationBuilder.RenameColumn(
                name: "notas",
                table: "Cita",
                newName: "notas_previas");

            migrationBuilder.RenameColumn(
                name: "id_servicio",
                table: "Cita",
                newName: "id_estado");

            migrationBuilder.RenameColumn(
                name: "fecha_hora",
                table: "Cita",
                newName: "fecha");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cita_id_servicio' AND object_id = OBJECT_ID('Cita'))
BEGIN
    EXEC sp_rename N'[Cita].[IX_Cita_id_servicio]', N'IX_Cita_id_estado', 'INDEX';
END;
");

            migrationBuilder.AlterColumn<int>(
                name: "id_profesional",
                table: "Cita",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "archivo_adjunto",
                table: "Cita",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "creado_por",
                table: "Cita",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_creacion",
                table: "Cita",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "hora_fin",
                table: "Cita",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "hora_inicio",
                table: "Cita",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "id_consultorio",
                table: "Cita",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "motivo_consulta",
                table: "Cita",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tipo_cita",
                table: "Cita",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cita_id_consultorio",
                table: "Cita",
                column: "id_consultorio");

            migrationBuilder.AddForeignKey(
                name: "FK_Cita_Consultorio_id_consultorio",
                table: "Cita",
                column: "id_consultorio",
                principalTable: "Consultorio",
                principalColumn: "id_consultorio",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Cita_Estado_Cita_id_estado",
                table: "Cita",
                column: "id_estado",
                principalTable: "Estado_Cita",
                principalColumn: "id_estado",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Cita_Profesional_id_profesional",
                table: "Cita",
                column: "id_profesional",
                principalTable: "Profesional",
                principalColumn: "id_profesional",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
