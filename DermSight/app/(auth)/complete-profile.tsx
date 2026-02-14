import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { API_URL } from '../../constants/Config';

const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];

export default function CompleteProfile() {
    const { user, updateUser, token } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [history, setHistory] = useState({
        chronicConditions: '',
        allergies: '',
        skinType: 'Normal',
        pastIssues: ''
    });

    const [uploadedFile, setUploadedFile] = useState<any>(null);

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setUploadedFile(result.assets[0]);
                Alert.alert("File Selected", `Ready to upload: ${result.assets[0].name}`);
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const handleUpload = async () => {
        if (!uploadedFile) {
            Alert.alert("Error", "Please select a PDF first");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            // @ts-ignore
            formData.append('report', {
                uri: uploadedFile.uri,
                name: uploadedFile.name,
                type: 'application/pdf',
            });

            const response = await axios.post(`${API_URL}/auth/upload-report`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            updateUser(response.data.user);
            Alert.alert("Success", "Report uploaded and history updated!", [
                { text: "Continue", onPress: () => router.replace('/(main)') }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Upload Failed", "Could not process report.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFinish = async () => {
        setIsLoading(true);
        try {
            const formattedHistory = {
                ...history,
                chronicConditions: history.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
                allergies: history.allergies.split(',').map(s => s.trim()).filter(Boolean),
            };

            const response = await axios.post(`${API_URL}/auth/profile/medical-history`, {
                medicalHistory: formattedHistory
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            updateUser(response.data);
            router.replace('/(main)');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save profile.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Screen className="bg-slate-950 flex-1">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    <Text className="text-white text-3xl font-bold mb-2">Complete Profile</Text>
                    <Text className="text-white/60 text-lg mb-8">Help us personalize your triage experience</Text>

                    {/* PDF Section */}
                    <View className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">
                        <View className="flex-row items-center mb-4 space-x-3">
                            <Ionicons name="document-text" size={24} color="#14b8a6" />
                            <Text className="text-white text-xl font-bold">Medical Report (Optional)</Text>
                        </View>
                        <Text className="text-white/50 mb-6">Upload a recent skin report or medical history to help our AI understand your case better.</Text>

                        <TouchableOpacity
                            onPress={handlePickDocument}
                            className="bg-teal-600/20 border border-teal-500/30 p-5 rounded-2xl items-center mb-4"
                        >
                            <Ionicons name="cloud-upload-outline" size={32} color="#2dd4bf" />
                            <Text className="text-teal-400 font-bold mt-2">
                                {uploadedFile ? uploadedFile.name : "Select PDF Report"}
                            </Text>
                        </TouchableOpacity>

                        {uploadedFile && (
                            <TouchableOpacity
                                onPress={handleUpload}
                                disabled={isUploading}
                                className="bg-teal-600 p-4 rounded-xl items-center"
                            >
                                {isUploading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Upload & Process Report</Text>}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Manual Entry Section */}
                    <View className="space-y-6">
                        <Text className="text-white text-xl font-bold mb-2">Medical History</Text>

                        <View>
                            <Text className="text-white/60 text-sm mb-2">Chronic Conditions</Text>
                            <TextInput
                                className="bg-white/5 p-5 rounded-2xl text-white border border-white/10"
                                placeholder="e.g. Eczema, Psoriasis"
                                placeholderTextColor="#ffffff30"
                                value={history.chronicConditions}
                                onChangeText={(t) => setHistory({ ...history, chronicConditions: t })}
                            />
                        </View>

                        <View>
                            <Text className="text-white/60 text-sm mb-2">Allergies</Text>
                            <TextInput
                                className="bg-white/5 p-5 rounded-2xl text-white border border-white/10"
                                placeholder="e.g. Latex, Penicillin"
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

                        <TouchableOpacity
                            onPress={handleFinish}
                            disabled={isLoading}
                            className="bg-cyan-600 p-5 rounded-2xl items-center shadow-lg shadow-cyan-500/20 mt-4"
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-xl">Finish & Continue</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.replace('/(main)')} className="items-center py-4">
                            <Text className="text-white/40">Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}
