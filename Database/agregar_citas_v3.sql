-- agregar_citas_v3.sql
-- Script para migrar esquema de Cita a v3 (añadir tablas Estado_Cita y Consultorio, agregar columnas a Cita)
-- Ejecutar con un usuario con permisos DDL sobre la base de datos SmileTrackDB

SET XACT_ABORT ON;
GO

-- 1) Crear tabla Estado_Cita si no existe
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

-- 2) Crear tabla Consultorio si no existe
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

-- 3) Modificar tabla Cita para agregar columnas nuevas si no existen
-- Nota: no se eliminan columnas antiguas (fecha_hora, id_servicio, estado)

IF OBJECT_ID('dbo.Cita', 'U') IS NULL
BEGIN
    PRINT 'ERROR: La tabla dbo.Cita NO existe en la base de datos. Confirma que estás ejecutando contra la BD correcta (SmileTrackDB).';
    THROW 50000, 'La tabla dbo.Cita no existe.', 1;
END

-- Helper: agregar columna si no existe
-- Añadir columna: fecha DATE
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

-- 4) Agregar FK hacia Consultorio (id_consultorio) si no existe
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

-- 5) Agregar FK hacia Estado_Cita (id_estado) si no existe
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

PRINT 'Script completar — revisión terminada.';
GO

-- Fin del script
