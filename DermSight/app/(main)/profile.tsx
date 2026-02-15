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
        <Screen safeArea scrollable className="bg-white" style={{ backgroundColor: '#ffffff' }} contentContainerStyle={{ backgroundColor: '#ffffff', paddingBottom: 120 }} footer={<Navbar />}>
            <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="close" size={28} color="#9333ea" />
                </TouchableOpacity>
                <Text className="text-slate-900 text-xl font-bold">My Profile</Text>
                <TouchableOpacity onPress={logout} className="bg-red-50 px-4 py-2 rounded-full border border-red-100">
                    <Text className="text-red-600 font-bold text-sm">Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1">
                <View className="items-center py-10 px-6">
                    <View className="w-28 h-28 bg-purple-50 rounded-full items-center justify-center mb-5 border-4 border-purple-100 shadow-sm">
                        <Text className="text-purple-600 text-4xl font-bold">{user?.name?.charAt(0)}</Text>
                    </View>
                    <Text className="text-slate-900 text-3xl font-bold mb-1">{user?.name}</Text>
                    <Text className="text-slate-500 text-base">{user?.email}</Text>
                </View>

                <View className="px-6 space-y-10 pb-10">
                    <Text className="text-slate-900 text-2xl font-bold mb-2">Medical History</Text>

                    <View>
                        <Text className="text-slate-700 text-base font-semibold mb-3 ml-1">Chronic Conditions</Text>
                        <TextInput
                            className="bg-slate-50 p-5 rounded-2xl text-slate-900 border border-slate-200 focus:border-purple-500"
                            placeholder="e.g. Eczema, Psoriasis"
                            placeholderTextColor="#94a3b8"
                            value={history.chronicConditions}
                            onChangeText={(t) => setHistory({ ...history, chronicConditions: t })}
                        />
                    </View>

                    <View>
                        <Text className="text-slate-700 text-base font-semibold mb-3 ml-1">Allergies</Text>
                        <TextInput
                            className="bg-slate-50 p-5 rounded-2xl text-slate-900 border border-slate-200 focus:border-purple-500"
                            placeholder="e.g. Penicillin, Latex"
                            placeholderTextColor="#94a3b8"
                            value={history.allergies}
                            onChangeText={(t) => setHistory({ ...history, allergies: t })}
                        />
                    </View>

                    <View>
                        <Text className="text-slate-700 text-base font-semibold mb-3 ml-1">Skin Type</Text>
                        <View className="flex-row flex-wrap gap-3">
                            {SKIN_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setHistory({ ...history, skinType: type })}
                                    className={`px-5 py-3 rounded-full border ${history.skinType === type ? 'bg-purple-600 border-purple-600 shadow-md shadow-purple-200' : 'bg-white border-slate-200 shadow-sm'}`}
                                >
                                    <Text className={`text-sm ${history.skinType === type ? 'text-white font-bold' : 'text-slate-600'}`}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text className="text-slate-700 text-base font-semibold mb-3 ml-1">Relevant Past Issues</Text>
                        <TextInput
                            className="bg-slate-50 p-5 rounded-3xl text-slate-900 border border-slate-200 focus:border-purple-500"
                            placeholder="Describe any past dermatological issues..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={history.pastIssues}
                            onChangeText={(t) => setHistory({ ...history, pastIssues: t })}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isLoading}
                        className="bg-purple-600 p-5 rounded-2xl items-center shadow-lg shadow-purple-200 mt-4"
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-xl">Save History</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Screen>
    );
}
