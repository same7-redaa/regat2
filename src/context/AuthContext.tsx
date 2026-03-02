import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: any | null;
    isLoading: boolean;
    login: (userData: any) => void;
    logout: () => void;
    hasPermission: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const storedUserStr = Cookies.get('ma5zon_user');
            if (storedUserStr) {
                try {
                    const storedUser = JSON.parse(storedUserStr);
                    // Verify user still exists and permissions are up to date
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('username', storedUser.username)
                        .eq('password', storedUser.password)
                        .single();

                    if (data && !error) {
                        setUser(data);
                    } else {
                        Cookies.remove('ma5zon_user');
                    }
                } catch (err) {
                    Cookies.remove('ma5zon_user');
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const login = (userData: any) => {
        setUser(userData);
        Cookies.set('ma5zon_user', JSON.stringify(userData), { expires: 7 }); // 7 days
    };

    const logout = () => {
        setUser(null);
        Cookies.remove('ma5zon_user');
        window.location.href = '/login';
    };

    const hasPermission = (page: string) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (Array.isArray(user.permissions) && user.permissions.includes(page)) return true;
        return false;
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
