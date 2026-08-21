import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthAPI } from "../services/resources";
import { setTokens, clearTokens } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const access = localStorage.getItem("access_token");
    if (!access) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await AuthAPI.me();
      setUser(data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username, password) => {
    const { data } = await AuthAPI.login({ username, password });
    setTokens({ access: data.access, refresh: data.refresh });
    const me = await AuthAPI.me();
    setUser(me.data);
    return me.data;
  };

  const register = async (payload) => {
    const { data } = await AuthAPI.register(payload);
    setTokens({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
