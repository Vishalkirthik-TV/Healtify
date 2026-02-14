import { View, ScrollView, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../utils/cn";
import { StatusBar } from "expo-status-bar";

interface ScreenProps extends ViewProps {
    scrollable?: boolean;
    safeArea?: boolean;
    className?: string;
    contentContainerStyle?: any;
}

export function Screen({
    children,
    scrollable = false,
    safeArea = true,
    className,
    style,
    contentContainerStyle,
    ...props
}: ScreenProps) {
    const insets = useSafeAreaInsets();

    const containerStyle = [
        safeArea && { paddingTop: insets.top, paddingBottom: insets.bottom },
        style
    ];

    if (scrollable) {
        return (
            <View className="flex-1 bg-slate-50">
                <StatusBar style="dark" />
                <ScrollView
                    contentContainerStyle={[
                        safeArea && { paddingTop: insets.top, paddingBottom: insets.bottom },
                        { flexGrow: 1 },
                        contentContainerStyle
                    ]}
                    className={cn("flex-1", className)}
                    keyboardShouldPersistTaps="handled"
                    {...props}
                >
                    {children}
                </ScrollView>
            </View>
        );
    }

    return (
        <View
            style={containerStyle}
            className={cn("flex-1 bg-slate-50", className)}
            {...props}
        >
            <StatusBar style="dark" />
            {children}
        </View>
    );
}
