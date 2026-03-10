import { useState, useRef } from "react";
import { View, Image, TouchableOpacity, Alert, Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { Title, Body, Caption } from "../../components/Typography";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function Capture() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<"back" | "front">("back");
    const [photo, setPhoto] = useState<string | null>(null);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <Screen safeArea className="items-center justify-center px-6">
                <Title className="text-center mb-4">Camera Permission Required</Title>
                <Body className="text-center mb-8">
                    We need access to your camera to analyze skin conditions.
                </Body>
                <Button title="Grant Permission" onPress={requestPermission} />
            </Screen>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    skipProcessing: true
                });
                setPhoto(photo.uri);
            } catch (error) {
                Alert.alert("Error", "Failed to take picture");
            }
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const confirmPhoto = () => {
        if (photo) {
            // Pass the photo URI to the next screen (params or context)
            // For now, passing via query param (simple, but limit size) or store
            // Better to use a global store or context, but for simplicity:
            router.push({
                pathname: "/(main)/symptoms",
                params: { imageUri: photo }
            });
        }
    };

    if (photo) {
        return (
            <Screen safeArea className="bg-black">
                <Image source={{ uri: photo }} className="flex-1 w-full h-full" resizeMode="contain" />
                <View className="absolute bottom-0 w-full p-6 flex-row justify-between bg-black/50">
                    <Button
                        title="Retake"
                        onPress={() => setPhoto(null)}
                        variant="secondary"
                        className="flex-1 mr-4"
                    />
                    <Button
                        title="Use Photo"
                        onPress={confirmPhoto}
                        variant="primary"
                        className="flex-1"
                    />
                </View>
            </Screen>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <CameraView
                style={{ flex: 1 }}
                facing={facing}
                ref={cameraRef}
            />
            <View className="absolute inset-0 flex-1 justify-between p-6 pt-12">
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 bg-black/40 rounded-full">
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))} className="p-2 bg-black/40 rounded-full">
                        <MaterialIcons name="flip-camera-ios" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                <View className="flex-row justify-between items-center mb-8 px-4">
                    <TouchableOpacity onPress={pickImage} className="items-center justify-center w-12 h-12 rounded-full bg-white/20">
                        <Ionicons name="images" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={takePicture}
                        className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
                    >
                        <View className="w-16 h-16 rounded-full bg-white transition-opacity active:opacity-80" />
                    </TouchableOpacity>

                    <View className="w-12" />
                </View>
            </View>
            <View className="bg-black p-4 items-center">
                <Caption className="text-white">Ensure good lighting and focus</Caption>
            </View>
        </View>
    );
}
