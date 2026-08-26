const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
const { resolveDataPath, ensureDir } = require("../utils/dataPaths");
const { printLogLine } = require("../utils/logLine");

dotenv.config();

const dbPath = resolveDataPath(process.env.DB_PATH, "database/toolbox.db");

const schemaPath = path.join(__dirname, "schema.sql");

// A freshly mounted volume (Docker) is an empty directory — make sure it
// exists before sqlite3 tries to open a file inside it.
ensureDir(path.dirname(dbPath));

let db = null;

function openDatabase() {
  if (db) {
    return Promise.resolve(db);
  }

  return new Promise((resolve, reject) => {
    const newDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        db = null;

        printLogLine({
          level: "critical",
          source: "DB",
          message: `Could not open the database: ${err.message}`,
        });

        reject(err);
        return;
      }

      newDb.run("PRAGMA foreign_keys = ON;", (pragmaErr) => {
        if (pragmaErr) {
          printLogLine({
            level: "critical",
            source: "DB",
            message: `Could not enable foreign keys: ${pragmaErr.message}`,
          });

          reject(pragmaErr);
          return;
        }

        resolve(newDb);
      });
    });

    db = newDb;
  });
}

function getDatabase() {
  if (!db) {
    throw new Error("Database connection is not open");
  }

  return db;
}

function initializeDatabase() {
  const schema = fs.readFileSync(schemaPath, "utf8");

  return new Promise((resolve, reject) => {
    getDatabase().exec(schema, (err) => {
      if (err) {
        printLogLine({
          level: "critical",
          source: "DB",
          message: `Could not initialise the schema: ${err.message}`,
        });

        reject(err);
        return;
      }

      resolve();
    });
  })
    .then(() => ensureColumns("tools", TOOLS_ADDED_COLUMNS))
    .then(() => ensureColumns("users", USERS_ADDED_COLUMNS))
    .then(() =>
      execSql(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL",
      ),
    )
    .then(() => ensureAuthConfigLocalUsersMode());
}

// `CREATE TABLE IF NOT EXISTS` in schema.sql only helps on a fresh database —
// it does nothing for a table that already exists from an earlier version of
// the app. There's no migration framework here, so new nullable/defaulted
// columns are added idempotently on every boot instead: check what's already
// there via PRAGMA table_info, then ALTER TABLE for whatever is missing.
const TOOLS_ADDED_COLUMNS = [
  { name: "is_draft", ddl: "INTEGER DEFAULT 0" },
  { name: "featured", ddl: "INTEGER DEFAULT 0" },
];

// "Local users" mode (multi-user, username+password) - added after the
// original single-admin auth system shipped.
const USERS_ADDED_COLUMNS = [
  { name: "username", ddl: "TEXT" },
  { name: "last_login_at", ddl: "TEXT" },
];

// Unlike ADD COLUMN above, a CHECK constraint can't be altered in place in
// SQLite - the only way to widen auth_config.mode's allowed values on a
// database that already existed before "Local users" mode is the standard
// rebuild-and-swap dance: new table with the wider CHECK, copy the single
// row over, drop the old table, rename. Detected by trying to read the
// table's own CREATE statement from sqlite_master rather than tracking a
// separate "schema version" number - if 'local_users' is already in there,
// this is a no-op on every subsequent boot.
async function ensureAuthConfigLocalUsersMode() {
  const row = await new Promise((resolve, reject) => {
    getDatabase().get(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'auth_config'",
      [],
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );
  });

  if (!row || row.sql.includes("local_users")) {
    return;
  }

  printLogLine({
    level: "info",
    source: "DB",
    message: "Migrating auth_config to support 'local_users' mode...",
  });

  await execSql(`
    ALTER TABLE auth_config RENAME TO auth_config_old;

    CREATE TABLE auth_config (
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

    INSERT INTO auth_config
      SELECT * FROM auth_config_old;

    DROP TABLE auth_config_old;
  `);
}

function execSql(sql) {
  return new Promise((resolve, reject) => {
    getDatabase().exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function tableInfo(table) {
  return new Promise((resolve, reject) => {
    getDatabase().all(`PRAGMA table_info(${table})`, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows || []);
    });
  });
}

function addColumn(table, column) {
  return new Promise((resolve, reject) => {
    getDatabase().run(
      `ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.ddl}`,
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      },
    );
  });
}

async function ensureColumns(table, columns) {
  const existing = new Set((await tableInfo(table)).map((row) => row.name));

  for (const column of columns) {
    if (!existing.has(column.name)) {
      await addColumn(table, column);
    }
  }
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelCaseKeys(row) {
  if (!row || typeof row !== "object") {
    return row;
  }

  if (Array.isArray(row)) {
    return row.map(camelCaseKeys);
  }

  const result = {};

  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }

  return result;
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(camelCaseKeys(rows));
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(camelCaseKeys(row));
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function runCallback(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        id: this.lastID,
        changes: this.changes,
      });
    });
  });
}

function closeDatabase() {
  if (!db) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const currentDb = db;

    currentDb.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      if (db === currentDb) {
        db = null;
      }

      resolve();
    });
  });
}

// Exported so anything that needs the schema to exist before it runs (e.g.
// the one-time local-admin-user migration in services/userService.js) can
// sequence itself after this instead of guessing when boot is done.
const dbReady = openDatabase()
  .then(() => initializeDatabase())
  .catch((err) => {
    printLogLine({
      level: "critical",
      source: "DB",
      message: `Database initialisation failed: ${err.message}`,
    });
  });

module.exports = {
  get db() {
    return db;
  },
  dbPath,
  dbReady,
  all,
  get,
  run,
  openDatabase,
  initializeDatabase,
  closeDatabase,
};
