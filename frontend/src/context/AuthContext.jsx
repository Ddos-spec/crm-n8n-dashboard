import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, login as loginApi } from '../utils/api.js';
import { getToken, removeToken, setToken } from '../utils/auth.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await getProfile();
        setUser(profile);
      } catch (error) {
        removeToken();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email, password) => {
    const { token, user: userData } = await loginApi(email, password);
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: Boolean(user),
      loading
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
