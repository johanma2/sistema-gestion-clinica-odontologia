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

    -- Insertar 2-3 consultorios de prueba si no existen (por nombre)
    IF NOT EXISTS (SELECT 1 FROM dbo.Consultorio WHERE nombre = 'Consultorio 1')
    BEGIN
        INSERT INTO dbo.Consultorio (nombre, ubicacion, tipo, nombre_estado, capacidad) VALUES
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
