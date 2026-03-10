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
        <Screen safeArea scrollable className="px-6 py-6" style={{ backgroundColor: '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 100, backgroundColor: '#FFFFFF' }} footer={<Navbar />}>
            <View className="flex-row items-center justify-between mb-6">
                <View>
                    <Text className="text-slate-900 text-2xl font-bold">Hello!</Text>
                    <Text className="text-slate-500 text-lg">How can I help you today?</Text>
                </View>
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={() => setEmergencyModalVisible(true)}
                        className="bg-red-500/20 border border-red-500/50 p-2 rounded-full animate-pulse"
                    >
                        <Ionicons name="warning" size={24} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-slate-100 p-2.5 rounded-full border border-slate-200">
                        <Ionicons name="notifications-outline" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Emergency Modal */}
            <EmergencyModal
                visible={emergencyModalVisible}
                onClose={() => setEmergencyModalVisible(false)}
            />

            {/* Primary Action - Talk to AI */}
            <Card className="bg-purple-50 border-purple-100 mb-6 shadow-sm overflow-hidden" >
                <View className="absolute right-0 top-0 bottom-0 w-32 bg-purple-100/50 -skew-x-12 translate-x-8" />
                <View className="p-6">
                    <View className="bg-purple-100 w-12 h-12 rounded-full items-center justify-center mb-4 border border-purple-200">
                        <MaterialCommunityIcons name="robot-excited-outline" size={28} color="#9333ea" />
                    </View>
                    <Text className="text-slate-900 text-2xl font-bold mb-2">Talk to AI Assistant</Text>
                    <Text className="text-slate-600 text-base mb-6 leading-6">
                        Start a live video triage with our AI avatar. Describe your symptoms and show the condition.
                    </Text>
                    <Button
                        title="Start Live Triage"
                        onPress={() => router.push('/(main)/avatar-triage')}
                        variant="primary"
                        className="bg-purple-600 shadow-md shadow-purple-200"
                        icon={<Ionicons name="videocam" size={20} color="white" />}
                    />
                </View>
            </Card >

            {/* Secondary Actions */}
            < View className="flex-row gap-4 mb-6" >
                <TouchableOpacity className="flex-1" onPress={() => router.push('/(main)/history')}>
                    <Card className="bg-white border-slate-100 p-5 shadow-sm">
                        <View className="bg-purple-50 w-12 h-12 rounded-full items-center justify-center mb-4 border border-purple-100">
                            <Ionicons name="time-outline" size={26} color="#9333ea" />
                        </View>
                        <Text className="text-slate-900 font-bold text-lg mb-1">History</Text>
                        <Text className="text-sm text-slate-500">Past assessments</Text>
                    </Card>
                </TouchableOpacity>

                <TouchableOpacity className="flex-1" onPress={() => router.push('https://www.google.com/maps/search/dermatologist+near+me')}>
                    <Card className="bg-white border-slate-100 p-5 shadow-sm">
                        <View className="bg-purple-50 w-12 h-12 rounded-full items-center justify-center mb-4 border border-purple-100">
                            <Ionicons name="location-outline" size={26} color="#9333ea" />
                        </View>
                        <Text className="text-slate-900 font-bold text-lg mb-1">Find Doctor</Text>
                        <Text className="text-sm text-slate-500">Nearby specialists</Text>
                    </Card>
                </TouchableOpacity>
            </View >

            {/* Tertiary Action - Health Insights (1x2 Rectangular Card) */}
            <TouchableOpacity onPress={() => router.push('/(main)/history')}>
                <Card className="bg-white border-slate-100 p-6 shadow-sm overflow-hidden mb-6">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                            <View className="flex-row items-center mb-2">
                                <View className="bg-purple-50 p-2 rounded-lg border border-purple-100 mr-3">
                                    <Ionicons name="trending-up-outline" size={20} color="#9333ea" />
                                </View>
                                <Text className="text-slate-900 font-bold text-xl">Smart Health Insights</Text>
                            </View>
                            <Text className="text-slate-500 text-sm leading-5">
                                View personalized skin care tips and track your condition's progress over time.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#e2e8f0" />
                    </View>
                </Card>
            </TouchableOpacity>
        </Screen >
    );
}
