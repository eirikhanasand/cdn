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
    path TEXT,
    content TEXT NOT NULL,
    git TEXT,
    locked BOOLEAN DEFAULT FALSE,
    owner TEXT,
    editors TEXT[],
    parent TEXT,
    alias TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'folder')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_shares_path ON shares(path);
CREATE INDEX IF NOT EXISTS idx_shares_path ON shares(parent);
CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(type);
CREATE INDEX IF NOT EXISTS idx_shares_locked ON shares(locked);
CREATE INDEX IF NOT EXISTS idx_vms ON vms(vm_id);
