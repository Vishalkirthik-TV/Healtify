import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Navbar } from '../../components/Navbar';
import { Ionicons } from '@expo/vector-icons';

export default function History() {
    return (
        <Screen className="bg-slate-950 flex-1">
            <View className="px-6 py-8 border-b border-white/10">
                <Text className="text-white text-3xl font-bold">History</Text>
                <Text className="text-white/40 mt-1">Your past dermatological assessments</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                <View className="items-center justify-center py-20">
                    <View className="bg-slate-900 p-6 rounded-full mb-4">
                        <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
                    </View>
                    <Text className="text-white text-lg font-bold">No history yet</Text>
                    <Text className="text-white/40 text-center mt-2 px-10">
                        Start a triage session to see your assessments saved here.
                    </Text>
                </View>
            </ScrollView>

            <Navbar />
        </Screen>
    );
}
