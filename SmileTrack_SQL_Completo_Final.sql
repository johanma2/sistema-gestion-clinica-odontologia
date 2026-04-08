-- ============================================================
--  SmileTrack -- Sistema de Gestion Odontologica
--  Motor : SQL Server 2019+ / T-SQL
--  ADSO  · SENA 2025
--  26 tablas · 32 procedimientos · 18 triggers
-- ============================================================
--
--  INDICE
--  -------------------------------------------------------
--  PARTE 1  Configuracion de la base de datos
--  PARTE 2  Tablas por modulo (7 modulos)
--  PARTE 3  Datos de prueba
--  PARTE 4  Triggers (18) -- uno por modulo, justo despues de sus tablas
--  PARTE 5  Procedimientos almacenados (32)
--  PARTE 6  Consultas SELECT por tabla (leer cada tabla)
-- ============================================================


-- ============================================================
-- PARTE 1  CONFIGURACION DE LA BASE DE DATOS
-- ============================================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'SmileTrackDB')
    DROP DATABASE SmileTrackDB;
GO

CREATE DATABASE SmileTrackDB;
GO

USE SmileTrackDB;
GO


-- ============================================================
-- PARTE 2  TABLAS POR MODULO
-- ============================================================

-- ------------------------------------------------------------
-- MODULO 1: USUARIOS, ROLES Y PERMISOS
-- 4 tablas: Rol, Usuario, Auditoria, Rol_Menu_Permiso
-- ------------------------------------------------------------

CREATE TABLE Rol (
    id_rol        INT           PRIMARY KEY IDENTITY(1,1),
    nombre_rol    VARCHAR(50)   NOT NULL,
    descripcion   VARCHAR(200)  NULL
);
GO

CREATE TABLE Usuario (
    id_usuario       INT           PRIMARY KEY IDENTITY(1,1),
    id_usuario_FK    INT           NULL,
    nombre           VARCHAR(100)  NOT NULL,
    apellidos        VARCHAR(100)  NOT NULL,
    correo           VARCHAR(150)  NOT NULL UNIQUE,
    contrasena       VARCHAR(255)  NOT NULL,
    id_rol           INT           NOT NULL,
    estado           VARCHAR(10)   NOT NULL DEFAULT 'activo'
                     CHECK (estado IN ('activo','inactivo')),
    fecha_nacimiento DATE          NULL,
    fecha_creacion   DATETIME      NOT NULL DEFAULT GETDATE(),
    ultimo_login     DATETIME      NULL,
    CONSTRAINT FK_Usuario_Rol FOREIGN KEY (id_rol) REFERENCES Rol(id_rol)
);
GO

CREATE TABLE Auditoria (
    id_auditoria    INT           PRIMARY KEY IDENTITY(1,1),
    id_usuario      INT           NULL,
    tabla_afectada  VARCHAR(100)  NOT NULL,
    id_registro     INT           NULL,
    accion          VARCHAR(45)   NOT NULL
                    CHECK (accion IN ('INSERT','UPDATE','DELETE')),
    ip_origen       VARCHAR(45)   NULL,
    datos_anteriores VARCHAR(MAX) NULL,
    datos_nuevos    VARCHAR(MAX)  NULL,
    descripcion     VARCHAR(255)  NULL,
    fecha           DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Auditoria_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);
GO

CREATE TABLE Rol_Menu_Permiso (
    id_rol          INT  NOT NULL,
    id_usuario      INT  NOT NULL,
    id_menu         INT  NOT NULL,
    puede_ver       BIT  NOT NULL DEFAULT 0,
    puede_crear     BIT  NOT NULL DEFAULT 0,
    puede_editar    BIT  NOT NULL DEFAULT 0,
    puede_eliminar  BIT  NOT NULL DEFAULT 0,
    puede_exportar  BIT  NOT NULL DEFAULT 0,
    PRIMARY KEY (id_rol, id_menu),
    CONSTRAINT FK_RMP_Rol     FOREIGN KEY (id_rol)     REFERENCES Rol(id_rol),
    CONSTRAINT FK_RMP_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);
GO

-- ============================================================
-- TRIGGERS -- MODULO 1: USUARIOS
-- ============================================================

-- Despues de insertar un usuario, registrar en auditoria
CREATE OR ALTER TRIGGER trg_Usuario_Insert
ON Usuario
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Auditoria (id_usuario, tabla_afectada, accion, id_registro, descripcion, fecha)
    SELECT
        i.id_usuario,
        'Usuario',
        'INSERT',
        i.id_usuario,
        'Nuevo usuario registrado: ' + i.nombre,
        GETDATE()
    FROM inserted i;
END
GO

-- Despues de actualizar un usuario, registrar datos anteriores y nuevos
CREATE OR ALTER TRIGGER trg_Usuario_Update
ON Usuario
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Auditoria (id_usuario, tabla_afectada, accion, id_registro,
                           datos_anteriores, datos_nuevos, descripcion, fecha)
    SELECT
        i.id_usuario,
        'Usuario',
        'UPDATE',
        i.id_usuario,
        '{"estado":"' + d.estado + '","correo":"' + d.correo + '"}',
        '{"estado":"' + i.estado + '","correo":"' + i.correo + '"}',
        'Usuario actualizado: ' + i.nombre,
        GETDATE()
    FROM inserted i
    INNER JOIN deleted d ON d.id_usuario = i.id_usuario;
END
GO

-- Antes de eliminar un usuario, verificar que no tenga dependencias activas
CREATE OR ALTER TRIGGER trg_Usuario_Delete
ON Usuario
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM Profesional p
        INNER JOIN deleted d ON d.id_usuario = p.id_usuario
        WHERE p.estado = 'activo'
    )
    BEGIN
        RAISERROR('No se puede eliminar el usuario porque tiene un profesional activo asociado.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1 FROM Paciente p
        INNER JOIN deleted d ON d.id_usuario = p.id_usuario
        WHERE p.estado = 'activo'
    )
    BEGIN
        RAISERROR('No se puede eliminar el usuario porque tiene un paciente activo asociado.', 16, 1);
        RETURN;
    END

    DELETE FROM Usuario WHERE id_usuario IN (SELECT id_usuario FROM deleted);
END
GO


-- ------------------------------------------------------------
-- MODULO 2: PACIENTES
-- 1 tabla: Paciente
-- ------------------------------------------------------------

CREATE TABLE Paciente (
    id_paciente          INT           PRIMARY KEY IDENTITY(1,1),
    id_usuario           INT           NULL,
    tipo_documento       VARCHAR(5)    NOT NULL
                         CHECK (tipo_documento IN ('CC','TI','CE','PAS','NIT')),
    documento            VARCHAR(20)   NOT NULL UNIQUE,
    nombres              VARCHAR(100)  NOT NULL,
    apellidos            VARCHAR(100)  NOT NULL,
    fecha_nacimiento     DATE          NOT NULL,
    genero               VARCHAR(5)    NULL,
    telefono             VARCHAR(20)   NULL,
    correo               VARCHAR(150)  NULL,
    direccion            VARCHAR(255)  NULL,
    ciudad               VARCHAR(100)  NULL,
    grupo_sanguineo      VARCHAR(5)    NULL,
    alergias             VARCHAR(MAX)  NULL,
    antecedentes_medicos VARCHAR(MAX)  NULL,
    contacto_emergencia  VARCHAR(100)  NULL,
    telefono_emergencia  VARCHAR(20)   NULL,
    fecha_registro       DATE          NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    estado               VARCHAR(10)   NOT NULL DEFAULT 'activo'
                         CHECK (estado IN ('activo','inactivo','retirado')),
    CONSTRAINT FK_Paciente_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);
GO

-- ============================================================
-- TRIGGERS -- MODULO 2: PACIENTES
-- ============================================================

-- Despues de insertar un paciente, crear historia clinica automaticamente
CREATE OR ALTER TRIGGER trg_Paciente_Insert
ON Paciente
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Historia_Clinica (id_paciente, fecha_apertura, activa)
    SELECT i.id_paciente, CAST(GETDATE() AS DATE), 1
    FROM inserted i
    WHERE NOT EXISTS (
        SELECT 1 FROM Historia_Clinica hc WHERE hc.id_paciente = i.id_paciente
    );
END
GO

-- Antes de eliminar un paciente, verificar que no tenga facturas pendientes ni citas agendadas
CREATE OR ALTER TRIGGER trg_Paciente_Delete
ON Paciente
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM Factura f
        INNER JOIN deleted d ON d.id_paciente = f.id_paciente
        WHERE f.estado IN ('pendiente','parcial')
    )
    BEGIN
        RAISERROR('No se puede eliminar el paciente porque tiene facturas pendientes de pago.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1 FROM Cita c
        INNER JOIN deleted d ON d.id_paciente = c.id_paciente
        INNER JOIN Estado_Cita ec ON ec.id_estado = c.id_estado
        WHERE ec.nombre_estado = 'Agendada'
    )
    BEGIN
        RAISERROR('No se puede eliminar el paciente porque tiene citas agendadas.', 16, 1);
        RETURN;
    END

    DELETE FROM Paciente WHERE id_paciente IN (SELECT id_paciente FROM deleted);
END
GO

-- Al cambiar estado del paciente a retirado, cerrar automaticamente su historia clinica
CREATE OR ALTER TRIGGER trg_Paciente_Update
ON Paciente
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(estado)
    BEGIN
        UPDATE Historia_Clinica
        SET activa = 0
        WHERE id_paciente IN (
            SELECT i.id_paciente FROM inserted i
            INNER JOIN deleted d ON d.id_paciente = i.id_paciente
            WHERE i.estado = 'retirado' AND d.estado != 'retirado'
        );
    END
END
GO


-- ------------------------------------------------------------
-- MODULO 3: ESPECIALIDADES Y PROFESIONALES
-- 6 tablas: Especialidad, Profesional, Profesional_Especialidad,
--           Horario_Profesional, Bloqueo_Profesional, Ausencia_Profesional
-- ------------------------------------------------------------

CREATE TABLE Especialidad (
    id_especialidad INT          PRIMARY KEY IDENTITY(1,1),
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255) NULL
);
GO

CREATE TABLE Profesional (
    id_profesional  INT          PRIMARY KEY IDENTITY(1,1),
    id_usuario      INT          NOT NULL,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    registro_medico VARCHAR(50)  NOT NULL UNIQUE,
    descripcion     VARCHAR(255) NULL,
    categoria       VARCHAR(100) NULL,
    telefono        VARCHAR(20)  NULL,
    estado          VARCHAR(15)  NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo','inactivo','vacaciones')),
    fecha_ingreso   DATE         NULL,
    CONSTRAINT FK_Profesional_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);
GO

CREATE TABLE Profesional_Especialidad (
    id_profesional  INT NOT NULL,
    id_especialidad INT NOT NULL,
    principal       BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (id_profesional, id_especialidad),
    CONSTRAINT FK_PE_Profesional  FOREIGN KEY (id_profesional)  REFERENCES Profesional(id_profesional),
    CONSTRAINT FK_PE_Especialidad FOREIGN KEY (id_especialidad) REFERENCES Especialidad(id_especialidad)
);
GO

CREATE TABLE Horario_Profesional (
    id_horario     INT          PRIMARY KEY IDENTITY(1,1),
    id_profesional INT          NOT NULL,
    dia_semana     VARCHAR(12)  NOT NULL
                   CHECK (dia_semana IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo')),
    hora_inicio    TIME         NOT NULL,
    hora_fin       TIME         NOT NULL,
    activo         BIT          NOT NULL DEFAULT 1,
    CONSTRAINT FK_HP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
);
GO

CREATE TABLE Bloqueo_Profesional (
    id_bloqueo     INT          PRIMARY KEY IDENTITY(1,1),
    id_profesional INT          NOT NULL,
    fecha_inicio   DATETIME     NOT NULL,
    fecha_fin      DATETIME     NOT NULL,
    motivo         VARCHAR(150) NULL,
    aprobado_por   INT          NULL,
    CONSTRAINT FK_BP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
);
GO

CREATE TABLE Ausencia_Profesional (
    id_ausencia    INT          PRIMARY KEY IDENTITY(1,1),
    id_profesional INT          NOT NULL,
    tipo           VARCHAR(15)  NOT NULL
                   CHECK (tipo IN ('vacaciones','incapacidad','permiso','otro')),
    fecha_inicio   DATE         NOT NULL,
    fecha_fin      DATE         NOT NULL,
    duracion       INT          NULL,
    observaciones  VARCHAR(MAX) NULL,
    aprobado_por   INT          NULL,
    CONSTRAINT FK_AP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
);
GO

-- ============================================================
-- TRIGGERS -- MODULO 3: PROFESIONALES
-- ============================================================

-- Al cambiar estado del profesional a inactivo o vacaciones,
-- cancelar automaticamente sus citas futuras agendadas
CREATE OR ALTER TRIGGER trg_Profesional_Update
ON Profesional
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_est_cancelada INT;

    IF UPDATE(estado)
    BEGIN
        SELECT TOP 1 @id_est_cancelada = id_estado
        FROM Estado_Cita WHERE nombre_estado = 'Cancelada';

        -- Cancelar citas futuras agendadas
        UPDATE Cita
        SET id_estado = @id_est_cancelada
        WHERE id_profesional IN (
            SELECT i.id_profesional FROM inserted i
            INNER JOIN deleted d ON d.id_profesional = i.id_profesional
            WHERE i.estado IN ('inactivo','vacaciones')
              AND d.estado = 'activo'
        )
        AND fecha >= CAST(GETDATE() AS DATE)
        AND id_estado IN (
            SELECT id_estado FROM Estado_Cita WHERE nombre_estado = 'Agendada'
        );

        -- Registrar cancelaciones automaticas
        INSERT INTO Cancelacion_Cita (id_cita, motivo, cancelado_por, fecha_cancelacion, horas_anticipacion)
        SELECT
            c.id_cita,
            'Cancelacion automatica por cambio de estado del profesional.',
            i.id_usuario,
            GETDATE(),
            DATEDIFF(HOUR, GETDATE(),
                CAST(CAST(c.fecha AS NVARCHAR) + ' ' + CAST(c.hora_inicio AS NVARCHAR) AS DATETIME))
        FROM Cita c
        INNER JOIN inserted i ON i.id_profesional = c.id_profesional
        INNER JOIN deleted  d ON d.id_profesional = i.id_profesional
        WHERE i.estado IN ('inactivo','vacaciones')
          AND d.estado = 'activo'
          AND c.fecha >= CAST(GETDATE() AS DATE)
          AND NOT EXISTS (
              SELECT 1 FROM Cancelacion_Cita cc WHERE cc.id_cita = c.id_cita
          );
    END
END
GO

-- Antes de eliminar un profesional, verificar que no tenga citas futuras agendadas
CREATE OR ALTER TRIGGER trg_Profesional_Delete
ON Profesional
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM Cita c
        INNER JOIN deleted d ON d.id_profesional = c.id_profesional
        INNER JOIN Estado_Cita ec ON ec.id_estado = c.id_estado
        WHERE ec.nombre_estado = 'Agendada'
          AND c.fecha >= CAST(GETDATE() AS DATE)
    )
    BEGIN
        RAISERROR('No se puede eliminar el profesional porque tiene citas agendadas.', 16, 1);
        RETURN;
    END
    DELETE FROM Profesional WHERE id_profesional IN (SELECT id_profesional FROM deleted);
END
GO


-- ------------------------------------------------------------
-- MODULO 4: SERVICIOS Y CONSULTORIOS
-- 3 tablas: Servicio, Profesional_Servicio, Consultorio
-- ------------------------------------------------------------

CREATE TABLE Servicio (
    id_servicio INT           PRIMARY KEY IDENTITY(1,1),
    nombre      VARCHAR(100)  NOT NULL,
    descripcion VARCHAR(255)  NULL,
    categoria   VARCHAR(100)  NULL,
    costo       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    duracion    VARCHAR(50)   NULL,
    telefono    VARCHAR(20)   NULL,
    activo      BIT           NOT NULL DEFAULT 1
);
GO

CREATE TABLE Profesional_Servicio (
    id_profesional INT NOT NULL,
    id_servicio    INT NOT NULL,
    PRIMARY KEY (id_profesional, id_servicio),
    CONSTRAINT FK_PS_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional),
    CONSTRAINT FK_PS_Servicio    FOREIGN KEY (id_servicio)    REFERENCES Servicio(id_servicio)
);
GO

CREATE TABLE Consultorio (
    id_consultorio INT          PRIMARY KEY IDENTITY(1,1),
    nombre         VARCHAR(100) NOT NULL,
    ubicacion      VARCHAR(150) NULL,
    tipo           VARCHAR(50)  NULL,
    nombre_estado  VARCHAR(50)  NULL,
    capacidad      INT          NULL,
    estado         VARCHAR(15)  NOT NULL DEFAULT 'disponible'
                   CHECK (estado IN ('disponible','ocupado','mantenimiento'))
);
GO

-- ============================================================
-- TRIGGERS -- MODULO 4: SERVICIOS
-- ============================================================

-- Bloquear desactivacion de servicio con citas pendientes
CREATE OR ALTER TRIGGER trg_Servicio_Update
ON Servicio
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(activo)
    BEGIN
        IF EXISTS (
            SELECT 1 FROM Detalle_Cita dc
            INNER JOIN inserted   i  ON i.id_servicio = dc.id_servicio
            INNER JOIN deleted    d  ON d.id_servicio = i.id_servicio
            INNER JOIN Cita       c  ON c.id_cita     = dc.id_cita
            INNER JOIN Estado_Cita ec ON ec.id_estado  = c.id_estado
            WHERE i.activo = 0 AND d.activo = 1
              AND dc.estado = 'pendiente'
              AND ec.nombre_estado = 'Agendada'
        )
        BEGIN
            RAISERROR('No se puede desactivar el servicio porque tiene citas pendientes asociadas.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
    END
END
GO

-- Registrar en auditoria cualquier cambio de precio de servicio
CREATE OR ALTER TRIGGER trg_Servicio_CostoUpdate
ON Servicio
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(costo)
    BEGIN
        INSERT INTO Auditoria (tabla_afectada, accion, id_registro,
                               datos_anteriores, datos_nuevos, descripcion, fecha)
        SELECT
            'Servicio',
            'UPDATE',
            i.id_servicio,
            '{"costo":' + CAST(d.costo AS NVARCHAR) + '}',
            '{"costo":' + CAST(i.costo AS NVARCHAR) + '}',
            'Precio actualizado para servicio: ' + i.nombre,
            GETDATE()
        FROM inserted i
        INNER JOIN deleted d ON d.id_servicio = i.id_servicio
        WHERE i.costo != d.costo;
    END
END
GO


-- ------------------------------------------------------------
-- MODULO 5: CITAS Y CANCELACIONES
-- 4 tablas: Estado_Cita, Cita, Cancelacion_Cita, Detalle_Cita
-- ------------------------------------------------------------

CREATE TABLE Estado_Cita (
    id_estado     INT         PRIMARY KEY IDENTITY(1,1),
    nombre_estado VARCHAR(50) NOT NULL UNIQUE,
    descripcion   VARCHAR(150) NULL
);
GO

CREATE TABLE Cita (
    id_cita          INT          PRIMARY KEY IDENTITY(1,1),
    fecha            DATE         NOT NULL,
    hora_inicio      TIME         NOT NULL,
    hora_fin         TIME         NOT NULL,
    motivo_consulta  VARCHAR(MAX) NULL,
    notas_previas    VARCHAR(MAX) NULL,
    tipo_cita        VARCHAR(20)  NULL
                     CHECK (tipo_cita IN ('consulta','control','urgencia','procedimiento')),
    id_paciente      INT          NOT NULL,
    id_profesional   INT          NOT NULL,
    id_consultorio   INT          NOT NULL,
    id_estado        INT          NOT NULL,
    fecha_creacion   DATETIME     NOT NULL DEFAULT GETDATE(),
    creado_por       INT          NOT NULL,
    CONSTRAINT FK_Cita_Paciente    FOREIGN KEY (id_paciente)    REFERENCES Paciente(id_paciente),
    CONSTRAINT FK_Cita_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional),
    CONSTRAINT FK_Cita_Consultorio FOREIGN KEY (id_consultorio) REFERENCES Consultorio(id_consultorio),
    CONSTRAINT FK_Cita_Estado      FOREIGN KEY (id_estado)      REFERENCES Estado_Cita(id_estado),
    CONSTRAINT FK_Cita_CreadoPor   FOREIGN KEY (creado_por)     REFERENCES Usuario(id_usuario)
);
GO

CREATE TABLE Cancelacion_Cita (
    id_cancelacion    INT          PRIMARY KEY IDENTITY(1,1),
    id_cita           INT          NOT NULL,
    motivo            VARCHAR(MAX) NULL,
    cancelado_por     INT          NOT NULL,
    ip_origen         VARCHAR(45)  NULL,
    fecha_cancelacion DATETIME     NOT NULL DEFAULT GETDATE(),
    horas_anticipacion INT         NULL,
    CONSTRAINT FK_CC_Cita         FOREIGN KEY (id_cita)       REFERENCES Cita(id_cita),
    CONSTRAINT FK_CC_CanceladoPor FOREIGN KEY (cancelado_por) REFERENCES Usuario(id_usuario)
);
GO

CREATE TABLE Detalle_Cita (
    id_detalle_cita INT           PRIMARY KEY IDENTITY(1,1),
    id_cita         INT           NOT NULL,
    id_servicio     INT           NOT NULL,
    precio_aplicado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    observaciones   VARCHAR(MAX)  NULL,
    estado          VARCHAR(10)   NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','realizado','cancelado')),
    CONSTRAINT FK_DC_Cita    FOREIGN KEY (id_cita)    REFERENCES Cita(id_cita),
    CONSTRAINT FK_DC_Servicio FOREIGN KEY (id_servicio) REFERENCES Servicio(id_servicio)
);
GO

-- ============================================================
-- TRIGGERS -- MODULO 5: CITAS
-- ============================================================

-- Al insertar una cita, crear notificacion de confirmacion + recordatorio 24h antes
CREATE OR ALTER TRIGGER trg_Cita_Insert
ON Cita
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Notificacion inmediata de confirmacion
    INSERT INTO Notificacion (id_usuario, id_cita, tipo, canal, asunto, mensaje, estado, fecha_programada)
    SELECT
        p.id_usuario,
        i.id_cita,
        'confirmacion',
        'correo',
        'Confirmacion de cita - SmileTrack',
        'Su cita ha sido agendada para el ' +
            CONVERT(NVARCHAR, i.fecha, 103) + ' a las ' +
            CONVERT(NVARCHAR, i.hora_inicio, 108) + '.',
        'pendiente',
        GETDATE()
    FROM inserted i
    INNER JOIN Paciente p ON p.id_paciente = i.id_paciente
    WHERE p.id_usuario IS NOT NULL;

    -- Recordatorio programado 24 horas antes
    INSERT INTO Notificacion (id_usuario, id_cita, tipo, canal, asunto, mensaje, estado, fecha_programada)
    SELECT
        p.id_usuario,
        i.id_cita,
        'recordatorio',
        'correo',
        'Recordatorio de cita - SmileTrack',
        'Le recordamos que tiene una cita manana ' +
            CONVERT(NVARCHAR, i.fecha, 103) + ' a las ' +
            CONVERT(NVARCHAR, i.hora_inicio, 108) + '.',
        'pendiente',
        DATEADD(DAY, -1,
            CAST(CAST(i.fecha AS NVARCHAR) + ' ' + CAST(i.hora_inicio AS NVARCHAR) AS DATETIME))
    FROM inserted i
    INNER JOIN Paciente p ON p.id_paciente = i.id_paciente
    WHERE p.id_usuario IS NOT NULL;
END
GO

-- Al cambiar estado de cita a Cancelada, notificar al paciente y auditar
CREATE OR ALTER TRIGGER trg_Cita_Update
ON Cita
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(id_estado)
    BEGIN
        -- Notificacion de cancelacion
        INSERT INTO Notificacion (id_usuario, id_cita, tipo, canal, asunto, mensaje, estado, fecha_programada)
        SELECT
            p.id_usuario,
            i.id_cita,
            'cancelacion',
            'correo',
            'Cita cancelada - SmileTrack',
            'Su cita del ' + CONVERT(NVARCHAR, i.fecha, 103) +
            ' a las ' + CONVERT(NVARCHAR, i.hora_inicio, 108) + ' ha sido cancelada.',
            'pendiente',
            GETDATE()
        FROM inserted i
        INNER JOIN deleted    d  ON d.id_cita     = i.id_cita
        INNER JOIN Paciente   p  ON p.id_paciente = i.id_paciente
        INNER JOIN Estado_Cita ec ON ec.id_estado  = i.id_estado
        WHERE ec.nombre_estado = 'Cancelada'
          AND d.id_estado != i.id_estado
          AND p.id_usuario IS NOT NULL;

        -- Auditoria del cambio de estado
        INSERT INTO Auditoria (tabla_afectada, accion, id_registro,
                               datos_anteriores, datos_nuevos, descripcion, fecha)
        SELECT
            'Cita',
            'UPDATE',
            i.id_cita,
            '{"id_estado":' + CAST(d.id_estado AS NVARCHAR) + '}',
            '{"id_estado":' + CAST(i.id_estado AS NVARCHAR) + '}',
            'Estado de cita actualizado.',
            GETDATE()
        FROM inserted i
        INNER JOIN deleted d ON d.id_cita = i.id_cita
        WHERE i.id_estado != d.id_estado;
    END
END
GO

-- Validar que la fecha no sea pasada y hora_fin > hora_inicio antes de insertar
CREATE OR ALTER TRIGGER trg_Cita_ValidarFecha
ON Cita
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted WHERE fecha < CAST(GETDATE() AS DATE))
    BEGIN
        RAISERROR('No se puede agendar una cita en una fecha pasada.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM inserted WHERE hora_fin <= hora_inicio)
    BEGIN
        RAISERROR('La hora de fin debe ser mayor que la hora de inicio.', 16, 1);
        RETURN;
    END

    INSERT INTO Cita (
        fecha, hora_inicio, hora_fin, motivo_consulta, notas_previas,
        tipo_cita, id_paciente, id_profesional, id_consultorio,
        id_estado, fecha_creacion, creado_por
    )
    SELECT
        fecha, hora_inicio, hora_fin, motivo_consulta, notas_previas,
        tipo_cita, id_paciente, id_profesional, id_consultorio,
        id_estado, fecha_creacion, creado_por
    FROM inserted;
END
GO


-- ------------------------------------------------------------
-- MODULO 6: FACTURACION, PAGOS Y NOTIFICACIONES
-- 4 tablas: Factura, Detalle_Factura, Pago, Notificacion
-- ------------------------------------------------------------

CREATE TABLE Factura (
    id_factura      INT           PRIMARY KEY IDENTITY(1,1),
    numero_factura  VARCHAR(20)   NOT NULL UNIQUE,
    fecha_factura   DATE          NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    fecha_apertura  DATE          NULL,
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    impuestos       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado          VARCHAR(10)   NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','parcial','pagada','anulada')),
    id_paciente     INT           NOT NULL,
    notas           VARCHAR(MAX)  NULL,
    generada_por    INT           NOT NULL,
    CONSTRAINT FK_Factura_Paciente    FOREIGN KEY (id_paciente)  REFERENCES Paciente(id_paciente),
    CONSTRAINT FK_Factura_GeneradaPor FOREIGN KEY (generada_por) REFERENCES Usuario(id_usuario)
);
GO

CREATE TABLE Detalle_Factura (
    id_detalle_factura INT           PRIMARY KEY IDENTITY(1,1),
    id_factura         INT           NOT NULL,
    id_detalle_cita    INT           NULL,
    descripcion        VARCHAR(255)  NULL,
    precio_unitario    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cantidad           INT           NOT NULL DEFAULT 1,
    descuento_linea    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT FK_DF_Factura    FOREIGN KEY (id_factura)      REFERENCES Factura(id_factura),
    CONSTRAINT FK_DF_DetalleCita FOREIGN KEY (id_detalle_cita) REFERENCES Detalle_Cita(id_detalle_cita)
);
GO

CREATE TABLE Pago (
    id_pago        INT           PRIMARY KEY IDENTITY(1,1),
    id_factura     INT           NOT NULL,
    fecha_pago     DATETIME      NOT NULL DEFAULT GETDATE(),
    monto          DECIMAL(12,2) NOT NULL,
    metodo_pago    VARCHAR(20)   NOT NULL
                   CHECK (metodo_pago IN ('efectivo','tarjeta','transferencia','otro')),
    referencia     VARCHAR(100)  NULL,
    registrado_por INT           NOT NULL,
    notas          VARCHAR(MAX)  NULL,
    CONSTRAINT FK_Pago_Factura       FOREIGN KEY (id_factura)     REFERENCES Factura(id_factura),
    CONSTRAINT FK_Pago_RegistradoPor FOREIGN KEY (registrado_por) REFERENCES Usuario(id_usuario)
);
GO

CREATE TABLE Notificacion (
    id_notificacion   INT          PRIMARY KEY IDENTITY(1,1),
    id_usuario        INT          NOT NULL,
    id_cita           INT          NULL,
    tipo              VARCHAR(15)  NOT NULL
                      CHECK (tipo IN ('confirmacion','recordatorio','cancelacion','mensaje')),
    canal             VARCHAR(10)  NOT NULL
                      CHECK (canal IN ('correo','sms','sistema')),
    asunto            VARCHAR(200) NULL,
    mensaje           VARCHAR(MAX) NULL,
    estado            VARCHAR(10)  NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','enviada','fallida','leida')),
    fecha_programada  DATETIME     NULL,
    fecha_envio       DATETIME     NULL,
    CONSTRAINT FK_Notif_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    CONSTRAINT FK_Notif_Cita    FOREIGN KEY (id_cita)    REFERENCES Cita(id_cita)
);
GO

-- ============================================================
-- TRIGGERS -- MODULO 6: FACTURACION Y PAGOS
-- ============================================================

-- Al insertar un pago, actualizar automaticamente el estado de la factura
CREATE OR ALTER TRIGGER trg_Pago_Insert
ON Pago
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_factura    INT;
    DECLARE @total         DECIMAL(12,2);
    DECLARE @total_pagado  DECIMAL(12,2);
    DECLARE @estado_nuevo  NVARCHAR(20);

    SELECT @id_factura = id_factura FROM inserted;
    SELECT @total = total FROM Factura WHERE id_factura = @id_factura;
    SELECT @total_pagado = ISNULL(SUM(monto), 0) FROM Pago WHERE id_factura = @id_factura;

    IF @total_pagado >= @total
        SET @estado_nuevo = 'pagada';
    ELSE IF @total_pagado > 0
        SET @estado_nuevo = 'parcial';
    ELSE
        SET @estado_nuevo = 'pendiente';

    UPDATE Factura SET estado = @estado_nuevo WHERE id_factura = @id_factura;
END
GO

-- Antes de insertar un pago, validar que el monto no exceda el saldo pendiente
CREATE OR ALTER TRIGGER trg_Pago_ValidarMonto
ON Pago
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_factura   INT;
    DECLARE @monto        DECIMAL(12,2);
    DECLARE @total        DECIMAL(12,2);
    DECLARE @total_pagado DECIMAL(12,2);
    DECLARE @saldo        DECIMAL(12,2);

    SELECT @id_factura = id_factura, @monto = monto FROM inserted;
    SELECT @total = total FROM Factura WHERE id_factura = @id_factura;
    SELECT @total_pagado = ISNULL(SUM(monto), 0) FROM Pago WHERE id_factura = @id_factura;
    SET @saldo = @total - @total_pagado;

    IF @monto <= 0
    BEGIN
        RAISERROR('El monto del pago debe ser mayor a cero.', 16, 1);
        RETURN;
    END

    IF @monto > @saldo
    BEGIN
        RAISERROR('El monto del pago excede el saldo pendiente de la factura.', 16, 1);
        RETURN;
    END

    INSERT INTO Pago (id_factura, fecha_pago, monto, metodo_pago, referencia, registrado_por, notas)
    SELECT  id_factura, fecha_pago, monto, metodo_pago, referencia, registrado_por, notas
    FROM inserted;
END
GO

-- Antes de eliminar una factura, verificar que no tenga pagos registrados
CREATE OR ALTER TRIGGER trg_Factura_Delete
ON Factura
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM Pago p
        INNER JOIN deleted d ON d.id_factura = p.id_factura
    )
    BEGIN
        RAISERROR('No se puede eliminar una factura que ya tiene pagos registrados.', 16, 1);
        RETURN;
    END
    DELETE FROM Factura WHERE id_factura IN (SELECT id_factura FROM deleted);
END
GO

-- Al insertar un detalle de factura, recalcular subtotal y total de la factura
CREATE OR ALTER TRIGGER trg_DetalleFactura_Insert
ON Detalle_Factura
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE f SET
        subtotal = (
            SELECT ISNULL(SUM(df.precio_unitario * df.cantidad - df.descuento_linea), 0)
            FROM Detalle_Factura df WHERE df.id_factura = f.id_factura
        ),
        total = (
            SELECT ISNULL(SUM(df.precio_unitario * df.cantidad - df.descuento_linea), 0)
            FROM Detalle_Factura df WHERE df.id_factura = f.id_factura
        ) - f.descuento + f.impuestos
    FROM Factura f
    INNER JOIN inserted i ON i.id_factura = f.id_factura;
END
GO


-- ------------------------------------------------------------
-- MODULO 7: HISTORIA CLINICA Y ODONTOGRAMA
-- 5 tablas: Historia_Clinica, Detalle_Historia_Clinica,
--           Diente_Catalogo, Odontograma, Odontograma_Diente
-- ------------------------------------------------------------

CREATE TABLE Historia_Clinica (
    id_historia               INT          PRIMARY KEY IDENTITY(1,1),
    id_paciente               INT          NOT NULL UNIQUE,
    fecha_apertura            DATE         NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    observaciones_generales   VARCHAR(MAX) NULL,
    activa                    BIT          NOT NULL DEFAULT 1,
    CONSTRAINT FK_HC_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente)
);
GO

CREATE TABLE Detalle_Historia_Clinica (
    id_detalle_historia     INT          PRIMARY KEY IDENTITY(1,1),
    id_historia             INT          NOT NULL,
    id_cita                 INT          NULL,
    id_profesional          INT          NOT NULL,
    fecha                   DATE         NOT NULL,
    diagnostico             VARCHAR(MAX) NULL,
    procedimiento           VARCHAR(255) NULL,
    tratamiento             VARCHAR(MAX) NULL,
    observaciones           VARCHAR(MAX) NULL,
    proxima_cita_sugerida   DATE         NULL,
    CONSTRAINT FK_DHC_Historia    FOREIGN KEY (id_historia)   REFERENCES Historia_Clinica(id_historia),
    CONSTRAINT FK_DHC_Cita        FOREIGN KEY (id_cita)       REFERENCES Cita(id_cita),
    CONSTRAINT FK_DHC_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
);
GO

CREATE TABLE Diente_Catalogo (
    id_diente      INT          PRIMARY KEY IDENTITY(1,1),
    numero_fdi     INT          NOT NULL UNIQUE,
    nombre         VARCHAR(100) NULL,
    cuadrante      INT          NULL CHECK (cuadrante IN (1,2,3,4)),
    tipo_denticion VARCHAR(10)  NULL CHECK (tipo_denticion IN ('adulto','infantil')),
    tipo_diente    DATETIME     NULL
);
GO

CREATE TABLE Odontograma (
    id_odontograma  INT          PRIMARY KEY IDENTITY(1,1),
    id_historia     INT          NOT NULL,
    id_detalle      INT          NULL,
    tipo            VARCHAR(10)  NOT NULL CHECK (tipo IN ('adulto','infantil')),
    fecha_registro  DATE         NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    observaciones   VARCHAR(MAX) NULL,
    CONSTRAINT FK_Odonto_Historia FOREIGN KEY (id_historia) REFERENCES Historia_Clinica(id_historia),
    CONSTRAINT FK_Odonto_Detalle  FOREIGN KEY (id_detalle)  REFERENCES Detalle_Historia_Clinica(id_detalle_historia)
);
GO

CREATE TABLE Odontograma_Diente (
    id_od_diente   INT          PRIMARY KEY IDENTITY(1,1),
    id_odontograma INT          NOT NULL,
    id_diente      INT          NOT NULL,
    id_profesional INT          NOT NULL,
    estado         VARCHAR(20)  NOT NULL
                   CHECK (estado IN ('sano','caries','obturacion','corona','extraccion',
                                     'endodoncia','restauracion','implante','otro')),
    cara_afectada  VARCHAR(60)  NULL,
    observaciones  VARCHAR(MAX) NULL,
    fecha_registro DATE         NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    CONSTRAINT FK_OD_Odontograma  FOREIGN KEY (id_odontograma)  REFERENCES Odontograma(id_odontograma),
    CONSTRAINT FK_OD_Diente       FOREIGN KEY (id_diente)       REFERENCES Diente_Catalogo(id_diente),
    CONSTRAINT FK_OD_Profesional  FOREIGN KEY (id_profesional)  REFERENCES Profesional(id_profesional)
);
GO

-- ============================================================
-- TRIGGERS -- MODULO 7: HISTORIA CLINICA Y ODONTOGRAMA
-- ============================================================

-- Al insertar una entrada clinica, crear odontograma automaticamente
-- (adulto o infantil segun edad del paciente) si no existe para esa consulta
CREATE OR ALTER TRIGGER trg_DetalleHistoria_Insert
ON Detalle_Historia_Clinica
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Odontograma (id_historia, id_detalle, tipo, fecha_registro, observaciones)
    SELECT
        i.id_historia,
        i.id_detalle_historia,
        CASE
            WHEN DATEDIFF(YEAR, p.fecha_nacimiento, GETDATE()) < 13 THEN 'infantil'
            ELSE 'adulto'
        END,
        CAST(GETDATE() AS DATE),
        'Odontograma generado automaticamente.'
    FROM inserted i
    INNER JOIN Historia_Clinica hc ON hc.id_historia  = i.id_historia
    INNER JOIN Paciente         p  ON p.id_paciente   = hc.id_paciente
    WHERE NOT EXISTS (
        SELECT 1 FROM Odontograma o
        WHERE o.id_historia = i.id_historia
          AND o.id_detalle  = i.id_detalle_historia
    );
END
GO

-- Al cambiar el estado de un diente, registrar en auditoria
CREATE OR ALTER TRIGGER trg_OdontogramaDiente_Update
ON Odontograma_Diente
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(estado)
    BEGIN
        INSERT INTO Auditoria (id_usuario, tabla_afectada, accion, id_registro,
                               datos_anteriores, datos_nuevos, descripcion, fecha)
        SELECT
            pr.id_usuario,
            'Odontograma_Diente',
            'UPDATE',
            i.id_od_diente,
            '{"estado":"' + d.estado + '"}',
            '{"estado":"' + i.estado + '"}',
            'Estado de diente FDI ' + CAST(dc.numero_fdi AS NVARCHAR) +
            ' actualizado de ' + d.estado + ' a ' + i.estado,
            GETDATE()
        FROM inserted i
        INNER JOIN deleted         d  ON d.id_od_diente   = i.id_od_diente
        INNER JOIN Diente_Catalogo dc ON dc.id_diente      = i.id_diente
        INNER JOIN Profesional     pr ON pr.id_profesional = i.id_profesional
        WHERE i.estado != d.estado;
    END
END
GO

-- Antes de eliminar una historia clinica, verificar que no tenga entradas
CREATE OR ALTER TRIGGER trg_HistoriaClinica_Delete
ON Historia_Clinica
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM Detalle_Historia_Clinica dhc
        INNER JOIN deleted d ON d.id_historia = dhc.id_historia
    )
    BEGIN
        RAISERROR('No se puede eliminar una historia clinica que tiene entradas registradas.', 16, 1);
        RETURN;
    END
    DELETE FROM Historia_Clinica WHERE id_historia IN (SELECT id_historia FROM deleted);
END
GO


-- ============================================================
-- PARTE 3  DATOS DE PRUEBA
-- Orden correcto respetando claves foraneas
-- ============================================================

-- 1. ROLES
SET IDENTITY_INSERT Rol ON;
INSERT INTO Rol (id_rol, nombre_rol, descripcion) VALUES
(1, 'Administrador', 'Acceso total al sistema'),
(2, 'Odontologo',    'Gestion clinica y agenda personal'),
(3, 'Auxiliar',      'Apoyo clinico y consulta parcial'),
(4, 'Recepcion',     'Citas, pacientes y facturacion'),
(5, 'Paciente',      'Consulta de historial y citas propias');
SET IDENTITY_INSERT Rol OFF;
GO

-- 2. USUARIOS
SET IDENTITY_INSERT Usuario ON;
INSERT INTO Usuario (id_usuario, nombre, apellidos, correo, contrasena, id_rol, estado, fecha_nacimiento) VALUES
(1, 'Carlos',    'Martinez Ruiz',   'admin@smiletrack.com',     'SmT2025*Admin', 1, 'activo', '1985-03-15'),
(2, 'Andres',    'Torres Gomez',    'atorres@smiletrack.com',   'SmT2025*Odo',   2, 'activo', '1990-07-22'),
(3, 'Laura',     'Gomez Salinas',   'lgomez@smiletrack.com',    'SmT2025*Odo2',  2, 'activo', '1988-11-05'),
(4, 'Sara',      'Jimenez Ramos',   'sjimenez@smiletrack.com',  'SmT2025*Aux',   3, 'activo', '1995-02-18'),
(5, 'Valentina', 'Torres Perez',    'vtorres@smiletrack.com',   'SmT2025*Rec',   4, 'activo', '1993-08-30'),
(6, 'Juan',      'Sebastian Morales','jmorales@correo.com',     'SmT2025*Pac',   5, 'activo', '1995-08-14'),
(7, 'Maria',     'Lopez Rodriguez', 'mlopez@correo.com',        'SmT2025*Pac2',  5, 'activo', '1988-04-20');
SET IDENTITY_INSERT Usuario OFF;
GO

-- 3. ESPECIALIDADES
SET IDENTITY_INSERT Especialidad ON;
INSERT INTO Especialidad (id_especialidad, nombre, descripcion) VALUES
(1, 'Odontologia General',  'Atencion primaria y preventiva'),
(2, 'Endodoncia',           'Tratamiento de conductos'),
(3, 'Ortodoncia',           'Correccion dental y mandibular'),
(4, 'Periodoncia',          'Encias y tejidos de soporte'),
(5, 'Odontopediatria',      'Atencion a pacientes menores de edad');
SET IDENTITY_INSERT Especialidad OFF;
GO

-- 4. PACIENTES
SET IDENTITY_INSERT Paciente ON;
INSERT INTO Paciente (id_paciente, id_usuario, tipo_documento, documento, nombres, apellidos,
                      fecha_nacimiento, genero, telefono, correo, ciudad, grupo_sanguineo, alergias, estado) VALUES
(1, 6, 'CC', '1098765432', 'Juan Sebastian', 'Morales Rincon',  '1995-08-14', 'M', '312 456 7890', 'jmorales@correo.com', 'Bogota',   'O+', 'Penicilina', 'activo'),
(2, 7, 'CC', '1045678901', 'Maria Fernanda', 'Lopez Rodriguez', '1988-04-20', 'F', '314 234 5678', 'mlopez@correo.com',   'Medellin', 'A+', NULL,         'activo'),
(3, NULL,'CC','1023456789', 'Carlos',        'Ruiz Mendoza',    '1975-12-01', 'M', '315 678 9012', 'cruiz@correo.com',    'Cali',     'B+', 'Latex',      'activo'),
(4, NULL,'TI','1055500123', 'Daniela',       'Perez Castillo',  '2010-06-15', 'F', '316 890 1234', 'dperez@correo.com',   'Bogota',  'AB+', NULL,         'activo');
SET IDENTITY_INSERT Paciente OFF;
GO

-- 5. PROFESIONALES
SET IDENTITY_INSERT Profesional ON;
INSERT INTO Profesional (id_profesional, id_usuario, nombres, apellidos, registro_medico, categoria, estado, fecha_ingreso) VALUES
(1, 2, 'Andres', 'Torres Gomez',  'RM-2024-001', 'Odontologia General', 'activo', '2024-01-15'),
(2, 3, 'Laura',  'Gomez Salinas', 'RM-2024-002', 'Endodoncia',          'activo', '2024-02-01');
SET IDENTITY_INSERT Profesional OFF;
GO

INSERT INTO Profesional_Especialidad (id_profesional, id_especialidad, principal) VALUES
(1, 1, 1), (1, 3, 0),
(2, 1, 0), (2, 2, 1);
GO

-- 6. HORARIOS
SET IDENTITY_INSERT Horario_Profesional ON;
INSERT INTO Horario_Profesional (id_horario, id_profesional, dia_semana, hora_inicio, hora_fin, activo) VALUES
(1, 1, 'Lunes',     '08:00:00', '17:00:00', 1),
(2, 1, 'Martes',    '08:00:00', '17:00:00', 1),
(3, 1, 'Miercoles', '08:00:00', '17:00:00', 1),
(4, 1, 'Jueves',    '08:00:00', '17:00:00', 1),
(5, 1, 'Viernes',   '08:00:00', '16:00:00', 1),
(6, 2, 'Lunes',     '09:00:00', '18:00:00', 1),
(7, 2, 'Miercoles', '09:00:00', '18:00:00', 1),
(8, 2, 'Viernes',   '09:00:00', '16:00:00', 1);
SET IDENTITY_INSERT Horario_Profesional OFF;
GO

-- 7. SERVICIOS
SET IDENTITY_INSERT Servicio ON;
INSERT INTO Servicio (id_servicio, nombre, descripcion, categoria, costo, duracion, activo) VALUES
(1, 'Consulta general',       'Valoracion y diagnostico inicial',       'Preventivo',  50000.00, '30 min', 1),
(2, 'Limpieza dental',        'Profilaxis y detartraje supragingival',   'Preventivo',  80000.00, '45 min', 1),
(3, 'Endodoncia',             'Tratamiento de conductos radiculares',    'Endodoncia', 350000.00, '90 min', 1),
(4, 'Resina dental',          'Restauracion con resina compuesta',       'Restauracion',150000.00,'60 min', 1),
(5, 'Extraccion simple',      'Extraccion dental sin complicaciones',    'Cirugia',    120000.00, '45 min', 1),
(6, 'Blanqueamiento dental',  'Blanqueamiento con luz LED',              'Estetica',   250000.00, '60 min', 1),
(7, 'Control de tratamiento', 'Seguimiento de tratamiento en curso',     'Preventivo',  30000.00, '20 min', 1);
SET IDENTITY_INSERT Servicio OFF;
GO

INSERT INTO Profesional_Servicio (id_profesional, id_servicio) VALUES
(1,1),(1,2),(1,4),(1,5),(1,7),
(2,1),(2,2),(2,3),(2,7);
GO

-- 8. CONSULTORIOS
SET IDENTITY_INSERT Consultorio ON;
INSERT INTO Consultorio (id_consultorio, nombre, ubicacion, tipo, nombre_estado, capacidad, estado) VALUES
(1, 'Consultorio 1', 'Piso 1', 'General',      'Disponible', 2, 'disponible'),
(2, 'Consultorio 2', 'Piso 1', 'General',      'Disponible', 2, 'disponible'),
(3, 'Consultorio 3', 'Piso 2', 'Especialidad', 'Disponible', 2, 'disponible');
SET IDENTITY_INSERT Consultorio OFF;
GO

-- 9. ESTADOS DE CITA
SET IDENTITY_INSERT Estado_Cita ON;
INSERT INTO Estado_Cita (id_estado, nombre_estado, descripcion) VALUES
(1, 'Agendada',     'Cita programada, pendiente de confirmacion'),
(2, 'Confirmada',   'Cita confirmada por el paciente'),
(3, 'En consulta',  'Paciente siendo atendido actualmente'),
(4, 'Atendida',     'Cita completada satisfactoriamente'),
(5, 'Cancelada',    'Cita cancelada por paciente o profesional'),
(6, 'No asistio',   'Paciente no se presento'),
(7, 'Reprogramada', 'Cita reprogramada a otra fecha');
SET IDENTITY_INSERT Estado_Cita OFF;
GO

-- 10. CITAS
SET IDENTITY_INSERT Cita ON;
INSERT INTO Cita (id_cita, fecha, hora_inicio, hora_fin, motivo_consulta, tipo_cita,
                  id_paciente, id_profesional, id_consultorio, id_estado, creado_por) VALUES
(1, '2026-03-20', '08:00:00', '08:30:00', 'Consulta general de rutina',         'consulta',     1, 1, 1, 4, 5),
(2, '2026-03-20', '09:00:00', '10:00:00', 'Tratamiento endodoncia pieza 23',    'procedimiento',2, 2, 3, 3, 5),
(3, '2026-03-20', '10:00:00', '10:45:00', 'Limpieza dental semestral',          'consulta',     3, 1, 2, 4, 5),
(4, '2026-03-21', '09:00:00', '09:30:00', 'Control de tratamiento ortodoncia',  'control',      2, 1, 1, 1, 5),
(5, '2026-03-21', '14:00:00', '15:00:00', 'Endodoncia pieza 16',                'procedimiento',3, 2, 3, 1, 5);
SET IDENTITY_INSERT Cita OFF;
GO

-- 11. DETALLE DE CITA
SET IDENTITY_INSERT Detalle_Cita ON;
INSERT INTO Detalle_Cita (id_detalle_cita, id_cita, id_servicio, precio_aplicado, observaciones, estado) VALUES
(1, 1, 1, 50000.00, 'Consulta de rutina, sin hallazgos criticos',          'realizado'),
(2, 2, 7, 30000.00, 'Control endodoncia pieza 23, bien cicatrizado',       'realizado'),
(3, 2, 1, 50000.00, 'Valoracion adicional solicitada por el profesional',  'realizado'),
(4, 3, 2, 80000.00, 'Limpieza completa, detartraje incluido',              'realizado');
SET IDENTITY_INSERT Detalle_Cita OFF;
GO

-- 12. HISTORIA CLINICA
SET IDENTITY_INSERT Historia_Clinica ON;
INSERT INTO Historia_Clinica (id_historia, id_paciente, fecha_apertura, observaciones_generales, activa) VALUES
(1, 1, '2024-01-15', 'Paciente con alergia a Penicilina. Grupo O+.',           1),
(2, 2, '2024-02-20', 'Paciente sin antecedentes relevantes.',                  1),
(3, 3, '2024-03-10', 'Paciente con alergia al Latex. Anotacion urgente.',      1),
(4, 4, '2024-06-01', 'Paciente menor de edad. Denticion mixta.',               1);
SET IDENTITY_INSERT Historia_Clinica OFF;
GO

-- 13. DIENTE CATALOGO (muestra parcial)
SET IDENTITY_INSERT Diente_Catalogo ON;
INSERT INTO Diente_Catalogo (id_diente, numero_fdi, nombre, cuadrante, tipo_denticion) VALUES
(1,  11, 'Incisivo central superior derecho',   1, 'adulto'),
(2,  12, 'Incisivo lateral superior derecho',   1, 'adulto'),
(3,  13, 'Canino superior derecho',             1, 'adulto'),
(4,  16, 'Primer molar superior derecho',       1, 'adulto'),
(5,  21, 'Incisivo central superior izquierdo', 2, 'adulto'),
(6,  23, 'Canino superior izquierdo',           2, 'adulto'),
(7,  36, 'Primer molar inferior izquierdo',     3, 'adulto'),
(8,  44, 'Primer premolar inferior derecho',    4, 'adulto'),
(9,  48, 'Tercer molar inferior derecho',       4, 'adulto'),
(10, 55, 'Segundo molar temporal superior',     1, 'infantil');
SET IDENTITY_INSERT Diente_Catalogo OFF;
GO

-- 14. DETALLE DE HISTORIA CLINICA
SET IDENTITY_INSERT Detalle_Historia_Clinica ON;
INSERT INTO Detalle_Historia_Clinica
    (id_detalle_historia, id_historia, id_cita, id_profesional, fecha,
     diagnostico, procedimiento, tratamiento, observaciones, proxima_cita_sugerida) VALUES
(1, 1, 1, 1, '2026-03-20', 'Sin caries activas. Calculo supragingival', 'Consulta general',
 'Mantenimiento preventivo cada 6 meses', 'Paciente colaborador', '2026-09-20'),
(2, 2, 3, 1, '2026-03-20', 'Acumulo moderado de sarro', 'Limpieza profunda',
 'Tecnica Bass + fluor topico', 'Encias con leve sangrado', '2026-09-20'),
(3, 1, 2, 2, '2026-03-20', 'Endodoncia pieza 23 completada', 'Control endodoncia',
 'Control radiografico en 3 meses', 'Sin sintomas', '2026-06-20');
SET IDENTITY_INSERT Detalle_Historia_Clinica OFF;
GO

-- 15. ODONTOGRAMA
SET IDENTITY_INSERT Odontograma ON;
INSERT INTO Odontograma (id_odontograma, id_historia, id_detalle, tipo, fecha_registro, observaciones) VALUES
(1, 1, 1, 'adulto', '2026-03-20', 'Odontograma inicial de la consulta'),
(2, 2, 2, 'adulto', '2026-03-20', 'Odontograma post limpieza');
SET IDENTITY_INSERT Odontograma OFF;
GO

SET IDENTITY_INSERT Odontograma_Diente ON;
INSERT INTO Odontograma_Diente
    (id_od_diente, id_odontograma, id_diente, id_profesional, estado, cara_afectada, observaciones, fecha_registro) VALUES
(1, 1, 1, 1, 'sano',      NULL,          'Sin lesion',                '2026-03-20'),
(2, 1, 2, 1, 'caries',    'vestibular',  'Caries inicial pieza 12',   '2026-03-20'),
(3, 1, 4, 1, 'obturacion','oclusal',     'Obturacion en amalgama',    '2026-03-20'),
(4, 1, 6, 1, 'endodoncia','todas',       'Endodoncia completada',     '2026-03-20'),
(5, 2, 1, 1, 'sano',      NULL,          'Sin lesion',                '2026-03-20'),
(6, 2, 5, 1, 'caries',    'proximal',    'Caries entre piezas',       '2026-03-20');
SET IDENTITY_INSERT Odontograma_Diente OFF;
GO

-- 16. FACTURAS Y PAGOS
SET IDENTITY_INSERT Factura ON;
INSERT INTO Factura (id_factura, numero_factura, fecha_factura, subtotal, descuento, impuestos, total, estado, id_paciente, notas, generada_por) VALUES
(1, 'FAC-2026-0001', '2026-03-20', 80000.00, 5000.00, 0.00, 75000.00, 'pagada',   1, 'Consulta + control', 5),
(2, 'FAC-2026-0002', '2026-03-20', 80000.00, 0.00,    0.00, 80000.00, 'pendiente',2, 'Limpieza dental',    5);
SET IDENTITY_INSERT Factura OFF;
GO

SET IDENTITY_INSERT Detalle_Factura ON;
INSERT INTO Detalle_Factura (id_detalle_factura, id_factura, id_detalle_cita, descripcion, precio_unitario, cantidad, descuento_linea, subtotal) VALUES
(1, 1, 1, 'Consulta general',          50000.00, 1, 5000.00, 45000.00),
(2, 1, 2, 'Control de tratamiento',    30000.00, 1, 0.00,    30000.00),
(3, 2, 4, 'Limpieza dental',           80000.00, 1, 0.00,    80000.00);
SET IDENTITY_INSERT Detalle_Factura OFF;
GO

SET IDENTITY_INSERT Pago ON;
INSERT INTO Pago (id_pago, id_factura, fecha_pago, monto, metodo_pago, referencia, registrado_por, notas) VALUES
(1, 1, '2026-03-20 11:30:00', 75000.00, 'efectivo', NULL, 5, 'Pago en efectivo en recepcion');
SET IDENTITY_INSERT Pago OFF;
GO

-- 17. NOTIFICACIONES
SET IDENTITY_INSERT Notificacion ON;
INSERT INTO Notificacion (id_notificacion, id_usuario, id_cita, tipo, canal, asunto, mensaje, estado, fecha_programada) VALUES
(1, 6, 4, 'confirmacion', 'correo', 'Confirmacion de cita - SmileTrack',
 'Su cita ha sido agendada para el 21/03/2026 a las 09:00.', 'enviada',  '2026-03-19 09:00:00'),
(2, 6, 4, 'recordatorio', 'correo', 'Recordatorio de cita - SmileTrack',
 'Le recordamos su cita manana 21/03/2026 a las 09:00.',     'pendiente','2026-03-20 09:00:00'),
(3, 7, 5, 'confirmacion', 'correo', 'Confirmacion de cita - SmileTrack',
 'Su cita ha sido agendada para el 21/03/2026 a las 14:00.', 'pendiente','2026-03-19 14:00:00');
SET IDENTITY_INSERT Notificacion OFF;
GO


-- ============================================================
-- PARTE 5  PROCEDIMIENTOS ALMACENADOS (32 SP)
-- ============================================================

-- ------------------------------------------------------------
-- MODULO 1: GESTION DE USUARIOS  (7 SP)
-- ------------------------------------------------------------

-- SP 1/7  Registrar nuevo usuario
CREATE OR ALTER PROCEDURE sp_RegistrarUsuario
    @nombre      NVARCHAR(100),
    @correo      NVARCHAR(150),
    @contrasena  NVARCHAR(255),
    @id_rol      INT,
    @id_usuario  INT OUTPUT,
    @mensaje     NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM Usuario WHERE correo = @correo)
        BEGIN
            SET @mensaje    = 'El correo ya esta registrado.';
            SET @id_usuario = 0;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        INSERT INTO Usuario (nombre, correo, contrasena, id_rol, estado, fecha_creacion)
        VALUES (@nombre, @correo, @contrasena, @id_rol, 'activo', GETDATE());
        SET @id_usuario = SCOPE_IDENTITY();
        SET @mensaje    = 'Usuario registrado correctamente.';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @mensaje    = 'Error al registrar el usuario: ' + ERROR_MESSAGE();
        SET @id_usuario = 0;
    END CATCH
END
GO

-- SP 2/7  Activar o inactivar un usuario
CREATE OR ALTER PROCEDURE sp_ActualizarEstadoUsuario
    @id_usuario INT,
    @estado     VARCHAR(10),
    @mensaje    NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @estado NOT IN ('activo','inactivo')
    BEGIN SET @mensaje = 'Estado invalido. Use activo o inactivo.'; RETURN; END

    UPDATE Usuario SET estado = @estado WHERE id_usuario = @id_usuario;
    SET @mensaje = 'Estado actualizado correctamente.';
END
GO

-- SP 3/7  Actualizar fecha de ultimo acceso
CREATE OR ALTER PROCEDURE sp_RegistrarLogin
    @id_usuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Usuario SET ultimo_login = GETDATE() WHERE id_usuario = @id_usuario;
END
GO

-- SP 4/7  Asignar o actualizar permisos CRUD de un rol sobre un menu
CREATE OR ALTER PROCEDURE sp_AsignarPermisoRol
    @id_rol         INT,
    @id_usuario     INT,
    @id_menu        INT,
    @puede_ver      BIT,
    @puede_crear    BIT,
    @puede_editar   BIT,
    @puede_eliminar BIT,
    @puede_exportar BIT,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Rol_Menu_Permiso WHERE id_rol = @id_rol AND id_menu = @id_menu)
        UPDATE Rol_Menu_Permiso
        SET puede_ver = @puede_ver, puede_crear = @puede_crear, puede_editar = @puede_editar,
            puede_eliminar = @puede_eliminar, puede_exportar = @puede_exportar
        WHERE id_rol = @id_rol AND id_menu = @id_menu;
    ELSE
        INSERT INTO Rol_Menu_Permiso (id_rol, id_usuario, id_menu, puede_ver, puede_crear,
                                      puede_editar, puede_eliminar, puede_exportar)
        VALUES (@id_rol, @id_usuario, @id_menu, @puede_ver, @puede_crear,
                @puede_editar, @puede_eliminar, @puede_exportar);

    SET @mensaje = 'Permisos asignados correctamente.';
END
GO

-- SP 5/7  Consultar permisos de un usuario segun su rol
CREATE OR ALTER PROCEDURE sp_ConsultarPermisosUsuario
    @id_usuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT rmp.id_menu, rmp.puede_ver, rmp.puede_crear,
           rmp.puede_editar, rmp.puede_eliminar, rmp.puede_exportar
    FROM Rol_Menu_Permiso rmp
    INNER JOIN Usuario u ON u.id_rol = rmp.id_rol
    WHERE u.id_usuario = @id_usuario;
END
GO

-- SP 6/7  Cambiar contrasena verificando la actual
CREATE OR ALTER PROCEDURE sp_CambiarContrasena
    @id_usuario        INT,
    @contrasena_actual NVARCHAR(255),
    @contrasena_nueva  NVARCHAR(255),
    @contrasena_confirm NVARCHAR(255),
    @mensaje           NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Usuario WHERE id_usuario = @id_usuario AND contrasena = @contrasena_actual)
    BEGIN SET @mensaje = 'La contrasena actual no es correcta.'; RETURN; END

    IF @contrasena_nueva != @contrasena_confirm
    BEGIN SET @mensaje = 'Las contrasenas nuevas no coinciden.'; RETURN; END

    UPDATE Usuario SET contrasena = @contrasena_nueva WHERE id_usuario = @id_usuario;
    SET @mensaje = 'Contrasena actualizada correctamente.';
END
GO

-- SP 7/7  Restablecer contrasena por el administrador
CREATE OR ALTER PROCEDURE sp_RestablecerContrasena
    @id_usuario     INT,
    @nueva_contrasena NVARCHAR(255),
    @id_admin       INT,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Usuario WHERE id_usuario = @id_admin AND id_rol = 1)
    BEGIN SET @mensaje = 'Solo el administrador puede restablecer contrasenas.'; RETURN; END

    UPDATE Usuario SET contrasena = @nueva_contrasena WHERE id_usuario = @id_usuario;
    SET @mensaje = 'Contrasena restablecida correctamente.';
END
GO


-- ------------------------------------------------------------
-- MODULO 2: GESTION DE PACIENTES  (4 SP)
-- ------------------------------------------------------------

-- SP 1/4  Registrar paciente y crear historia clinica automaticamente
CREATE OR ALTER PROCEDURE sp_RegistrarPaciente
    @tipo_documento      VARCHAR(5),
    @documento           VARCHAR(20),
    @nombres             VARCHAR(100),
    @apellidos           VARCHAR(100),
    @fecha_nacimiento    DATE,
    @genero              VARCHAR(5)   = NULL,
    @telefono            VARCHAR(20)  = NULL,
    @correo              VARCHAR(150) = NULL,
    @ciudad              VARCHAR(100) = NULL,
    @grupo_sanguineo     VARCHAR(5)   = NULL,
    @alergias            VARCHAR(MAX) = NULL,
    @antecedentes        VARCHAR(MAX) = NULL,
    @contacto_emergencia VARCHAR(100) = NULL,
    @telefono_emergencia VARCHAR(20)  = NULL,
    @id_paciente         INT OUTPUT,
    @mensaje             NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM Paciente WHERE documento = @documento)
        BEGIN
            SET @mensaje    = 'Ya existe un paciente con ese documento.';
            SET @id_paciente = 0;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        INSERT INTO Paciente (tipo_documento, documento, nombres, apellidos, fecha_nacimiento,
                              genero, telefono, correo, ciudad, grupo_sanguineo, alergias,
                              antecedentes_medicos, contacto_emergencia, telefono_emergencia,
                              fecha_registro, estado)
        VALUES (@tipo_documento, @documento, @nombres, @apellidos, @fecha_nacimiento,
                @genero, @telefono, @correo, @ciudad, @grupo_sanguineo, @alergias,
                @antecedentes, @contacto_emergencia, @telefono_emergencia,
                CAST(GETDATE() AS DATE), 'activo');

        SET @id_paciente = SCOPE_IDENTITY();

        -- Historia clinica (el trigger trg_Paciente_Insert tambien la crea,
        -- pero se verifica para evitar duplicado si se usa el SP directamente)
        IF NOT EXISTS (SELECT 1 FROM Historia_Clinica WHERE id_paciente = @id_paciente)
            INSERT INTO Historia_Clinica (id_paciente, fecha_apertura, activa)
            VALUES (@id_paciente, CAST(GETDATE() AS DATE), 1);

        SET @mensaje = 'Paciente registrado correctamente.';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @mensaje    = 'Error al registrar el paciente: ' + ERROR_MESSAGE();
        SET @id_paciente = 0;
    END CATCH
END
GO

-- SP 2/4  Actualizar datos de contacto y antecedentes del paciente
CREATE OR ALTER PROCEDURE sp_ActualizarPaciente
    @id_paciente         INT,
    @telefono            VARCHAR(20)  = NULL,
    @correo              VARCHAR(150) = NULL,
    @direccion           VARCHAR(255) = NULL,
    @ciudad              VARCHAR(100) = NULL,
    @alergias            VARCHAR(MAX) = NULL,
    @antecedentes        VARCHAR(MAX) = NULL,
    @contacto_emergencia VARCHAR(100) = NULL,
    @telefono_emergencia VARCHAR(20)  = NULL,
    @mensaje             NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Paciente
    SET telefono = @telefono, correo = @correo, direccion = @direccion,
        ciudad = @ciudad, alergias = @alergias, antecedentes_medicos = @antecedentes,
        contacto_emergencia = @contacto_emergencia, telefono_emergencia = @telefono_emergencia
    WHERE id_paciente = @id_paciente;
    SET @mensaje = 'Paciente actualizado correctamente.';
END
GO

-- SP 3/4  Buscar paciente activo por documento con edad calculada
CREATE OR ALTER PROCEDURE sp_BuscarPacientePorDocumento
    @documento VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.*,
        DATEDIFF(YEAR, p.fecha_nacimiento, GETDATE()) AS edad
    FROM Paciente p
    WHERE p.documento = @documento AND p.estado = 'activo';
END
GO

-- SP 4/4  Listar pacientes con filtros opcionales
CREATE OR ALTER PROCEDURE sp_ListarPacientes
    @estado   VARCHAR(10)  = NULL,
    @ciudad   VARCHAR(100) = NULL,
    @busqueda VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.id_paciente, p.documento, p.nombres, p.apellidos, p.telefono,
        p.correo, p.ciudad, p.estado, p.alergias,
        DATEDIFF(YEAR, p.fecha_nacimiento, GETDATE()) AS edad
    FROM Paciente p
    WHERE (@estado   IS NULL OR p.estado = @estado)
      AND (@ciudad   IS NULL OR p.ciudad LIKE '%' + @ciudad + '%')
      AND (@busqueda IS NULL OR p.nombres + ' ' + p.apellidos LIKE '%' + @busqueda + '%'
                             OR p.documento LIKE '%' + @busqueda + '%')
    ORDER BY p.apellidos, p.nombres;
END
GO


-- ------------------------------------------------------------
-- MODULO 3: GESTION DE PROFESIONALES  (6 SP)
-- ------------------------------------------------------------

-- SP 1/6  Registrar profesional con especialidad principal
CREATE OR ALTER PROCEDURE sp_RegistrarProfesional
    @id_usuario       INT,
    @nombres          VARCHAR(100),
    @apellidos        VARCHAR(100),
    @registro_medico  VARCHAR(50),
    @telefono         VARCHAR(20)  = NULL,
    @correo           VARCHAR(150) = NULL,
    @fecha_ingreso    DATE         = NULL,
    @id_especialidad  INT,
    @id_profesional   INT OUTPUT,
    @mensaje          NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM Profesional WHERE registro_medico = @registro_medico)
        BEGIN
            SET @mensaje = 'El registro medico ya existe.'; SET @id_profesional = 0;
            ROLLBACK TRANSACTION; RETURN;
        END
        INSERT INTO Profesional (id_usuario, nombres, apellidos, registro_medico,
                                  telefono, fecha_ingreso, estado)
        VALUES (@id_usuario, @nombres, @apellidos, @registro_medico,
                @telefono, @fecha_ingreso, 'activo');

        SET @id_profesional = SCOPE_IDENTITY();

        INSERT INTO Profesional_Especialidad (id_profesional, id_especialidad, principal)
        VALUES (@id_profesional, @id_especialidad, 1);

        SET @mensaje = 'Profesional registrado correctamente.';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @mensaje = 'Error: ' + ERROR_MESSAGE(); SET @id_profesional = 0;
    END CATCH
END
GO

-- SP 2/6  Asignar o actualizar especialidad adicional
CREATE OR ALTER PROCEDURE sp_AsignarEspecialidad
    @id_profesional  INT,
    @id_especialidad INT,
    @principal       BIT,
    @mensaje         NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Profesional_Especialidad
               WHERE id_profesional = @id_profesional AND id_especialidad = @id_especialidad)
        UPDATE Profesional_Especialidad SET principal = @principal
        WHERE id_profesional = @id_profesional AND id_especialidad = @id_especialidad;
    ELSE
        INSERT INTO Profesional_Especialidad (id_profesional, id_especialidad, principal)
        VALUES (@id_profesional, @id_especialidad, @principal);

    SET @mensaje = 'Especialidad asignada correctamente.';
END
GO

-- SP 3/6  Registrar o actualizar horario semanal del profesional
CREATE OR ALTER PROCEDURE sp_RegistrarHorario
    @id_profesional INT,
    @dia_semana     VARCHAR(12),
    @hora_inicio    TIME,
    @hora_fin       TIME,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Horario_Profesional
               WHERE id_profesional = @id_profesional AND dia_semana = @dia_semana)
        UPDATE Horario_Profesional
        SET hora_inicio = @hora_inicio, hora_fin = @hora_fin, activo = 1
        WHERE id_profesional = @id_profesional AND dia_semana = @dia_semana;
    ELSE
        INSERT INTO Horario_Profesional (id_profesional, dia_semana, hora_inicio, hora_fin, activo)
        VALUES (@id_profesional, @dia_semana, @hora_inicio, @hora_fin, 1);

    SET @mensaje = 'Horario registrado correctamente.';
END
GO

-- SP 4/6  Registrar bloqueo de calendario del profesional
CREATE OR ALTER PROCEDURE sp_RegistrarBloqueo
    @id_profesional INT,
    @fecha_inicio   DATETIME,
    @fecha_fin      DATETIME,
    @motivo         VARCHAR(150) = NULL,
    @id_bloqueo     INT OUTPUT,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Bloqueo_Profesional (id_profesional, fecha_inicio, fecha_fin, motivo)
    VALUES (@id_profesional, @fecha_inicio, @fecha_fin, @motivo);
    SET @id_bloqueo = SCOPE_IDENTITY();
    SET @mensaje    = 'Bloqueo registrado correctamente.';
END
GO

-- SP 5/6  Solicitar ausencia con estado pendiente de aprobacion
CREATE OR ALTER PROCEDURE sp_SolicitarAusencia
    @id_profesional INT,
    @tipo           VARCHAR(15),
    @fecha_inicio   DATE,
    @fecha_fin      DATE,
    @observaciones  VARCHAR(MAX) = NULL,
    @id_ausencia    INT OUTPUT,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Ausencia_Profesional (id_profesional, tipo, fecha_inicio, fecha_fin,
                                      duracion, observaciones)
    VALUES (@id_profesional, @tipo, @fecha_inicio, @fecha_fin,
            DATEDIFF(DAY, @fecha_inicio, @fecha_fin), @observaciones);
    SET @id_ausencia = SCOPE_IDENTITY();
    SET @mensaje     = 'Ausencia solicitada correctamente.';
END
GO

-- SP 6/6  Verificar disponibilidad del profesional para una fecha y hora
CREATE OR ALTER PROCEDURE sp_VerificarDisponibilidadProfesional
    @id_profesional INT,
    @fecha          DATE,
    @hora_inicio    TIME,
    @hora_fin       TIME,
    @disponible     BIT OUTPUT,
    @motivo         NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @disponible = 1;
    SET @motivo     = 'Disponible';

    DECLARE @dia VARCHAR(12) = DATENAME(WEEKDAY, @fecha);

    -- Verificar horario laboral
    IF NOT EXISTS (
        SELECT 1 FROM Horario_Profesional
        WHERE id_profesional = @id_profesional AND dia_semana = @dia
          AND hora_inicio <= @hora_inicio AND hora_fin >= @hora_fin AND activo = 1
    )
    BEGIN SET @disponible = 0; SET @motivo = 'El profesional no trabaja ese dia o fuera de horario.'; RETURN; END

    -- Verificar bloqueos
    IF EXISTS (
        SELECT 1 FROM Bloqueo_Profesional
        WHERE id_profesional = @id_profesional
          AND CAST(@fecha AS DATETIME) + CAST(@hora_inicio AS DATETIME)
              BETWEEN fecha_inicio AND fecha_fin
    )
    BEGIN SET @disponible = 0; SET @motivo = 'El profesional tiene un bloqueo en ese horario.'; RETURN; END

    -- Verificar ausencias
    IF EXISTS (
        SELECT 1 FROM Ausencia_Profesional
        WHERE id_profesional = @id_profesional AND @fecha BETWEEN fecha_inicio AND fecha_fin
    )
    BEGIN SET @disponible = 0; SET @motivo = 'El profesional tiene una ausencia registrada ese dia.'; RETURN; END

    -- Verificar citas existentes
    IF EXISTS (
        SELECT 1 FROM Cita c
        INNER JOIN Estado_Cita ec ON ec.id_estado = c.id_estado
        WHERE c.id_profesional = @id_profesional AND c.fecha = @fecha
          AND ec.nombre_estado NOT IN ('Cancelada','No asistio')
          AND c.hora_inicio < @hora_fin AND c.hora_fin > @hora_inicio
    )
    BEGIN SET @disponible = 0; SET @motivo = 'El profesional ya tiene una cita en ese horario.'; RETURN; END
END
GO


-- ------------------------------------------------------------
-- MODULO 4: GESTION DE SERVICIOS  (4 SP)
-- ------------------------------------------------------------

-- SP 1/4  Registrar nuevo servicio
CREATE OR ALTER PROCEDURE sp_RegistrarServicio
    @nombre      VARCHAR(100),
    @descripcion VARCHAR(255) = NULL,
    @categoria   VARCHAR(100) = NULL,
    @costo       DECIMAL(12,2),
    @duracion    VARCHAR(50)  = NULL,
    @id_servicio INT OUTPUT,
    @mensaje     NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @costo < 0
    BEGIN SET @mensaje = 'El costo no puede ser negativo.'; SET @id_servicio = 0; RETURN; END

    INSERT INTO Servicio (nombre, descripcion, categoria, costo, duracion, activo)
    VALUES (@nombre, @descripcion, @categoria, @costo, @duracion, 1);
    SET @id_servicio = SCOPE_IDENTITY();
    SET @mensaje     = 'Servicio registrado correctamente.';
END
GO

-- SP 2/4  Actualizar precio de un servicio
CREATE OR ALTER PROCEDURE sp_ActualizarPrecioServicio
    @id_servicio INT,
    @nuevo_costo DECIMAL(12,2),
    @mensaje     NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @nuevo_costo < 0
    BEGIN SET @mensaje = 'El costo no puede ser negativo.'; RETURN; END

    UPDATE Servicio SET costo = @nuevo_costo WHERE id_servicio = @id_servicio;
    SET @mensaje = 'Precio actualizado correctamente.';
END
GO

-- SP 3/4  Asignar servicio al catalogo de un profesional
CREATE OR ALTER PROCEDURE sp_AsignarServicioProfesional
    @id_profesional INT,
    @id_servicio    INT,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Profesional_Servicio
               WHERE id_profesional = @id_profesional AND id_servicio = @id_servicio)
    BEGIN SET @mensaje = 'El servicio ya esta asignado a ese profesional.'; RETURN; END

    INSERT INTO Profesional_Servicio (id_profesional, id_servicio)
    VALUES (@id_profesional, @id_servicio);
    SET @mensaje = 'Servicio asignado correctamente.';
END
GO

-- SP 4/4  Listar servicios con filtros opcionales
CREATE OR ALTER PROCEDURE sp_ListarServicios
    @categoria VARCHAR(100) = NULL,
    @activo    BIT          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_servicio, nombre, descripcion, categoria, costo, duracion, activo
    FROM Servicio
    WHERE (@categoria IS NULL OR categoria = @categoria)
      AND (@activo    IS NULL OR activo    = @activo)
    ORDER BY categoria, nombre;
END
GO


-- ------------------------------------------------------------
-- MODULO 5: GESTION DE CITAS  (6 SP)
-- ------------------------------------------------------------

-- SP 1/6  Agendar cita con validacion completa
CREATE OR ALTER PROCEDURE sp_AgendarCita
    @fecha          DATE,
    @hora_inicio    TIME,
    @hora_fin       TIME,
    @motivo         VARCHAR(MAX) = NULL,
    @tipo_cita      VARCHAR(20)  = 'consulta',
    @id_paciente    INT,
    @id_profesional INT,
    @id_consultorio INT,
    @creado_por     INT,
    @id_cita        INT OUTPUT,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validar disponibilidad del profesional
        DECLARE @disponible BIT, @motivo_disp NVARCHAR(200);
        EXEC sp_VerificarDisponibilidadProfesional
             @id_profesional, @fecha, @hora_inicio, @hora_fin,
             @disponible OUTPUT, @motivo_disp OUTPUT;

        IF @disponible = 0
        BEGIN
            SET @mensaje = @motivo_disp; SET @id_cita = 0;
            ROLLBACK TRANSACTION; RETURN;
        END

        -- Verificar consultorio disponible
        IF EXISTS (
            SELECT 1 FROM Cita c
            INNER JOIN Estado_Cita ec ON ec.id_estado = c.id_estado
            WHERE c.id_consultorio = @id_consultorio AND c.fecha = @fecha
              AND ec.nombre_estado NOT IN ('Cancelada','No asistio')
              AND c.hora_inicio < @hora_fin AND c.hora_fin > @hora_inicio
        )
        BEGIN
            SET @mensaje = 'El consultorio ya esta ocupado en ese horario.'; SET @id_cita = 0;
            ROLLBACK TRANSACTION; RETURN;
        END

        DECLARE @id_estado_agendada INT;
        SELECT @id_estado_agendada = id_estado FROM Estado_Cita WHERE nombre_estado = 'Agendada';

        INSERT INTO Cita (fecha, hora_inicio, hora_fin, motivo_consulta, tipo_cita,
                          id_paciente, id_profesional, id_consultorio, id_estado, creado_por)
        VALUES (@fecha, @hora_inicio, @hora_fin, @motivo, @tipo_cita,
                @id_paciente, @id_profesional, @id_consultorio, @id_estado_agendada, @creado_por);

        SET @id_cita = SCOPE_IDENTITY();
        SET @mensaje = 'Cita agendada correctamente.';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @mensaje = 'Error al agendar la cita: ' + ERROR_MESSAGE(); SET @id_cita = 0;
    END CATCH
END
GO

-- SP 2/6  Cancelar cita registrando motivo y horas de anticipacion
CREATE OR ALTER PROCEDURE sp_CancelarCita
    @id_cita      INT,
    @motivo       VARCHAR(MAX) = NULL,
    @cancelado_por INT,
    @mensaje      NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_estado_cancelada INT;
    SELECT @id_estado_cancelada = id_estado FROM Estado_Cita WHERE nombre_estado = 'Cancelada';

    DECLARE @fecha       DATE;
    DECLARE @hora_inicio TIME;
    SELECT @fecha = fecha, @hora_inicio = hora_inicio FROM Cita WHERE id_cita = @id_cita;

    UPDATE Cita SET id_estado = @id_estado_cancelada WHERE id_cita = @id_cita;

    INSERT INTO Cancelacion_Cita (id_cita, motivo, cancelado_por, fecha_cancelacion, horas_anticipacion)
    VALUES (
        @id_cita, @motivo, @cancelado_por, GETDATE(),
        DATEDIFF(HOUR, GETDATE(),
            CAST(CAST(@fecha AS NVARCHAR) + ' ' + CAST(@hora_inicio AS NVARCHAR) AS DATETIME))
    );

    SET @mensaje = 'Cita cancelada correctamente.';
END
GO

-- SP 3/6  Reprogramar cita validando disponibilidad
CREATE OR ALTER PROCEDURE sp_ReprogramarCita
    @id_cita         INT,
    @nueva_fecha     DATE,
    @nueva_hora_ini  TIME,
    @nueva_hora_fin  TIME,
    @mensaje         NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_profesional INT;
    SELECT @id_profesional = id_profesional FROM Cita WHERE id_cita = @id_cita;

    DECLARE @disponible BIT, @motivo_disp NVARCHAR(200);
    EXEC sp_VerificarDisponibilidadProfesional
         @id_profesional, @nueva_fecha, @nueva_hora_ini, @nueva_hora_fin,
         @disponible OUTPUT, @motivo_disp OUTPUT;

    IF @disponible = 0
    BEGIN SET @mensaje = @motivo_disp; RETURN; END

    DECLARE @id_reprog INT;
    SELECT @id_reprog = id_estado FROM Estado_Cita WHERE nombre_estado = 'Reprogramada';

    UPDATE Cita
    SET fecha = @nueva_fecha, hora_inicio = @nueva_hora_ini, hora_fin = @nueva_hora_fin,
        id_estado = @id_reprog
    WHERE id_cita = @id_cita;

    SET @mensaje = 'Cita reprogramada correctamente.';
END
GO

-- SP 4/6  Consultar agenda de un profesional para una fecha
CREATE OR ALTER PROCEDURE sp_AgendaProfesional
    @id_profesional INT,
    @fecha          DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.id_cita, c.hora_inicio, c.hora_fin, c.tipo_cita, c.motivo_consulta,
        p.nombres + ' ' + p.apellidos AS paciente,
        p.alergias,
        ec.nombre_estado AS estado,
        co.nombre AS consultorio
    FROM Cita c
    INNER JOIN Paciente    p  ON p.id_paciente   = c.id_paciente
    INNER JOIN Estado_Cita ec ON ec.id_estado     = c.id_estado
    INNER JOIN Consultorio co ON co.id_consultorio = c.id_consultorio
    WHERE c.id_profesional = @id_profesional AND c.fecha = @fecha
    ORDER BY c.hora_inicio;
END
GO

-- SP 5/6  Agregar servicio al detalle de una cita con precio historico
CREATE OR ALTER PROCEDURE sp_AgregarDetalleCita
    @id_cita      INT,
    @id_servicio  INT,
    @observaciones VARCHAR(MAX) = NULL,
    @mensaje       NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @precio DECIMAL(12,2);
    SELECT @precio = costo FROM Servicio WHERE id_servicio = @id_servicio;

    INSERT INTO Detalle_Cita (id_cita, id_servicio, precio_aplicado, observaciones, estado)
    VALUES (@id_cita, @id_servicio, @precio, @observaciones, 'pendiente');

    SET @mensaje = 'Servicio agregado al detalle de la cita.';
END
GO

-- SP 6/6  Aprobar ausencia de un profesional
CREATE OR ALTER PROCEDURE sp_AprobarAusencia
    @id_ausencia  INT,
    @aprobado_por INT,
    @mensaje      NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Ausencia_Profesional SET aprobado_por = @aprobado_por WHERE id_ausencia = @id_ausencia;
    SET @mensaje = 'Ausencia aprobada correctamente.';
END
GO


-- ------------------------------------------------------------
-- MODULO 6: FACTURACION Y PAGOS  (5 SP)
-- ------------------------------------------------------------

-- SP 1/5  Generar factura desde una cita con precios historicos
CREATE OR ALTER PROCEDURE sp_GenerarFactura
    @id_cita      INT,
    @descuento    DECIMAL(12,2) = 0,
    @impuestos    DECIMAL(12,2) = 0,
    @notas        VARCHAR(MAX)  = NULL,
    @generada_por INT,
    @id_factura   INT OUTPUT,
    @mensaje      NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @id_paciente INT;
        SELECT @id_paciente = id_paciente FROM Cita WHERE id_cita = @id_cita;

        DECLARE @num_factura VARCHAR(20) =
            'FAC-' + CAST(YEAR(GETDATE()) AS NVARCHAR) + '-' +
            RIGHT('0000' + CAST(
                (SELECT ISNULL(MAX(id_factura),0) + 1 FROM Factura), NVARCHAR), 4);

        DECLARE @subtotal DECIMAL(12,2);
        SELECT @subtotal = ISNULL(SUM(precio_aplicado), 0)
        FROM Detalle_Cita WHERE id_cita = @id_cita AND estado = 'realizado';

        INSERT INTO Factura (numero_factura, fecha_factura, subtotal, descuento, impuestos,
                             total, estado, id_paciente, notas, generada_por)
        VALUES (@num_factura, CAST(GETDATE() AS DATE), @subtotal, @descuento, @impuestos,
                @subtotal - @descuento + @impuestos, 'pendiente', @id_paciente, @notas, @generada_por);

        SET @id_factura = SCOPE_IDENTITY();

        -- Copiar detalles de la cita a la factura
        INSERT INTO Detalle_Factura (id_factura, id_detalle_cita, descripcion,
                                     precio_unitario, cantidad, descuento_linea, subtotal)
        SELECT @id_factura, dc.id_detalle_cita, s.nombre,
               dc.precio_aplicado, 1, 0, dc.precio_aplicado
        FROM Detalle_Cita dc
        INNER JOIN Servicio s ON s.id_servicio = dc.id_servicio
        WHERE dc.id_cita = @id_cita AND dc.estado = 'realizado';

        SET @mensaje = 'Factura generada correctamente: ' + @num_factura;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @mensaje = 'Error al generar la factura: ' + ERROR_MESSAGE(); SET @id_factura = 0;
    END CATCH
END
GO

-- SP 2/5  Registrar pago con actualizacion automatica de estado de factura
CREATE OR ALTER PROCEDURE sp_RegistrarPago
    @id_factura    INT,
    @monto         DECIMAL(12,2),
    @metodo_pago   VARCHAR(20),
    @referencia    VARCHAR(100) = NULL,
    @registrado_por INT,
    @notas         VARCHAR(MAX) = NULL,
    @id_pago       INT OUTPUT,
    @mensaje       NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    -- La validacion de monto la realiza el trigger trg_Pago_ValidarMonto
    INSERT INTO Pago (id_factura, fecha_pago, monto, metodo_pago, referencia, registrado_por, notas)
    VALUES (@id_factura, GETDATE(), @monto, @metodo_pago, @referencia, @registrado_por, @notas);

    SET @id_pago = SCOPE_IDENTITY();
    SET @mensaje = 'Pago registrado correctamente.';
END
GO

-- SP 3/5  Anular factura sin pagos registrados
CREATE OR ALTER PROCEDURE sp_AnularFactura
    @id_factura INT,
    @mensaje    NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Pago WHERE id_factura = @id_factura)
    BEGIN SET @mensaje = 'No se puede anular una factura que ya tiene pagos.'; RETURN; END

    UPDATE Factura SET estado = 'anulada' WHERE id_factura = @id_factura;
    SET @mensaje = 'Factura anulada correctamente.';
END
GO

-- SP 4/5  Estado de cuenta completo del paciente
CREATE OR ALTER PROCEDURE sp_EstadoCuentaPaciente
    @id_paciente INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        f.id_factura, f.numero_factura, f.fecha_factura,
        f.subtotal, f.descuento, f.total, f.estado,
        ISNULL((SELECT SUM(p.monto) FROM Pago p WHERE p.id_factura = f.id_factura), 0) AS total_pagado,
        f.total - ISNULL((SELECT SUM(p.monto) FROM Pago p WHERE p.id_factura = f.id_factura), 0) AS saldo_pendiente
    FROM Factura f
    WHERE f.id_paciente = @id_paciente
    ORDER BY f.fecha_factura DESC;
END
GO

-- SP 5/5  (Completar SP de facturacion --- listar facturas pendientes)
CREATE OR ALTER PROCEDURE sp_ListarFacturasPendientes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        f.id_factura, f.numero_factura, f.fecha_factura, f.total, f.estado,
        pat.nombres + ' ' + pat.apellidos AS paciente
    FROM Factura f
    INNER JOIN Paciente pat ON pat.id_paciente = f.id_paciente
    WHERE f.estado IN ('pendiente','parcial')
    ORDER BY f.fecha_factura;
END
GO


-- ------------------------------------------------------------
-- MODULO 7: HISTORIA CLINICA Y ODONTOGRAMA  (5 SP)
-- ------------------------------------------------------------

-- SP 1/5  Registrar entrada en historia clinica y marcar cita como Atendida
CREATE OR ALTER PROCEDURE sp_RegistrarEntradaHistoria
    @id_paciente         INT,
    @id_cita             INT          = NULL,
    @id_profesional      INT,
    @diagnostico         VARCHAR(MAX) = NULL,
    @procedimiento       VARCHAR(255) = NULL,
    @tratamiento         VARCHAR(MAX) = NULL,
    @observaciones       VARCHAR(MAX) = NULL,
    @proxima_cita        DATE         = NULL,
    @id_detalle          INT OUTPUT,
    @mensaje             NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @id_historia INT;
        SELECT @id_historia = id_historia FROM Historia_Clinica WHERE id_paciente = @id_paciente;

        IF @id_historia IS NULL
        BEGIN
            SET @mensaje = 'El paciente no tiene historia clinica.'; SET @id_detalle = 0;
            ROLLBACK TRANSACTION; RETURN;
        END

        INSERT INTO Detalle_Historia_Clinica
            (id_historia, id_cita, id_profesional, fecha, diagnostico,
             procedimiento, tratamiento, observaciones, proxima_cita_sugerida)
        VALUES
            (@id_historia, @id_cita, @id_profesional, CAST(GETDATE() AS DATE), @diagnostico,
             @procedimiento, @tratamiento, @observaciones, @proxima_cita);

        SET @id_detalle = SCOPE_IDENTITY();

        -- Marcar la cita como Atendida
        IF @id_cita IS NOT NULL
        BEGIN
            DECLARE @id_atendida INT;
            SELECT @id_atendida = id_estado FROM Estado_Cita WHERE nombre_estado = 'Atendida';
            UPDATE Cita SET id_estado = @id_atendida WHERE id_cita = @id_cita;
        END

        SET @mensaje = 'Entrada registrada correctamente en la historia clinica.';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @mensaje = 'Error: ' + ERROR_MESSAGE(); SET @id_detalle = 0;
    END CATCH
END
GO

-- SP 2/5  Crear odontograma asociado a una historia clinica
CREATE OR ALTER PROCEDURE sp_CrearOdontograma
    @id_paciente     INT,
    @id_detalle      INT          = NULL,
    @tipo            VARCHAR(10),
    @observaciones   VARCHAR(MAX) = NULL,
    @id_odontograma  INT OUTPUT,
    @mensaje         NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_historia INT;
    SELECT @id_historia = id_historia FROM Historia_Clinica WHERE id_paciente = @id_paciente;

    IF @id_historia IS NULL
    BEGIN SET @mensaje = 'El paciente no tiene historia clinica.'; SET @id_odontograma = 0; RETURN; END

    INSERT INTO Odontograma (id_historia, id_detalle, tipo, fecha_registro, observaciones)
    VALUES (@id_historia, @id_detalle, @tipo, CAST(GETDATE() AS DATE), @observaciones);

    SET @id_odontograma = SCOPE_IDENTITY();
    SET @mensaje        = 'Odontograma creado correctamente.';
END
GO

-- SP 3/5  Registrar o actualizar estado de un diente por numero FDI
CREATE OR ALTER PROCEDURE sp_RegistrarEstadoDiente
    @id_odontograma INT,
    @numero_fdi     INT,
    @id_profesional INT,
    @estado         VARCHAR(20),
    @cara_afectada  VARCHAR(60)  = NULL,
    @observaciones  VARCHAR(MAX) = NULL,
    @mensaje        NVARCHAR(200) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_diente INT;
    SELECT @id_diente = id_diente FROM Diente_Catalogo WHERE numero_fdi = @numero_fdi;

    IF @id_diente IS NULL
    BEGIN SET @mensaje = 'Numero FDI no encontrado en el catalogo.'; RETURN; END

    IF EXISTS (
        SELECT 1 FROM Odontograma_Diente
        WHERE id_odontograma = @id_odontograma AND id_diente = @id_diente
    )
        UPDATE Odontograma_Diente
        SET estado = @estado, cara_afectada = @cara_afectada,
            observaciones = @observaciones, fecha_registro = CAST(GETDATE() AS DATE),
            id_profesional = @id_profesional
        WHERE id_odontograma = @id_odontograma AND id_diente = @id_diente;
    ELSE
        INSERT INTO Odontograma_Diente
            (id_odontograma, id_diente, id_profesional, estado, cara_afectada, observaciones, fecha_registro)
        VALUES (@id_odontograma, @id_diente, @id_profesional, @estado,
                @cara_afectada, @observaciones, CAST(GETDATE() AS DATE));

    SET @mensaje = 'Estado del diente registrado correctamente.';
END
GO

-- SP 4/5  Historial clinico completo del paciente
CREATE OR ALTER PROCEDURE sp_HistorialCompletoPaciente
    @id_paciente INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        dhc.id_detalle_historia, dhc.fecha, dhc.diagnostico, dhc.procedimiento,
        dhc.tratamiento, dhc.observaciones, dhc.proxima_cita_sugerida,
        pr.nombres + ' ' + pr.apellidos AS profesional,
        c.tipo_cita, c.hora_inicio
    FROM Historia_Clinica hc
    INNER JOIN Detalle_Historia_Clinica dhc ON dhc.id_historia   = hc.id_historia
    INNER JOIN Profesional              pr  ON pr.id_profesional = dhc.id_profesional
    LEFT  JOIN Cita                     c   ON c.id_cita         = dhc.id_cita
    WHERE hc.id_paciente = @id_paciente
    ORDER BY dhc.fecha DESC;
END
GO

-- SP 5/5  Odontograma mas reciente del paciente
CREATE OR ALTER PROCEDURE sp_OdontogramaActual
    @id_paciente INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        od.id_od_diente, dc.numero_fdi, dc.nombre AS diente, dc.cuadrante,
        od.estado, od.cara_afectada, od.observaciones, od.fecha_registro,
        pr.nombres + ' ' + pr.apellidos AS ultimo_profesional
    FROM Historia_Clinica hc
    INNER JOIN Odontograma         o   ON o.id_historia     = hc.id_historia
    INNER JOIN Odontograma_Diente  od  ON od.id_odontograma = o.id_odontograma
    INNER JOIN Diente_Catalogo     dc  ON dc.id_diente       = od.id_diente
    INNER JOIN Profesional         pr  ON pr.id_profesional  = od.id_profesional
    WHERE hc.id_paciente = @id_paciente
      AND o.id_odontograma = (
          SELECT TOP 1 id_odontograma FROM Odontograma
          WHERE id_historia = hc.id_historia
          ORDER BY fecha_registro DESC
      )
    ORDER BY dc.numero_fdi;
END
GO


-- ============================================================
-- PARTE 6  CONSULTAS SELECT  (leer cada tabla)
-- Pega cualquiera de estas lineas en SQL Server Management Studio
-- para ver los datos de la tabla correspondiente
-- ============================================================

-- ---- MODULO 1: USUARIOS, ROLES Y PERMISOS ----
SELECT * FROM Rol;
SELECT * FROM Usuario;
SELECT * FROM Auditoria;
SELECT * FROM Rol_Menu_Permiso;

-- ---- MODULO 2: PACIENTES ----
SELECT * FROM Paciente;

-- Pacientes con edad calculada
SELECT id_paciente, nombres, apellidos, documento,
       DATEDIFF(YEAR, fecha_nacimiento, GETDATE()) AS edad,
       alergias, estado
FROM Paciente
ORDER BY apellidos;

-- ---- MODULO 3: ESPECIALIDADES Y PROFESIONALES ----
SELECT * FROM Especialidad;
SELECT * FROM Profesional;
SELECT * FROM Profesional_Especialidad;
SELECT * FROM Horario_Profesional;
SELECT * FROM Bloqueo_Profesional;
SELECT * FROM Ausencia_Profesional;

-- Profesionales con sus especialidades (JOIN)
SELECT
    pr.id_profesional,
    pr.nombres + ' ' + pr.apellidos AS profesional,
    pr.registro_medico,
    e.nombre AS especialidad,
    pe.principal,
    pr.estado
FROM Profesional pr
INNER JOIN Profesional_Especialidad pe ON pe.id_profesional  = pr.id_profesional
INNER JOIN Especialidad             e  ON e.id_especialidad  = pe.id_especialidad
ORDER BY pr.apellidos;

-- ---- MODULO 4: SERVICIOS Y CONSULTORIOS ----
SELECT * FROM Servicio;
SELECT * FROM Profesional_Servicio;
SELECT * FROM Consultorio;

-- Servicios activos con precio
SELECT nombre, categoria, costo, duracion
FROM Servicio WHERE activo = 1
ORDER BY categoria, nombre;

-- ---- MODULO 5: CITAS Y CANCELACIONES ----
SELECT * FROM Estado_Cita;
SELECT * FROM Cita;
SELECT * FROM Cancelacion_Cita;
SELECT * FROM Detalle_Cita;

-- Agenda del dia completa (JOIN de 4 tablas)
SELECT
    c.id_cita,
    c.hora_inicio, c.hora_fin,
    pat.nombres + ' ' + pat.apellidos AS paciente,
    pat.alergias,
    pr.nombres  + ' ' + pr.apellidos  AS profesional,
    con.nombre  AS consultorio,
    ec.nombre_estado AS estado,
    c.tipo_cita,
    c.motivo_consulta
FROM Cita c
INNER JOIN Paciente    pat ON pat.id_paciente    = c.id_paciente
INNER JOIN Profesional pr  ON pr.id_profesional  = c.id_profesional
INNER JOIN Consultorio con ON con.id_consultorio = c.id_consultorio
INNER JOIN Estado_Cita ec  ON ec.id_estado       = c.id_estado
WHERE c.fecha = CAST(GETDATE() AS DATE)
ORDER BY c.hora_inicio;

-- Citas de un profesional especifico (reemplaza el 1 por el id_profesional)
SELECT
    c.fecha, c.hora_inicio, c.hora_fin,
    pat.nombres + ' ' + pat.apellidos AS paciente,
    ec.nombre_estado AS estado
FROM Cita c
INNER JOIN Paciente    pat ON pat.id_paciente = c.id_paciente
INNER JOIN Estado_Cita ec  ON ec.id_estado    = c.id_estado
WHERE c.id_profesional = 1
ORDER BY c.fecha, c.hora_inicio;

-- ---- MODULO 6: FACTURACION, PAGOS Y NOTIFICACIONES ----
SELECT * FROM Factura;
SELECT * FROM Detalle_Factura;
SELECT * FROM Pago;
SELECT * FROM Notificacion;

-- Facturas con saldo pendiente
SELECT
    f.numero_factura, f.fecha_factura,
    pat.nombres + ' ' + pat.apellidos AS paciente,
    f.total,
    ISNULL(SUM(p.monto), 0) AS total_pagado,
    f.total - ISNULL(SUM(p.monto), 0) AS saldo_pendiente,
    f.estado
FROM Factura f
INNER JOIN Paciente pat ON pat.id_paciente = f.id_paciente
LEFT  JOIN Pago     p   ON p.id_factura   = f.id_factura
GROUP BY f.id_factura, f.numero_factura, f.fecha_factura,
         pat.nombres, pat.apellidos, f.total, f.estado
ORDER BY f.fecha_factura DESC;

-- ---- MODULO 7: HISTORIA CLINICA Y ODONTOGRAMA ----
SELECT * FROM Historia_Clinica;
SELECT * FROM Detalle_Historia_Clinica;
SELECT * FROM Diente_Catalogo;
SELECT * FROM Odontograma;
SELECT * FROM Odontograma_Diente;

-- Historial clinico completo de un paciente (reemplaza 1 por id_paciente)
SELECT
    dhc.fecha,
    pr.nombres + ' ' + pr.apellidos AS profesional,
    dhc.diagnostico,
    dhc.procedimiento,
    dhc.tratamiento,
    dhc.observaciones,
    dhc.proxima_cita_sugerida
FROM Historia_Clinica hc
INNER JOIN Detalle_Historia_Clinica dhc ON dhc.id_historia   = hc.id_historia
INNER JOIN Profesional              pr  ON pr.id_profesional = dhc.id_profesional
WHERE hc.id_paciente = 1
ORDER BY dhc.fecha DESC;

-- Odontograma actual de un paciente (reemplaza 1 por id_paciente)
SELECT
    dc.numero_fdi,
    dc.nombre AS diente,
    dc.cuadrante,
    od.estado,
    od.cara_afectada,
    od.observaciones,
    od.fecha_registro,
    pr.nombres + ' ' + pr.apellidos AS profesional
FROM Historia_Clinica       hc
INNER JOIN Odontograma      o   ON o.id_historia     = hc.id_historia
INNER JOIN Odontograma_Diente od ON od.id_odontograma = o.id_odontograma
INNER JOIN Diente_Catalogo  dc  ON dc.id_diente       = od.id_diente
INNER JOIN Profesional      pr  ON pr.id_profesional  = od.id_profesional
WHERE hc.id_paciente = 1
ORDER BY dc.numero_fdi;

-- ---- CONSULTAS UTILES DE AUDITORIA ----

-- Ver todos los cambios del sistema ordenados por fecha
SELECT
    a.fecha, a.tabla_afectada, a.accion,
    u.nombre + ' ' + u.apellidos AS usuario,
    a.descripcion,
    a.datos_anteriores,
    a.datos_nuevos
FROM Auditoria a
LEFT JOIN Usuario u ON u.id_usuario = a.id_usuario
ORDER BY a.fecha DESC;

-- Ver inicios de sesion del dia
SELECT u.nombre, u.apellidos, u.correo, u.ultimo_login
FROM Usuario u
WHERE CAST(u.ultimo_login AS DATE) = CAST(GETDATE() AS DATE)
ORDER BY u.ultimo_login DESC;

-- ============================================================
-- FIN DEL SCRIPT  SmileTrack v1.0
-- 26 tablas · 32 procedimientos · 18 triggers
-- T-SQL · SQL Server 2019+ · ADSO · SENA 2025
-- ============================================================
