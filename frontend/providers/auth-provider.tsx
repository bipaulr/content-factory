'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface LocalUser {
  user_id: string;
  email: string;
  name: string;
  google_id?: string;
  image_url?: string;
  created_at: string;
  last_login: string;
}

interface AuthContextType {
  localUser: LocalUser | null;
  isLocalAuth: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  localUser: null,
  isLocalAuth: false,
  loading: true,
});

export function useLocalAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for local auth token on mount
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as LocalUser;
        setLocalUser(user);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ localUser, isLocalAuth: !!localUser, loading }}>
      <SessionProvider>
        {children}
      </SessionProvider>
    </AuthContext.Provider>
  );
}
