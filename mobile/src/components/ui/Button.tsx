import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
}) => {
  const isInteractive = !disabled && !loading;

  const getContainerStyle = ({ pressed }: { pressed: boolean }): ViewStyle[] => {
    const baseStyle = styles.base;
    const sizeStyle = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    const disabledStyle = disabled ? styles.disabled : null;
    const pressedStyle = pressed && isInteractive ? styles.pressed : null;

    return [baseStyle, sizeStyle, variantStyle, disabledStyle, pressedStyle, style].filter(
      Boolean
    ) as ViewStyle[];
  };

  const getTextColor = (): string => {
    if (disabled) {
      return colors.neutral[400];
    }
    switch (variant) {
      case 'outline':
      case 'ghost':
        return colors.primary.main;
      case 'secondary':
        return colors.secondary.contrastText;
      case 'primary':
      default:
        return colors.primary.contrastText;
    }
  };

  const getIndicatorColor = (): string => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return colors.primary.main;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      style={getContainerStyle}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIndicatorColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            textSizeStyles[size],
            { color: getTextColor() },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    minHeight: 44, // Minimum accessible touch target
    minWidth: 44,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: typography.fontWeight.semiBold,
    textAlign: 'center',
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
  },
});

const textSizeStyles = StyleSheet.create({
  sm: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
  },
  md: {
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.md,
  },
  lg: {
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.lg,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary.main,
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: colors.secondary.main,
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary.main,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
