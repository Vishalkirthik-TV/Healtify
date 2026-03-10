import { useState } from "react";
import { View, TextInput, Switch, ScrollView, Image, TouchableOpacity, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { Title, Subtitle, Body, Caption } from "../../components/Typography";
import { Card } from "../../components/Card";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Symptoms() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const imageUri = params.imageUri as string;

    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("Just started");
    const [painLevel, setPainLevel] = useState(0);
    const [hasFever, setHasFever] = useState(false);
    const [hasHistory, setHasHistory] = useState(false);

    const handleSubmit = () => {
        // Navigate to processing with data
        router.push({
            pathname: "/(main)/processing",
            params: {
                imageUri,
                description,
                duration,
                painLevel,
                hasFever: hasFever.toString(),
                hasHistory: hasHistory.toString(),
            },
        });
    };

    return (
        <Screen safeArea scrollable className="p-6">
            <View className="flex-row items-center mb-6">
                {imageUri && (
                    <Image
                        source={{ uri: imageUri }}
                        className="w-16 h-16 rounded-lg mr-4 bg-slate-200"
                    />
                )}
                <View className="flex-1">
                    <Title className="text-xl">Describe Symptoms</Title>
                    <Caption>Help the AI analyze your condition</Caption>
                </View>
            </View>

            <Card className="mb-6 space-y-4">
                <View>
                    <Subtitle className="mb-2">What are you experiencing?</Subtitle>
                    <TextInput
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3 h-24 text-base text-slate-800"
                        multiline
                        placeholder="e.g. Itchy red rash, started yesterday..."
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View>
                    <Subtitle className="mb-2">How long has it been there?</Subtitle>
                    <View className="flex-row flex-wrap gap-2">
                        {["Just started", "Few days", "Week+", "Month+"].map((d) => (
                            <TouchableOpacity
                                key={d}
                                onPress={() => setDuration(d)}
                                className={`px-4 py-2 rounded-full border ${duration === d
                                        ? "bg-teal-600 border-teal-600"
                                        : "bg-white border-slate-200"
                                    }`}
                            >
                                <Text
                                    className={
                                        duration === d ? "text-white font-semibold" : "text-slate-600"
                                    }
                                >
                                    {d}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View>
                    <Subtitle className="mb-2">Pain Level (0-10): {painLevel}</Subtitle>
                    <View className="flex-row justify-between items-center">
                        <Button
                            title="-"
                            onPress={() => setPainLevel(Math.max(0, painLevel - 1))}
                            variant="outline"
                            size="sm"
                            className="w-12"
                        />
                        <View className="flex-1 items-center">
                            <View className="w-full h-2 bg-slate-200 rounded-full mx-4 overflow-hidden relative">
                                <View className="h-full bg-teal-500" style={{ width: `${painLevel * 10}%` }} />
                            </View>
                        </View>
                        <Button
                            title="+"
                            onPress={() => setPainLevel(Math.min(10, painLevel + 1))}
                            variant="outline"
                            size="sm"
                            className="w-12"
                        />
                    </View>
                </View>

                <View className="flex-row justify-between items-center py-2 border-t border-slate-100">
                    <View>
                        <Subtitle className="text-base">Fever</Subtitle>
                        <Caption>Body temperature above 100.4°F</Caption>
                    </View>
                    <Switch
                        value={hasFever}
                        onValueChange={setHasFever}
                        trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                    />
                </View>

                <View className="flex-row justify-between items-center py-2 border-t border-slate-100">
                    <View>
                        <Subtitle className="text-base">Medical History</Subtitle>
                        <Caption>Diabetes, Allergies, etc.</Caption>
                    </View>
                    <Switch
                        value={hasHistory}
                        onValueChange={setHasHistory}
                        trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                    />
                </View>
            </Card>

            <Button
                title="Analyze Condition"
                onPress={handleSubmit}
                disabled={!description}
                size="lg"
                className="mb-8"
            />
        </Screen>
    );
}
