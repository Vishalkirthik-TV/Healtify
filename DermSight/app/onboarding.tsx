import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Dimensions, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'AI Skin Analysis',
        description: 'Get instant clinical-grade assessments of your skin concerns using Gemini AI.',
        icon: 'scan-outline',
        color: '#0d9488'
    },
    {
        id: '2',
        title: 'Talking AI Mentor',
        description: 'Speak naturally with our 3D avatar assistant who guides you through triage.',
        icon: 'chatbubble-ellipses-outline',
        color: '#0891b2'
    },
    {
        id: '3',
        title: 'Safety First',
        description: 'Automated risk escalation and red flag detection to keep you safe.',
        icon: 'shield-checkmark-outline',
        color: '#ef4444'
    }
];

export default function Onboarding() {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();

    const handleNext = () => {
        if (activeIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
        } else {
            router.replace('/login');
        }
    };

    return (
        <Screen className="bg-slate-950 flex-1">
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    setActiveIndex(Math.round(x / width));
                }}
                renderItem={({ item }) => (
                    <View style={{ width, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <View className="mb-12 p-8 rounded-full" style={{ backgroundColor: item.color + '20' }}>
                            <Ionicons name={item.icon as any} size={100} color={item.color} />
                        </View>
                        <Text className="text-white text-3xl font-bold text-center mb-4">{item.title}</Text>
                        <Text className="text-white/60 text-lg text-center leading-relaxed">
                            {item.description}
                        </Text>
                    </View>
                )}
                keyExtractor={(item) => item.id}
            />

            <View className="absolute bottom-12 left-0 right-0 px-8 flex-row items-center justify-between">
                <View className="flex-row space-x-2">
                    {SLIDES.map((_, idx) => (
                        <View
                            key={idx}
                            style={{
                                width: idx === activeIndex ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: idx === activeIndex ? '#fff' : '#ffffff40'
                            }}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={handleNext}
                    className="bg-white px-8 py-4 rounded-2xl flex-row items-center space-x-2"
                >
                    <Text className="text-slate-950 font-bold text-lg">
                        {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#020617" />
                </TouchableOpacity>
            </View>
        </Screen>
    );
}
