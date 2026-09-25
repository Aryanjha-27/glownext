import { API_SERVER_URL, apiClient, backendMissing, setTokens } from "./apiClient";
async function login(payload) {
  try {
    const backendUrl = API_SERVER_URL || "http://127.0.0.1:8000";
    const data = await apiClient.post("/auth/login/", payload, {
      auth: false,
      baseUrl: `${backendUrl}/api`,
      credentials: "include",
    });
    const accessToken = data.access ?? data.access_token ?? data.token ?? null;
    const refreshToken = data.refresh ?? data.refresh_token ?? null;
    setTokens(accessToken, refreshToken);
    return data;
  } catch (error) {
    if (isMissing(error)) return backendMissing("POST /api/auth/login/");
    throw error;
  }
}
async function register(payload) {
  try {
    const data = await apiClient.post("/auth/register/", payload, { auth: false });
    const accessToken = data.access ?? data.access_token ?? data.token ?? null;
    const refreshToken = data.refresh ?? data.refresh_token ?? null;
    if (accessToken) setTokens(accessToken, refreshToken);
    return data;
  } catch (error) {
    if (isMissing(error)) return backendMissing("POST /api/auth/register/");
    throw error;
  }
}
async function getCurrentUser() {
  try {
    return await apiClient.get("/auth/user/");
  } catch (error) {
    if (isMissing(error)) return backendMissing("GET /api/auth/user/");
    throw error;
  }
}
async function logout() {
  try {
    await apiClient.post("/auth/logout/");
  } catch {
  } finally {
    setTokens(null, null);
  }
}
async function updateProfile(data) {
  try {
    return await apiClient.patch("/auth/profile/", data);
  } catch (error) {
    if (isMissing(error)) return backendMissing("PATCH /api/auth/profile/");
    throw error;
  }
}
function isMissing(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error.status === 404 || error.status === 0)
  );
}
export { getCurrentUser, login, logout, register, updateProfile };
