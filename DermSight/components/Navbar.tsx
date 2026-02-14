import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const tabs = [
        { name: 'Home', icon: 'home', path: '/(main)' },
        { name: 'History', icon: 'time', path: '/(main)/history' },
        { name: 'Profile', icon: 'person', path: '/(main)/profile' },
    ];

    return (
        <View style={styles.container}>
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
                            color={isActive ? '#2dd4bf' : '#94a3b8'}
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
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        paddingBottom: 25,
        paddingTop: 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
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
        fontWeight: '500',
    },
    activeLabel: {
        color: '#2dd4bf',
        fontWeight: '700',
    },
});
