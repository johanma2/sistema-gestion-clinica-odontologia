IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
CREATE TABLE [Especialidad] (
    [id_especialidad] int NOT NULL IDENTITY,
    [nombre] nvarchar(100) NOT NULL,
    [descripcion] nvarchar(255) NULL,
    CONSTRAINT [PK_Especialidad] PRIMARY KEY ([id_especialidad])
);

CREATE TABLE [Rol] (
    [id_rol] int NOT NULL IDENTITY,
    [nombre_rol] nvarchar(50) NOT NULL,
    [descripcion] nvarchar(200) NULL,
    CONSTRAINT [PK_Rol] PRIMARY KEY ([id_rol])
);

CREATE TABLE [Servicio] (
    [id_servicio] int NOT NULL IDENTITY,
    [nombre] nvarchar(150) NOT NULL,
    [descripcion] nvarchar(500) NULL,
    [precio] decimal(12,2) NOT NULL,
    [estado] nvarchar(10) NOT NULL,
    CONSTRAINT [PK_Servicio] PRIMARY KEY ([id_servicio])
);

CREATE TABLE [Usuario] (
    [id_usuario] int NOT NULL IDENTITY,
    [creado_por] int NULL,
    [nombre] nvarchar(100) NOT NULL,
    [apellidos] nvarchar(100) NOT NULL,
    [correo] nvarchar(150) NOT NULL,
    [contrasena] nvarchar(255) NOT NULL,
    [id_rol] int NOT NULL,
    [estado] nvarchar(10) NOT NULL,
    [fecha_nacimiento] datetime2 NULL,
    [fecha_creacion] datetime2 NOT NULL,
    [ultimo_login] datetime2 NULL,
    [codigo_recuperacion] nvarchar(10) NULL,
    [fecha_expiracion_codigo] datetime2 NULL,
    CONSTRAINT [PK_Usuario] PRIMARY KEY ([id_usuario]),
    CONSTRAINT [FK_Usuario_Rol_id_rol] FOREIGN KEY ([id_rol]) REFERENCES [Rol] ([id_rol]) ON DELETE CASCADE
);

CREATE TABLE [Paciente] (
    [id_paciente] int NOT NULL IDENTITY,
    [id_usuario] int NULL,
    [tipo_documento] nvarchar(5) NOT NULL,
    [documento] nvarchar(20) NOT NULL,
    [nombres] nvarchar(100) NOT NULL,
    [apellidos] nvarchar(100) NOT NULL,
    [fecha_nacimiento] datetime2 NOT NULL,
    [genero] nvarchar(5) NULL,
    [telefono] nvarchar(20) NULL,
    [correo] nvarchar(150) NULL,
    [direccion] nvarchar(255) NULL,
    [ciudad] nvarchar(100) NULL,
    [grupo_sanguineo] nvarchar(5) NULL,
    [alergias] nvarchar(max) NULL,
    [antecedentes_medicos] nvarchar(max) NULL,
    [contacto_emergencia] nvarchar(100) NULL,
    [telefono_emergencia] nvarchar(20) NULL,
    [fecha_registro] datetime2 NOT NULL,
    [estado] nvarchar(10) NOT NULL,
    [archivo_adjunto] nvarchar(255) NULL,
    CONSTRAINT [PK_Paciente] PRIMARY KEY ([id_paciente]),
    CONSTRAINT [FK_Paciente_Usuario_id_usuario] FOREIGN KEY ([id_usuario]) REFERENCES [Usuario] ([id_usuario])
);

CREATE TABLE [Profesional] (
    [id_profesional] int NOT NULL IDENTITY,
    [id_usuario] int NOT NULL,
    [nombres] nvarchar(100) NOT NULL,
    [apellidos] nvarchar(100) NOT NULL,
    [registro_medico] nvarchar(50) NOT NULL,
    [descripcion] nvarchar(255) NULL,
    [categoria] nvarchar(100) NULL,
    [telefono] nvarchar(20) NULL,
    [estado] nvarchar(15) NOT NULL,
    [fecha_ingreso] datetime2 NULL,
    CONSTRAINT [PK_Profesional] PRIMARY KEY ([id_profesional]),
    CONSTRAINT [FK_Profesional_Usuario_id_usuario] FOREIGN KEY ([id_usuario]) REFERENCES [Usuario] ([id_usuario]) ON DELETE NO ACTION
);

CREATE TABLE [Cita] (
    [id_cita] int NOT NULL IDENTITY,
    [id_paciente] int NOT NULL,
    [id_profesional] int NULL,
    [id_servicio] int NULL,
    [fecha_hora] datetime2 NOT NULL,
    [estado] nvarchar(30) NOT NULL,
    [notas] nvarchar(max) NULL,
    CONSTRAINT [PK_Cita] PRIMARY KEY ([id_cita]),
    CONSTRAINT [FK_Cita_Paciente_id_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [Paciente] ([id_paciente]),
    CONSTRAINT [FK_Cita_Profesional_id_profesional] FOREIGN KEY ([id_profesional]) REFERENCES [Profesional] ([id_profesional]) ON DELETE SET NULL,
    CONSTRAINT [FK_Cita_Servicio_id_servicio] FOREIGN KEY ([id_servicio]) REFERENCES [Servicio] ([id_servicio]) ON DELETE SET NULL
);

CREATE TABLE [Profesional_Especialidad] (
    [id_profesional] int NOT NULL,
    [id_especialidad] int NOT NULL,
    [principal] bit NOT NULL,
    CONSTRAINT [PK_Profesional_Especialidad] PRIMARY KEY ([id_profesional], [id_especialidad]),
    CONSTRAINT [FK_Profesional_Especialidad_Especialidad_id_especialidad] FOREIGN KEY ([id_especialidad]) REFERENCES [Especialidad] ([id_especialidad]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Profesional_Especialidad_Profesional_id_profesional] FOREIGN KEY ([id_profesional]) REFERENCES [Profesional] ([id_profesional]) ON DELETE CASCADE
);

CREATE INDEX [IX_Cita_id_paciente] ON [Cita] ([id_paciente]);

CREATE INDEX [IX_Cita_id_profesional] ON [Cita] ([id_profesional]);

CREATE INDEX [IX_Cita_id_servicio] ON [Cita] ([id_servicio]);

CREATE INDEX [IX_Paciente_id_usuario] ON [Paciente] ([id_usuario]);

CREATE INDEX [IX_Profesional_id_usuario] ON [Profesional] ([id_usuario]);

CREATE INDEX [IX_Profesional_Especialidad_id_especialidad] ON [Profesional_Especialidad] ([id_especialidad]);

CREATE INDEX [IX_Usuario_id_rol] ON [Usuario] ([id_rol]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260719002717_InitialCreate', N'9.0.15');

CREATE TABLE [Historia_Clinica] (
    [id_historia] int NOT NULL IDENTITY,
    [id_paciente] int NOT NULL,
    [fecha_apertura] datetime2 NOT NULL,
    [observaciones_generales] nvarchar(max) NULL,
    [activa] bit NOT NULL,
    CONSTRAINT [PK_Historia_Clinica] PRIMARY KEY ([id_historia]),
    CONSTRAINT [FK_Historia_Clinica_Paciente_id_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [Paciente] ([id_paciente]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_Historia_Clinica_id_paciente] ON [Historia_Clinica] ([id_paciente]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260719225433_AgregarHistoriaClinica', N'9.0.15');


IF OBJECT_ID(N'[dbo].[FK_Cita_Profesional_id_profesional]', N'F') IS NOT NULL
BEGIN
    ALTER TABLE [Cita] DROP CONSTRAINT [FK_Cita_Profesional_id_profesional];
END;



IF OBJECT_ID(N'[dbo].[FK_Cita_Servicio_id_servicio]', N'F') IS NOT NULL
BEGIN
    ALTER TABLE [Cita] DROP CONSTRAINT [FK_Cita_Servicio_id_servicio];
END;



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



IF COL_LENGTH('Cita', 'notas_previas') IS NULL AND COL_LENGTH('Cita', 'notas') IS NOT NULL
BEGIN
    EXEC sp_rename N'[Cita].[notas]', N'notas_previas', 'COLUMN';
END;



IF COL_LENGTH('Cita', 'id_estado') IS NULL AND COL_LENGTH('Cita', 'id_servicio') IS NOT NULL
BEGIN
    EXEC sp_rename N'[Cita].[id_servicio]', N'id_estado', 'COLUMN';
END;



IF COL_LENGTH('Cita', 'fecha') IS NULL AND COL_LENGTH('Cita', 'fecha_hora') IS NOT NULL
BEGIN
    EXEC sp_rename N'[Cita].[fecha_hora]', N'fecha', 'COLUMN';
END;


DECLARE @var sysname;
SELECT @var = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Profesional]') AND [c].[name] = N'id_usuario');
IF @var IS NOT NULL EXEC(N'ALTER TABLE [Profesional] DROP CONSTRAINT [' + @var + '];');
ALTER TABLE [Profesional] ALTER COLUMN [id_usuario] int NULL;

DROP INDEX [IX_Cita_id_profesional] ON [Cita];
DECLARE @var1 sysname;
SELECT @var1 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'id_profesional');
IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var1 + '];');
UPDATE [Cita] SET [id_profesional] = 0 WHERE [id_profesional] IS NULL;
ALTER TABLE [Cita] ALTER COLUMN [id_profesional] int NOT NULL;
ALTER TABLE [Cita] ADD DEFAULT 0 FOR [id_profesional];
CREATE INDEX [IX_Cita_id_profesional] ON [Cita] ([id_profesional]);


IF COL_LENGTH('Cita', 'archivo_adjunto') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [archivo_adjunto] nvarchar(255) NULL;
END;



IF COL_LENGTH('Cita', 'creado_por') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [creado_por] int NULL;
END;



IF COL_LENGTH('Cita', 'fecha_creacion') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [fecha_creacion] datetime2 NULL;
END;



IF COL_LENGTH('Cita', 'hora_fin') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [hora_fin] time NULL;
END;



IF COL_LENGTH('Cita', 'hora_inicio') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [hora_inicio] time NULL;
END;



IF COL_LENGTH('Cita', 'id_consultorio') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [id_consultorio] int NULL;
END;



IF COL_LENGTH('Cita', 'motivo_consulta') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [motivo_consulta] nvarchar(max) NULL;
END;



IF COL_LENGTH('Cita', 'tipo_cita') IS NULL
BEGIN
    ALTER TABLE [Cita] ADD [tipo_cita] nvarchar(20) NULL;
END;



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



IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Estado_Cita')
BEGIN
    CREATE TABLE [Estado_Cita] (
        [id_estado] int NOT NULL IDENTITY(1,1),
        [nombre_estado] nvarchar(50) NOT NULL,
        [descripcion] nvarchar(150) NULL,
        CONSTRAINT [PK_Estado_Cita] PRIMARY KEY ([id_estado])
    );
END;



IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cita_id_consultorio' AND object_id = OBJECT_ID('Cita'))
BEGIN
    CREATE INDEX [IX_Cita_id_consultorio] ON [Cita] ([id_consultorio]);
END;



IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_Consultorio_id_consultorio')
BEGIN
    ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Consultorio_id_consultorio] FOREIGN KEY ([id_consultorio]) REFERENCES [Consultorio] ([id_consultorio]) ON DELETE SET NULL;
END;



IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_Estado_Cita_id_estado')
BEGIN
    ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Estado_Cita_id_estado] FOREIGN KEY ([id_estado]) REFERENCES [Estado_Cita] ([id_estado]) ON DELETE SET NULL;
END;



IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_Profesional_id_profesional')
BEGIN
    ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Profesional_id_profesional] FOREIGN KEY ([id_profesional]) REFERENCES [Profesional] ([id_profesional]) ON DELETE NO ACTION;
END;


INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260720220025_ActualizarCitasModeloNuevo', N'9.0.15');

ALTER TABLE [Cita] DROP CONSTRAINT [FK_Cita_Consultorio_id_consultorio];

ALTER TABLE [Cita] DROP CONSTRAINT [FK_Cita_Estado_Cita_id_estado];

ALTER TABLE [Cita] DROP CONSTRAINT [FK_Cita_Profesional_id_profesional];

DROP INDEX [IX_Cita_id_consultorio] ON [Cita];

DECLARE @var2 sysname;
SELECT @var2 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'archivo_adjunto');
IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var2 + '];');
ALTER TABLE [Cita] DROP COLUMN [archivo_adjunto];

DECLARE @var3 sysname;
SELECT @var3 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'creado_por');
IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var3 + '];');
ALTER TABLE [Cita] DROP COLUMN [creado_por];

DECLARE @var4 sysname;
SELECT @var4 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'fecha_creacion');
IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var4 + '];');
ALTER TABLE [Cita] DROP COLUMN [fecha_creacion];

DECLARE @var5 sysname;
SELECT @var5 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'hora_fin');
IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var5 + '];');
ALTER TABLE [Cita] DROP COLUMN [hora_fin];

DECLARE @var6 sysname;
SELECT @var6 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'hora_inicio');
IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var6 + '];');
ALTER TABLE [Cita] DROP COLUMN [hora_inicio];

DECLARE @var7 sysname;
SELECT @var7 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'id_consultorio');
IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var7 + '];');
ALTER TABLE [Cita] DROP COLUMN [id_consultorio];

DECLARE @var8 sysname;
SELECT @var8 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'motivo_consulta');
IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var8 + '];');
ALTER TABLE [Cita] DROP COLUMN [motivo_consulta];

DECLARE @var9 sysname;
SELECT @var9 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'tipo_cita');
IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var9 + '];');
ALTER TABLE [Cita] DROP COLUMN [tipo_cita];

EXEC sp_rename N'[Cita].[notas_previas]', N'notas', 'COLUMN';

EXEC sp_rename N'[Cita].[id_estado]', N'id_servicio', 'COLUMN';

EXEC sp_rename N'[Cita].[fecha]', N'fecha_hora', 'COLUMN';

EXEC sp_rename N'[Cita].[IX_Cita_id_estado]', N'IX_Cita_id_servicio', 'INDEX';

DECLARE @var10 sysname;
SELECT @var10 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cita]') AND [c].[name] = N'id_profesional');
IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [Cita] DROP CONSTRAINT [' + @var10 + '];');
ALTER TABLE [Cita] ALTER COLUMN [id_profesional] int NULL;

ALTER TABLE [Cita] ADD [estado] nvarchar(30) NOT NULL DEFAULT N'';

ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Profesional_id_profesional] FOREIGN KEY ([id_profesional]) REFERENCES [Profesional] ([id_profesional]) ON DELETE SET NULL;

ALTER TABLE [Cita] ADD CONSTRAINT [FK_Cita_Servicio_id_servicio] FOREIGN KEY ([id_servicio]) REFERENCES [Servicio] ([id_servicio]) ON DELETE SET NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260724183456_Baseline', N'9.0.15');

COMMIT;
GO

