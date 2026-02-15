import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { cn } from "../utils/cn";

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    textClassName?: string;
    icon?: React.ReactNode;
}

export function Button({
    title,
    onPress,
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    className,
    textClassName,
    icon,
}: ButtonProps) {
    const baseStyles = "flex-row items-center justify-center rounded-xl";

    const variants = {
        primary: "bg-purple-600 active:bg-purple-700",
        secondary: "bg-slate-200 active:bg-slate-300",
        outline: "border-2 border-purple-600 bg-transparent active:bg-purple-50",
        ghost: "bg-transparent active:bg-slate-100",
        danger: "bg-red-500 active:bg-red-600",
    };

    const sizes = {
        sm: "px-4 py-2",
        md: "px-6 py-3",
        lg: "px-8 py-4",
    };

    const textVariants = {
        primary: "text-white font-bold",
        secondary: "text-slate-900 font-semibold",
        outline: "text-purple-600 font-bold",
        ghost: "text-slate-600 font-semibold",
        danger: "text-white font-bold",
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                disabled && "opacity-50",
                className
            )}
        >
            {loading ? (
                <ActivityIndicator color={variant === "outline" ? "#9333ea" : "white"} />
            ) : (
                <View className="flex-row items-center">
                    {icon && <View className="mr-2">{icon}</View>}
                    <Text
                        className={cn(
                            "text-center text-base",
                            textVariants[variant],
                            textClassName
                        )}
                    >
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
