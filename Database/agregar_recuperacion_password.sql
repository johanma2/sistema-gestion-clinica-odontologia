-- agregar_recuperacion_password.sql
-- Script para crear las tablas de recuperacion de contrasena de SmileTrack.
-- Ejecutar sobre la base de datos SmileTrackDB con un usuario con permisos DDL.

USE [SmileTrackDB];
GO

SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.CodigoRecuperacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CodigoRecuperacion (
        id_codigo INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NOT NULL,
        codigo_hash VARCHAR(255) NOT NULL,
        fecha_creacion DATETIME NOT NULL CONSTRAINT DF_CodigoRecuperacion_FechaCreacion DEFAULT (GETDATE()),
        fecha_expiracion DATETIME NOT NULL,
        intentos_fallidos INT NOT NULL CONSTRAINT DF_CodigoRecuperacion_IntentosFallidos DEFAULT (0),
        usado BIT NOT NULL CONSTRAINT DF_CodigoRecuperacion_Usado DEFAULT (0),
        ip_origen VARCHAR(45) NULL,
        CONSTRAINT FK_CodigoRecuperacion_Usuario FOREIGN KEY (id_usuario)
            REFERENCES dbo.Usuario(id_usuario)
            ON DELETE CASCADE
    );
    PRINT 'Tabla dbo.CodigoRecuperacion creada.';
END
ELSE
    PRINT 'Tabla dbo.CodigoRecuperacion ya existe, se omite creacion.';
GO

IF OBJECT_ID(N'dbo.AuditoriaRecuperacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditoriaRecuperacion (
        id_auditoria INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NULL,
        correo_solicitado VARCHAR(150) NOT NULL,
        accion VARCHAR(30) NOT NULL,
        ip_origen VARCHAR(45) NULL,
        fecha DATETIME NOT NULL CONSTRAINT DF_AuditoriaRecuperacion_Fecha DEFAULT (GETDATE()),
        CONSTRAINT CK_AuditoriaRecuperacion_Accion CHECK (
            accion IN (
                'solicitud',
                'codigo_verificado',
                'codigo_fallido',
                'password_restablecida',
                'bloqueo_por_intentos',
                'rate_limit_excedido'
            )
        ),
        CONSTRAINT FK_AuditoriaRecuperacion_Usuario FOREIGN KEY (id_usuario)
            REFERENCES dbo.Usuario(id_usuario)
            ON DELETE SET NULL
    );
    PRINT 'Tabla dbo.AuditoriaRecuperacion creada.';
END
ELSE
    PRINT 'Tabla dbo.AuditoriaRecuperacion ya existe, se omite creacion.';
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_CodigoRecuperacion_Usuario_Usado_Expiracion'
      AND object_id = OBJECT_ID(N'dbo.CodigoRecuperacion')
)
BEGIN
    CREATE INDEX IX_CodigoRecuperacion_Usuario_Usado_Expiracion
        ON dbo.CodigoRecuperacion (id_usuario, usado, fecha_expiracion);
    PRINT 'Indice IX_CodigoRecuperacion_Usuario_Usado_Expiracion creado.';
END
ELSE
    PRINT 'Indice IX_CodigoRecuperacion_Usuario_Usado_Expiracion ya existe.';
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_AuditoriaRecuperacion_Correo_Fecha'
      AND object_id = OBJECT_ID(N'dbo.AuditoriaRecuperacion')
)
BEGIN
    CREATE INDEX IX_AuditoriaRecuperacion_Correo_Fecha
        ON dbo.AuditoriaRecuperacion (correo_solicitado, fecha);
    PRINT 'Indice IX_AuditoriaRecuperacion_Correo_Fecha creado.';
END
ELSE
    PRINT 'Indice IX_AuditoriaRecuperacion_Correo_Fecha ya existe.';
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_AuditoriaRecuperacion_Usuario_Fecha'
      AND object_id = OBJECT_ID(N'dbo.AuditoriaRecuperacion')
)
BEGIN
    CREATE INDEX IX_AuditoriaRecuperacion_Usuario_Fecha
        ON dbo.AuditoriaRecuperacion (id_usuario, fecha);
    PRINT 'Indice IX_AuditoriaRecuperacion_Usuario_Fecha creado.';
END
ELSE
    PRINT 'Indice IX_AuditoriaRecuperacion_Usuario_Fecha ya existe.';
GO

PRINT 'Script de recuperacion de contrasena ejecutado correctamente.';
GO
