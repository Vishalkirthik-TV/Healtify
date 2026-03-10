import { View, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { Title, Subtitle, Body, Caption } from "../../components/Typography";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

// Mock Data Type
interface TriageResult {
    risk_level: "Low" | "Moderate" | "High";
    likely_category: string;
    confidence_score: number;
    reasoning: string[];
    recommended_action: string;
    safety_note: string;
}

export default function Results() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Mock Result - in real app, fetch this or pass it
    const result: TriageResult = {
        risk_level: "High",
        likely_category: "Suspicious Lesion",
        confidence_score: 88,
        reasoning: [
            "Irregular border detected",
            "Asymmetry in shape",
            "Color variation present"
        ],
        recommended_action: "Consult a Dermatologist",
        safety_note: "Based on the image analysis, professional evaluation is recommended.",
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case "Low": return "bg-green-100 text-green-800 border-green-200";
            case "Moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "High": return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case "Low": return "check-circle";
            case "Moderate": return "alert-circle";
            case "High": return "alert-decagram";
            default: return "help-circle";
        }
    }

    return (
        <Screen safeArea scrollable className="p-6">
            <Title className="mb-2">Analysis Results</Title>
            <Caption className="mb-6">AI-generated triage assessment</Caption>

            <Card className={`mb-6 border-l-4 ${result.risk_level === 'High' ? 'border-l-red-500' : result.risk_level === 'Moderate' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                <View className="flex-row items-center mb-4">
                    <MaterialCommunityIcons
                        name={getRiskIcon(result.risk_level)}
                        size={32}
                        color={result.risk_level === 'High' ? '#ef4444' : result.risk_level === 'Moderate' ? '#eab308' : '#22c55e'}
                    />
                    <View className="ml-3">
                        <Caption>Risk Level</Caption>
                        <Title className={result.risk_level === 'High' ? 'text-red-600' : result.risk_level === 'Moderate' ? 'text-yellow-600' : 'text-green-600'}>
                            {result.risk_level} Risk
                        </Title>
                    </View>
                </View>

                <View className="bg-slate-50 p-3 rounded-lg mb-3">
                    <Subtitle className="text-base mb-1">Likely Category</Subtitle>
                    <Body className="font-semibold">{result.likely_category}</Body>
                </View>

                <View className="flex-row items-center">
                    <Body className="text-sm text-slate-500 flex-1">
                        Confidence Score: <Body className="font-bold text-slate-700">{result.confidence_score}%</Body>
                    </Body>
                    {result.confidence_score < 60 && (
                        <Caption className="text-orange-500">Low confidence</Caption>
                    )}
                </View>
            </Card>

            <Card className="mb-6">
                <Subtitle className="mb-3 flex-row items-center">
                    <MaterialCommunityIcons name="brain" size={20} color="#0d9488" className="mr-2" />
                    AI Reasoning
                </Subtitle>
                {result.reasoning.map((reason, index) => (
                    <View key={index} className="flex-row items-start mb-2">
                        <View className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 mr-2" />
                        <Body className="flex-1 text-sm">{reason}</Body>
                    </View>
                ))}
            </Card>

            <Card className="mb-6 bg-blue-50 border-blue-100">
                <Subtitle className="text-blue-900 mb-2">Recommended Action</Subtitle>
                <Body className="text-blue-800 font-bold text-lg mb-1">
                    {result.recommended_action}
                </Body>
                <Caption className="text-blue-600">
                    {result.safety_note}
                </Caption>
            </Card>

            <View className="space-y-3 mb-8">
                <Button
                    title="View Full Report"
                    onPress={() => router.push({ pathname: "/(main)/report", params: { ...params, result: JSON.stringify(result) } })}
                    variant="primary"
                />
                <Button
                    title="Back to Home"
                    onPress={() => router.replace("/(main)")}
                    variant="ghost"
                />
            </View>
        </Screen>
    );
}
