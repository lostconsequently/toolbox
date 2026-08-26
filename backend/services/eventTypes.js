// The application-code allowlist of known event_type values, used to
// populate the Logging UI's filter dropdown (GET /api/admin/logs/event-types)
// without a DISTINCT scan over a potentially large table. event_log.event_type
// itself has no CHECK constraint (see schema.sql's comment) so a new value
// can start appearing in the data before it's added here - the filter
// dropdown just won't offer it as an option yet. `labelKey` is resolved by
// the frontend via i18n; this file only pairs a stable value with its
// category and translation key.
const EVENT_TYPES = [
  { value: "app.startup", category: "system" },
  { value: "app.shutdown", category: "system" },
  { value: "app.config_missing", category: "system" },
  { value: "app.startup_failed", category: "system" },
  { value: "app.unhandled_exception", category: "error" },
  { value: "app.unhandled_rejection", category: "error" },
  { value: "api.exception", category: "error" },
  { value: "db.connected", category: "system" },
  { value: "db.connection_failed", category: "system" },
  { value: "backup.created", category: "system" },
  { value: "backup.deleted", category: "system" },
  { value: "backup.skipped", category: "system" },
  { value: "backup.failed", category: "error" },
  { value: "backup.cleanup_failed", category: "error" },
  { value: "backup.temp_cleanup_failed", category: "error" },
  { value: "backup.restore_session_expired", category: "security" },
  { value: "backup.restore-from-upload", category: "security" },
  { value: "backup.restore-from-backup", category: "security" },
  { value: "backup.restore-from-backup-prepared", category: "security" },
  { value: "backup.restore-from-backup-cancelled", category: "security" },
  { value: "backup.restore-from-backup-expired", category: "security" },
  { value: "restore.failed", category: "error" },
  { value: "restore.rollback_failed", category: "error" },
  { value: "auth.login_failed", category: "auth" },
  { value: "auth.login_success", category: "auth" },
  { value: "auth.logout", category: "auth" },
  { value: "auth.recovery_key_failed", category: "auth" },
  { value: "auth.recovery_key_used", category: "security" },
  { value: "auth.local_admin_migrated", category: "system" },
  { value: "auth.session_validation_failed", category: "error" },
  { value: "auth.session_cleanup_failed", category: "error" },
  { value: "auth.sso_failed", category: "auth" },
  { value: "auth.sso_denied", category: "auth" },
  { value: "auth.sso_login", category: "auth" },
  { value: "security.auth_fail_open", category: "security" },
  { value: "upload.failed", category: "error" },
  { value: "upload.cleanup_failed", category: "error" },
  { value: "certificates.parse_failed", category: "api" },
  { value: "logs.retention_purge", category: "system" },
  { value: "logs.retention_purge_failed", category: "error" },
  { value: "logs.manual_purge", category: "system" },
];

module.exports = { EVENT_TYPES };
