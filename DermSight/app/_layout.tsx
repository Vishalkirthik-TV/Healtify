import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./context/AuthContext";
import React, { useEffect } from "react";

const queryClient = new QueryClient();

function RootLayoutNav() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)' || segments.includes('login') || segments.includes('signup');
        const inMainGroup = segments[0] === '(main)';
        const inOnboarding = segments[0] === 'onboarding';
        const inCompleteProfile = segments.includes('complete-profile');

        if (!user && !inAuthGroup && !inOnboarding) {
            // If user is not logged in and not in auth/onboarding, redirect to onboarding
            router.replace('/onboarding');
        } else if (user && (inAuthGroup || inOnboarding) && !inCompleteProfile) {
            // If user is logged in and tries to access auth/onboarding (excluding complete-profile), redirect to main
            router.replace('/(main)');
        }
    }, [user, isLoading, segments]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(main)" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function Layout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <QueryClientProvider client={queryClient}>
                    <RootLayoutNav />
                </QueryClientProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
