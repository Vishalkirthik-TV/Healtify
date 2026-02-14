import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen } from '../../components/Screen';
import AvatarView from '../components/AvatarView';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import axios from 'axios';
import { API_URL } from '../../constants/Config';

const { width } = Dimensions.get('window');

export default function AvatarTriage() {
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const router = useRouter();
    const cameraRef = useRef<CameraView>(null);
    const [isListening, setIsListening] = useState(false);
    const [aiStatus, setAiStatus] = useState("Initializing...");
    const [sessionId] = useState(`session-${Date.now()}`);
    const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const [lockedImageUri, setLockedImageUri] = useState<string | null>(null);
    const [riskAssessment, setRiskAssessment] = useState<{
        risk: 'Low' | 'Moderate' | 'High';
        confidence: number;
        redFlags: string[];
        escalate: boolean;
    } | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const isCameraOnRef = useRef(true);
    const [publicImageUrl, setPublicImageUrl] = useState<string | null>(null);
    const [captionText, setCaptionText] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<{ role: string; text: string; image?: string }[]>([]);
    const [conditionSuggestions, setConditionSuggestions] = useState<{ name: string; imageUrl: string }[] | null>(null);

    useEffect(() => {
        // Start background analysis loop ONLY if image is not locked
        if (!lockedImageUri) {
            startContinuousMonitoring();
        }

        // Initial greeting
        if (!lockedImageUri && sessionId.includes(String(Date.now()).substring(0, 8))) {
            speak("What happened? Point the camera at the affected area and tell me about your symptoms.");
        }

        return () => {
            stopContinuousMonitoring();
            Speech.stop();
            setCaptionText(null);
        };
    }, [lockedImageUri]);

    const resetLockedImage = () => {
        setLockedImageUri(null);
        setRiskAssessment(null);
        setAiStatus("Ready to Scan");
        speak("Okay, point the camera at the new area.");
    };

    const speak = (text: string, language: string = 'en') => {
        setAiStatus("Speaking...");
        setIsSpeaking(true);
        setCaptionText(text);
        Speech.speak(text, {
            language: language,
            onDone: () => {
                setIsSpeaking(false);
                setAiStatus("Ready"); // Changed from "Listening..." to "Ready" as it's not always listening after speaking
                setCaptionText(null);
            },
            onError: () => {
                setIsSpeaking(false);
                setAiStatus("Error speaking");
                setCaptionText(null);
            }
        });
    };

    const handleEnd = () => {
        Speech.stop();
        setIsSpeaking(false);
        setCaptionText(null);
        router.replace('/(main)');
    };

    const startContinuousMonitoring = () => {
        if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = setInterval(async () => {
            if (isCameraOnRef.current && cameraRef.current) {
                try {
                    console.log("Capturing interval frame...");
                    const photo = await cameraRef.current.takePictureAsync({
                        quality: 0.5,
                        skipProcessing: true,
                        shutterSound: false
                    });

                    // One last check before sending, in case they toggled OFF during the async capture
                    if (photo && isCameraOnRef.current) {
                        sendToBackend("Background visual check. If you see a skin condition, describe it briefly. If not, say nothing.", null, photo.uri, true);
                    }
                } catch (e) {
                    // Suppress error if it happened because we toggled privacy mode mid-capture
                    if (isCameraOnRef.current) {
                        console.log("Monitoring capture failed", e);
                    }
                }
            }
        }, 20000); // 20 seconds
    };

    const stopContinuousMonitoring = () => {
        if (analysisIntervalRef.current) {
            console.log("[Monitoring] Stopping background loop.");
            clearInterval(analysisIntervalRef.current);
            analysisIntervalRef.current = null;
        }
    };

    const recordingRef = useRef<Audio.Recording | null>(null);
    const isRecordingPending = useRef(false);

    const startRecording = async () => {
        try {
            if (isRecordingPending.current || recordingRef.current) return;

            // Stop speaking if user interrupts
            if (isSpeaking) {
                Speech.stop();
                setIsSpeaking(false);
                setCaptionText(null);
            }

            isRecordingPending.current = true;
            setIsListening(true);
            setAiStatus("Listening...");

            const perm = await Audio.requestPermissionsAsync();
            if (perm.status !== 'granted') {
                setIsListening(false);
                isRecordingPending.current = false;
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            if (!isRecordingPending.current) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) { }
                return;
            }

            recordingRef.current = recording;

        } catch (err) {
            console.error('Failed to start recording', err);
            setIsListening(false);
            isRecordingPending.current = false;
        }
    };

    const stopRecording = async () => {
        isRecordingPending.current = false;
        setIsListening(false);
        setAiStatus("Processing...");

        const recording = recordingRef.current;

        if (recording) {
            try {
                await recording.stopAndUnloadAsync();
                const uri = recording.getURI();
                recordingRef.current = null;

                if (uri) {
                    // Only send audio, NO image here
                    sendToBackend("User voice input:", uri, undefined);
                }
            } catch (error) {
                recordingRef.current = null;
                setAiStatus("Ready");
            }
        }
    };

    // Updated signature: text, audioUri, imageUri, isBackground
    const sendToBackend = async (text: string | null, audioUri?: string | null, existingImageUri?: string, isBackground: boolean = false) => {
        try {
            const formData = new FormData();
            formData.append('sessionId', sessionId);
            const userId = user?.id || (user as any)?._id;
            if (userId) {
                formData.append('userId', userId);
            }
            if (text) formData.append('message', text);

            let imageToSend = existingImageUri || lockedImageUri;

            // PRIVACY CHECK: If camera is OFF, we MUST NOT send any image
            if (!isCameraOnRef.current) {
                console.log(`[Privacy] Suppressing image for sessionId: ${sessionId}. Camera is OFF.`);
                imageToSend = null;
            } else {
                console.log(`[Privacy] Camera is ON. Image detected: ${!!imageToSend}`);
            }

            // If we don't have an image at all, and we are sending a user message (NOT background), capture now and lock it!
            if (!isBackground && !imageToSend && isCameraOnRef.current && cameraRef.current) {
                console.log("Capturing initial injury image...");
                try {
                    const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
                    imageToSend = photo.uri;
                    setLockedImageUri(photo.uri);
                    stopContinuousMonitoring();
                } catch (e) {
                    console.error("Camera capture failed:", e);
                }
            }

            if (imageToSend) {
                console.log(`[Privacy] Sending image part (${isBackground ? 'Background' : 'User Interaction'})`);
                formData.append('image', {
                    uri: imageToSend,
                    type: 'image/jpeg',
                    name: 'frame.jpg',
                } as any);
            } else if (!isCameraOnRef.current) {
                console.log("[Privacy] Privacy Mode ACTIVE: No image data included.");
            }

            if (audioUri) {
                formData.append('audio', {
                    uri: audioUri,
                    type: 'audio/m4a',
                    name: 'recording.m4a',
                } as any);
            }

            // optimistic update for user message (text only for now, audio is harder to transcribe locally without backend)
            if (text && !isBackground) {
                setChatHistory(prev => [...prev, { role: 'user', text }]);
            }

            const res = await axios.post(`${API_URL}/chat`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.reply) {
                // If we sent an image and got a response, lock it if it wasn't already locked AND it wasn't a background check
                if (imageToSend && !lockedImageUri && !isBackground) {
                    setLockedImageUri(imageToSend);
                }

                setAiStatus(res.data.reply);
                // Store assessment if provided
                if (res.data.assessment) {
                    setRiskAssessment(res.data.assessment);
                    if (res.data.publicImageUrl) {
                        setPublicImageUrl(res.data.publicImageUrl);
                    }
                }

                // Show condition suggestion cards if provided
                if (res.data.conditionSuggestions && res.data.conditionSuggestions.length > 0 && !isBackground) {
                    setConditionSuggestions(res.data.conditionSuggestions);
                }

                if (isBackground && res.data.reply.trim().toLowerCase().includes("nothing")) {
                    return;
                }

                if (!isBackground) {
                    setChatHistory(prev => [...prev, { role: 'ai', text: res.data.reply }]);
                }

                speak(res.data.reply, res.data.language || 'en');
            }

        } catch (error) {
            console.error("Backend Error:", error);
            // Only speak error if it's a user interaction, not background
            if (!isBackground) {
                speak("I'm having trouble connecting.");
                setAiStatus("Connection Error");
            }
        }
    };

    const handleConditionSelect = async (condition: { name: string; imageUrl: string }) => {
        setConditionSuggestions(null);
        speak("Got it. That helps narrow it down.");
        // Send the selection to Gemini for more focused analysis
        await sendToBackend(`I think my condition looks most like: ${condition.name}`, null, undefined, false);
    };

    if (!permission?.granted) {
        return <View />;
    }

    return (
        <Screen className="bg-black">
            {/* Live Camera Feed (Full Screen) */}
            {isCameraOn ? (
                !lockedImageUri && (
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        zoom={0}
                    />
                )
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="eye-off" size={64} color="#333" />
                    <Text className="text-white/40 mt-4 font-medium">Camera Disabled (Privacy Mode)</Text>
                </View>
            )}

            {/* Locked Image Display */}
            {lockedImageUri && isCameraOn && (
                <View style={StyleSheet.absoluteFill}>
                    <Image
                        source={{ uri: lockedImageUri }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/20" />
                </View>
            )}

            {/* Change Area Button (Only when locked) */}
            {lockedImageUri && (
                <TouchableOpacity
                    onPress={resetLockedImage}
                    className="absolute top-32 right-6 bg-gray-800/80 px-4 py-2 rounded-full border border-gray-600 z-50 shadow-sm"
                >
                    <View className="flex-row items-center space-x-2">
                        <Ionicons name="camera-reverse" size={16} color="white" />
                        <Text className="text-white text-xs font-bold ml-2">Change Area</Text>
                    </View>
                </TouchableOpacity>
            )}



            {/* Status Overlay */}
            <View className="absolute top-24 left-0 right-0 items-center px-6 z-40">
                <View className="bg-black/60 px-6 py-2 rounded-full mb-2">
                    <Text className="text-white font-medium text-sm uppercase tracking-wider">
                        {aiStatus}
                    </Text>
                </View>
            </View>

            {/* Risk Assessment UI & Escalation */}
            {riskAssessment && (
                <View className="absolute bottom-40 left-6 right-6">
                    <View className="bg-gray-900/90 w-full p-4 rounded-3xl border border-white/10 shadow-xl space-y-3">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center space-x-2">
                                <View style={{
                                    width: 12, height: 12, borderRadius: 6,
                                    backgroundColor: riskAssessment.risk === 'High' ? '#ef4444' : riskAssessment.risk === 'Moderate' ? '#f59e0b' : '#10b981'
                                }} />
                                <Text className="text-white font-bold text-lg ml-2">
                                    {riskAssessment.risk} Risk
                                </Text>
                            </View>
                            <View className="bg-white/10 px-3 py-1 rounded-full">
                                <Text className="text-white/80 text-xs font-medium">
                                    {riskAssessment.confidence}% Confidence
                                </Text>
                            </View>
                        </View>

                        {riskAssessment.redFlags && riskAssessment.redFlags.length > 0 && (
                            <View className="flex-row flex-wrap gap-2 pt-1 border-t border-white/5">
                                {riskAssessment.redFlags.map((flag, idx) => (
                                    <View key={idx} className="bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30">
                                        <Text className="text-red-400 text-[10px] font-bold uppercase">{flag}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Escalation Buttons */}
                        <View className="flex-col space-y-3 pt-2">
                            {riskAssessment.risk === 'High' ? (
                                <TouchableOpacity
                                    className="bg-red-600 py-4 rounded-xl flex-row items-center justify-center"
                                    onPress={() => {
                                        router.push({
                                            pathname: '/(main)/integrated-meeting',
                                            params: {
                                                roomId: sessionId,
                                                summary: riskAssessment.redFlags.join(', '),
                                                imageURL: publicImageUrl ? `${API_URL}${publicImageUrl}` : ''
                                            }
                                        });
                                    }}
                                >
                                    <Ionicons name="videocam" size={24} color="white" className="mr-2" />
                                    <Text className="text-white font-bold text-lg">Book Teleconsult (Urgent)</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    className="bg-teal-600 py-4 rounded-xl flex-row items-center justify-center"
                                    onPress={() => {
                                        router.push({
                                            pathname: '/(main)/integrated-meeting',
                                            params: {
                                                roomId: sessionId,
                                                summary: `General consultation for ${riskAssessment.risk} risk case.`,
                                                imageURL: publicImageUrl ? `${API_URL}${publicImageUrl}` : ''
                                            }
                                        });
                                    }}
                                >
                                    <Ionicons name="videocam" size={24} color="white" className="mr-2" />
                                    <Text className="text-white font-bold text-lg">Consult Specialist</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                className="bg-white/10 py-4 rounded-xl items-center"
                                onPress={resetLockedImage}
                            >
                                <Text className="text-white font-bold text-lg">Test New Area</Text>
                            </TouchableOpacity>

                            {riskAssessment.risk === 'High' && (
                                <TouchableOpacity
                                    className="bg-red-600/20 border border-red-500/50 py-3 rounded-2xl items-center shadow-lg"
                                    onPress={() => speak("Warning: Please contact emergency services immediately if you feel systemically unwell.")}
                                >
                                    <Text className="text-red-400 font-bold text-sm">Emergency Alert</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Condition Suggestion Cards */}
            {conditionSuggestions && conditionSuggestions.length > 0 && (
                <View className="absolute bottom-44 left-0 right-0 z-50 px-4">
                    <View className="bg-black/80 rounded-2xl px-4 py-3 border border-white/10">
                        <Text className="text-white/90 text-xs font-semibold mb-2 text-center">
                            Tap the condition that looks closest to yours:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                            {conditionSuggestions.map((condition, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => handleConditionSelect(condition)}
                                    className="items-center bg-white/10 rounded-xl p-2 border border-white/20"
                                    style={{ width: 90 }}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={{ uri: condition.imageUrl }}
                                        style={{ width: 70, height: 70, borderRadius: 10 }}
                                        resizeMode="cover"
                                    />
                                    <Text className="text-white text-[9px] font-medium mt-1 text-center" numberOfLines={2}>
                                        {condition.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setConditionSuggestions(null)} className="mt-2 items-center">
                            <Text className="text-white/50 text-[10px]">None of these match</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            {/* Bottom Controls */}
            <View className="absolute bottom-12 left-0 right-0 flex-row justify-center items-center space-x-8">
                <TouchableOpacity
                    onPress={() => {
                        const nextState = !isCameraOn;
                        setIsCameraOn(nextState);
                        isCameraOnRef.current = nextState;
                        if (!nextState) {
                            console.log("Privacy Mode: Camera DISABLED and UNMOUNTED.");
                            setLockedImageUri(null); // Clear any pending images for full privacy
                        } else {
                            console.log("Privacy Mode: Camera ENABLED.");
                        }
                    }}
                    className={`p-4 rounded-full border-2 ${isCameraOn ? 'bg-teal-600/20 border-teal-500/50' : 'bg-red-600/20 border-red-500/50'}`}
                >
                    <Ionicons name={isCameraOn ? "camera" : "camera-outline"} size={28} color={isCameraOn ? "#2dd4bf" : "#ef4444"} />
                </TouchableOpacity>

                <View className="items-center">
                    <TouchableOpacity
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        activeOpacity={0.8}
                        style={[
                            styles.micButton,
                            isListening ? styles.micActive : styles.micInactive
                        ]}
                    >
                        <Ionicons name={isListening ? "mic" : "mic-off"} size={32} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white/80 text-[10px] mt-2 font-medium">
                        {isListening ? "Release to Send" : "Hold to Speak"}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => {
                        router.push({
                            pathname: '/(main)/integrated-meeting',
                            params: {
                                roomId: sessionId,
                                summary: riskAssessment ? riskAssessment.redFlags.join(', ') : 'General Consultation',
                                imageURL: publicImageUrl ? `${API_URL}${publicImageUrl}` : '',
                                history: JSON.stringify(chatHistory)
                            }
                        });
                    }}
                    className="p-4 rounded-full border-2 bg-indigo-600/20 border-indigo-500/50"
                >
                    <Ionicons name="videocam" size={28} color="#818cf8" />
                </TouchableOpacity>
            </View>

            {/* Avatar Overlay */}
            <View className="absolute top-16 left-6 z-40 pointer-events-none" style={{ width: 120, height: 120 }}>
                <AvatarView isSpeaking={isSpeaking} />
            </View>

            {/* Top Bar Actions */}
            <View className="absolute top-12 left-6 right-6 flex-row justify-between items-center z-50">
                <TouchableOpacity onPress={() => router.back()} className="bg-black/50 p-2.5 rounded-full border border-white/10 shadow-lg">
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleEnd}
                    className="bg-red-600 px-6 py-2.5 rounded-full flex-row items-center space-x-2 border border-red-400 shadow-lg active:bg-red-700"
                >
                    <Ionicons name="close-circle" size={22} color="white" />
                    <Text className="text-white font-bold text-lg">End</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/profile')} className="bg-black/50 p-2.5 rounded-full border border-white/10 shadow-lg">
                    <Ionicons name="person" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Live Captions Overlay - Moved to Bottom (fixed position) */}
            {
                captionText && (
                    <View className="absolute bottom-40 left-6 right-6 items-center z-50 pointer-events-none">
                        <View className="bg-black/80 px-4 py-3 rounded-xl border border-white/5 shadow-sm backdrop-blur-sm">
                            <Text className="text-white text-base font-normal text-center leading-5 opacity-90">
                                {captionText}
                            </Text>
                        </View>
                    </View>
                )
            }

        </Screen >
    );
}

const styles = StyleSheet.create({
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    micActive: {
        backgroundColor: '#ef4444',
        borderColor: '#fca5a5',
        transform: [{ scale: 1.1 }]
    },
    micInactive: {
        backgroundColor: '#0f766e',
        borderColor: '#14b8a6',
    }
});
