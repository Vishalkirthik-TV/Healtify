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
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
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
                            color={isActive ? '#9333ea' : '#94a3b8'}
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
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 12,
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
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
