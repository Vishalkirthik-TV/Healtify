import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, Platform, View, Text, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect } from 'react';

// HTTPS Tunnel URL for Frontend (Required for Camera/Mic)
const TARGET_URL = 'https://affairs-cat-rock-european.trycloudflare.com/';

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, []);

  if (!cameraPermission || !micPermission) {
    // Camera permissions are still loading.
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to see and hear you.</Text>
        <Button onPress={requestCameraPermission} title="Grant Camera Permission" />
        <Button onPress={requestMicPermission} title="Grant Microphone Permission" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#000" />
      <WebView
        source={{
          uri: TARGET_URL,
          headers: {
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'TalkMateMobile' // Sometimes helps
          }
        }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true} // Important for audio/video
        mediaPlaybackRequiresUserAction={false} // Allow autoplay
        originWhitelist={['*']}
        // Grant permissions requested by the website
        onPermissionRequest={(request) => {
          request.grant(request.resources);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});

