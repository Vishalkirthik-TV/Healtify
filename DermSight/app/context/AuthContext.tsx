import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

interface User {
    id: string;
    name: string;
    email: string;
    medicalHistory?: any;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStorageData();
    }, []);

    const loadStorageData = async () => {
        try {
            const storedToken = await SecureStore.getItemAsync('userToken');
            const storedUser = await SecureStore.getItemAsync('userData');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                // Set default axios header
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }
        } catch (e) {
            console.error("Failed to load auth data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        await SecureStore.setItemAsync('userToken', newToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(newUser));
    };

    const logout = async () => {
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
