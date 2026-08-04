-- ============================================================
-- SCRIPT_SQL_UNICO.sql
-- Script unificado y conservador para SmileTrack.
-- Mantiene los módulos originales del proyecto y añade solo las columnas/objetos mínimos que el modelo actual necesita.
-- ============================================================

USE [SmileTrackDB];
GO

SET NOCOUNT ON;
GO

-- ============================================================
-- 1) ACCESO Y SEGURIDAD
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Rol') AND type = N'U')
BEGIN
    CREATE TABLE Rol (
        id_rol INT IDENTITY(1,1) PRIMARY KEY,
        nombre_rol VARCHAR(50) NOT NULL UNIQUE,
        descripcion VARCHAR(200) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Menu') AND type = N'U')
BEGIN
    CREATE TABLE Menu (
        id_menu INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        url VARCHAR(200) NOT NULL,
        icono VARCHAR(100) NULL,
        orden INT NOT NULL DEFAULT 0,
        id_menu_padre INT NULL,
        modulo VARCHAR(50) NULL,
        activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Menu_Padre FOREIGN KEY (id_menu_padre) REFERENCES Menu(id_menu)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Rol_Menu_Permiso') AND type = N'U')
BEGIN
    CREATE TABLE Rol_Menu_Permiso (
        id_rol INT NOT NULL,
        id_menu INT NOT NULL,
        puede_ver BIT NOT NULL DEFAULT 0,
        puede_crear BIT NOT NULL DEFAULT 0,
        puede_editar BIT NOT NULL DEFAULT 0,
        puede_eliminar BIT NOT NULL DEFAULT 0,
        puede_exportar BIT NOT NULL DEFAULT 0,
        PRIMARY KEY (id_rol, id_menu),
        CONSTRAINT FK_RMP_Rol FOREIGN KEY (id_rol) REFERENCES Rol(id_rol),
        CONSTRAINT FK_RMP_Menu FOREIGN KEY (id_menu) REFERENCES Menu(id_menu)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Usuario') AND type = N'U')
BEGIN
    CREATE TABLE Usuario (
        id_usuario INT IDENTITY(1,1) PRIMARY KEY,
        creado_por INT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        correo VARCHAR(150) NOT NULL UNIQUE,
        contrasena VARCHAR(255) NOT NULL,
        id_rol INT NOT NULL,
        estado VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
        fecha_nacimiento DATE NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        ultimo_login DATETIME NULL,
        codigo_recuperacion VARCHAR(10) NULL,
        fecha_expiracion_codigo DATETIME NULL,
        intentos_fallidos INT NOT NULL DEFAULT 0,
        ultimo_logout DATETIME NULL,
        CONSTRAINT FK_Usuario_Rol FOREIGN KEY (id_rol) REFERENCES Rol(id_rol),
        CONSTRAINT FK_Usuario_Creador FOREIGN KEY (creado_por) REFERENCES Usuario(id_usuario)
    );
END
GO

IF COL_LENGTH(N'dbo.Usuario', N'codigo_recuperacion') IS NULL
BEGIN
    ALTER TABLE Usuario ADD codigo_recuperacion VARCHAR(10) NULL;
END
GO

IF COL_LENGTH(N'dbo.Usuario', N'fecha_expiracion_codigo') IS NULL
BEGIN
    ALTER TABLE Usuario ADD fecha_expiracion_codigo DATETIME NULL;
END
GO

IF COL_LENGTH(N'dbo.Usuario', N'intentos_fallidos') IS NULL
BEGIN
    ALTER TABLE Usuario ADD intentos_fallidos INT NOT NULL DEFAULT 0;
END
GO

IF COL_LENGTH(N'dbo.Usuario', N'ultimo_logout') IS NULL
BEGIN
    ALTER TABLE Usuario ADD ultimo_logout DATETIME NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Auditoria') AND type = N'U')
BEGIN
    CREATE TABLE Auditoria (
        id_auditoria INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NULL,
        tabla_afectada VARCHAR(100) NOT NULL,
        id_registro INT NULL,
        accion VARCHAR(45) NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
        ip_origen VARCHAR(45) NULL,
        datos_anteriores VARCHAR(MAX) NULL,
        datos_nuevos VARCHAR(MAX) NULL,
        descripcion VARCHAR(255) NULL,
        fecha DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Auditoria_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
    );
END
GO

-- ============================================================
-- 2) PACIENTES
-- ============================================================
-- ============================================================
-- RECUPERACION DE CONTRASEÑA (migrado desde agregar_recuperacion_password.sql)
-- ============================================================
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

PRINT 'Script de recuperacion de contrasena incorporado al unificado.';
GO
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Paciente') AND type = N'U')
BEGIN
    CREATE TABLE Paciente (
        id_paciente INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NULL,
        tipo_documento VARCHAR(5) NOT NULL CHECK (tipo_documento IN ('CC','TI','CE','PAS','NIT')),
        documento VARCHAR(20) NOT NULL UNIQUE,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        fecha_nacimiento DATE NOT NULL,
        genero VARCHAR(5) NULL CHECK (genero IN ('M','F','O')),
        telefono VARCHAR(20) NULL,
        correo VARCHAR(150) NULL,
        direccion VARCHAR(255) NULL,
        ciudad VARCHAR(100) NULL,
        grupo_sanguineo VARCHAR(5) NULL,
        alergias VARCHAR(MAX) NULL,
        antecedentes_medicos VARCHAR(MAX) NULL,
        contacto_emergencia VARCHAR(100) NULL,
        telefono_emergencia VARCHAR(20) NULL,
        fecha_registro DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        estado VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','retirado')),
        archivo_adjunto VARCHAR(255) NULL,
        CONSTRAINT FK_Paciente_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
    );
END
GO

-- ============================================================
-- 3) PROFESIONALES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Especialidad') AND type = N'U')
BEGIN
    CREATE TABLE Especialidad (
        id_especialidad INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Profesional') AND type = N'U')
BEGIN
    CREATE TABLE Profesional (
        id_profesional INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NULL,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        registro_medico VARCHAR(50) NOT NULL,
        descripcion VARCHAR(255) NULL,
        categoria VARCHAR(100) NULL,
        telefono VARCHAR(20) NULL,
        estado VARCHAR(15) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
        fecha_ingreso DATE NULL,
        CONSTRAINT FK_Profesional_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE SET NULL
    );
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'nombres') IS NULL
BEGIN
    ALTER TABLE Profesional ADD nombres VARCHAR(100) NOT NULL CONSTRAINT DF_Profesional_Nombres DEFAULT '';
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'apellidos') IS NULL
BEGIN
    ALTER TABLE Profesional ADD apellidos VARCHAR(100) NOT NULL CONSTRAINT DF_Profesional_Apellidos DEFAULT '';
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'registro_medico') IS NULL
BEGIN
    ALTER TABLE Profesional ADD registro_medico VARCHAR(50) NOT NULL CONSTRAINT DF_Profesional_RegistroMedico DEFAULT '';
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'descripcion') IS NULL
BEGIN
    ALTER TABLE Profesional ADD descripcion VARCHAR(255) NULL;
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'categoria') IS NULL
BEGIN
    ALTER TABLE Profesional ADD categoria VARCHAR(100) NULL;
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'telefono') IS NULL
BEGIN
    ALTER TABLE Profesional ADD telefono VARCHAR(20) NULL;
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'estado') IS NULL
BEGIN
    ALTER TABLE Profesional ADD estado VARCHAR(15) NOT NULL CONSTRAINT DF_Profesional_Estado DEFAULT 'activo';
END
GO

IF COL_LENGTH(N'dbo.Profesional', N'fecha_ingreso') IS NULL
BEGIN
    ALTER TABLE Profesional ADD fecha_ingreso DATE NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Profesional_Especialidad') AND type = N'U')
BEGIN
    CREATE TABLE Profesional_Especialidad (
        id_profesional INT NOT NULL,
        id_especialidad INT NOT NULL,
        principal BIT NOT NULL DEFAULT 0,
        PRIMARY KEY (id_profesional, id_especialidad),
        CONSTRAINT FK_PE_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional),
        CONSTRAINT FK_PE_Especialidad FOREIGN KEY (id_especialidad) REFERENCES Especialidad(id_especialidad)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Horario_Profesional') AND type = N'U')
BEGIN
    CREATE TABLE Horario_Profesional (
        id_horario INT IDENTITY(1,1) PRIMARY KEY,
        id_profesional INT NOT NULL,
        dia_semana VARCHAR(12) NOT NULL CHECK (dia_semana IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo')),
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_HP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Bloqueo_Profesional') AND type = N'U')
BEGIN
    CREATE TABLE Bloqueo_Profesional (
        id_bloqueo INT IDENTITY(1,1) PRIMARY KEY,
        id_profesional INT NOT NULL,
        fecha_inicio DATETIME NOT NULL,
        fecha_fin DATETIME NOT NULL,
        motivo VARCHAR(150) NULL,
        aprobado_por INT NULL,
        CONSTRAINT FK_BP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Ausencia_Profesional') AND type = N'U')
BEGIN
    CREATE TABLE Ausencia_Profesional (
        id_ausencia INT IDENTITY(1,1) PRIMARY KEY,
        id_profesional INT NOT NULL,
        tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('vacaciones','incapacidad','permiso','otro')),
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        duracion INT NULL,
        observaciones VARCHAR(MAX) NULL,
        aprobado_por INT NULL,
        CONSTRAINT FK_AP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

-- ============================================================
-- 4) SERVICIOS Y CONSULTORIOS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Servicio') AND type = N'U')
BEGIN
    CREATE TABLE Servicio (
        id_servicio INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        descripcion VARCHAR(500) NULL,
        precio DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo'))
    );
END
GO

IF COL_LENGTH(N'dbo.Servicio', N'precio') IS NULL
BEGIN
    ALTER TABLE Servicio ADD precio DECIMAL(12,2) NOT NULL CONSTRAINT DF_Servicio_Precio DEFAULT 0.00;
END
GO

IF COL_LENGTH(N'dbo.Servicio', N'estado') IS NULL
BEGIN
    ALTER TABLE Servicio ADD estado VARCHAR(10) NOT NULL CONSTRAINT DF_Servicio_Estado DEFAULT 'activo';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Profesional_Servicio') AND type = N'U')
BEGIN
    CREATE TABLE Profesional_Servicio (
        id_profesional INT NOT NULL,
        id_servicio INT NOT NULL,
        PRIMARY KEY (id_profesional, id_servicio),
        CONSTRAINT FK_PS_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional),
        CONSTRAINT FK_PS_Servicio FOREIGN KEY (id_servicio) REFERENCES Servicio(id_servicio)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Consultorio') AND type = N'U')
BEGIN
    CREATE TABLE Consultorio (
        id_consultorio INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        ubicacion VARCHAR(150) NULL,
        tipo VARCHAR(50) NULL,
        nombre_estado VARCHAR(50) NULL,
        capacidad INT NULL,
        estado VARCHAR(15) NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','ocupado','mantenimiento'))
    );
END
GO

-- ============================================================
-- 5) CITAS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Estado_Cita') AND type = N'U')
BEGIN
    CREATE TABLE Estado_Cita (
        id_estado INT IDENTITY(1,1) PRIMARY KEY,
        nombre_estado VARCHAR(50) NOT NULL UNIQUE,
        descripcion VARCHAR(150) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Cita') AND type = N'U')
BEGIN
    CREATE TABLE Cita (
        id_cita INT IDENTITY(1,1) PRIMARY KEY,
        id_paciente INT NOT NULL,
        id_profesional INT NULL,
        id_servicio INT NULL,
        fecha_hora DATETIME NOT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'programada',
        notas VARCHAR(MAX) NULL,
        CONSTRAINT FK_Cita_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente),
        CONSTRAINT FK_Cita_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional) ON DELETE SET NULL,
        CONSTRAINT FK_Cita_Servicio FOREIGN KEY (id_servicio) REFERENCES Servicio(id_servicio) ON DELETE SET NULL
    );
END
GO

IF COL_LENGTH(N'dbo.Cita', N'id_servicio') IS NULL
BEGIN
    ALTER TABLE Cita ADD id_servicio INT NULL;
    ALTER TABLE Cita ADD CONSTRAINT FK_Cita_Servicio FOREIGN KEY (id_servicio) REFERENCES Servicio(id_servicio) ON DELETE SET NULL;
END
GO

IF COL_LENGTH(N'dbo.Cita', N'fecha_hora') IS NULL
BEGIN
    ALTER TABLE Cita ADD fecha_hora DATETIME NOT NULL CONSTRAINT DF_Cita_FechaHora DEFAULT GETDATE();
END
GO

IF COL_LENGTH(N'dbo.Cita', N'estado') IS NULL
BEGIN
    ALTER TABLE Cita ADD estado VARCHAR(30) NOT NULL CONSTRAINT DF_Cita_Estado DEFAULT 'programada';
END
GO

IF COL_LENGTH(N'dbo.Cita', N'notas') IS NULL
BEGIN
    ALTER TABLE Cita ADD notas VARCHAR(MAX) NULL;
END
GO

-- ============================================================
-- 6) HISTORIA CLÍNICA, FACTURACIÓN Y OTROS MÓDULOS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Historia_Clinica') AND type = N'U')
BEGIN
    CREATE TABLE Historia_Clinica (
        id_historia INT IDENTITY(1,1) PRIMARY KEY,
        id_paciente INT NOT NULL UNIQUE,
        fecha_apertura DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        observaciones_generales VARCHAR(MAX) NULL,
        activa BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_HC_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente)
    );
END
GO

    -- ============================================================
    -- AGREGADO: Migración parcial Citas V3
    -- Este bloque fue añadido automáticamente por agregar_citas_v3.sql
    -- Contiene creación de Estado_Cita, Consultorio y alteraciones idempotentes a Cita
    -- ============================================================

    SET XACT_ABORT ON;
    GO

    -- Crear tabla Estado_Cita si no existe
    IF OBJECT_ID('dbo.Estado_Cita', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.Estado_Cita (
            id_estado INT IDENTITY(1,1) PRIMARY KEY,
            nombre_estado VARCHAR(50) NOT NULL UNIQUE,
            descripcion VARCHAR(150) NULL
        );
        PRINT 'Tabla dbo.Estado_Cita creada.';
    END
    ELSE
        PRINT 'Tabla dbo.Estado_Cita ya existe, se omite creación.';

    -- Insertar valores si no existen
    DECLARE @vals TABLE (nombre VARCHAR(50), descripcion VARCHAR(150));
    INSERT INTO @vals (nombre, descripcion) VALUES
    ('Agendada', 'Cita programada y pendiente'),
    ('Confirmada', 'Cita confirmada por paciente o clínica'),
    ('En consulta', 'Paciente en consulta'),
    ('Atendida', 'Cita atendida y finalizada'),
    ('Cancelada', 'Cita cancelada'),
    ('No asistio', 'Paciente no asistió');

    DECLARE @n VARCHAR(50), @d VARCHAR(150);
    DECLARE cur CURSOR FOR SELECT nombre, descripcion FROM @vals;
    OPEN cur;
    FETCH NEXT FROM cur INTO @n, @d;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Estado_Cita WHERE nombre_estado = @n)
        BEGIN
            INSERT INTO dbo.Estado_Cita (nombre_estado, descripcion) VALUES (@n, @d);
            PRINT 'Insertado estado: ' + @n;
        END
        ELSE
            PRINT 'Estado ya existe: ' + @n;
        FETCH NEXT FROM cur INTO @n, @d;
    END
    CLOSE cur; DEALLOCATE cur;

    -- Crear tabla Consultorio si no existe
    IF OBJECT_ID('dbo.Consultorio', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.Consultorio (
            id_consultorio INT IDENTITY(1,1) PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            ubicacion VARCHAR(150) NULL,
            tipo VARCHAR(50) NULL,
            nombre_estado VARCHAR(50) NULL,
            capacidad INT NULL,
            estado VARCHAR(15) NOT NULL DEFAULT 'disponible'
        );
        PRINT 'Tabla dbo.Consultorio creada.';
    END
    ELSE
        PRINT 'Tabla dbo.Consultorio ya existe, se omite creación.';

        IF NOT EXISTS (SELECT 1 FROM dbo.Consultorio WHERE nombre = 'Consultorio 1')
        BEGIN
            -- Insert explicit 'estado' value to avoid NULL-insert errors when
            -- the existing table lacks a DEFAULT constraint for 'estado'.
            INSERT INTO dbo.Consultorio (nombre, ubicacion, tipo, estado, capacidad) VALUES
            ('Consultorio 1', 'Piso 1 - ala norte', 'general', 'disponible', 1),
            ('Consultorio 2', 'Piso 1 - ala sur', 'quirófano', 'disponible', 1),
            ('Consultorio 3', 'Piso 2 - ala este', 'especializado', 'disponible', 1);
            PRINT 'Consultorios de prueba insertados.';
        END
    ELSE
        PRINT 'Consultorios de prueba ya existen, se omite inserción.';

    -- Modificar tabla Cita para agregar columnas nuevas si no existen
    IF OBJECT_ID('dbo.Cita', 'U') IS NULL
    BEGIN
        PRINT 'ERROR: La tabla dbo.Cita NO existe en la base de datos. Confirma que estás ejecutando contra la BD correcta (SmileTrackDB).';
        THROW 50000, 'La tabla dbo.Cita no existe.', 1;
    END

    -- Agregar columna fecha DATE
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'fecha' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD fecha DATE NULL;
        PRINT 'Columna dbo.Cita.fecha creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.fecha ya existe.';

    -- hora_inicio TIME
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'hora_inicio' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD hora_inicio TIME NULL;
        PRINT 'Columna dbo.Cita.hora_inicio creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.hora_inicio ya existe.';

    -- hora_fin TIME
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'hora_fin' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD hora_fin TIME NULL;
        PRINT 'Columna dbo.Cita.hora_fin creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.hora_fin ya existe.';

    -- motivo_consulta VARCHAR(MAX)
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'motivo_consulta' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD motivo_consulta VARCHAR(MAX) NULL;
        PRINT 'Columna dbo.Cita.motivo_consulta creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.motivo_consulta ya existe.';

    -- notas_previas VARCHAR(MAX)
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'notas_previas' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD notas_previas VARCHAR(MAX) NULL;
        PRINT 'Columna dbo.Cita.notas_previas creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.notas_previas ya existe.';

    -- tipo_cita VARCHAR(20)
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'tipo_cita' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD tipo_cita VARCHAR(20) NULL;
        PRINT 'Columna dbo.Cita.tipo_cita creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.tipo_cita ya existe.';

    -- id_consultorio INT
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'id_consultorio' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD id_consultorio INT NULL;
        PRINT 'Columna dbo.Cita.id_consultorio creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.id_consultorio ya existe.';

    -- id_estado INT
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'id_estado' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD id_estado INT NULL;
        PRINT 'Columna dbo.Cita.id_estado creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.id_estado ya existe.';

    -- fecha_creacion DATETIME DEFAULT GETDATE()
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'fecha_creacion' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD fecha_creacion DATETIME NULL CONSTRAINT DF_Cita_FechaCreacion DEFAULT (GETDATE());
        PRINT 'Columna dbo.Cita.fecha_creacion creada con DEFAULT GETDATE().' ;
    END
    ELSE PRINT 'Columna dbo.Cita.fecha_creacion ya existe.';

    -- creado_por INT
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'creado_por' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD creado_por INT NULL;
        PRINT 'Columna dbo.Cita.creado_por creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.creado_por ya existe.';

    -- archivo_adjunto VARCHAR(255)
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'archivo_adjunto' AND Object_ID = Object_ID(N'dbo.Cita'))
    BEGIN
        ALTER TABLE dbo.Cita ADD archivo_adjunto VARCHAR(255) NULL;
        PRINT 'Columna dbo.Cita.archivo_adjunto creada.';
    END
    ELSE PRINT 'Columna dbo.Cita.archivo_adjunto ya existe.';

    -- Agregar FK hacia Consultorio (id_consultorio) si no existe
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_Consultorio')
    BEGIN
        IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'id_consultorio' AND Object_ID = Object_ID(N'dbo.Cita'))
        BEGIN
            ALTER TABLE dbo.Cita
            ADD CONSTRAINT FK_Cita_Consultorio FOREIGN KEY (id_consultorio) REFERENCES dbo.Consultorio(id_consultorio);
            PRINT 'Constraint FK_Cita_Consultorio creada.';
        END
        ELSE
            PRINT 'No existe la columna id_consultorio en dbo.Cita; FK no creada.';
    END
    ELSE PRINT 'Constraint FK_Cita_Consultorio ya existe.';

    -- Agregar FK hacia Estado_Cita (id_estado) si no existe
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cita_EstadoCita')
    BEGIN
        IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'id_estado' AND Object_ID = Object_ID(N'dbo.Cita'))
        BEGIN
            ALTER TABLE dbo.Cita
            ADD CONSTRAINT FK_Cita_EstadoCita FOREIGN KEY (id_estado) REFERENCES dbo.Estado_Cita(id_estado);
            PRINT 'Constraint FK_Cita_EstadoCita creada.';
        END
        ELSE
            PRINT 'No existe la columna id_estado en dbo.Cita; FK no creada.';
    END
    ELSE PRINT 'Constraint FK_Cita_EstadoCita ya existe.';

    PRINT 'Script agregado: migración parcial Citas V3 finalizada.';
    GO


IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Factura') AND type = N'U')
BEGIN
    CREATE TABLE Factura (
        id_factura INT IDENTITY(1,1) PRIMARY KEY,
        numero_factura VARCHAR(20) NOT NULL UNIQUE,
        fecha_factura DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','parcial','pagada','anulada')),
        id_paciente INT NOT NULL,
        notas VARCHAR(MAX) NULL,
        generada_por INT NOT NULL,
        CONSTRAINT FK_Factura_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente),
        CONSTRAINT FK_Factura_GeneradaPor FOREIGN KEY (generada_por) REFERENCES Usuario(id_usuario)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.PQR') AND type = N'U')
BEGIN
    CREATE TABLE PQR (
        id_pqr INT IDENTITY(1,1) PRIMARY KEY,
        id_paciente INT NOT NULL,
        id_usuario INT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('peticion','queja','reclamo','sugerencia')),
        asunto VARCHAR(200) NOT NULL,
        descripcion VARCHAR(MAX) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida','en_proceso','resuelta','cerrada','rechazada')),
        prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta','urgente')),
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_respuesta DATETIME NULL,
        respuesta VARCHAR(MAX) NULL,
        atendida_por INT NULL,
        evidencia_adjunto VARCHAR(255) NULL,
        CONSTRAINT FK_PQR_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente),
        CONSTRAINT FK_PQR_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
        CONSTRAINT FK_PQR_Atendida FOREIGN KEY (atendida_por) REFERENCES Usuario(id_usuario)
    );
END
GO

-- ============================================================
-- 7) SEED DE DATOS BASE
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Administrador')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES ('Administrador','Acceso total');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Profesional')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES ('Profesional','Gestión clínica');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Auxiliar')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES ('Auxiliar','Apoyo clínico');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Recepcionista')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES ('Recepcionista','Gestión de citas');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Paciente')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES ('Paciente','Consulta propia');
GO

IF NOT EXISTS (SELECT 1 FROM Menu WHERE url='/Publico/homepage.html')
    INSERT INTO Menu (nombre,url,icono,orden,modulo) VALUES ('Inicio','/Publico/homepage.html','🏠',1,'publico');
GO

IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Odontologia General')
    INSERT INTO Especialidad (nombre, descripcion) VALUES ('Odontologia General','Atención primaria');
IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Endodoncia')
    INSERT INTO Especialidad (nombre, descripcion) VALUES ('Endodoncia','Conductos');
IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Ortodoncia')
    INSERT INTO Especialidad (nombre, descripcion) VALUES ('Ortodoncia','Corrección dental');
IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Periodoncia')
    INSERT INTO Especialidad (nombre, descripcion) VALUES ('Periodoncia','Encías');
GO

IF NOT EXISTS (SELECT 1 FROM Usuario WHERE correo='admin@smiletrack.co')
BEGIN
    INSERT INTO Usuario (nombre, apellidos, correo, contrasena, id_rol, estado, fecha_creacion)
    VALUES ('Admin', 'SmileTrack', 'admin@smiletrack.co', '$2a$11$u.Lp05p02n3H8i1j/3CgkuM9Vl8y7D2pXfG7zT66.qG4q/3.X9G1a', (SELECT id_rol FROM Rol WHERE nombre_rol='Administrador'), 'activo', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM Usuario WHERE correo='pac@smiletrack.co')
BEGIN
    INSERT INTO Usuario (nombre, apellidos, correo, contrasena, id_rol, estado, fecha_creacion)
    VALUES ('Paciente', 'Prueba', 'pac@smiletrack.co', '$2a$11$u.Lp05p02n3H8i1j/3CgkuM9Vl8y7D2pXfG7zT66.qG4q/3.X9G1a', (SELECT id_rol FROM Rol WHERE nombre_rol='Paciente'), 'activo', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM Paciente WHERE documento='0000000001')
BEGIN
    INSERT INTO Paciente (id_usuario, tipo_documento, documento, nombres, apellidos, fecha_nacimiento, genero, correo, fecha_registro, estado)
    VALUES ((SELECT id_usuario FROM Usuario WHERE correo='pac@smiletrack.co'), 'CC', '0000000001', 'Paciente', 'Prueba', DATEADD(year, -25, CAST(GETDATE() AS DATE)), 'M', 'pac@smiletrack.co', CAST(GETDATE() AS DATE), 'activo');
END
GO

IF NOT EXISTS (SELECT 1 FROM Profesional WHERE registro_medico='SMT-001')
BEGIN
    DECLARE @id_usuario_admin INT = (SELECT TOP 1 id_usuario FROM Usuario WHERE correo='admin@smiletrack.co');
    IF @id_usuario_admin IS NOT NULL
    BEGIN
        INSERT INTO Profesional (id_usuario, nombres, apellidos, registro_medico, descripcion, categoria, telefono, estado, fecha_ingreso)
        VALUES (@id_usuario_admin, 'Dr. Juan', 'Smith', 'SMT-001', 'Especialista en ortodoncia', 'Ortodoncia', '3001234567', 'activo', CAST(GETDATE() AS DATE));
    END
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM Profesional_Especialidad pe
    JOIN Profesional p ON p.id_profesional = pe.id_profesional
    JOIN Especialidad e ON e.id_especialidad = pe.id_especialidad
    WHERE p.registro_medico = 'SMT-001' AND e.nombre = 'Ortodoncia'
)
BEGIN
    INSERT INTO Profesional_Especialidad (id_profesional, id_especialidad, principal)
    SELECT p.id_profesional, e.id_especialidad, 1
    FROM Profesional p
    JOIN Especialidad e ON e.nombre = 'Ortodoncia'
    WHERE p.registro_medico = 'SMT-001';
END
GO

IF NOT EXISTS (SELECT 1 FROM Servicio WHERE nombre='Limpieza dental')
BEGIN
    IF COL_LENGTH(N'dbo.Servicio', N'precio') IS NOT NULL AND COL_LENGTH(N'dbo.Servicio', N'estado') IS NOT NULL
    BEGIN
        EXEC sys.sp_executesql N'INSERT INTO Servicio (nombre, descripcion, precio, estado) VALUES (@p1, @p2, @p3, @p4);',
            N'@p1 nvarchar(150), @p2 nvarchar(500), @p3 decimal(12,2), @p4 nvarchar(10)',
            N'Limpieza dental', N'Prevención y profilaxis', 80000, N'activo';
    END
    ELSE
    BEGIN
        EXEC sys.sp_executesql N'INSERT INTO Servicio (nombre, descripcion, categoria, costo, duracion, telefono, activo) VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7);',
            N'@p1 nvarchar(150), @p2 nvarchar(500), @p3 nvarchar(50), @p4 decimal(12,2), @p5 nvarchar(50), @p6 nvarchar(20), @p7 bit',
            N'Limpieza dental', N'Prevención y profilaxis', N'Prevención', 80000, N'30 min', NULL, 1;
    END
END
GO

IF NOT EXISTS (SELECT 1 FROM Servicio WHERE nombre='Blanqueamiento')
BEGIN
    IF COL_LENGTH(N'dbo.Servicio', N'precio') IS NOT NULL AND COL_LENGTH(N'dbo.Servicio', N'estado') IS NOT NULL
    BEGIN
        EXEC sys.sp_executesql N'INSERT INTO Servicio (nombre, descripcion, precio, estado) VALUES (@p1, @p2, @p3, @p4);',
            N'@p1 nvarchar(150), @p2 nvarchar(500), @p3 decimal(12,2), @p4 nvarchar(10)',
            N'Blanqueamiento', N'Estética dental', 350000, N'activo';
    END
    ELSE
    BEGIN
        EXEC sys.sp_executesql N'INSERT INTO Servicio (nombre, descripcion, categoria, costo, duracion, telefono, activo) VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7);',
            N'@p1 nvarchar(150), @p2 nvarchar(500), @p3 nvarchar(50), @p4 decimal(12,2), @p5 nvarchar(50), @p6 nvarchar(20), @p7 bit',
            N'Blanqueamiento', N'Estética dental', N'Estética', 350000, N'60 min', NULL, 1;
    END
END
GO

IF NOT EXISTS (SELECT 1 FROM Servicio WHERE nombre='Ortodoncia')
BEGIN
    IF COL_LENGTH(N'dbo.Servicio', N'precio') IS NOT NULL AND COL_LENGTH(N'dbo.Servicio', N'estado') IS NOT NULL
    BEGIN
        EXEC sys.sp_executesql N'INSERT INTO Servicio (nombre, descripcion, precio, estado) VALUES (@p1, @p2, @p3, @p4);',
            N'@p1 nvarchar(150), @p2 nvarchar(500), @p3 decimal(12,2), @p4 nvarchar(10)',
            N'Ortodoncia', N'Alineación y corrección', 200000, N'activo';
    END
    ELSE
    BEGIN
        EXEC sys.sp_executesql N'INSERT INTO Servicio (nombre, descripcion, categoria, costo, duracion, telefono, activo) VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7);',
            N'@p1 nvarchar(150), @p2 nvarchar(500), @p3 nvarchar(50), @p4 decimal(12,2), @p5 nvarchar(50), @p6 nvarchar(20), @p7 bit',
            N'Ortodoncia', N'Alineación y corrección', N'Ortodoncia', 200000, N'45 min', NULL, 1;
    END
END
GO

IF NOT EXISTS (SELECT 1 FROM Cita WHERE motivo_consulta='Primera consulta de valoración')
BEGIN
    IF COL_LENGTH(N'dbo.Cita', N'fecha') IS NOT NULL
       AND COL_LENGTH(N'dbo.Cita', N'hora_inicio') IS NOT NULL
       AND COL_LENGTH(N'dbo.Cita', N'hora_fin') IS NOT NULL
       AND COL_LENGTH(N'dbo.Cita', N'id_estado') IS NOT NULL
       AND EXISTS (SELECT 1 FROM Paciente WHERE documento='0000000001')
       AND EXISTS (SELECT 1 FROM Profesional WHERE registro_medico='SMT-001')
       AND EXISTS (SELECT 1 FROM Estado_Cita WHERE nombre_estado='programada')
    BEGIN
        EXEC sys.sp_executesql N'
            INSERT INTO Cita (fecha, hora_inicio, hora_fin, motivo_consulta, notas_previas, tipo_cita, id_paciente, id_profesional, id_consultorio, id_estado, fecha_creacion, creado_por, archivo_adjunto)
            SELECT CAST(DATEADD(day, 2, GETDATE()) AS DATE), CAST(DATEADD(hour, 8, GETDATE()) AS TIME), CAST(DATEADD(hour, 9, GETDATE()) AS TIME), @motivo, NULL, @tipo, p.id_paciente, pr.id_profesional, NULL, ec.id_estado, GETDATE(), 1, NULL
            FROM Paciente p
            CROSS JOIN Profesional pr
            CROSS JOIN Estado_Cita ec
            WHERE p.documento=@documento AND pr.registro_medico=@registro AND ec.nombre_estado=@estado;
        ',
        N'@motivo nvarchar(200), @tipo nvarchar(50), @documento nvarchar(20), @registro nvarchar(50), @estado nvarchar(50)',
        N'Primera consulta de valoración', N'Valoración', N'0000000001', N'SMT-001', N'programada';
    END
END
GO

-- ============================================================
-- 8) DATOS FICTICIOS ADICIONALES (poblado para pruebas / demo)
-- Añadido para sincronizar este script de respaldo con el seed
-- real que ejecuta la aplicación en Data/DbInitializer.cs.
-- Todo el bloque es idempotente (verifica existencia antes de insertar).
-- ============================================================

-- --- 8.1 Servicios adicionales ---------------------------------
DECLARE @serviciosNuevos TABLE (nombre VARCHAR(150), descripcion VARCHAR(500), precio DECIMAL(12,2));
INSERT INTO @serviciosNuevos (nombre, descripcion, precio) VALUES
('Endodoncia', 'Tratamiento de conductos radiculares', 450000),
('Implante dental', 'Reemplazo de piezas perdidas', 2800000),
('Odontopediatria', 'Cuidado dental especializado para ninos', 60000),
('Extraccion simple', 'Extraccion de pieza dental sin complicaciones', 120000),
('Resina dental', 'Restauracion estetica de una pieza danada', 90000),
('Profilaxis y fluor', 'Prevencion de caries en ninos y adultos', 70000),
('Cirugia de terceros molares', 'Extraccion quirurgica de muelas del juicio', 650000);

DECLARE @sNombre VARCHAR(150), @sDescripcion VARCHAR(500), @sPrecio DECIMAL(12,2);
DECLARE cur_servicios CURSOR FOR SELECT nombre, descripcion, precio FROM @serviciosNuevos;
OPEN cur_servicios;
FETCH NEXT FROM cur_servicios INTO @sNombre, @sDescripcion, @sPrecio;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Servicio WHERE nombre = @sNombre)
        INSERT INTO Servicio (nombre, descripcion, precio, estado) VALUES (@sNombre, @sDescripcion, @sPrecio, 'activo');
    FETCH NEXT FROM cur_servicios INTO @sNombre, @sDescripcion, @sPrecio;
END
CLOSE cur_servicios; DEALLOCATE cur_servicios;
GO

-- --- 8.2 Consultorios adicionales -------------------------------
IF NOT EXISTS (SELECT 1 FROM Consultorio WHERE nombre = 'Box 04 - Odontopediatria')
    INSERT INTO Consultorio (nombre, ubicacion, tipo, nombre_estado, capacidad, estado)
    VALUES ('Box 04 - Odontopediatria', 'Planta 1 - Ala Este', 'Odontopediatria', 'Disponible', 1, 'disponible');
IF NOT EXISTS (SELECT 1 FROM Consultorio WHERE nombre = 'Box 05 - Rehabilitacion Oral')
    INSERT INTO Consultorio (nombre, ubicacion, tipo, nombre_estado, capacidad, estado)
    VALUES ('Box 05 - Rehabilitacion Oral', 'Planta 2 - Ala Oeste', 'Rehabilitacion Oral', 'Disponible', 1, 'disponible');
GO

-- --- 8.3 Pacientes ficticios -------------------------------------
DECLARE @pacientesNuevos TABLE (
    documento VARCHAR(20), nombres VARCHAR(100), apellidos VARCHAR(100),
    fecha_nacimiento DATE, genero VARCHAR(5), correo VARCHAR(150), ciudad VARCHAR(100)
);
INSERT INTO @pacientesNuevos (documento, nombres, apellidos, fecha_nacimiento, genero, correo, ciudad) VALUES
('10239485', 'Julian', 'Restrepo', '1995-04-12', 'M', 'julian.restrepo@ejemplo.com', 'Bogota'),
('52109432', 'Lucia', 'Torres', '1990-08-25', 'F', 'lucia.torres@ejemplo.com', 'Bogota'),
('88764321', 'Mariana', 'Esparza', '1985-11-30', 'F', 'mariana.esparza@ejemplo.com', 'Medellin'),
('11098452', 'Sebastian', 'Correa', '2002-02-14', 'M', 'sebastian.correa@ejemplo.com', 'Cali'),
('10345678', 'Andrea', 'Gomez', '1998-06-03', 'F', 'andrea.gomez@ejemplo.com', 'Bogota'),
('10456789', 'Camilo', 'Vargas', '1993-09-21', 'M', 'camilo.vargas@ejemplo.com', 'Bucaramanga'),
('10567890', 'Valentina', 'Rios', '2010-01-17', 'F', 'valentina.rios@ejemplo.com', 'Bogota'),
('10678901', 'Santiago', 'Pena', '1988-12-05', 'M', 'santiago.pena@ejemplo.com', 'Cali'),
('10789012', 'Isabella', 'Suarez', '2015-03-09', 'F', 'isabella.suarez@ejemplo.com', 'Medellin'),
('10890123', 'Nicolas', 'Cardenas', '1979-07-22', 'M', 'nicolas.cardenas@ejemplo.com', 'Bogota'),
('10901234', 'Daniela', 'Morales', '2001-10-11', 'F', 'daniela.morales@ejemplo.com', 'Barranquilla'),
('11012345', 'Felipe', 'Ortiz', '1996-05-27', 'M', 'felipe.ortiz@ejemplo.com', 'Bogota'),
('11123456', 'Gabriela', 'Munoz', '1992-02-02', 'F', 'gabriela.munoz@ejemplo.com', 'Cali'),
('11234567', 'Tomas', 'Herrera', '1983-08-14', 'M', 'tomas.herrera@ejemplo.com', 'Medellin'),
('11345678', 'Paula', 'Jimenez', '2005-04-30', 'F', 'paula.jimenez@ejemplo.com', 'Bogota');

DECLARE @pDoc VARCHAR(20), @pNom VARCHAR(100), @pApe VARCHAR(100), @pNac DATE, @pGen VARCHAR(5), @pCor VARCHAR(150), @pCiu VARCHAR(100);
DECLARE cur_pac CURSOR FOR SELECT documento, nombres, apellidos, fecha_nacimiento, genero, correo, ciudad FROM @pacientesNuevos;
OPEN cur_pac;
FETCH NEXT FROM cur_pac INTO @pDoc, @pNom, @pApe, @pNac, @pGen, @pCor, @pCiu;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Paciente WHERE documento = @pDoc)
    BEGIN
        INSERT INTO Paciente (id_usuario, tipo_documento, documento, nombres, apellidos, fecha_nacimiento, genero, correo, telefono, ciudad, fecha_registro, estado)
        VALUES (
            CASE WHEN @pDoc = '10239485' THEN (SELECT id_usuario FROM Usuario WHERE correo = 'pac@smiletrack.co') ELSE NULL END,
            'CC', @pDoc, @pNom, @pApe, @pNac, @pGen, @pCor,
            '300' + CAST(ABS(CHECKSUM(NEWID())) % 9000000 + 1000000 AS VARCHAR(10)),
            @pCiu, CAST(GETDATE() AS DATE), 'activo'
        );
    END
    FETCH NEXT FROM cur_pac INTO @pDoc, @pNom, @pApe, @pNac, @pGen, @pCor, @pCiu;
END
CLOSE cur_pac; DEALLOCATE cur_pac;
GO

-- --- 8.4 Historias clinicas para cada paciente --------------------
INSERT INTO Historia_Clinica (id_paciente, fecha_apertura, observaciones_generales, activa)
SELECT p.id_paciente, p.fecha_registro, 'Paciente sin antecedentes relevantes registrados al momento de apertura.', 1
FROM Paciente p
WHERE NOT EXISTS (SELECT 1 FROM Historia_Clinica h WHERE h.id_paciente = p.id_paciente);
GO

-- --- 8.5 Profesionales ficticios -----------------------------------
DECLARE @profesionalesNuevos TABLE (
    registro VARCHAR(50), nombres VARCHAR(100), apellidos VARCHAR(100),
    categoria VARCHAR(100), especialidad VARCHAR(100)
);
INSERT INTO @profesionalesNuevos (registro, nombres, apellidos, categoria, especialidad) VALUES
('RM-001', 'Ricardo', 'Mendez', 'Odontologo General', 'Odontologia General'),
('RM-002', 'Elena', 'Sotelo', 'Ortodoncista', 'Ortodoncia'),
('RM-003', 'Carlos', 'Ruiz', 'Endodoncista', 'Endodoncia'),
('RM-004', 'Veronica', 'Lozano', 'Periodoncista', 'Periodoncia'),
('RM-005', 'Andres', 'Beltran', 'Cirujano Oral', 'Cirugia Oral'),
('RM-006', 'Monica', 'Salazar', 'Odontopediatra', 'Odontopediatria'),
('RM-007', 'Diego', 'Fajardo', 'Rehabilitador Oral', 'Rehabilitacion Oral y Estetica Dental'),
('RM-008', 'Laura', 'Cifuentes', 'Odontologa General', 'Odontologia General');

DECLARE @prReg VARCHAR(50), @prNom VARCHAR(100), @prApe VARCHAR(100), @prCat VARCHAR(100), @prEsp VARCHAR(100);
DECLARE cur_prof CURSOR FOR SELECT registro, nombres, apellidos, categoria, especialidad FROM @profesionalesNuevos;
OPEN cur_prof;
FETCH NEXT FROM cur_prof INTO @prReg, @prNom, @prApe, @prCat, @prEsp;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Profesional WHERE registro_medico = @prReg)
    BEGIN
        INSERT INTO Profesional (id_usuario, nombres, apellidos, registro_medico, descripcion, categoria, telefono, estado, fecha_ingreso)
        VALUES (
            CASE WHEN @prReg = 'RM-001' THEN (SELECT id_usuario FROM Usuario WHERE correo = 'prof@smiletrack.co') ELSE NULL END,
            @prNom, @prApe, @prReg, 'Especialista en ' + LOWER(@prEsp), @prCat,
            '310' + CAST(ABS(CHECKSUM(NEWID())) % 9000000 + 1000000 AS VARCHAR(10)),
            'activo', CAST(GETDATE() AS DATE)
        );
    END

    IF NOT EXISTS (
        SELECT 1 FROM Profesional_Especialidad pe
        JOIN Profesional p ON p.id_profesional = pe.id_profesional
        JOIN Especialidad e ON e.id_especialidad = pe.id_especialidad
        WHERE p.registro_medico = @prReg AND e.nombre = @prEsp
    )
    BEGIN
        INSERT INTO Profesional_Especialidad (id_profesional, id_especialidad, principal)
        SELECT p.id_profesional, e.id_especialidad, 1
        FROM Profesional p, Especialidad e
        WHERE p.registro_medico = @prReg AND e.nombre = @prEsp;
    END

    FETCH NEXT FROM cur_prof INTO @prReg, @prNom, @prApe, @prCat, @prEsp;
END
CLOSE cur_prof; DEALLOCATE cur_prof;
GO

-- --- 8.6 Citas ficticias (25, mezclando pasado y futuro) -----------
DECLARE @i INT = 1;
DECLARE @totalPacientes INT = (SELECT COUNT(*) FROM Paciente);
DECLARE @totalProfesionales INT = (SELECT COUNT(*) FROM Profesional);
DECLARE @totalServicios INT = (SELECT COUNT(*) FROM Servicio);
DECLARE @citasExistentes INT = (SELECT COUNT(*) FROM Cita);

IF @citasExistentes < 20 AND @totalPacientes > 0 AND @totalProfesionales > 0
BEGIN
    WHILE @i <= 25
    BEGIN
        DECLARE @idPaciente INT = (SELECT id_paciente FROM (SELECT id_paciente, ROW_NUMBER() OVER (ORDER BY id_paciente) rn FROM Paciente) t WHERE rn = ((@i - 1) % @totalPacientes) + 1);
        DECLARE @idProfesional INT = (SELECT id_profesional FROM (SELECT id_profesional, ROW_NUMBER() OVER (ORDER BY id_profesional) rn FROM Profesional) t WHERE rn = ((@i * 3 - 1) % @totalProfesionales) + 1);
        DECLARE @idServicio INT = CASE WHEN @totalServicios > 0 THEN (SELECT id_servicio FROM (SELECT id_servicio, ROW_NUMBER() OVER (ORDER BY id_servicio) rn FROM Servicio) t WHERE rn = ((@i * 5 - 1) % @totalServicios) + 1) ELSE NULL END;
        DECLARE @estadoTxt VARCHAR(30) = (SELECT valor FROM (VALUES ('Agendada'), ('Confirmada'), ('Atendida'), ('Cancelada'), ('No asistio')) v(valor)
                                           ORDER BY (ABS(CHECKSUM(NEWID()))) OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY);
        DECLARE @offsetDias INT = CASE WHEN @i % 2 = 0 THEN -(ABS(CHECKSUM(NEWID())) % 60 + 1) ELSE (ABS(CHECKSUM(NEWID())) % 45 + 1) END;
        DECLARE @fechaHora DATETIME = DATEADD(MINUTE, (ABS(CHECKSUM(NEWID())) % 4) * 30, DATEADD(HOUR, 8 + (ABS(CHECKSUM(NEWID())) % 9), DATEADD(DAY, @offsetDias, CAST(CAST(GETDATE() AS DATE) AS DATETIME))));

        IF @idPaciente IS NOT NULL AND @idProfesional IS NOT NULL
        BEGIN
            INSERT INTO Cita (id_paciente, id_profesional, id_servicio, fecha_hora, estado, notas)
            VALUES (@idPaciente, @idProfesional, @idServicio, @fechaHora,
                    CASE WHEN @offsetDias < 0 AND @estadoTxt = 'Agendada' THEN 'Atendida' ELSE @estadoTxt END,
                    'Registro ficticio generado para pruebas.');
        END

        SET @i = @i + 1;
    END
END
GO

PRINT 'Bloque 8 (datos ficticios adicionales) ejecutado correctamente.';
GO