import { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';

interface AvatarProps {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    currentMessage?: string;
    isListening?: boolean;
}

export default function Avatar({ currentMessage, isListening }: AvatarProps) {
    const webviewRef = useRef<WebView>(null);

    // URL to the hosted Agentic Companion (or a local dev server IP)
    // For this demo, we can point to a placeholder or a specific RPM viewer
    // Ideally, this should point to the hosted version of the user's Agentic Companion
    // URL to the hosted Agentic Companion (or a local dev server IP)
    // For this demo, we can point to a placeholder or a specific RPM viewer
    // Ideally, this should point to the hosted version of the user's Agentic Companion
    const AVATAR_URL = 'http://192.168.60.170:3001/webview'; // Local Agentic Avatar

    useEffect(() => {
        if (currentMessage) {
            Speech.speak(currentMessage, {
                language: 'en-US',
                pitch: 1,
                rate: 1,
                onStart: () => {
                    // Send message to WebView to animate mouth (Visemes)
                    webviewRef.current?.postMessage(JSON.stringify({ type: 'speak', text: currentMessage }));
                },
                onDone: () => {
                    webviewRef.current?.postMessage(JSON.stringify({ type: 'stop_speak' }));
                }
            });
        }
    }, [currentMessage]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webviewRef}
                source={{ uri: AVATAR_URL }}
                style={styles.webview}
                scrollEnabled={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator size="large" color="#0d9488" style={styles.loading} />}
            />
            {isListening && (
                <View style={styles.listeningOverlay}>
                    {/* Visual cue that avatar is listening */}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 300, // Adjust height as needed
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    webview: {
        backgroundColor: 'transparent',
    },
    loading: {
        position: 'absolute',
        top: '50%',
        left: '50%',
    },
    listeningOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 4,
        borderColor: '#0d9488', // Teal border when listening
        borderRadius: 20,
    }
});
