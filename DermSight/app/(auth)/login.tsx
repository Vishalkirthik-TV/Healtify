import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            await login(response.data.token, response.data.user);
            router.replace('/(main)');
        } catch (error: any) {
            console.error(error);
            Alert.alert("Login Failed", error.response?.data?.error || "Invalid email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Screen className="bg-slate-950 flex-1">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                    <TouchableOpacity onPress={() => router.push('/onboarding')} className="mb-8 items-start">
                        <Ionicons name="help-circle-outline" size={24} color="white" />
                    </TouchableOpacity>

                    <Text className="text-white text-4xl font-bold mb-2">Welcome Back</Text>
                    <Text className="text-white/60 text-lg mb-12">Continue your skin health tracking</Text>

                    <View className="space-y-6">
                        <View>
                            <Text className="text-white/80 text-sm font-medium mb-2 ml-1">Email Address</Text>
                            <TextInput
                                className="bg-white/10 p-5 rounded-2xl text-white border border-white/10"
                                placeholder="name@domain.com"
                                placeholderTextColor="#ffffff40"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View>
                            <Text className="text-white/80 text-sm font-medium mb-2 ml-1">Password</Text>
                            <TextInput
                                className="bg-white/10 p-5 rounded-2xl text-white border border-white/10"
                                placeholder="••••••••"
                                placeholderTextColor="#ffffff40"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={isLoading}
                            className="bg-cyan-600 p-5 rounded-2xl items-center shadow-lg shadow-cyan-500/20"
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-xl">Login</Text>
                            )}
                        </TouchableOpacity>

                        <View className="flex-row justify-center space-x-2">
                            <Text className="text-white/60 text-lg">New to DermSight?</Text>
                            <TouchableOpacity onPress={() => router.push('/signup')}>
                                <Text className="text-cyan-400 font-bold text-lg">Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}
