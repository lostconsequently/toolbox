CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#2563eb',
  icon TEXT DEFAULT 'category',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'category',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'tool',
  tool_type TEXT DEFAULT 'link',
  config TEXT,
  input_template TEXT,
  favorite INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  is_draft INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'Other',
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER,
  tags TEXT,
  script_content TEXT NOT NULL DEFAULT '',
  is_template INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  is_admin_only INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS script_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id INTEGER NOT NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_required INTEGER DEFAULT 0,
  placeholder TEXT,
  default_value TEXT,
  help_text TEXT,
  options TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_tools_category_id ON tools(category_id);
CREATE INDEX IF NOT EXISTS idx_tools_subcategory_id ON tools(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_scripts_category_id ON scripts(category_id);
CREATE INDEX IF NOT EXISTS idx_scripts_subcategory_id ON scripts(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_scripts_is_admin_only ON scripts(is_admin_only);
CREATE INDEX IF NOT EXISTS idx_script_fields_script_id ON script_fields(script_id);

-- Optional authentication (disabled by default - see backend/services/authService.js).
-- One row per person who can log in. The pre-existing single shared admin
-- password becomes the first row here (source='local') via a one-time
-- migration in userService.ensureLocalAdminUser(), run at boot.
-- `username` is only set for accounts created via the "Local users" mode
-- (see backend/services/userService.js) - the single legacy local admin
-- (from ensureLocalAdminUser) and Entra accounts never have one. `role` has
-- no CHECK constraint (like auth_config.mode's SETTABLE_MODES) - valid
-- values ('admin', 'user') are enforced in application code only, in
-- routes/users.js, so adding a future role never needs a table rebuild.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL CHECK (source IN ('local', 'entra')),
  username TEXT,
  email TEXT,
  display_name TEXT,
  password_hash TEXT,
  external_id TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  UNIQUE (source, email)
);
-- The idx_users_username unique index is created in db.js, *after*
-- ensureColumns has added the username column to a pre-existing users table
-- - putting it here would fail on any database that predates "Local users"
-- mode, since this file's CREATE TABLE IF NOT EXISTS is a no-op for a table
-- that already exists (the column wouldn't exist yet when this index tried
-- to build).

-- Server-side sessions (not JWTs - see docs/ or the plan discussion: this is
-- what makes logout/timeout/future "revoke all sessions" actually possible).
-- `id` stores a hash of the session token, never the raw value.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  ip_fingerprint TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Single-row config table (id is always 1) for the Admin Center Authentication
-- tab. Defaults to mode='disabled' so a fresh install behaves exactly like
-- today until an admin explicitly opts in. This CHECK (including
-- 'local_users') only takes effect for a *fresh* database - an existing one
-- already has the old CHECK baked into the table and needs the rebuild
-- migration in db.js's ensureAuthConfigLocalUsersMode() instead, since
-- SQLite can't ALTER a CHECK constraint in place.
CREATE TABLE IF NOT EXISTS auth_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'disabled'
       CHECK (mode IN ('disabled', 'local', 'local_users', 'entra', 'hybrid')),
  session_timeout_minutes INTEGER NOT NULL DEFAULT 480,
  entra_tenant_id TEXT,
  entra_client_id TEXT,
  entra_client_secret_encrypted TEXT,
  entra_allowed_users TEXT,
  entra_allowed_groups TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO auth_config (id, mode) VALUES (1, 'disabled');

-- Audit trail for user/role management actions (Admin Center's Local Users
-- section) - who did what to which account, and when. Append-only, never
-- updated or deleted by the app. `actor_label`/`target_label` freeze the
-- display name/username at the time of the action so the log still reads
-- sensibly after the account is later renamed or deleted.
CREATE TABLE IF NOT EXISTS user_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  actor_label TEXT,
  action TEXT NOT NULL,
  target_user_id INTEGER,
  target_label TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at);

-- Recovery Key ("break glass" local password reset). Only the bcrypt hash is
-- ever stored; generating a new key invalidates the previous one implicitly
-- (recoveryKeyService only ever checks the most recent unused row).
CREATE TABLE IF NOT EXISTS recovery_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  used_at TEXT
);

-- Single-row config table (id is always 1) for the Admin Center Branding
-- tab. Every column is nullable and NULL means "use the built-in default" -
-- resetting a field is just setting it back to NULL, no separate defaults
-- table needed. *_path columns hold a filename under
-- database/uploads/branding/ (served publicly at /uploads/branding/<file>,
-- see app.js) rather than the file content itself.
CREATE TABLE IF NOT EXISTS branding_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  app_name TEXT,
  tagline TEXT,
  company_name TEXT,
  logo_path TEXT,
  favicon_path TEXT,
  primary_color TEXT,
  accent_color TEXT,
  login_title TEXT,
  login_subtitle TEXT,
  login_welcome_message TEXT,
  login_background_path TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO branding_config (id) VALUES (1);

-- Single-row config table (id is always 1) for the Admin Center Backup tab's
-- automatic-backup schedule. Read by routes/backup.js on every scheduling
-- decision (not cached at boot) so a change takes effect on the next run
-- without a server restart.
CREATE TABLE IF NOT EXISTS backup_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  interval_hours INTEGER NOT NULL DEFAULT 24,
  max_backups INTEGER NOT NULL DEFAULT 10,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO backup_config (id) VALUES (1);

-- Structured application/system/error event log, powering the Admin Center
-- Logging tab. Append-only - rows are only ever deleted by the retention
-- job or the manual purge action. `category` is the coarse grouping the
-- UI's section headers use; `event_type` is a free-text stable key (no
-- CHECK constraint, same reasoning as users.role) so new event types
-- (Entra sign-ins, API usage, syslog-forwarded events) never need a
-- schema rebuild. No FK on user_id - a log row must survive the
-- referenced user being deleted, same reasoning user_audit_log already
-- documents for its own frozen actor/target labels.
CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('system', 'error', 'security', 'api', 'auth')),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id INTEGER,
  user_label TEXT,
  ip TEXT,
  details TEXT,
  stack_trace TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at);
CREATE INDEX IF NOT EXISTS idx_event_log_level ON event_log(level);
CREATE INDEX IF NOT EXISTS idx_event_log_category ON event_log(category);
CREATE INDEX IF NOT EXISTS idx_event_log_event_type ON event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_user_id ON event_log(user_id);

-- Single-row config table (id is always 1) for the Logging tab's retention
-- settings, same pattern as backup_config. 0 days = keep forever.
-- max_total_rows is a hard safety cap independent of age-based retention,
-- enforced every purge cycle regardless of how fresh the rows are.
CREATE TABLE IF NOT EXISTS logging_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  system_retention_days INTEGER NOT NULL DEFAULT 30,
  error_retention_days INTEGER NOT NULL DEFAULT 90,
  security_retention_days INTEGER NOT NULL DEFAULT 180,
  max_total_rows INTEGER NOT NULL DEFAULT 100000,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO logging_config (id) VALUES (1);

