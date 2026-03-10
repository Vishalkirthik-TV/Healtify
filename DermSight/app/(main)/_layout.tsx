import { Stack } from 'expo-router';

export default function MainLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="capture" />
            <Stack.Screen name="symptoms" />
            <Stack.Screen name="processing" options={{ gestureEnabled: false }} />
            <Stack.Screen name="results" />
            <Stack.Screen name="report" />
            <Stack.Screen name="avatar-triage" options={{ gestureEnabled: false }} />
            <Stack.Screen name="history" />
        </Stack>
    );
}
