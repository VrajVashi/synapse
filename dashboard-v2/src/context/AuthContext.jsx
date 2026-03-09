import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const MOCK_USERS = [
    { email: 'teacher@demo.com', password: 'demo1234', role: 'teacher', name: 'Demo Teacher' },
    { email: 'student@demo.com', password: 'demo1234', role: 'student', name: 'Demo Student' },
    { email: 'vraj@synapse.dev', password: 'demo1234', role: 'teacher', name: 'Vraj Vashi' },
];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('synapse_user')); } catch { return null; }
    });

    const login = useCallback((email, password) => {
        const e = email.trim().toLowerCase();
        const found = MOCK_USERS.find(u => u.email === e && u.password === password);
        if (found) {
            localStorage.setItem('synapse_user', JSON.stringify(found));
            setUser(found);
            return { success: true, user: found };
        }
        const stored = JSON.parse(localStorage.getItem('synapse_users') || '[]');
        const stUser = stored.find(u => u.email === e && u.password === password);
        if (stUser) {
            localStorage.setItem('synapse_user', JSON.stringify(stUser));
            setUser(stUser);
            return { success: true, user: stUser };
        }
        return { success: false, error: 'Invalid credentials' };
    }, []);

    const signup = useCallback((name, email, password, role) => {
        const newUser = { email: email.trim().toLowerCase(), password, role, name };
        const users = JSON.parse(localStorage.getItem('synapse_users') || '[]');
        users.push(newUser);
        localStorage.setItem('synapse_users', JSON.stringify(users));
        localStorage.setItem('synapse_user', JSON.stringify(newUser));
        setUser(newUser);
        return newUser;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('synapse_user');
        setUser(null);
    }, []);

    const getDemoCredentials = useCallback((role) => {
        const acct = role === 'teacher' ? MOCK_USERS[0] : MOCK_USERS[1];
        return { email: acct.email, password: acct.password };
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
