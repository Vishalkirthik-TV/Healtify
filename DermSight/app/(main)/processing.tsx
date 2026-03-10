import { useEffect } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { Title, Body } from "../../components/Typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triageService } from "../../services/api";

export default function Processing() {
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        const analyze = async () => {
            try {
                const result = await triageService.analyze({
                    imageUri: params.imageUri as string,
                    description: params.description as string,
                    duration: params.duration as string,
                    painLevel: Number(params.painLevel),
                    hasFever: params.hasFever === 'true',
                    hasHistory: params.hasHistory === 'true',
                });

                router.replace({
                    pathname: "/(main)/results",
                    params: {
                        ...params,
                        result: JSON.stringify(result)
                    }
                });
            } catch (error) {
                console.error(error);
                Alert.alert(
                    "Analysis Failed",
                    "Could not process the image. Please try again.",
                    [{ text: "OK", onPress: () => router.back() }]
                );
            }
        };

        analyze();
    }, []);

    return (
        <Screen safeArea className="items-center justify-center p-6 bg-slate-50">
            <View className="mb-8 p-6 bg-white rounded-full shadow-sm">
                <ActivityIndicator size="large" color="#0d9488" />
            </View>

            <Title className="text-center mb-4">Analyzing...</Title>
            <Body className="text-center text-slate-500 mb-12">
                Our AI is reviewing your image and symptoms against clinical patterns.
            </Body>

            <View className="bg-blue-50 p-4 rounded-xl flex-row items-center space-x-3 gap-3">
                <MaterialCommunityIcons name="shield-check" size={24} color="#3b82f6" />
                <Body className="text-blue-800 text-sm flex-1">
                    Your data is encrypted and processed securely. This is not a medical diagnosis.
                </Body>
            </View>
        </Screen>
    );
}
