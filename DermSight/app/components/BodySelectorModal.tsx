import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Dimensions,
    ScrollView,
} from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BODY_W = SCREEN_W * 0.7;
const BODY_H = BODY_W * 2.2;

// ─── Body region definitions ────────────────────────────────────────
// Each region: label, hitbox (x, y, w, h relative to BODY_W / BODY_H)
const FRONT_REGIONS = [
    { id: 'head', label: 'Head / Face', x: 0.35, y: 0.00, w: 0.30, h: 0.10, emoji: '🧠' },
    { id: 'neck', label: 'Neck', x: 0.38, y: 0.10, w: 0.24, h: 0.03, emoji: '🔗' },
    { id: 'left_shoulder', label: 'Left Shoulder', x: 0.10, y: 0.12, w: 0.20, h: 0.05, emoji: '💪' },
    { id: 'right_shoulder', label: 'Right Shoulder', x: 0.70, y: 0.12, w: 0.20, h: 0.05, emoji: '💪' },
    { id: 'chest', label: 'Chest', x: 0.25, y: 0.14, w: 0.50, h: 0.10, emoji: '🫁' },
    { id: 'left_arm', label: 'Left Arm', x: 0.02, y: 0.17, w: 0.18, h: 0.18, emoji: '🦾' },
    { id: 'right_arm', label: 'Right Arm', x: 0.80, y: 0.17, w: 0.18, h: 0.18, emoji: '🦾' },
    { id: 'abdomen', label: 'Abdomen', x: 0.25, y: 0.24, w: 0.50, h: 0.10, emoji: '🫄' },
    { id: 'left_hand', label: 'Left Hand', x: 0.00, y: 0.35, w: 0.15, h: 0.08, emoji: '🤚' },
    { id: 'right_hand', label: 'Right Hand', x: 0.85, y: 0.35, w: 0.15, h: 0.08, emoji: '🤚' },
    { id: 'groin', label: 'Groin / Hip', x: 0.30, y: 0.34, w: 0.40, h: 0.06, emoji: '🦴' },
    { id: 'left_thigh', label: 'Left Thigh', x: 0.20, y: 0.40, w: 0.25, h: 0.15, emoji: '🦵' },
    { id: 'right_thigh', label: 'Right Thigh', x: 0.55, y: 0.40, w: 0.25, h: 0.15, emoji: '🦵' },
    { id: 'left_knee', label: 'Left Knee', x: 0.22, y: 0.55, w: 0.20, h: 0.06, emoji: '🦿' },
    { id: 'right_knee', label: 'Right Knee', x: 0.58, y: 0.55, w: 0.20, h: 0.06, emoji: '🦿' },
    { id: 'left_leg', label: 'Left Shin / Calf', x: 0.22, y: 0.61, w: 0.20, h: 0.18, emoji: '🦵' },
    { id: 'right_leg', label: 'Right Shin / Calf', x: 0.58, y: 0.61, w: 0.20, h: 0.18, emoji: '🦵' },
    { id: 'left_foot', label: 'Left Foot', x: 0.18, y: 0.80, w: 0.22, h: 0.08, emoji: '🦶' },
    { id: 'right_foot', label: 'Right Foot', x: 0.60, y: 0.80, w: 0.22, h: 0.08, emoji: '🦶' },
];

const BACK_REGIONS = [
    { id: 'head_back', label: 'Back of Head / Scalp', x: 0.35, y: 0.00, w: 0.30, h: 0.10, emoji: '🧠' },
    { id: 'neck_back', label: 'Back of Neck', x: 0.38, y: 0.10, w: 0.24, h: 0.03, emoji: '🔗' },
    { id: 'upper_back', label: 'Upper Back', x: 0.20, y: 0.13, w: 0.60, h: 0.10, emoji: '🔙' },
    { id: 'left_arm_back', label: 'Left Arm (Back)', x: 0.02, y: 0.17, w: 0.18, h: 0.18, emoji: '🦾' },
    { id: 'right_arm_back', label: 'Right Arm (Back)', x: 0.80, y: 0.17, w: 0.18, h: 0.18, emoji: '🦾' },
    { id: 'lower_back', label: 'Lower Back', x: 0.25, y: 0.23, w: 0.50, h: 0.10, emoji: '🔙' },
    { id: 'left_hand_back', label: 'Left Hand (Back)', x: 0.00, y: 0.35, w: 0.15, h: 0.08, emoji: '🤚' },
    { id: 'right_hand_back', label: 'Right Hand (Back)', x: 0.85, y: 0.35, w: 0.15, h: 0.08, emoji: '🤚' },
    { id: 'buttocks', label: 'Buttocks', x: 0.28, y: 0.33, w: 0.44, h: 0.08, emoji: '🪑' },
    { id: 'left_thigh_b', label: 'Left Thigh (Back)', x: 0.20, y: 0.41, w: 0.25, h: 0.15, emoji: '🦵' },
    { id: 'right_thigh_b', label: 'Right Thigh (Back)', x: 0.55, y: 0.41, w: 0.25, h: 0.15, emoji: '🦵' },
    { id: 'left_calf', label: 'Left Calf', x: 0.22, y: 0.58, w: 0.20, h: 0.20, emoji: '🦵' },
    { id: 'right_calf', label: 'Right Calf', x: 0.58, y: 0.58, w: 0.20, h: 0.20, emoji: '🦵' },
    { id: 'left_heel', label: 'Left Heel / Sole', x: 0.20, y: 0.80, w: 0.20, h: 0.08, emoji: '🦶' },
    { id: 'right_heel', label: 'Right Heel / Sole', x: 0.60, y: 0.80, w: 0.20, h: 0.08, emoji: '🦶' },
];

// ─── SVG Body Silhouette ────────────────────────────────────────────
function BodySilhouette({ isFront }: { isFront: boolean }) {
    const color = '#3b82f6';
    const opacity = 0.25;
    // Simple human outline using SVG primitives
    return (
        <Svg width={BODY_W} height={BODY_H * 0.88} viewBox="0 0 200 440" style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* Head */}
            <Circle cx="100" cy="30" r="25" fill={color} opacity={opacity} />
            {/* Neck */}
            <Rect x="90" y="55" width="20" height="15" fill={color} opacity={opacity} rx="5" />
            {/* Torso */}
            <Path
                d={isFront
                    ? "M60,70 Q55,70 50,80 L45,160 Q45,175 60,175 L140,175 Q155,175 155,160 L150,80 Q145,70 140,70 Z"
                    : "M60,70 Q55,70 50,80 L45,160 Q45,175 60,175 L140,175 Q155,175 155,160 L150,80 Q145,70 140,70 Z"
                }
                fill={color}
                opacity={opacity}
            />
            {/* Left Arm */}
            <Path d="M50,75 Q30,80 20,120 L15,170 Q12,180 20,180 L30,180 Q35,178 35,170 L40,120 Q42,100 50,85 Z" fill={color} opacity={opacity} />
            {/* Right Arm */}
            <Path d="M150,75 Q170,80 180,120 L185,170 Q188,180 180,180 L170,180 Q165,178 165,170 L160,120 Q158,100 150,85 Z" fill={color} opacity={opacity} />
            {/* Left Leg */}
            <Path d="M65,175 L55,300 Q53,320 55,340 L50,390 Q48,400 55,405 L75,405 Q82,402 80,395 L85,340 Q87,320 85,300 L90,175 Z" fill={color} opacity={opacity} />
            {/* Right Leg */}
            <Path d="M110,175 L115,300 Q117,320 115,340 L120,390 Q122,400 130,405 L145,405 Q152,402 150,395 L145,340 Q143,320 145,300 L135,175 Z" fill={color} opacity={opacity} />
        </Svg>
    );
}

// ─── Main Component ────────────────────────────────────────────
interface BodySelectorModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (region: string) => void;
}

export default function BodySelectorModal({ visible, onClose, onConfirm }: BodySelectorModalProps) {
    const [isFront, setIsFront] = useState(true);
    const [selected, setSelected] = useState<string | null>(null);
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

    const regions = isFront ? FRONT_REGIONS : BACK_REGIONS;

    const handleSelect = (region: typeof FRONT_REGIONS[0]) => {
        setSelected(region.id);
        setSelectedLabel(region.label);
    };

    const handleConfirm = () => {
        if (selectedLabel) {
            onConfirm(selectedLabel);
            setSelected(null);
            setSelectedLabel(null);
            setIsFront(true);
        }
    };

    const handleClose = () => {
        setSelected(null);
        setSelectedLabel(null);
        setIsFront(true);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/90 justify-center items-center">
                {/* Header */}
                <View className="w-full px-6 pt-14 pb-2 flex-row justify-between items-center">
                    <TouchableOpacity onPress={handleClose} className="p-2">
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg font-bold">Select Affected Area</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Front/Back Toggle */}
                <View className="flex-row bg-white/10 rounded-full p-1 mx-6 mb-4">
                    <TouchableOpacity
                        onPress={() => { setIsFront(true); setSelected(null); setSelectedLabel(null); }}
                        className={`flex-1 py-2 rounded-full items-center ${isFront ? 'bg-blue-600' : ''}`}
                    >
                        <Text className={`font-semibold ${isFront ? 'text-white' : 'text-white/50'}`}>Front</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { setIsFront(false); setSelected(null); setSelectedLabel(null); }}
                        className={`flex-1 py-2 rounded-full items-center ${!isFront ? 'bg-blue-600' : ''}`}
                    >
                        <Text className={`font-semibold ${!isFront ? 'text-white' : 'text-white/50'}`}>Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Body Map */}
                <View className="flex-1 items-center justify-center" style={{ width: BODY_W, maxHeight: BODY_H * 0.88 }}>
                    <View style={{ width: BODY_W, height: BODY_H * 0.88, position: 'relative' }}>
                        <BodySilhouette isFront={isFront} />

                        {/* Tappable Regions */}
                        {regions.map((region) => {
                            const isSelected = selected === region.id;
                            return (
                                <TouchableOpacity
                                    key={region.id}
                                    onPress={() => handleSelect(region)}
                                    activeOpacity={0.6}
                                    style={{
                                        position: 'absolute',
                                        left: region.x * BODY_W,
                                        top: region.y * (BODY_H * 0.88),
                                        width: region.w * BODY_W,
                                        height: region.h * (BODY_H * 0.88),
                                        borderRadius: 8,
                                        borderWidth: isSelected ? 2 : 1,
                                        borderColor: isSelected ? '#22d3ee' : 'rgba(255,255,255,0.15)',
                                        backgroundColor: isSelected ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.05)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: isSelected ? 14 : 10, opacity: isSelected ? 1 : 0.6 }}>
                                        {region.emoji}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Selected Label & Confirm */}
                <View className="w-full px-6 pb-10 pt-3">
                    {selectedLabel ? (
                        <View className="items-center">
                            <Text className="text-cyan-400 text-base font-semibold mb-3">
                                📍 {selectedLabel}
                            </Text>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                className="bg-cyan-600 w-full py-4 rounded-2xl items-center shadow-lg border border-cyan-400/30"
                                activeOpacity={0.8}
                            >
                                <Text className="text-white font-bold text-lg">Confirm Selection</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text className="text-white/40 text-sm text-center">
                            Tap a body region above to select
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}
