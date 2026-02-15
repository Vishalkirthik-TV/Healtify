import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '../../components/Screen';
import { Navbar } from '../../components/Navbar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function History() {
    const router = useRouter();
    return (
        <Screen safeArea scrollable className="bg-white" style={{ backgroundColor: '#ffffff' }} contentContainerStyle={{ backgroundColor: '#ffffff' }} footer={<Navbar />}>
            <View className="px-6 py-8 border-b border-slate-100 flex-row items-center space-x-4">
                <TouchableOpacity onPress={() => router.back()} className="mr-2">
                    <Ionicons name="arrow-back" size={28} color="#9333ea" />
                </TouchableOpacity>
                <View>
                    <Text className="text-slate-900 text-3xl font-bold">History</Text>
                    <Text className="text-slate-500 mt-1">Your past dermatological assessments</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                <View className="items-center justify-center py-24">
                    <View className="bg-purple-50 p-8 rounded-full mb-6 border border-purple-100 shadow-sm">
                        <Ionicons name="document-text-outline" size={56} color="#9333ea" />
                    </View>
                    <Text className="text-slate-900 text-2xl font-bold mb-2">No history yet</Text>
                    <Text className="text-slate-500 text-center text-base px-10 leading-6">
                        Start a triage session to see your assessments saved here.
                    </Text>
                </View>
            </ScrollView>
        </Screen>
    );
}
