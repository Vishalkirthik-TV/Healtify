import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const tabs = [
        { name: 'Home', icon: 'home', path: '/(main)' },
        { name: 'History', icon: 'time', path: '/(main)/history' },
        { name: 'Profile', icon: 'person', path: '/(main)/profile' },
    ];

    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { bottom: Math.max(insets.bottom, 24) }]}>
            {tabs.map((tab) => {
                const isActive = pathname === tab.path || (tab.path === '/(main)' && pathname === '/');
                return (
                    <TouchableOpacity
                        key={tab.name}
                        onPress={() => router.push(tab.path as any)}
                        style={styles.tab}
                    >
                        <Ionicons
                            name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
                            size={24}
                            color={isActive ? '#9333ea' : '#64748b'}
                        />
                        <Text style={[styles.label, isActive && styles.activeLabel]}>
                            {tab.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 24,
        right: 24,
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 40,
        paddingVertical: 14,
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(241, 245, 249, 0.8)',
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    label: {
        fontSize: 10,
        marginTop: 4,
        color: '#94a3b8',
        fontWeight: '600',
    },
    activeLabel: {
        color: '#9333ea',
        fontWeight: '700',
    },
});
