import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen } from '../../components/Screen';
import AvatarView from '../components/AvatarView';
import BodySelectorModal from '../components/BodySelectorModal';
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
    const [showBodySelector, setShowBodySelector] = useState(false);

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

    const handleBodyRegionSelect = async (region: string) => {
        setShowBodySelector(false);
        speak(`Got it, you selected ${region}. Let me focus on that area.`);
        await sendToBackend(`The affected area is on my ${region}. Please focus your analysis on this body region.`, null, undefined, false);
    };

    return (
        <Screen safeArea={false} className="bg-black">
            {/* Permission Check Overlay */}
            {!permission?.granted ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
                    <View className="bg-purple-900/20 p-8 rounded-full mb-8 border border-purple-500/30">
                        <Ionicons name="camera" size={64} color="#9333ea" />
                    </View>
                    <Text className="text-white text-2xl font-bold mb-3 text-center">Camera Access Required</Text>
                    <Text className="text-white/60 text-center mb-10 leading-6 text-base">
                        To use our interactive AI triage, we need access to your camera to see the affected area.
                    </Text>
                    <TouchableOpacity
                        onPress={requestPermission}
                        className="bg-purple-600 px-10 py-4 rounded-2xl shadow-lg shadow-purple-500/20 active:bg-purple-700"
                    >
                        <Text className="text-white font-bold text-lg">Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} className="mt-8 p-2">
                        <Text className="text-white/40 font-medium">Cancel and go back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={StyleSheet.absoluteFill}>
                    {/* Top/Bottom Gradients for Premium Feel */}
                    <View className="absolute top-0 left-0 right-0 h-40 bg-black/40 z-10" style={{ opacity: 0.6 }} />
                    <View className="absolute bottom-0 left-0 right-0 h-48 bg-black/60 z-10" style={{ opacity: 0.8 }} />

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



                    {/* Top Bar - Medical Design */}
                    <View className="absolute top-14 left-6 right-6 flex-row justify-between items-center z-50">
                        <TouchableOpacity onPress={() => router.back()} className="bg-white/10 p-2.5 rounded-full border border-white/20 backdrop-blur-md">
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white font-bold text-xl tracking-tight">Live Triage</Text>
                        <TouchableOpacity onPress={() => router.push('/profile')} className="bg-white/10 p-2.5 rounded-full border border-white/20 backdrop-blur-md">
                            <Ionicons name="person" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Session Status & Avatar Bubble (Repositioned) */}
                    <View className="absolute top-32 left-6 right-6 flex-row-reverse justify-between items-start z-40">
                        {/* Session Status Indicator (Now on the Right) */}
                        <View className="bg-white/10 px-4 py-2 rounded-full border border-white/20 backdrop-blur-md flex-row items-center space-x-2">
                            <View className="w-2 h-2 rounded-full bg-green-500 shadow-sm" style={{ shadowColor: '#22c55e', shadowRadius: 4 }} />
                            <Text className="text-white/80 font-bold text-[10px] uppercase tracking-widest ml-1">
                                Session Active
                            </Text>
                        </View>

                        {/* Assistant Avatar (Now on the Left) */}
                        <View className="items-center">
                            <View className="rounded-full shadow-2xl border-[1.5px] border-white/40 overflow-hidden bg-white/5" style={{ padding: 4 }}>
                                <AvatarView isSpeaking={isSpeaking} />
                            </View>
                            {isSpeaking && (
                                <View className="mt-2 bg-purple-500/80 px-2 py-0.5 rounded-md border border-purple-400/30">
                                    <Text className="text-white text-[8px] font-bold uppercase tracking-tighter">Assistant Speaking</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Risk Assessment UI & Escalation */}
                    {riskAssessment && (
                        <View className="absolute bottom-40 left-6 right-6">
                            <View className="bg-white/95 w-full p-5 rounded-3xl border border-slate-100 shadow-2xl space-y-4">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center space-x-2">
                                        <View style={{
                                            width: 12, height: 12, borderRadius: 6,
                                            backgroundColor: riskAssessment.risk === 'High' ? '#ef4444' : riskAssessment.risk === 'Moderate' ? '#f59e0b' : '#10b981'
                                        }} />
                                        <Text className="text-slate-900 font-bold text-xl ml-2">
                                            {riskAssessment.risk} Risk
                                        </Text>
                                    </View>
                                    <View className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                        <Text className="text-slate-600 text-xs font-semibold">
                                            {riskAssessment.confidence}% Confidence
                                        </Text>
                                    </View>
                                </View>

                                {riskAssessment.redFlags && riskAssessment.redFlags.length > 0 && (
                                    <View className="flex-row flex-wrap gap-2 pt-1 border-t border-slate-50">
                                        {riskAssessment.redFlags.map((flag, idx) => (
                                            <View key={idx} className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                                <Text className="text-red-600 text-[10px] font-bold uppercase">{flag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Escalation Buttons */}
                                <View className="flex-col space-y-3 pt-2">
                                    {riskAssessment.risk === 'High' ? (
                                        <TouchableOpacity
                                            className="bg-red-600 py-4 rounded-xl flex-row items-center justify-center shadow-md shadow-red-200"
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
                                            className="bg-purple-600 py-4 rounded-xl flex-row items-center justify-center shadow-md shadow-purple-200"
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
                                        className="bg-slate-100 py-4 rounded-xl items-center border border-slate-200"
                                        onPress={resetLockedImage}
                                    >
                                        <Text className="text-slate-700 font-bold text-lg">Test New Area</Text>
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
                            <View className="bg-white rounded-2xl px-4 py-4 border border-slate-100 shadow-2xl">
                                <Text className="text-slate-800 text-sm font-bold mb-3 text-center">
                                    Tap the condition that looks closest:
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                    {conditionSuggestions.map((condition, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => handleConditionSelect(condition)}
                                            className="items-center bg-slate-50 rounded-xl p-2 border border-slate-100 shadow-sm"
                                            style={{ width: 100 }}
                                            activeOpacity={0.7}
                                        >
                                            <Image
                                                source={{ uri: condition.imageUrl }}
                                                style={{ width: 80, height: 80, borderRadius: 12 }}
                                                resizeMode="cover"
                                            />
                                            <Text className="text-slate-900 text-[10px] font-bold mt-2 text-center" numberOfLines={2}>
                                                {condition.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={() => setConditionSuggestions(null)} className="mt-3 items-center">
                                    <Text className="text-slate-400 text-[11px] font-medium">None of these match</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {/* Main Clinical Action Bar (Mic Centric + Body Selector) */}
                    <View className="absolute bottom-12 left-0 right-0 z-50 flex-row justify-center items-center space-x-8 px-6">
                        {/* Privacy / Camera Toggle */}
                        <TouchableOpacity
                            onPress={() => {
                                const nextState = !isCameraOn;
                                setIsCameraOn(nextState);
                                isCameraOnRef.current = nextState;
                            }}
                            className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg"
                        >
                            <Ionicons name={isCameraOn ? "camera" : "camera-outline"} size={22} color="white" />
                        </TouchableOpacity>

                        {/* Body Selector (Restored to main bar) */}
                        <TouchableOpacity
                            onPress={() => setShowBodySelector(true)}
                            className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg"
                        >
                            <Ionicons name="accessibility-outline" size={22} color="white" />
                        </TouchableOpacity>

                        {/* Primary Mic Interaction */}
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
                                <Ionicons name={isListening ? "mic" : "mic-off"} size={36} color="white" />
                            </TouchableOpacity>
                            <Text className="text-white/90 text-xs mt-5 font-extrabold uppercase tracking-[2px] text-center shadow-sm">
                                {isListening ? "Listening..." : "Hold to Speak"}
                            </Text>
                        </View>

                        {/* Meeting / Specialist Link */}
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
                            className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg"
                        >
                            <Ionicons name="videocam" size={22} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Clinical Guidance Glass Card (Pixel Perfect Refinement) */}
                    <View className="absolute bottom-48 left-6 right-6 overflow-hidden rounded-[32px] border border-white/20 bg-black/10 backdrop-blur-3xl shadow-2xl z-40">
                        <View className="px-8 py-7 items-center">
                            <Text className="text-white/60 text-[11px] font-bold uppercase tracking-[3px] mb-4 text-center">
                                {isListening ? "Listening..." : "Clinical Assistant"}
                            </Text>
                            <Text className="text-white text-[22px] font-bold text-center leading-8 mb-5">
                                {captionText || "How can I help? Describe your symptoms clearly."}
                            </Text>
                            {!captionText && !isListening && (
                                <View className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
                                    <Text className="text-white/40 text-[10px] font-extrabold uppercase tracking-[2px]">
                                        Point camera at affected area
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Body Selector Modal */}
                    <BodySelectorModal
                        visible={showBodySelector}
                        onClose={() => setShowBodySelector(false)}
                        onConfirm={handleBodyRegionSelect}
                    />
                </View>
            )}
        </Screen >
    );
}

const styles = StyleSheet.create({
    micButton: {
        width: 86,
        height: 86,
        borderRadius: 43,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 6,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    micActive: {
        backgroundColor: '#ef4444',
        borderColor: '#fff',
        transform: [{ scale: 1.1 }]
    },
    micInactive: {
        backgroundColor: '#9333ea',
        borderColor: '#fff',
    }
});
