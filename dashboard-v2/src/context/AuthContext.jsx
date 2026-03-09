import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'https://synapse-backend.up.railway.app';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        // Only store the lightweight profile (no password) in sessionStorage
        // so the tab stays logged in on refresh but doesn't persist cross-device
        try { return JSON.parse(sessionStorage.getItem('synapse_user')); } catch { return null; }
    });

    const login = useCallback(async (email, password) => {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });
            const data = await res.json();
            if (!res.ok) return { success: false, error: data.error || 'Invalid credentials' };
            sessionStorage.setItem('synapse_user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true, user: data.user };
        } catch {
            return { success: false, error: 'Could not reach server' };
        }
    }, []);

    const signup = useCallback(async (name, email, password, role) => {
        try {
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email: email.trim().toLowerCase(), password, role }),
            });
            const data = await res.json();
            if (!res.ok) return { success: false, error: data.error || 'Signup failed' };
            sessionStorage.setItem('synapse_user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true, user: data.user };
        } catch {
            return { success: false, error: 'Could not reach server' };
        }
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem('synapse_user');
        setUser(null);
    }, []);

    const getDemoCredentials = useCallback((role) => {
        return role === 'teacher'
            ? { email: 'teacher@demo.com', password: 'demo1234' }
            : { email: 'student@demo.com', password: 'demo1234' };
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, getDemoCredentials }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
