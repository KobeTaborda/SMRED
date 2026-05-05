-- ============================================
--  NETWORK MONITOR - Script SQL para SQL Server
--  Ejecutar en SQL Server Management Studio
-- ============================================

-- 1. Crear la base de datos
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SMRED')
BEGIN
    CREATE DATABASE SMRED;
END
GO

USE SMRED;
GO

-- 2. Tabla de hosts
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='hosts' AND xtype='U')
CREATE TABLE hosts (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(100) NOT NULL,
    ip_address      NVARCHAR(255) NOT NULL UNIQUE,
    description     NVARCHAR(500),
    location        NVARCHAR(50),
    type            NVARCHAR(50),
    status          NVARCHAR(20) DEFAULT 'UNKNOWN',
    is_active       BIT DEFAULT 1,
    last_seen       DATETIME2,
    last_latency    FLOAT,
    monitored_ports NVARCHAR(500),
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE()
);
GO

-- 3. Tabla de registros de ping
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ping_records' AND xtype='U')
CREATE TABLE ping_records (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    host_id     BIGINT NOT NULL,
    latency_ms  FLOAT,
    reachable   BIT NOT NULL,
    packet_loss INT,
    ttl         INT,
    recorded_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_ping_host FOREIGN KEY (host_id)
        REFERENCES hosts(id) ON DELETE CASCADE
);
GO

-- 4. Tabla de resultados de escaneo de puertos
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='port_scan_results' AND xtype='U')
CREATE TABLE port_scan_results (
    id               BIGINT IDENTITY(1,1) PRIMARY KEY,
    host_id          BIGINT NOT NULL,
    port_number      INT NOT NULL,
    protocol         NVARCHAR(10) DEFAULT 'TCP',
    status           NVARCHAR(20) NOT NULL,
    service_name     NVARCHAR(100),
    response_time_ms FLOAT,
    banner           NVARCHAR(500),
    is_new_open      BIT DEFAULT 0,
    scanned_at       DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_scan_host FOREIGN KEY (host_id)
        REFERENCES hosts(id) ON DELETE CASCADE
);
GO

-- 5. Tabla de alertas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='alerts' AND xtype='U')
CREATE TABLE alerts (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    host_id     BIGINT,
    alert_type  NVARCHAR(50) NOT NULL,
    severity    NVARCHAR(20) NOT NULL,
    title       NVARCHAR(255) NOT NULL,
    message     NVARCHAR(1000) NOT NULL,
    status      NVARCHAR(20) DEFAULT 'ACTIVE',
    email_sent  BIT DEFAULT 0,
    resolved_at DATETIME2,
    created_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_alert_host FOREIGN KEY (host_id)
        REFERENCES hosts(id) ON DELETE SET NULL
);
GO

-- 6. Tabla de ancho de banda
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='bandwidth_records' AND xtype='U')
CREATE TABLE bandwidth_records (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    interface_name  NVARCHAR(100) NOT NULL,
    bytes_received  BIGINT,
    bytes_sent      BIGINT,
    rx_rate_kbps    FLOAT,
    tx_rate_kbps    FLOAT,
    rx_packets      BIGINT,
    tx_packets      BIGINT,
    rx_errors       BIGINT,
    tx_errors       BIGINT,
    recorded_at     DATETIME2 DEFAULT GETDATE()
);
GO

-- 7. Indices (con verificacion para evitar error si ya existen)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_ping_host_time' AND object_id = OBJECT_ID('ping_records'))
    CREATE INDEX idx_ping_host_time ON ping_records (host_id, recorded_at);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_ping_recorded' AND object_id = OBJECT_ID('ping_records'))
    CREATE INDEX idx_ping_recorded ON ping_records (recorded_at);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_scan_host' AND object_id = OBJECT_ID('port_scan_results'))
    CREATE INDEX idx_scan_host ON port_scan_results (host_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_scan_time' AND object_id = OBJECT_ID('port_scan_results'))
    CREATE INDEX idx_scan_time ON port_scan_results (scanned_at);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_alert_host' AND object_id = OBJECT_ID('alerts'))
    CREATE INDEX idx_alert_host ON alerts (host_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_alert_status' AND object_id = OBJECT_ID('alerts'))
    CREATE INDEX idx_alert_status ON alerts (status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_alert_created' AND object_id = OBJECT_ID('alerts'))
    CREATE INDEX idx_alert_created ON alerts (created_at);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_bw_interface' AND object_id = OBJECT_ID('bandwidth_records'))
    CREATE INDEX idx_bw_interface ON bandwidth_records (interface_name);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_bw_recorded' AND object_id = OBJECT_ID('bandwidth_records'))
    CREATE INDEX idx_bw_recorded ON bandwidth_records (recorded_at);
GO

PRINT 'Base de datos SMRED creada correctamente.';
GO
