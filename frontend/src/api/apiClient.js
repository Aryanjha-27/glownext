const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "/api";
const API_SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const TOKEN_STORAGE_KEY = "glownext.access_token";
const REFRESH_STORAGE_KEY = "glownext.refresh_token";
class ApiError extends Error {
  status;
  kind;
  /** DRF field errors, when provided. */
  fieldErrors;
  constructor(message, opts = {}) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status ?? 0;
    this.kind = opts.kind ?? "unknown";
    this.fieldErrors = opts.fieldErrors;
  }
}
function backendMissing(endpoint) {
  throw new ApiError(
    `This feature needs a backend endpoint that does not exist yet: ${endpoint}. Implement it in Django, then this screen works with no frontend changes.`,
    { kind: "backend_missing" },
  );
}
function isBackendMissing(error) {
  return error instanceof ApiError && error.kind === "backend_missing";
}
function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
function setTokens(access, refresh) {
  if (typeof window === "undefined") return;
  try {
    if (access) window.localStorage.setItem(TOKEN_STORAGE_KEY, access);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (refresh) window.localStorage.setItem(REFRESH_STORAGE_KEY, refresh);
    else if (refresh === null) window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {}
}
const UNAUTHORIZED_EVENT = "glownext:unauthorized";
function kindForStatus(status) {
  if (status === 400) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "unknown";
}
function messageForStatus(status, payload) {
  if (payload && typeof payload === "object") {
    const p = payload;
    const detail = p["detail"] ?? p["message"] ?? p["error"];
    if (typeof detail === "string") return detail;
  }
  if (typeof payload === "string" && payload.trim() && !payload.startsWith("<")) return payload;
  switch (kindForStatus(status)) {
    case "validation":
      return "Some of the information sent was invalid.";
    case "unauthorized":
      return "Your session has expired. Please log in again.";
    case "forbidden":
      return "You don't have permission to do that.";
    case "not_found":
      return "We couldn't find what you were looking for.";
    case "server":
      return "The server had a problem. Please try again in a moment.";
    default:
      return `Request failed (${status}).`;
  }
}
function fieldErrorsFrom(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return void 0;
  const out = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "detail") continue;
    if (Array.isArray(value)) out[key] = value.map(String);
    else if (typeof value === "string") out[key] = [value];
  }
  return Object.keys(out).length ? out : void 0;
}
function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === void 0 || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
async function request(path, options = {}) {
  const { method = "GET", body, auth = true, signal, credentials, baseUrl = API_BASE_URL, isRetry = false } = options;
  const headers = { Accept: "application/json" };
  const token = auth ? getToken() : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== void 0 && !isForm) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(signal ? { signal } : {}),
      ...(credentials ? { credentials } : {}),
      ...(body === void 0 ? {} : { body: isForm ? body : JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check that the Django API is running and try again.",
      { kind: "network" },
    );
  }
  if (response.status === 204) return void 0;
  const text = await response.text();
  let payload = text;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {}
  }
  if (!response.ok) {
    if (response.status === 401) {
      const refreshToken = typeof window !== "undefined" ? window.localStorage.getItem(REFRESH_STORAGE_KEY) : null;
      if (auth && refreshToken && !isRetry && !path.includes("/auth/token/refresh/")) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });
          if (refreshResponse.ok) {
            const refreshed = await refreshResponse.json();
            setTokens(refreshed.access, refreshed.refresh);
            return request(path, { ...options, isRetry: true });
          }
        } catch {
          // Fall through to the normal authentication failure below.
        }
        setTokens(null, null);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      } else if (!refreshToken || isRetry) {
        setTokens(null, null);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      }
    }
    throw new ApiError(messageForStatus(response.status, payload), {
      status: response.status,
      kind: kindForStatus(response.status),
      fieldErrors: response.status === 400 ? fieldErrorsFrom(payload) : void 0,
    });
  }
  return payload;
}
const apiClient = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  postFormData: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
function normalizeList(payload) {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload };
  }
  if (payload && Array.isArray(payload.results)) return payload;
  return { count: 0, next: null, previous: null, results: [] };
}
export {
  API_BASE_URL,
  API_SERVER_URL,
  ApiError,
  REFRESH_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  UNAUTHORIZED_EVENT,
  apiClient,
  backendMissing,
  buildQuery,
  getToken,
  isBackendMissing,
  normalizeList,
  setTokens,
};
