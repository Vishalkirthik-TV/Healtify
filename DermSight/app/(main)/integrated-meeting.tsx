import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function IntegratedMeeting() {
    const { roomId, summary, imageURL } = useLocalSearchParams();
    const router = useRouter();

    // Base Linzo URL - This must point to the FRONTEND (React App) tunnel
    // Frontend (5173) -> https://camcorder-submit-pensions-mary.trycloudflare.com
    const LINZO_BASE_URL = "https://camcorder-submit-pensions-mary.trycloudflare.com";

    const meetingUrl = `${LINZO_BASE_URL}/integrated-room/${roomId}?summary=${encodeURIComponent(summary as string)}&image=${encodeURIComponent(imageURL as string)}`;

    return (
        <Screen style={{ backgroundColor: '#1e293b' }}>
            <View className="flex-row items-center px-4 py-3 border-b border-white/10 bg-slate-900">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <View>
                    <Text className="text-white font-bold text-lg">Teleconsultation</Text>
                    <Text className="text-white/60 text-xs">Powered by Linzo</Text>
                </View>
            </View>

            {(() => { console.log('[WebView] Attempting to load:', meetingUrl); return null; })()}

            <WebView
                source={{ uri: meetingUrl }}
                style={styles.webview}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#684CFE" />
                        <Text className="text-white/60 mt-4 font-medium">Connecting to medical room...</Text>
                    </View>
                )}
                renderError={(errorName) => (
                    <View style={styles.loading}>
                        <Ionicons name="alert-circle" size={40} color="#ef4444" />
                        <Text className="text-white mt-4 font-bold">Connection Failed</Text>
                        <Text className="text-white/40 text-xs mt-2">{errorName}</Text>
                    </View>
                )}
                onLoadStart={() => console.log('[WebView] Load started')}
                onLoadEnd={() => console.log('[WebView] Load ended')}
                onPermissionRequest={(event: any) => {
                    console.log('[WebView] Permission requested:', event.resources);
                    event.grant();
                }}
                onNavigationStateChange={(navState) => {
                    console.log('[WebView] Nav State:', navState.url, navState.loading);
                }}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                }}
                userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                databaseEnabled={true}
                originWhitelist={['*']}
                allowsFullscreenVideo={true}
                scalesPageToFit={true}
                mixedContentMode="always"
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    webview: {
        flex: 1,
        backgroundColor: '#1a1a1a', // Dark gray for WebView
    },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212', // Slightly different for loading
    }
});
