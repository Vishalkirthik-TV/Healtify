import { Text, TextProps } from "react-native";
import { cn } from "../utils/cn";

interface TypographyProps extends TextProps {
    className?: string;
}

export function Title({ className, ...props }: TypographyProps) {
    return (
        <Text
            className={cn("text-2xl font-bold text-slate-900", className)}
            {...props}
        />
    );
}

export function Subtitle({ className, ...props }: TypographyProps) {
    return (
        <Text
            className={cn("text-lg font-semibold text-slate-700", className)}
            {...props}
        />
    );
}

export function Body({ className, ...props }: TypographyProps) {
    return (
        <Text
            className={cn("text-base text-slate-600 leading-relaxed", className)}
            {...props}
        />
    );
}

export function Caption({ className, ...props }: TypographyProps) {
    return (
        <Text
            className={cn("text-sm text-slate-500", className)}
            {...props}
        />
    );
}
