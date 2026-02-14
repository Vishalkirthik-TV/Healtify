import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';

const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];

export default function Profile() {
    const { user, updateUser, logout } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [history, setHistory] = useState({
        chronicConditions: user?.medicalHistory?.chronicConditions?.join(', ') || '',
        allergies: user?.medicalHistory?.allergies?.join(', ') || '',
        skinType: user?.medicalHistory?.skinType || 'Normal',
        pastIssues: user?.medicalHistory?.pastIssues || ''
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const formattedHistory = {
                ...history,
                chronicConditions: history.chronicConditions.split(',').map((s: string) => s.trim()).filter(Boolean),
                allergies: history.allergies.split(',').map((s: string) => s.trim()).filter(Boolean),
            };

            const response = await axios.post(`${API_URL}/auth/profile/medical-history`, {
                medicalHistory: formattedHistory
            });

            updateUser(response.data);
            Alert.alert("Success", "Medical history updated!");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Screen className="bg-slate-950 flex-1">
            <View className="p-6 flex-row items-center justify-between border-b border-white/10">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">My Profile</Text>
                <TouchableOpacity onPress={logout} className="bg-red-500/10 px-4 py-2 rounded-full">
                    <Text className="text-red-400 font-bold">Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="p-6" contentContainerStyle={{ paddingBottom: 120 }}>
                <View className="items-center mb-8">
                    <View className="w-24 h-24 bg-teal-500/20 rounded-full items-center justify-center mb-4">
                        <Text className="text-teal-400 text-3xl font-bold">{user?.name?.charAt(0)}</Text>
                    </View>
                    <Text className="text-white text-2xl font-bold">{user?.name}</Text>
                    <Text className="text-white/40">{user?.email}</Text>
                </View>

                <View className="space-y-6 mb-12">
                    <Text className="text-white text-lg font-bold mb-2">Medical History</Text>

                    <View>
                        <Text className="text-white/60 text-sm mb-2">Chronic Conditions (comma separated)</Text>
                        <TextInput
                            className="bg-white/5 p-4 rounded-xl text-white border border-white/10"
                            placeholder="e.g. Eczema, Psoriasis"
                            placeholderTextColor="#ffffff30"
                            value={history.chronicConditions}
                            onChangeText={(t) => setHistory({ ...history, chronicConditions: t })}
                        />
                    </View>

                    <View>
                        <Text className="text-white/60 text-sm mb-2">Allergies (comma separated)</Text>
                        <TextInput
                            className="bg-white/5 p-4 rounded-xl text-white border border-white/10"
                            placeholder="e.g. Penicillin, Latex"
                            placeholderTextColor="#ffffff30"
                            value={history.allergies}
                            onChangeText={(t) => setHistory({ ...history, allergies: t })}
                        />
                    </View>

                    <View>
                        <Text className="text-white/60 text-sm mb-2">Skin Type</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {SKIN_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setHistory({ ...history, skinType: type })}
                                    className={`px-4 py-2 rounded-full border ${history.skinType === type ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-white/20'}`}
                                >
                                    <Text className={`text-sm ${history.skinType === type ? 'text-white font-bold' : 'text-white/60'}`}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text className="text-white/60 text-sm mb-2">Relevant Past Issues</Text>
                        <TextInput
                            className="bg-white/5 p-4 rounded-xl text-white border border-white/10"
                            placeholder="Describe any past dermatological issues..."
                            placeholderTextColor="#ffffff30"
                            multiline
                            numberOfLines={4}
                            value={history.pastIssues}
                            onChangeText={(t) => setHistory({ ...history, pastIssues: t })}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isLoading}
                        className="bg-teal-600 p-5 rounded-2xl items-center shadow-lg"
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Save History</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <Navbar />
        </Screen>
    );
}
