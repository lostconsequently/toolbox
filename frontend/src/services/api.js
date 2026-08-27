import { getStoredLanguage, translate } from "../i18n";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

export function toBackendUrl(path) {
  if (!path) return null;

  return `${API_ORIGIN}${path}`;
}

function translateApiError({ error, code, params }) {
  if (!code) return error;

  const language = getStoredLanguage();
  const key = `errors.${code}`;

  const labelParams = params?.label
    ? { ...params, label: translateField(language, params.label) }
    : params;

  const translated = translate(language, key, labelParams);

  return translated === key ? error : translated;
}

function translateField(language, label) {
  const key = `fields.${label}`;
  const translated = translate(language, key);

  return translated === key ? label : translated;
}

let forceLogoutHandler = null;

export function setForceLogoutHandler(handler) {
  forceLogoutHandler = handler;
}

let forceLoginRedirectHandler = null;

export function setForceLoginRedirectHandler(handler) {
  forceLoginRedirectHandler = handler;
}

async function request(endpoint, options = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "x-admin-token": sessionStorage.getItem("toolbox_admin_token") || "",
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `API Error ${response.status}`;
    let errorCode;

    try {
      const errorData = await response.json();

      errorMessage =
        translateApiError(errorData) || errorData.message || errorMessage;
      errorCode = errorData.code;
    } catch {
      const errorText = await response.text();

      if (errorText) {
        errorMessage = errorText;
      }
    }

    const isLayer1AuthEndpoint =
      endpoint.startsWith("/auth/status") ||
      endpoint.startsWith("/auth/session/");

    if (response.status === 401 && errorCode === "auth.required") {
      forceLoginRedirectHandler?.();
    } else if (
      !isLayer1AuthEndpoint &&
      (response.status === 401 || response.status === 403)
    ) {
      const hadToken = Boolean(sessionStorage.getItem("toolbox_admin_token"));

      sessionStorage.removeItem("toolbox_admin_token");

      if (hadToken && forceLogoutHandler) {
        forceLogoutHandler();
      }
    }

    const error = new Error(errorMessage);

    error.code = errorCode;

    throw error;
  }

  return response.json();
}

export const api = {
  loginAdmin: (password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        password,
      }),
    }),

  getAuthStatus: () => request("/auth/status"),

  getSessionUser: () => request("/auth/session/me"),

  loginSession: (password, username) =>
    request("/auth/session/login", {
      method: "POST",
      body: JSON.stringify(username ? { username, password } : { password }),
    }),

  logoutSession: () =>
    request("/auth/session/logout", {
      method: "POST",
    }),

  recoverPassword: (recoveryKey, newPassword) =>
    request("/auth/session/recover", {
      method: "POST",
      body: JSON.stringify({ recoveryKey, newPassword }),
    }),

  getAuthConfig: () => request("/admin/auth-config"),

  updateAuthConfig: (data) =>
    request("/admin/auth-config", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  generateRecoveryKey: () =>
    request("/admin/auth-config/recovery-key", {
      method: "POST",
    }),

  testEntraConfig: (data) =>
    request("/admin/auth-config/test-entra", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getUsers: () => request("/admin/users"),

  createUser: (data) =>
    request("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateUser: (id, data) =>
    request(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  resetUserPassword: (id, password) =>
    request(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  setUserActive: (id, isActive) =>
    request(`/admin/users/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),

  revokeUserSessions: (id) =>
    request(`/admin/users/${id}/revoke-sessions`, {
      method: "POST",
    }),

  deleteUser: (id) =>
    request(`/admin/users/${id}`, {
      method: "DELETE",
    }),

  getBranding: () => request("/branding"),

  updateBranding: (data) =>
    request("/branding", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  resetBranding: () =>
    request("/branding/reset", {
      method: "POST",
    }),

  uploadBrandingImage: async (slot, file) => {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(`${API_BASE}/branding/${slot}`, {
      method: "POST",
      headers: {
        "x-admin-token": sessionStorage.getItem("toolbox_admin_token") || "",
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        translateApiError(result) || result.error || "Upload failed",
      );
    }

    return result;
  },

  removeBrandingImage: async (slot) => {
    const response = await fetch(`${API_BASE}/branding/${slot}`, {
      method: "DELETE",
      headers: {
        "x-admin-token": sessionStorage.getItem("toolbox_admin_token") || "",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        translateApiError(result) || result.error || "Remove failed",
      );
    }

    return result;
  },

  getSystemInfo: () => request("/admin/system-info"),

  lookupMac: (mac) => request(`/maclookup/${encodeURIComponent(mac)}`),

  lookupSsl: (host, port) =>
    request(
      `/sslcheck/${encodeURIComponent(host)}${port ? `?port=${encodeURIComponent(port)}` : ""}`,
    ),

  lookupReputation: (query) =>
    request(`/reputation/${encodeURIComponent(query)}`),

  checkBreachPasswordPrefix: (prefix) =>
    request("/breachcheck", {
      method: "POST",
      body: JSON.stringify({ prefix }),
    }),

  lookupReverseDns: (ip) => request(`/reversedns/${encodeURIComponent(ip)}`),

  lookupDnsRecords: (name, types, expected = {}, resolverId = "backend") => {
    const params = new URLSearchParams({
      name,
      types: types.join(","),
      resolver: resolverId,
    });

    const expectedParam = Object.entries(expected)
      .filter(([, value]) => value)
      .map(([type, value]) => `${type}:${value}`)
      .join("|");

    if (expectedParam) {
      params.set("expected", expectedParam);
    }

    return request(`/dnslookup?${params.toString()}`);
  },

  lookupDnsPropagation: ({ name, recordType, expectedValue, customResolver }) =>
    request(
      `/dnspropagation?name=${encodeURIComponent(
        name,
      )}&type=${encodeURIComponent(recordType)}&expected=${encodeURIComponent(
        expectedValue || "",
      )}${customResolver ? `&customResolver=${encodeURIComponent(customResolver)}` : ""}`,
    ),

  inspectCertificate: (payload) =>
    request("/certificates/inspect", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  inspectCsr: (payload) =>
    request("/certificates/inspect-csr", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  lookupIp: (query) => request(`/iplookup/${encodeURIComponent(query)}`),

  checkPort: ({ host, port }) =>
    request(
      `/portcheck?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`,
    ),

  logoutAdmin: () =>
    request("/auth/logout", {
      method: "POST",
    }),

  lookupWhois: (domain) => request(`/whois/${encodeURIComponent(domain)}`),

  flattenSpf: ({ domain = "", spfRecord = "" }) =>
    request("/spf/flatten", {
      method: "POST",
      body: JSON.stringify({ domain, spfRecord }),
    }),

  analyzeBsodDump: async (file) => {
    const response = await fetch(`${API_BASE}/bsodanalyzer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-file-name": encodeURIComponent(file.name),
      },
      body: await file.arrayBuffer(),
    });

    if (!response.ok) {
      let message = `API Error ${response.status}`;

      try {
        const data = await response.json();

        message = data.error || data.message || message;
      } catch {
        const text = await response.text();

        if (text) {
          message = text;
        }
      }

      throw new Error(message);
    }

    return response.json();
  },

  lookupBsodStopCode: (code) =>
    request(`/bsodanalyzer/lookup?code=${encodeURIComponent(code)}`),

  getCategories: () => request("/categories"),

  createCategory: (data) =>
    request("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (id, data) =>
    request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCategory: (id) =>
    request(`/categories/${id}`, {
      method: "DELETE",
    }),

  getSubcategories: () => request("/subcategories"),

  createSubcategory: (data) =>
    request("/subcategories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSubcategory: (id, data) =>
    request(`/subcategories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteSubcategory: (id) =>
    request(`/subcategories/${id}`, {
      method: "DELETE",
    }),

  getTools: () => request("/tools"),

  createTool: (data) =>
    request("/tools", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTool: (id, data) =>
    request(`/tools/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTool: (id) =>
    request(`/tools/${id}`, {
      method: "DELETE",
    }),

  toggleToolFavorite: (id, favorite) =>
    request(`/tools/${id}/favorite`, {
      method: "PATCH",
      body: JSON.stringify({
        favorite,
      }),
    }),

  getScripts: () => request("/scripts"),

  getScript: (id) => request(`/scripts/${id}`),

  createScript: (data) =>
    request("/scripts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateScript: (id, data) =>
    request(`/scripts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteScript: (id) =>
    request(`/scripts/${id}`, {
      method: "DELETE",
    }),

  toggleScriptFavorite: (id, isFavorite) =>
    request(`/scripts/${id}/favorite`, {
      method: "PATCH",
      body: JSON.stringify({
        isFavorite,
      }),
    }),

  getScriptFields: (scriptId) => request(`/scripts/${scriptId}/fields`),

  createScriptField: (scriptId, data) =>
    request(`/scripts/${scriptId}/fields`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateScriptField: (scriptId, fieldId, data) =>
    request(`/scripts/${scriptId}/fields/${fieldId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteScriptField: (scriptId, fieldId) =>
    request(`/scripts/${scriptId}/fields/${fieldId}`, {
      method: "DELETE",
    }),

  downloadDatabase: async () => {
    const response = await fetch(`${API_BASE}/backup/database`, {
      headers: {
        "x-admin-token": sessionStorage.getItem("toolbox_admin_token") || "",
      },
    });

    if (!response.ok) {
      throw new Error("Database download failed");
    }

    return response.blob();
  },

  restoreDatabase: async (file) => {
    const formData = new FormData();

    formData.append("database", file);

    const response = await fetch(`${API_BASE}/backup/restore`, {
      method: "POST",
      headers: {
        "x-admin-token": sessionStorage.getItem("toolbox_admin_token") || "",
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Restore failed");
    }

    return result;
  },

  getBackups: () => request("/backup/backups"),

  getBackupConfig: () => request("/backup/config"),

  updateBackupConfig: (data) =>
    request("/backup/config", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  downloadBackupFile: async (filename) => {
    const response = await fetch(
      `${API_BASE}/backup/download-backup/${encodeURIComponent(filename)}`,
      {
        headers: {
          "x-admin-token": sessionStorage.getItem("toolbox_admin_token") || "",
        },
      },
    );

    if (!response.ok) {
      let errorMessage = "Backup download failed";

      try {
        const errorData = await response.json();

        errorMessage = errorData.error || errorMessage;
      } catch {}

      throw new Error(errorMessage);
    }

    return response.blob();
  },

  prepareRestoreFromBackup: (filename) =>
    request("/backup/restore-from-backup/prepare", {
      method: "POST",
      body: JSON.stringify({ filename }),
    }),

  commitRestoreFromBackup: (restoreToken) =>
    request("/backup/restore-from-backup/commit", {
      method: "POST",
      body: JSON.stringify({ restoreToken }),
    }),

  cancelRestoreFromBackup: (restoreToken) =>
    request("/backup/restore-from-backup/cancel", {
      method: "POST",
      body: JSON.stringify({ restoreToken }),
    }),

  getLogs: (filters = {}) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;

      if (Array.isArray(value)) {
        if (value.length) params.set(key, value.join(","));
        continue;
      }

      params.set(key, String(value));
    }

    const query = params.toString();

    return request(`/admin/logs${query ? `?${query}` : ""}`);
  },

  getLogEventTypes: () => request("/admin/logs/event-types"),

  getLogConfig: () => request("/admin/logs/config"),

  updateLogConfig: (data) =>
    request("/admin/logs/config", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  purgeLogs: (data) =>
    request("/admin/logs/purge", {
      method: "POST",
      body: JSON.stringify({ confirm: true, ...data }),
    }),

  exportLogs: async (filters = {}, format = "csv") => {
    const params = new URLSearchParams({ format });

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;

      if (Array.isArray(value)) {
        if (value.length) params.set(key, value.join(","));
        continue;
      }

      params.set(key, String(value));
    }

    const response = await fetch(
      `${API_BASE}/admin/logs/export?${params.toString()}`,
      {
        credentials: "include",
        headers: {
          "x-admin-token": sessionStorage.getItem("toolbox_admin_token") || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Log export failed");
    }

    return response.blob();
  },

  // Public app info (name, status, version) - the root of the API itself,
  // used by the wizard's welcome step before anything else is known.
  getAppInfo: () => request(""),

  // First Startup Wizard - all public, no admin token exists yet at this
  // point. /setup/status stays reachable after completion too (used by the
  // route gate); the others 403 permanently once setup is done.
  getSetupStatus: () => request("/setup/status"),

  prepareSetupRestore: async (file) => {
    const formData = new FormData();

    formData.append("database", file);

    const response = await fetch(`${API_BASE}/setup/restore/prepare`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Restore validation failed");
    }

    return result;
  },

  cancelSetupRestore: (token) =>
    request("/setup/restore/cancel", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  completeSetup: (data) =>
    request("/setup/complete", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
