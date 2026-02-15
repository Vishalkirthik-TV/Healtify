import { View, ScrollView, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../utils/cn";
import { StatusBar } from "expo-status-bar";

interface ScreenProps extends ViewProps {
    scrollable?: boolean;
    safeArea?: boolean;
    className?: string;
    contentContainerStyle?: any;
    footer?: React.ReactNode;
}

export function Screen({
    children,
    scrollable = false,
    safeArea = true,
    className,
    style,
    contentContainerStyle,
    footer,
    ...props
}: ScreenProps) {
    const insets = useSafeAreaInsets();

    const containerStyle = [
        safeArea && { paddingTop: insets.top, paddingBottom: insets.bottom },
        style
    ];

    if (scrollable) {
        return (
            <View className={cn("flex-1", !className?.includes("bg-") && "bg-slate-50", className)} style={style}>
                <StatusBar style="dark" />
                <ScrollView
                    contentContainerStyle={[
                        safeArea && { paddingTop: insets.top, paddingBottom: insets.bottom },
                        { flexGrow: 1 },
                        contentContainerStyle
                    ]}
                    className="flex-1"
                    keyboardShouldPersistTaps="handled"
                    {...props}
                >
                    {children}
                </ScrollView>
                {footer}
            </View>
        );
    }

    return (
        <View
            style={[containerStyle, style]}
            className={cn("flex-1", !className?.includes("bg-") && "bg-slate-50", className)}
            {...props}
        >
            <StatusBar style="dark" />
            {children}
            {footer}
        </View>
    );
}
