import { useEffect, useState } from "react";
import {
  KeyRound,
  Pencil,
  Power,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import FormField from "../../components/toolForms/shared/FormField";
import StatusBadge from "../../components/toolForms/shared/StatusBadge";
import StatusMessage from "../../components/toolForms/shared/StatusMessage";
import Badge from "../../components/shared/Badge";
import Card from "../../components/shared/Card";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";

const ROLES = ["admin", "user"];

function formatDate(value, language) {
  if (!value) return null;

  return new Date(value).toLocaleString(language === "nl" ? "nl-NL" : "en-US");
}

export default function LocalUsersSection({
  isAdmin,
  confirm,
  setNotice,
  compactMode,
}) {
  const { user: currentUser, refreshStatus: refreshAuthStatus } = useAuth();
  const { t, language } = useLanguage();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [resettingId, setResettingId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");

  const [rowBusyId, setRowBusyId] = useState(null);

  const loadUsers = () =>
    api
      .getUsers()
      .then((result) => setUsers(result.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const openCreate = () => {
    setCreating(true);
    setNewUsername("");
    setNewDisplayName("");
    setNewPassword("");
    setNewRole("user");
    setCreateError("");
  };

  const submitCreate = async () => {
    setCreateBusy(true);
    setCreateError("");

    try {
      await api.createUser({
        username: newUsername.trim(),
        displayName: newDisplayName.trim(),
        password: newPassword,
        role: newRole,
      });

      setCreating(false);
      setNotice({
        status: "success",
        message: t("adminCenter.localUsers.createSuccess"),
      });
      await loadUsers();
    } catch (err) {
      setCreateError(err.message || t("adminCenter.localUsers.createFailed"));
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setEditDisplayName(user.displayName || "");
    setEditRole(user.role);
    setEditError("");
  };

  const submitEdit = async (user) => {
    setEditBusy(true);
    setEditError("");

    try {
      await api.updateUser(user.id, {
        displayName: editDisplayName.trim(),
        role: editRole,
      });

      setEditingId(null);
      setNotice({
        status: "success",
        message: t("adminCenter.localUsers.updateSuccess"),
      });
      await loadUsers();
    } catch (err) {
      setEditError(err.message || t("adminCenter.localUsers.updateFailed"));
    } finally {
      setEditBusy(false);
    }
  };

  const openReset = (user) => {
    setResettingId(user.id);
    setResetPassword("");
    setResetError("");
  };

  const submitReset = async (user) => {
    setResetBusy(true);
    setResetError("");

    try {
      await api.resetUserPassword(user.id, resetPassword);

      setResettingId(null);
      setNotice({
        status: "success",
        message: t("adminCenter.localUsers.resetSuccess"),
      });
      await loadUsers();
    } catch (err) {
      setResetError(err.message || t("adminCenter.localUsers.resetFailed"));
    } finally {
      setResetBusy(false);
    }
  };

  const toggleActive = async (user) => {
    setRowBusyId(user.id);
    setNotice(null);

    try {
      await api.setUserActive(user.id, !user.isActive);

      setNotice({
        status: "success",
        message: user.isActive
          ? t("adminCenter.localUsers.disableSuccess")
          : t("adminCenter.localUsers.enableSuccess"),
      });

      await loadUsers();
    } catch (err) {
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.localUsers.actionFailed"),
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const revokeSessions = async (user) => {
    setRowBusyId(user.id);
    setNotice(null);

    try {
      await api.revokeUserSessions(user.id);

      setNotice({
        status: "success",
        message: t("adminCenter.localUsers.revokeSuccess"),
      });

      await loadUsers();

      if (user.id === currentUser?.id) {
        refreshAuthStatus();
      }
    } catch (err) {
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.localUsers.actionFailed"),
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const removeUser = async (user) => {
    const confirmed = await confirm(
      t("adminCenter.localUsers.deleteConfirm", { name: user.displayName }),
      { danger: true },
    );

    if (!confirmed) return;

    setRowBusyId(user.id);
    setNotice(null);

    try {
      await api.deleteUser(user.id);

      setNotice({
        status: "success",
        message: t("adminCenter.localUsers.deleteSuccess"),
      });

      await loadUsers();
    } catch (err) {
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.localUsers.actionFailed"),
      });
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div
      style={{
        padding: compactMode ? "12px" : "16px",
        marginBottom: "20px",
        background: "var(--surface)",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        opacity: isAdmin ? 1 : 0.6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Users size={16} />
          <h3 style={{ margin: 0 }}>{t("adminCenter.localUsers.heading")}</h3>

          <Badge
            label={t("common.beta")}
            color="var(--status-warning)"
            variant="soft"
            compactMode
          />
        </div>

        {!creating && (
          <ActionButton
            variant="primary"
            compactMode
            icon={<UserPlus size={14} />}
            disabled={!isAdmin}
            onClick={openCreate}
          >
            {t("adminCenter.localUsers.addUser")}
          </ActionButton>
        )}
      </div>

      <p style={{ color: "var(--subtle)", fontSize: "13px", marginTop: 0 }}>
        {t("adminCenter.localUsers.description")}
      </p>

      {creating && (
        <div
          style={{
            padding: "14px",
            marginBottom: "16px",
            borderRadius: "8px",
            border: "1px solid var(--primary)",
            background: "var(--card)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <FormField
              label={t("adminCenter.localUsers.usernameLabel")}
              value={newUsername}
              onChange={setNewUsername}
              placeholder="jsmith"
              disabled={createBusy}
              mono
              compactMode={compactMode}
            />

            <FormField
              label={t("adminCenter.localUsers.displayNameLabel")}
              value={newDisplayName}
              onChange={setNewDisplayName}
              placeholder="Jane Smith"
              disabled={createBusy}
              compactMode={compactMode}
            />

            <FormField
              label={t("adminCenter.localUsers.passwordLabel")}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder={t("adminCenter.localUsers.passwordPlaceholder")}
              disabled={createBusy}
              autoComplete="new-password"
              compactMode={compactMode}
            />

            <RoleSelect
              label={t("adminCenter.localUsers.roleLabel")}
              value={newRole}
              onChange={setNewRole}
              disabled={createBusy}
              compactMode={compactMode}
              t={t}
            />
          </div>

          {createError && (
            <div style={{ marginBottom: "10px" }}>
              <StatusMessage status="error" compactMode={compactMode}>
                {createError}
              </StatusMessage>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <ActionButton
              variant="primary"
              compactMode
              disabled={createBusy}
              onClick={submitCreate}
            >
              {createBusy
                ? t("adminCenter.localUsers.creating")
                : t("adminCenter.localUsers.create")}
            </ActionButton>

            <ActionButton
              variant="secondary"
              compactMode
              icon={<X size={13} />}
              disabled={createBusy}
              onClick={() => setCreating(false)}
            >
              {t("common.cancel")}
            </ActionButton>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--subtle)", fontSize: "13px" }}>
          {t("common.loading")}
        </div>
      ) : users.length === 0 ? (
        <div style={{ color: "var(--subtle)", fontSize: "13px" }}>
          {t("adminCenter.localUsers.empty")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "8px" }}>
          {users.map((user) => (
            <div key={user.id}>
              <Card
                hoverShadow
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  padding: compactMode ? "8px 10px" : "10px 12px",
                }}
              >
                <div style={{ minWidth: "160px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <strong style={{ fontSize: "13px" }}>
                      {user.displayName}
                    </strong>

                    {user.id === currentUser?.id && (
                      <span
                        style={{ fontSize: "11px", color: "var(--subtle)" }}
                      >
                        ({t("adminCenter.localUsers.you")})
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--subtle)",
                      fontFamily: "var(--mono, monospace)",
                    }}
                  >
                    {user.username ||
                      `${user.source}${user.email ? `:${user.email}` : ""}`}
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <StatusBadge
                    label={
                      user.role === "admin"
                        ? t("adminCenter.localUsers.roleAdmin")
                        : t("adminCenter.localUsers.roleUser")
                    }
                    status={user.role === "admin" ? "warning" : "neutral"}
                    compactMode={compactMode}
                  />

                  <StatusBadge
                    label={
                      user.isActive
                        ? t("adminCenter.localUsers.statusEnabled")
                        : t("adminCenter.localUsers.statusDisabled")
                    }
                    status={user.isActive ? "success" : "error"}
                    compactMode={compactMode}
                  />
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--subtle)",
                    minWidth: "140px",
                  }}
                >
                  <div>
                    {t("adminCenter.localUsers.lastLogin")}:{" "}
                    {formatDate(user.lastLoginAt, language) ||
                      t("adminCenter.localUsers.never")}
                  </div>
                  <div>
                    {t("adminCenter.localUsers.activeSessions")}:{" "}
                    {user.activeSessions}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {user.source === "local" && user.username && (
                    <ActionButton
                      variant="secondary"
                      compactMode
                      icon={<Pencil size={12} />}
                      disabled={!isAdmin || rowBusyId === user.id}
                      onClick={() => openEdit(user)}
                    >
                      {t("common.edit")}
                    </ActionButton>
                  )}

                  {user.source === "local" && user.username && (
                    <ActionButton
                      variant="secondary"
                      compactMode
                      icon={<KeyRound size={12} />}
                      disabled={!isAdmin || rowBusyId === user.id}
                      onClick={() => openReset(user)}
                    >
                      {t("adminCenter.localUsers.resetPassword")}
                    </ActionButton>
                  )}

                  {user.activeSessions > 0 && (
                    <ActionButton
                      variant="secondary"
                      compactMode
                      disabled={!isAdmin || rowBusyId === user.id}
                      onClick={() => revokeSessions(user)}
                    >
                      {t("adminCenter.localUsers.revokeSessions")}
                    </ActionButton>
                  )}

                  <ActionButton
                    variant="secondary"
                    compactMode
                    icon={<Power size={12} />}
                    disabled={
                      !isAdmin ||
                      rowBusyId === user.id ||
                      user.id === currentUser?.id
                    }
                    title={
                      user.id === currentUser?.id
                        ? t("adminCenter.localUsers.cannotDisableSelf")
                        : undefined
                    }
                    onClick={() => toggleActive(user)}
                  >
                    {user.isActive
                      ? t("adminCenter.localUsers.disable")
                      : t("adminCenter.localUsers.enable")}
                  </ActionButton>

                  <ActionButton
                    variant="danger"
                    compactMode
                    icon={<Trash2 size={12} />}
                    disabled={
                      !isAdmin ||
                      rowBusyId === user.id ||
                      user.id === currentUser?.id
                    }
                    title={
                      user.id === currentUser?.id
                        ? t("adminCenter.localUsers.cannotDeleteSelf")
                        : undefined
                    }
                    onClick={() => removeUser(user)}
                  >
                    {t("common.delete")}
                  </ActionButton>
                </div>
              </Card>

              {editingId === user.id && (
                <div
                  style={{
                    padding: "12px",
                    marginTop: "4px",
                    borderRadius: "8px",
                    border: "1px solid var(--primary)",
                    background: "var(--card)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                      marginBottom: "10px",
                    }}
                  >
                    <FormField
                      label={t("adminCenter.localUsers.displayNameLabel")}
                      value={editDisplayName}
                      onChange={setEditDisplayName}
                      disabled={editBusy}
                      compactMode={compactMode}
                    />

                    <RoleSelect
                      label={t("adminCenter.localUsers.roleLabel")}
                      value={editRole}
                      onChange={setEditRole}
                      disabled={editBusy || user.id === currentUser?.id}
                      hint={
                        user.id === currentUser?.id
                          ? t("adminCenter.localUsers.cannotChangeOwnRole")
                          : undefined
                      }
                      compactMode={compactMode}
                      t={t}
                    />
                  </div>

                  {editError && (
                    <div style={{ marginBottom: "10px" }}>
                      <StatusMessage status="error" compactMode={compactMode}>
                        {editError}
                      </StatusMessage>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <ActionButton
                      variant="primary"
                      compactMode
                      disabled={editBusy}
                      onClick={() => submitEdit(user)}
                    >
                      {editBusy ? t("common.saving") : t("common.save")}
                    </ActionButton>

                    <ActionButton
                      variant="secondary"
                      compactMode
                      disabled={editBusy}
                      onClick={() => setEditingId(null)}
                    >
                      {t("common.cancel")}
                    </ActionButton>
                  </div>
                </div>
              )}

              {resettingId === user.id && (
                <div
                  style={{
                    padding: "12px",
                    marginTop: "4px",
                    borderRadius: "8px",
                    border: "1px solid var(--primary)",
                    background: "var(--card)",
                  }}
                >
                  <div style={{ maxWidth: "260px", marginBottom: "10px" }}>
                    <FormField
                      label={t("adminCenter.localUsers.newPasswordLabel")}
                      type="password"
                      value={resetPassword}
                      onChange={setResetPassword}
                      disabled={resetBusy}
                      autoComplete="new-password"
                      compactMode={compactMode}
                    />
                  </div>

                  {resetError && (
                    <div style={{ marginBottom: "10px" }}>
                      <StatusMessage status="error" compactMode={compactMode}>
                        {resetError}
                      </StatusMessage>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <ActionButton
                      variant="primary"
                      compactMode
                      disabled={resetBusy}
                      onClick={() => submitReset(user)}
                    >
                      {resetBusy
                        ? t("adminCenter.localUsers.resetting")
                        : t("adminCenter.localUsers.resetPassword")}
                    </ActionButton>

                    <ActionButton
                      variant="secondary"
                      compactMode
                      disabled={resetBusy}
                      onClick={() => setResettingId(null)}
                    >
                      {t("common.cancel")}
                    </ActionButton>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleSelect({
  label,
  value,
  onChange,
  disabled,
  hint,
  compactMode,
  t,
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          color: "var(--subtle)",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0 10px",
          fontSize: compactMode ? "12px" : "13px",
          height: compactMode ? "34px" : "38px",
        }}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role === "admin"
              ? t("adminCenter.localUsers.roleAdmin")
              : t("adminCenter.localUsers.roleUser")}
          </option>
        ))}
      </select>

      {hint && (
        <div
          style={{ fontSize: "11px", color: "var(--subtle)", marginTop: "4px" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
