DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cdn') THEN
        CREATE DATABASE "cdn";
    END IF;
END $$;

\c "cdn"

DO $$
DECLARE
    user_password text;
BEGIN
    user_password := current_setting('db_password', true);

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cdn') THEN
        EXECUTE format('CREATE USER "cdn" WITH ENCRYPTED PASSWORD %L', user_password);
        EXECUTE 'GRANT ALL PRIVILEGES ON DATABASE "cdn" TO "cdn"';
    END IF;
END $$;

-- Files
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    data BYTEA NOT NULL,
    type TEXT NOT NULL,
    path TEXT UNIQUE NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shares
CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT,
    content TEXT NOT NULL,
    git TEXT,
    locked BOOLEAN DEFAULT FALSE,
    owner TEXT,
    editors TEXT[],
    parent TEXT,
    alias TEXT,
    type TEXT NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'folder')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_group_members (
    group_id TEXT NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
    share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
    role TEXT,
    PRIMARY KEY (group_id, share_id)
);

-- Links
CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    visits INT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- VMs
CREATE TABLE IF NOT EXISTS vms (
    project_id TEXT PRIMARY KEY,
    vm_id TEXT NOT NULL,
    last_log TEXT[],
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocklist to prevent DDoS
CREATE TABLE IF NOT EXISTS blocklist (
    id SERIAL PRIMARY KEY,
    metric TEXT NOT NULL CHECK (metric IN ('ip', 'user_agent')),
    value TEXT NOT NULL,
    is_vpn BOOLEAN DEFAULT FALSE,
    is_proxy BOOLEAN DEFAULT FALSE,
    is_tor BOOLEAN DEFAULT FALSE,
    is_relay BOOLEAN DEFAULT FALSE,
    ip_owner TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    requests JSONB DEFAULT '[]'::jsonb,
    owner TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_metric_value UNIQUE(metric, value)
);

-- Todays request logs
CREATE TABLE IF NOT EXISTS request_logs (
    id SERIAL PRIMARY KEY,
    domain TEXT NOT NULL,
    ip INET NOT NULL,
    user_agent TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '/',
    method TEXT NOT NULL DEFAULT 'GET',
    referer TEXT,
    hits INT DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- All request logs
CREATE TABLE IF NOT EXISTS request_logs_all (
    id SERIAL PRIMARY KEY,
    domain TEXT NOT NULL,
    ip INET NOT NULL,
    user_agent TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '/',
    method TEXT NOT NULL DEFAULT 'GET',
    referer TEXT,
    hits INT DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Updates updated at when insert happens
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adds updated at trigger to blocklist
CREATE TRIGGER blocklist_updated_at
BEFORE UPDATE ON blocklist
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shares_path ON shares(path);
CREATE INDEX IF NOT EXISTS idx_shares_parent ON shares(parent);
CREATE INDEX IF NOT EXISTS shares_alias_idx ON shares(alias);
CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(type);
CREATE INDEX IF NOT EXISTS idx_shares_locked ON shares(locked);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vms ON vms(vm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_request_logs_last_seen ON request_logs(last_seen);
CREATE UNIQUE INDEX IF NOT EXISTS idx_request_logs_domain ON request_logs(domain);
CREATE INDEX IF NOT EXISTS idx_project_group_members_group ON project_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_project_group_members_share ON project_group_members(share_id);
SET work_mem = '512MB';
SET max_parallel_workers_per_gather = 4;
SET max_parallel_workers = 8;

CREATE MATERIALIZED VIEW request_logs_combined_mv AS
SELECT * FROM request_logs_all
UNION ALL
SELECT * FROM request_logs;

CREATE INDEX idx_combined_ip ON request_logs_combined_mv(ip);
CREATE INDEX idx_combined_path ON request_logs_combined_mv(path);
CREATE INDEX idx_combined_user_agent ON request_logs_combined_mv(user_agent);
