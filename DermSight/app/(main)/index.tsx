import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../components/Screen";
import { Navbar } from "../../components/Navbar";
import { Title, Subtitle, Body, Caption } from "../../components/Typography";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera, History, AlertTriangle, ChevronRight, MessageCircle } from "lucide-react-native";
import { EmergencyModal } from "../../components/EmergencyModal";

export default function Home() {
    const router = useRouter();
    const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);

    return (
        <Screen safeArea scrollable className="px-6 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
            <View className="flex-row items-center justify-between mb-6">
                <View>
                    <Text className="text-white text-xl font-bold">Hello!</Text>
                    <Text className="text-slate-400">How can I help you today?</Text>
                </View>
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={() => setEmergencyModalVisible(true)}
                        className="bg-red-500/20 border border-red-500/50 p-2 rounded-full animate-pulse"
                    >
                        <Ionicons name="warning" size={24} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-slate-800 p-2 rounded-full">
                        <Ionicons name="notifications-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Emergency Modal */}
            <EmergencyModal
                visible={emergencyModalVisible}
                onClose={() => setEmergencyModalVisible(false)}
            />

            {/* Primary Action - Talk to AI */}
            <Card className="bg-teal-900/40 border-teal-500/30 mb-6 overflow-hidden" >
                <View className="absolute right-0 top-0 bottom-0 w-32 bg-teal-500/10 -skew-x-12 translate-x-8" />
                <View className="p-6">
                    <View className="bg-teal-500/20 w-12 h-12 rounded-full items-center justify-center mb-4">
                        <MaterialCommunityIcons name="robot-excited-outline" size={28} color="#2dd4bf" />
                    </View>
                    <Text className="text-white text-xl font-bold mb-2">Talk to AI Assistant</Text>
                    <Text className="text-slate-300 mb-6">
                        Start a live video triage with our AI avatar. Describe your symptoms and show the condition.
                    </Text>
                    <Button
                        title="Start Live Triage"
                        onPress={() => router.push('/(main)/avatar-triage')}
                        variant="primary"
                        icon={<Ionicons name="videocam" size={20} color="white" />}
                    />
                </View>
            </Card >

            {/* Secondary Actions */}
            < View className="flex-row gap-4 mb-6" >
                <TouchableOpacity className="flex-1" onPress={() => router.push('/(main)/history')}>
                    <Card className="bg-slate-900 border-slate-800 p-4">
                        <View className="bg-blue-500/20 w-10 h-10 rounded-full items-center justify-center mb-3">
                            <Ionicons name="time-outline" size={24} color="#60a5fa" />
                        </View>
                        <Text className="text-white font-bold mb-1">History</Text>
                        <Text className="text-xs text-slate-500">Past assessments</Text>
                    </Card>
                </TouchableOpacity>

                <TouchableOpacity className="flex-1" onPress={() => router.push('https://www.google.com/maps/search/dermatologist+near+me')}>
                    <Card className="bg-slate-900 border-slate-800 p-4">
                        <View className="bg-purple-500/20 w-10 h-10 rounded-full items-center justify-center mb-3">
                            <Ionicons name="location-outline" size={24} color="#c084fc" />
                        </View>
                        <Text className="text-white font-bold mb-1">Find Doctor</Text>
                        <Text className="text-xs text-slate-500">Nearby specialists</Text>
                    </Card>
                </TouchableOpacity>
            </View >
            <Navbar />
        </Screen >
    );
}
