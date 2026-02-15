import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';

export default function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSignUp = async () => {
        if (!name || !email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/auth/register`, { name, email, password });
            await login(response.data.token, response.data.user);
            router.replace('/complete-profile');
        } catch (error: any) {
            console.error(error);
            Alert.alert("Sign Up Failed", error.response?.data?.error || "Check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Screen className="bg-white flex-1">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                    <TouchableOpacity onPress={() => router.back()} className="mb-8">
                        <Ionicons name="arrow-back" size={28} color="#9333ea" />
                    </TouchableOpacity>

                    <Text className="text-slate-900 text-4xl font-bold mb-2">Create Account</Text>
                    <Text className="text-slate-500 text-lg mb-12">Start your personalized health journey</Text>

                    <View className="space-y-6">
                        <View>
                            <Text className="text-slate-700 text-base font-semibold mb-3 ml-1">Full Name</Text>
                            <TextInput
                                className="bg-slate-50 p-5 rounded-2xl text-slate-900 border border-slate-200 focus:border-purple-500"
                                placeholder="John Doe"
                                placeholderTextColor="#94a3b8"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View>
                            <Text className="text-slate-700 text-base font-semibold mb-3 ml-1">Email Address</Text>
                            <TextInput
                                className="bg-slate-50 p-5 rounded-2xl text-slate-900 border border-slate-200 focus:border-purple-500"
                                placeholder="name@domain.com"
                                placeholderTextColor="#94a3b8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View>
                            <Text className="text-slate-700 text-base font-semibold mb-3 ml-1">Password</Text>
                            <TextInput
                                className="bg-slate-50 p-5 rounded-2xl text-slate-900 border border-slate-200 focus:border-purple-500"
                                placeholder="••••••••"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSignUp}
                            disabled={isLoading}
                            className="bg-purple-600 p-5 rounded-2xl items-center shadow-lg shadow-purple-200"
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-xl">Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <View className="flex-row justify-center space-x-2">
                            <Text className="text-slate-500 text-lg">Already have an account?</Text>
                            <TouchableOpacity onPress={() => router.push('/login')}>
                                <Text className="text-purple-600 font-bold text-lg">Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}
