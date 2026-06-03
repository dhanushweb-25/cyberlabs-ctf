import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  rank?: number;
  created_at: string;
  is_admin: boolean;
}


export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Auth State from LocalStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('ctf_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async (authToken: string, showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const res = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser({
          id: 0, // Profile detail doesn't include raw ID in response but let's map it
          username: data.username,
          email: data.email,
          points: data.points,
          rank: data.rank,
          created_at: data.join_date,
          is_admin: data.is_admin
        });
      } else {
        // Token might have expired
        logout();
      }
    } catch (err) {
      console.error("Error fetching user profile", err);
      // Don't log out on temporary network issues, just stop loading
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, confirmPassword: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          password,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      // Automatically log in after registration
      await login(username, password, false);
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setIsLoading(false);
      throw err;
    }
  };

  const login = async (username: string, password: string, rememberMe: boolean) => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          remember_me: rememberMe
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      const authToken = data.access_token;
      setToken(authToken);
      localStorage.setItem('ctf_token', authToken);
      await fetchUserProfile(authToken);
    } catch (err: any) {
      setError(err.message || "Login failed");
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ctf_token');
    setError(null);
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  const refreshProfile = async () => {
    if (token) {
      await fetchUserProfile(token, false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    register,
    login,
    logout,
    clearError,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
