import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, ScrollView, Alert, Linking, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';

interface EmergencyModalProps {
    visible: boolean;
    onClose: () => void;
}

interface Hospital {
    name: string;
    vicinity: string;
    distance?: string;
    place_id: string;
}

export function EmergencyModal({ visible, onClose }: EmergencyModalProps) {
    const [loading, setLoading] = useState(false);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [viewMode, setViewMode] = useState<'menu' | 'hospitals'>('menu');

    const EMERGENCY_NUMBER = '7387130524';

    useEffect(() => {
        if (visible) {
            setViewMode('menu'); // Reset to menu on open
            (async () => {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission to access location was denied');
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setLocation(location);
            })();
        }
    }, [visible]);

    const triggerEmergencyAction = async (type: 'AMBULANCE' | 'CONTACT') => {
        if (!location) {
            Alert.alert("Location Not Found", "Cannot detect location for emergency call.");
            return;
        }

        try {
            // Android Emulator uses 10.0.2.2 to access host localhost
            // For physical device, change '192.168.60.170' to your machine's LAN IP
            const API_URL = Platform.OS === 'android' ? 'http://192.168.60.170:5000' : 'http://localhost:5000';

            // 1. Send SMS (Existing Logic)
            await fetch(`${API_URL}/api/emergency/alert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, coords: location.coords })
            });

            // 2. Trigger Automated Voice Call (New Logic)
            await fetch(`${API_URL}/api/emergency/automated-call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, coords: location.coords })
            });

            Alert.alert("Emergency Alert Sent", "Ambulance/Contact is being called automatically with your location.");
        } catch (error) {
            console.error("Failed to trigger emergency", error);
            Alert.alert("Connection Failed", "Could not reach server. Please dial 7387130524 directly.");
            Linking.openURL(`tel:7387130524`);
        }
    }

    const handleCallAmbulance = () => {
        Alert.alert(
            "Confirm Ambulance",
            "This will trigger an automated call to emergency services with your location.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", style: "destructive", onPress: () => triggerEmergencyAction('AMBULANCE') }
            ]
        );
    };

    const handleEmergencyContact = () => {
        Alert.alert(
            "Confirm Alert",
            "This will trigger an automated call to your contact with your location.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => triggerEmergencyAction('CONTACT') }
            ]
        );
    };


    const fetchLikelyHospitals = async () => {
        if (!location) {
            Alert.alert("Location not available", "Please try again in a moment.");
            return;
        }
        setLoading(true);
        setViewMode('hospitals');

        try {
            const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

            const response = await fetch(`${API_URL}/api/emergency/hospitals?lat=${location.coords.latitude}&lng=${location.coords.longitude}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setHospitals(data);
        } catch (error) {
            console.log("Error fetching hospitals:", error);
            Alert.alert("Network Error", "Showing offline data.");
            setHospitals([
                { name: "City General Hospital", vicinity: "Emergency Ward", place_id: "1" },
                { name: "Apollo Hospital", vicinity: "Main Road", place_id: "2" },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleHospitalTap = (hospital: Hospital) => {
        // Since we don't have real phone numbers from Places API yet without the backend details
        // We will default to the emergency number as a fallback or open maps
        Alert.alert(
            "Contact Hospital",
            `Call ${hospital.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Call Emergency Line", onPress: () => Linking.openURL(`tel:${EMERGENCY_NUMBER}`) },
                { text: "Open Maps", onPress: () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + hospital.vicinity)}`) }
            ]
        );
    };


    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end">
                {/* Backdrop */}
                <TouchableOpacity
                    className="absolute top-0 bottom-0 left-0 right-0 bg-black/60"
                    onPress={onClose}
                    activeOpacity={1}
                />

                <View className="bg-slate-900 rounded-t-3xl border-t border-slate-700 min-h-[50%] pb-10">
                    <View className="items-center py-4">
                        <View className="w-16 h-1 bg-slate-700 rounded-full" />
                    </View>

                    <View className="px-6 mb-6 flex-row justify-between items-center">
                        <View>
                            <Text className="text-white text-2xl font-bold flex-row items-center">
                                <Ionicons name="warning" size={24} color="#ef4444" style={{ marginRight: 8 }} />
                                Emergency Assistance
                            </Text>
                            <Text className="text-slate-400 text-sm mt-1">
                                {viewMode === 'menu' ? "Select an option for immediate help" : "Nearby Medical Centers"}
                            </Text>
                        </View>
                        {viewMode === 'hospitals' && (
                            <TouchableOpacity onPress={() => setViewMode('menu')} className="bg-slate-800 p-2 rounded-full">
                                <Ionicons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {viewMode === 'menu' ? (
                        <View className="px-6 space-y-4">
                            {/* Option 1: Find Hospitals */}
                            <TouchableOpacity
                                onPress={fetchLikelyHospitals}
                                className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl flex-row items-center"
                            >
                                <View className="bg-blue-500 w-12 h-12 rounded-full items-center justify-center mr-4">
                                    <MaterialCommunityIcons name="hospital-marker" size={28} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-lg font-bold">Find Nearby Hospitals</Text>
                                    <Text className="text-blue-200 text-xs">View list & call directly</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#60a5fa" />
                            </TouchableOpacity>

                            {/* Option 2: Call Ambulance */}
                            <TouchableOpacity
                                onPress={handleCallAmbulance}
                                className="bg-red-600/20 border border-red-500/50 p-4 rounded-xl flex-row items-center"
                            >
                                <View className="bg-red-600 w-12 h-12 rounded-full items-center justify-center mr-4 animate-pulse">
                                    <MaterialCommunityIcons name="ambulance" size={28} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-lg font-bold">Call Ambulance</Text>
                                    <Text className="text-red-200 text-xs">Dial 7387130524 & Share Location</Text>
                                </View>
                                <Ionicons name="call" size={24} color="#f87171" />
                            </TouchableOpacity>

                            {/* Option 3: Emergency Contact */}
                            <TouchableOpacity
                                onPress={handleEmergencyContact}
                                className="bg-orange-600/20 border border-orange-500/50 p-4 rounded-xl flex-row items-center"
                            >
                                <View className="bg-orange-500 w-12 h-12 rounded-full items-center justify-center mr-4">
                                    <Ionicons name="person" size={28} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-lg font-bold">Emergency Contact</Text>
                                    <Text className="text-orange-200 text-xs">Alert Friend (7387130524)</Text>
                                </View>
                                <Ionicons name="send" size={24} color="#fb923c" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="px-6 flex-1 h-96">
                            {loading ? (
                                <View className="flex-1 items-center justify-center">
                                    <ActivityIndicator size="large" color="#60a5fa" />
                                    <Text className="text-white mt-4">Locating hospitals...</Text>
                                </View>
                            ) : (
                                <ScrollView className="flex-1">
                                    {hospitals.map((hospital, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => handleHospitalTap(hospital)}
                                            className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700 flex-row items-center"
                                        >
                                            <View className="bg-slate-700 w-10 h-10 rounded-full items-center justify-center mr-3">
                                                <MaterialCommunityIcons name="hospital-box" size={20} color="#ef4444" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-white font-bold text-base">{hospital.name}</Text>
                                                <Text className="text-slate-400 text-xs">{hospital.vicinity}</Text>
                                            </View>
                                            <View className="bg-green-600/20 p-2 rounded-full">
                                                <Ionicons name="call" size={18} color="#4ade80" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity onPress={() => setViewMode('menu')} className="mt-4 items-center">
                                        <Text className="text-slate-500">Back to Options</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
