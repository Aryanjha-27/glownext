import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { getToken, isBackendMissing, setTokens, UNAUTHORIZED_EVENT } from "@/api/apiClient";
import * as authApi from "@/api/authApi";
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const me = await authApi.getCurrentUser();
      setUser(me);
      setAuthUnavailable(false);
    } catch (error) {
      setUser(null);
      if (isBackendMissing(error)) setAuthUnavailable(true);
      else setTokens(null, null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshTimer = window.setInterval(() => {
      void loadUser();
    }, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [user, loadUser]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);
  const value = useMemo(
    () => ({
      user,
      userType: user?.profile?.user_type ?? user?.user_type ?? null,
      isAuthenticated: Boolean(user),
      loading,
      authUnavailable,
      login: async (email, password) => {
        const data = await authApi.login({ email, password });
        if (data.user) {
          setUser(data.user);
          return data.user;
        }
        await loadUser();
        return user;
      },
      register: async (payload) => {
        await authApi.register(payload);
      },
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
      refresh: loadUser,
      setUser,
    }),
    [user, loading, authUnavailable, loadUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export { AuthContext, AuthProvider };
