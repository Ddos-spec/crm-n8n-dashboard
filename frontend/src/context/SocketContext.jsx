import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/auth.js';
import { useAuthContext } from './AuthContext.jsx';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuthContext();

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setSocket((prev) => {
        if (prev) {
          prev.disconnect();
        }
        return null;
      });
      return undefined;
    }

    const instance = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token }
    });

    instance.connect();
    setSocket((prev) => {
      if (prev && prev.id !== instance.id) {
        prev.disconnect();
      }
      return instance;
    });

    return () => {
      instance.disconnect();
    };
  }, [user?.id]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
