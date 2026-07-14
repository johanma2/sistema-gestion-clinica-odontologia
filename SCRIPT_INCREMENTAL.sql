-- ============================================================
-- SCRIPT_INCREMENTAL.sql
-- SmileTrack v3.0 - Script incremental (crea solo objetos faltantes)
-- NOTA: Este script evita DROP/CREATE DATABASE y no elimina datos.
-- Ejecute en un entorno de staging y haga backup antes de aplicar.
-- ============================================================

USE [master];
-- No hacemos DROP/CREATE DATABASE en el incremental. Asegúrate de cambiar a la BD objetivo.
GO

-- Cambia de contexto a tu base de datos si es necesario:
USE SmileTrackDB;
GO

-- ------------------------------------------------------------
-- MÓDULO 1: ACCESO Y SEGURIDAD (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Rol') AND type in (N'U'))
BEGIN
    CREATE TABLE Rol (
        id_rol        INT PRIMARY KEY IDENTITY(1,1),
        nombre_rol    VARCHAR(50)  NOT NULL UNIQUE,
        descripcion   VARCHAR(200) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Menu') AND type in (N'U'))
BEGIN
    CREATE TABLE Menu (
        id_menu          INT PRIMARY KEY IDENTITY(1,1),
        nombre           VARCHAR(100) NOT NULL,
        url              VARCHAR(200) NOT NULL,
        icono            VARCHAR(100) NULL,
        orden            INT NOT NULL DEFAULT 0,
        id_menu_padre    INT NULL,
        modulo           VARCHAR(50) NULL,
        activo           BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Menu_Padre FOREIGN KEY (id_menu_padre) REFERENCES Menu(id_menu) ON DELETE NO ACTION
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Rol_Menu_Permiso') AND type in (N'U'))
BEGIN
    CREATE TABLE Rol_Menu_Permiso (
        id_rol          INT NOT NULL,
        id_menu         INT NOT NULL,
        puede_ver       BIT NOT NULL DEFAULT 0,
        puede_crear     BIT NOT NULL DEFAULT 0,
        puede_editar    BIT NOT NULL DEFAULT 0,
        puede_eliminar  BIT NOT NULL DEFAULT 0,
        puede_exportar  BIT NOT NULL DEFAULT 0,
        PRIMARY KEY (id_rol, id_menu),
        CONSTRAINT FK_RMP_Rol FOREIGN KEY (id_rol) REFERENCES Rol(id_rol),
        CONSTRAINT FK_RMP_Menu FOREIGN KEY (id_menu) REFERENCES Menu(id_menu)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Usuario') AND type in (N'U'))
BEGIN
    CREATE TABLE Usuario (
        id_usuario       INT PRIMARY KEY IDENTITY(1,1),
        creado_por       INT NULL,
        nombre           VARCHAR(100)  NOT NULL,
        apellidos        VARCHAR(100)  NOT NULL,
        correo           VARCHAR(150)  NOT NULL UNIQUE,
        contrasena       VARCHAR(255)  NOT NULL,
        id_rol           INT           NOT NULL,
        estado           VARCHAR(10)   NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
        fecha_nacimiento DATE          NULL,
        fecha_creacion   DATETIME      NOT NULL DEFAULT GETDATE(),
        ultimo_login     DATETIME      NULL,
        CONSTRAINT FK_Usuario_Rol FOREIGN KEY (id_rol) REFERENCES Rol(id_rol),
        CONSTRAINT FK_Usuario_Creador FOREIGN KEY (creado_por) REFERENCES Usuario(id_usuario) ON DELETE NO ACTION
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Auditoria') AND type in (N'U'))
BEGIN
    CREATE TABLE Auditoria (
        id_auditoria     INT PRIMARY KEY IDENTITY(1,1),
        id_usuario       INT NULL,
        tabla_afectada   VARCHAR(100)  NOT NULL,
        id_registro      INT NULL,
        accion           VARCHAR(45)   NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
        ip_origen        VARCHAR(45)   NULL,
        datos_anteriores VARCHAR(MAX)  NULL,
        datos_nuevos     VARCHAR(MAX)  NULL,
        descripcion      VARCHAR(255)  NULL,
        fecha            DATETIME      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Auditoria_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 2: PACIENTES (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Paciente') AND type in (N'U'))
BEGIN
    CREATE TABLE Paciente (
        id_paciente          INT PRIMARY KEY IDENTITY(1,1),
        id_usuario           INT NULL,
        tipo_documento       VARCHAR(5)    NOT NULL CHECK (tipo_documento IN ('CC','TI','CE','PAS','NIT')),
        documento            VARCHAR(20)   NOT NULL UNIQUE,
        nombres              VARCHAR(100)  NOT NULL,
        apellidos            VARCHAR(100)  NOT NULL,
        fecha_nacimiento     DATE          NOT NULL,
        genero               VARCHAR(5)    NULL CHECK (genero IN ('M','F','O')),
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
        estado               VARCHAR(10)   NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','retirado')),
        archivo_adjunto      VARCHAR(255)  NULL,
        CONSTRAINT FK_Paciente_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 3: PROFESIONALES (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Especialidad') AND type in (N'U'))
BEGIN
    CREATE TABLE Especialidad (
        id_especialidad INT PRIMARY KEY IDENTITY(1,1),
        nombre          VARCHAR(100) NOT NULL,
        descripcion     VARCHAR(255) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Profesional') AND type in (N'U'))
BEGIN
    CREATE TABLE Profesional (
        id_profesional  INT PRIMARY KEY IDENTITY(1,1),
        id_usuario      INT NOT NULL UNIQUE,
        nombres         VARCHAR(100) NOT NULL,
        apellidos       VARCHAR(100) NOT NULL,
        registro_medico VARCHAR(50)  NOT NULL UNIQUE,
        descripcion     VARCHAR(255) NULL,
        categoria       VARCHAR(100) NULL,
        telefono        VARCHAR(20)  NULL,
        estado          VARCHAR(15)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','vacaciones')),
        fecha_ingreso   DATE NULL,
        CONSTRAINT FK_Profesional_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Profesional_Especialidad') AND type in (N'U'))
BEGIN
    CREATE TABLE Profesional_Especialidad (
        id_profesional  INT NOT NULL,
        id_especialidad INT NOT NULL,
        principal       BIT NOT NULL DEFAULT 0,
        PRIMARY KEY (id_profesional, id_especialidad),
        CONSTRAINT FK_PE_Profesional  FOREIGN KEY (id_profesional)  REFERENCES Profesional(id_profesional),
        CONSTRAINT FK_PE_Especialidad FOREIGN KEY (id_especialidad) REFERENCES Especialidad(id_especialidad)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Horario_Profesional') AND type in (N'U'))
BEGIN
    CREATE TABLE Horario_Profesional (
        id_horario     INT PRIMARY KEY IDENTITY(1,1),
        id_profesional INT NOT NULL,
        dia_semana     VARCHAR(12) NOT NULL CHECK (dia_semana IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo')),
        hora_inicio    TIME NOT NULL,
        hora_fin       TIME NOT NULL,
        activo         BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_HP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Bloqueo_Profesional') AND type in (N'U'))
BEGIN
    CREATE TABLE Bloqueo_Profesional (
        id_bloqueo     INT PRIMARY KEY IDENTITY(1,1),
        id_profesional INT NOT NULL,
        fecha_inicio   DATETIME NOT NULL,
        fecha_fin      DATETIME NOT NULL,
        motivo         VARCHAR(150) NULL,
        aprobado_por   INT NULL,
        CONSTRAINT FK_BP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Ausencia_Profesional') AND type in (N'U'))
BEGIN
    CREATE TABLE Ausencia_Profesional (
        id_ausencia    INT PRIMARY KEY IDENTITY(1,1),
        id_profesional INT NOT NULL,
        tipo           VARCHAR(15) NOT NULL CHECK (tipo IN ('vacaciones','incapacidad','permiso','otro')),
        fecha_inicio   DATE NOT NULL,
        fecha_fin      DATE NOT NULL,
        duracion       INT NULL,
        observaciones  VARCHAR(MAX) NULL,
        aprobado_por   INT NULL,
        CONSTRAINT FK_AP_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 4: SERVICIOS Y CONSULTORIOS (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Servicio') AND type in (N'U'))
BEGIN
    CREATE TABLE Servicio (
        id_servicio INT PRIMARY KEY IDENTITY(1,1),
        nombre      VARCHAR(100)  NOT NULL,
        descripcion VARCHAR(255)  NULL,
        categoria   VARCHAR(100)  NULL,
        costo       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        duracion    VARCHAR(50)   NULL,
        telefono    VARCHAR(20)   NULL,
        activo      BIT NOT NULL DEFAULT 1
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Profesional_Servicio') AND type in (N'U'))
BEGIN
    CREATE TABLE Profesional_Servicio (
        id_profesional INT NOT NULL,
        id_servicio    INT NOT NULL,
        PRIMARY KEY (id_profesional, id_servicio),
        CONSTRAINT FK_PS_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional),
        CONSTRAINT FK_PS_Servicio    FOREIGN KEY (id_servicio)    REFERENCES Servicio(id_servicio)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Consultorio') AND type in (N'U'))
BEGIN
    CREATE TABLE Consultorio (
        id_consultorio INT PRIMARY KEY IDENTITY(1,1),
        nombre         VARCHAR(100) NOT NULL,
        ubicacion      VARCHAR(150) NULL,
        tipo           VARCHAR(50)  NULL,
        nombre_estado  VARCHAR(50)  NULL,
        capacidad      INT NULL,
        estado         VARCHAR(15) NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','ocupado','mantenimiento'))
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 5: CITAS (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Estado_Cita') AND type in (N'U'))
BEGIN
    CREATE TABLE Estado_Cita (
        id_estado     INT PRIMARY KEY IDENTITY(1,1),
        nombre_estado VARCHAR(50) NOT NULL UNIQUE,
        descripcion   VARCHAR(150) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Cita') AND type in (N'U'))
BEGIN
    CREATE TABLE Cita (
        id_cita          INT PRIMARY KEY IDENTITY(1,1),
        fecha            DATE NOT NULL,
        hora_inicio      TIME NOT NULL,
        hora_fin         TIME NOT NULL,
        motivo_consulta  VARCHAR(MAX) NULL,
        notas_previas    VARCHAR(MAX) NULL,
        tipo_cita        VARCHAR(20) NULL CHECK (tipo_cita IN ('consulta','control','urgencia','procedimiento')),
        id_paciente      INT NOT NULL,
        id_profesional   INT NOT NULL,
        id_consultorio   INT NOT NULL,
        id_estado        INT NOT NULL,
        fecha_creacion   DATETIME NOT NULL DEFAULT GETDATE(),
        creado_por       INT NOT NULL,
        archivo_adjunto  VARCHAR(255) NULL,
        CONSTRAINT FK_Cita_Paciente    FOREIGN KEY (id_paciente)    REFERENCES Paciente(id_paciente),
        CONSTRAINT FK_Cita_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional),
        CONSTRAINT FK_Cita_Consultorio FOREIGN KEY (id_consultorio) REFERENCES Consultorio(id_consultorio),
        CONSTRAINT FK_Cita_Estado      FOREIGN KEY (id_estado)      REFERENCES Estado_Cita(id_estado),
        CONSTRAINT FK_Cita_CreadoPor   FOREIGN KEY (creado_por)     REFERENCES Usuario(id_usuario)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Cancelacion_Cita') AND type in (N'U'))
BEGIN
    CREATE TABLE Cancelacion_Cita (
        id_cancelacion    INT PRIMARY KEY IDENTITY(1,1),
        id_cita           INT NOT NULL,
        motivo            VARCHAR(MAX) NULL,
        cancelado_por     INT NOT NULL,
        ip_origen         VARCHAR(45)  NULL,
        fecha_cancelacion DATETIME NOT NULL DEFAULT GETDATE(),
        horas_anticipacion INT NULL,
        CONSTRAINT FK_CC_Cita         FOREIGN KEY (id_cita)       REFERENCES Cita(id_cita),
        CONSTRAINT FK_CC_CanceladoPor FOREIGN KEY (cancelado_por) REFERENCES Usuario(id_usuario)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Detalle_Cita') AND type in (N'U'))
BEGIN
    CREATE TABLE Detalle_Cita (
        id_detalle_cita INT PRIMARY KEY IDENTITY(1,1),
        id_cita         INT NOT NULL,
        id_servicio     INT NOT NULL,
        precio_aplicado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        observaciones   VARCHAR(MAX) NULL,
        estado          VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','realizado','cancelado')),
        CONSTRAINT FK_DC_Cita     FOREIGN KEY (id_cita)    REFERENCES Cita(id_cita),
        CONSTRAINT FK_DC_Servicio FOREIGN KEY (id_servicio) REFERENCES Servicio(id_servicio)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 6: HISTORIA CLÍNICA Y ODONTOGRAMA (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Historia_Clinica') AND type in (N'U'))
BEGIN
    CREATE TABLE Historia_Clinica (
        id_historia             INT PRIMARY KEY IDENTITY(1,1),
        id_paciente             INT NOT NULL UNIQUE,
        fecha_apertura          DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        observaciones_generales VARCHAR(MAX) NULL,
        activa                  BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_HC_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Detalle_Historia_Clinica') AND type in (N'U'))
BEGIN
    CREATE TABLE Detalle_Historia_Clinica (
        id_detalle_historia   INT PRIMARY KEY IDENTITY(1,1),
        id_historia           INT NOT NULL,
        id_cita               INT NULL,
        id_profesional        INT NOT NULL,
        fecha                 DATE NOT NULL,
        diagnostico           VARCHAR(MAX) NULL,
        procedimiento         VARCHAR(255) NULL,
        tratamiento           VARCHAR(MAX) NULL,
        observaciones         VARCHAR(MAX) NULL,
        proxima_cita_sugerida DATE NULL,
        CONSTRAINT FK_DHC_Historia    FOREIGN KEY (id_historia)   REFERENCES Historia_Clinica(id_historia),
        CONSTRAINT FK_DHC_Cita        FOREIGN KEY (id_cita)       REFERENCES Cita(id_cita),
        CONSTRAINT FK_DHC_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Diente_Catalogo') AND type in (N'U'))
BEGIN
    CREATE TABLE Diente_Catalogo (
        id_diente      INT PRIMARY KEY IDENTITY(1,1),
        numero_fdi     INT NOT NULL UNIQUE,
        nombre         VARCHAR(100) NULL,
        cuadrante      INT NULL CHECK (cuadrante IN (1,2,3,4)),
        tipo_denticion VARCHAR(10) NULL CHECK (tipo_denticion IN ('adulto','infantil')),
        tipo_diente    VARCHAR(15) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Odontograma') AND type in (N'U'))
BEGIN
    CREATE TABLE Odontograma (
        id_odontograma INT PRIMARY KEY IDENTITY(1,1),
        id_historia    INT NOT NULL,
        id_detalle     INT NULL,
        tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('adulto','infantil')),
        fecha_registro DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        observaciones  VARCHAR(MAX) NULL,
        CONSTRAINT FK_Odonto_Historia FOREIGN KEY (id_historia) REFERENCES Historia_Clinica(id_historia),
        CONSTRAINT FK_Odonto_Detalle  FOREIGN KEY (id_detalle)  REFERENCES Detalle_Historia_Clinica(id_detalle_historia)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Odontograma_Diente') AND type in (N'U'))
BEGIN
    CREATE TABLE Odontograma_Diente (
        id_od_diente   INT PRIMARY KEY IDENTITY(1,1),
        id_odontograma INT NOT NULL,
        id_diente      INT NOT NULL,
        id_profesional INT NOT NULL,
        estado         VARCHAR(20) NOT NULL CHECK (estado IN ('sano','caries','obturacion','corona','extraccion','endodoncia','restauracion','implante','otro')),
        cara_afectada  VARCHAR(60) NULL,
        observaciones  VARCHAR(MAX) NULL,
        fecha_registro DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        CONSTRAINT FK_OD_Odontograma FOREIGN KEY (id_odontograma) REFERENCES Odontograma(id_odontograma),
        CONSTRAINT FK_OD_Diente      FOREIGN KEY (id_diente)      REFERENCES Diente_Catalogo(id_diente),
        CONSTRAINT FK_OD_Profesional FOREIGN KEY (id_profesional) REFERENCES Profesional(id_profesional)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 7: FACTURACIÓN Y PAGOS (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Factura') AND type in (N'U'))
BEGIN
    CREATE TABLE Factura (
        id_factura     INT PRIMARY KEY IDENTITY(1,1),
        numero_factura VARCHAR(20)   NOT NULL UNIQUE,
        fecha_factura  DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        fecha_apertura DATE NULL,
        subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        descuento      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        impuestos      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        estado         VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','parcial','pagada','anulada')),
        id_paciente    INT NOT NULL,
        notas          VARCHAR(MAX) NULL,
        generada_por   INT NOT NULL,
        archivo_adjunto VARCHAR(255) NULL,
        CONSTRAINT FK_Factura_Paciente    FOREIGN KEY (id_paciente)  REFERENCES Paciente(id_paciente),
        CONSTRAINT FK_Factura_GeneradaPor FOREIGN KEY (generada_por) REFERENCES Usuario(id_usuario)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Detalle_Factura') AND type in (N'U'))
BEGIN
    CREATE TABLE Detalle_Factura (
        id_detalle_factura INT PRIMARY KEY IDENTITY(1,1),
        id_factura         INT NOT NULL,
        id_detalle_cita    INT NULL,
        descripcion        VARCHAR(255) NULL,
        precio_unitario    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        cantidad           INT NOT NULL DEFAULT 1,
        descuento_linea    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        subtotal           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        CONSTRAINT FK_DF_Factura     FOREIGN KEY (id_factura)      REFERENCES Factura(id_factura),
        CONSTRAINT FK_DF_DetalleCita FOREIGN KEY (id_detalle_cita) REFERENCES Detalle_Cita(id_detalle_cita)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Pago') AND type in (N'U'))
BEGIN
    CREATE TABLE Pago (
        id_pago        INT PRIMARY KEY IDENTITY(1,1),
        id_factura     INT NOT NULL,
        fecha_pago     DATETIME NOT NULL DEFAULT GETDATE(),
        monto          DECIMAL(12,2) NOT NULL,
        metodo_pago    VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo','tarjeta','transferencia','otro')),
        referencia     VARCHAR(100) NULL,
        registrado_por INT NOT NULL,
        notas          VARCHAR(MAX) NULL,
        CONSTRAINT FK_Pago_Factura       FOREIGN KEY (id_factura)     REFERENCES Factura(id_factura),
        CONSTRAINT FK_Pago_RegistradoPor FOREIGN KEY (registrado_por) REFERENCES Usuario(id_usuario)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Notificacion') AND type in (N'U'))
BEGIN
    CREATE TABLE Notificacion (
        id_notificacion  INT PRIMARY KEY IDENTITY(1,1),
        id_usuario       INT NOT NULL,
        id_cita          INT NULL,
        tipo             VARCHAR(15) NOT NULL CHECK (tipo IN ('confirmacion','recordatorio','cancelacion','mensaje')),
        canal            VARCHAR(10) NOT NULL CHECK (canal IN ('correo','sms','sistema')),
        asunto           VARCHAR(200) NULL,
        mensaje          VARCHAR(MAX) NULL,
        estado           VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviada','fallida','leida')),
        fecha_programada DATETIME NULL,
        fecha_envio      DATETIME NULL,
        plantilla_codigo VARCHAR(50) NULL,
        datos_plantilla  VARCHAR(MAX) NULL,
        CONSTRAINT FK_Notif_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
        CONSTRAINT FK_Notif_Cita    FOREIGN KEY (id_cita)    REFERENCES Cita(id_cita)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 8: PQR (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.PQR') AND type in (N'U'))
BEGIN
    CREATE TABLE PQR (
        id_pqr              INT PRIMARY KEY IDENTITY(1,1),
        id_paciente         INT NOT NULL,
        id_usuario          INT NULL,
        tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('peticion','queja','reclamo','sugerencia')),
        asunto              VARCHAR(200) NOT NULL,
        descripcion         VARCHAR(MAX) NOT NULL,
        estado              VARCHAR(20) NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida','en_proceso','resuelta','cerrada','rechazada')),
        prioridad           VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta','urgente')),
        fecha_creacion      DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_respuesta     DATETIME NULL,
        respuesta           VARCHAR(MAX) NULL,
        atendida_por        INT NULL,
        evidencia_adjunto   VARCHAR(255) NULL,
        CONSTRAINT FK_PQR_Paciente FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente),
        CONSTRAINT FK_PQR_Usuario  FOREIGN KEY (id_usuario)   REFERENCES Usuario(id_usuario),
        CONSTRAINT FK_PQR_Atendida FOREIGN KEY (atendida_por) REFERENCES Usuario(id_usuario)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 9: REPORTES (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Reporte_Config') AND type in (N'U'))
BEGIN
    CREATE TABLE Reporte_Config (
        id_reporte        INT PRIMARY KEY IDENTITY(1,1),
        nombre_reporte    VARCHAR(100) NOT NULL,
        descripcion       VARCHAR(255) NULL,
        modulo_origen     VARCHAR(50) NOT NULL,
        tipo_salida       VARCHAR(20) NOT NULL DEFAULT 'tabla' CHECK (tipo_salida IN ('tabla','grafico','pdf','excel','csv')),
        parametros_config VARCHAR(MAX) NULL,
        activo            BIT NOT NULL DEFAULT 1,
        creado_por        INT NOT NULL,
        fecha_creacion    DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_RC_CreadoPor FOREIGN KEY (creado_por) REFERENCES Usuario(id_usuario)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Reporte_Ejecucion') AND type in (N'U'))
BEGIN
    CREATE TABLE Reporte_Ejecucion (
        id_ejecucion        INT PRIMARY KEY IDENTITY(1,1),
        id_reporte          INT NOT NULL,
        id_usuario          INT NOT NULL,
        fecha_ejecucion     DATETIME NOT NULL DEFAULT GETDATE(),
        parametros_aplicados VARCHAR(MAX) NULL,
        registros_afectados INT NULL,
        archivo_generado    VARCHAR(255) NULL,
        duracion_ms         INT NULL,
        CONSTRAINT FK_RE_Reporte FOREIGN KEY (id_reporte) REFERENCES Reporte_Config(id_reporte),
        CONSTRAINT FK_RE_Usuario FOREIGN KEY (id_usuario)  REFERENCES Usuario(id_usuario)
    );
END
GO

-- ------------------------------------------------------------
-- MÓDULO 10: AYUDA (Tablas)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Ayuda_Articulo') AND type in (N'U'))
BEGIN
    CREATE TABLE Ayuda_Articulo (
        id_articulo         INT PRIMARY KEY IDENTITY(1,1),
        titulo              VARCHAR(200) NOT NULL,
        categoria           VARCHAR(50) NOT NULL CHECK (categoria IN ('general','citas','pacientes','facturacion','perfil','sistema')),
        rol_destinatario    VARCHAR(20) NULL,
        contenido           VARCHAR(MAX) NOT NULL,
        orden               INT NOT NULL DEFAULT 0,
        activo              BIT NOT NULL DEFAULT 1,
        fecha_actualizacion DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Ayuda_PreguntaFrecuente') AND type in (N'U'))
BEGIN
    CREATE TABLE Ayuda_PreguntaFrecuente (
        id_pregunta INT PRIMARY KEY IDENTITY(1,1),
        pregunta    VARCHAR(255) NOT NULL,
        respuesta   VARCHAR(MAX) NOT NULL,
        categoria   VARCHAR(50) NOT NULL,
        orden       INT NOT NULL DEFAULT 0,
        activo      BIT NOT NULL DEFAULT 1
    );
END
GO

-- ------------------------------------------------------------
-- DATOS DE PRUEBA: insertar filas solo si no existen
-- ------------------------------------------------------------
-- ROLES
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Administrador')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES('Administrador','Acceso total');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Profesional')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES('Profesional','Gestión clínica');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Auxiliar')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES('Auxiliar','Apoyo clínico');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Recepcionista')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES('Recepcionista','Citas y facturación');
IF NOT EXISTS (SELECT 1 FROM Rol WHERE nombre_rol='Paciente')
    INSERT INTO Rol (nombre_rol, descripcion) VALUES('Paciente','Consulta propia');
GO

-- MENÚ (inserta registros si no existen por nombre+url)
IF NOT EXISTS (SELECT 1 FROM Menu WHERE url='/Publico/homepage.html')
    INSERT INTO Menu (nombre,url,icono,orden,modulo) VALUES('Inicio','/Publico/homepage.html','🏠',1,'publico');
-- Puedes añadir más entradas según sea necesario; revisar claves únicas antes de insertar masivas.
GO

-- Especialidades de ejemplo
IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Odontologia General')
    INSERT INTO Especialidad (nombre, descripcion) VALUES('Odontologia General','Atención primaria');
IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Endodoncia')
    INSERT INTO Especialidad (nombre, descripcion) VALUES('Endodoncia','Conductos');
IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Ortodoncia')
    INSERT INTO Especialidad (nombre, descripcion) VALUES('Ortodoncia','Corrección dental');
IF NOT EXISTS (SELECT 1 FROM Especialidad WHERE nombre='Periodoncia')
    INSERT INTO Especialidad (nombre, descripcion) VALUES('Periodoncia','Encías');
GO

-- NOTA: Para conjuntos de datos grandes (usuarios, pacientes, facturas) prefiero que me confirmes si deseas insertar todo el bloque de seed con comprobaciones por PK/unique.

-- ------------------------------------------------------------
-- TRIGGERS y STORED PROCEDURES
-- (El script original ya usaba CREATE OR ALTER para triggers y procs; los dejamos tal cual para idempotencia)
-- ------------------------------------------------------------

-- Usuario triggers
CREATE OR ALTER TRIGGER trg_Usuario_Insert ON Usuario AFTER INSERT AS
BEGIN SET NOCOUNT ON;
    INSERT INTO Auditoria (id_usuario, tabla_afectada, accion, id_registro, descripcion)
    SELECT i.id_usuario,'Usuario','INSERT',i.id_usuario,'Nuevo usuario: '+i.nombre FROM inserted i;
END
GO

CREATE OR ALTER TRIGGER trg_Usuario_Update ON Usuario AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    INSERT INTO Auditoria (id_usuario, tabla_afectada, accion, id_registro, datos_anteriores, datos_nuevos)
    SELECT i.id_usuario,'Usuario','UPDATE',i.id_usuario,'{"estado":"'+d.estado+'"}','{"estado":"'+i.estado+'"}'
    FROM inserted i JOIN deleted d ON d.id_usuario=i.id_usuario WHERE i.estado!=d.estado;
END
GO

CREATE OR ALTER TRIGGER trg_Usuario_Delete ON Usuario INSTEAD OF DELETE AS
BEGIN SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM Profesional p JOIN deleted d ON d.id_usuario=p.id_usuario WHERE p.estado='activo')
    BEGIN
        RAISERROR('Usuario tiene profesional activo.',16,1);
        RETURN;
    END
    DELETE FROM Usuario WHERE id_usuario IN (SELECT id_usuario FROM deleted);
END
GO

-- (Se mantienen el resto de triggers y stored procedures con CREATE OR ALTER tal y como están en el script original.)

-- FIN SCRIPT_INCREMENTAL.sql
