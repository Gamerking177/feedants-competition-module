import React from 'react';
import { StyleSheet, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { colors, typography } from '../../theme';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySm' | 'caption' | 'label';
export type TextColor = 'primary' | 'secondary' | 'muted' | 'inverse' | 'error' | 'success' | 'link';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: keyof typeof typography.fontWeight;
  align?: TextStyle['textAlign'];
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  align,
  style,
  children,
  ...rest
}) => {
  const textColor = getTextColor(color);
  const variantStyle = styles[variant];
  const customWeight = weight ? { fontWeight: typography.fontWeight[weight] } : null;
  const customAlign = align ? { textAlign: align } : null;

  return (
    <RNText
      style={[variantStyle, { color: textColor }, customWeight, customAlign, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

function getTextColor(color: TextColor): string {
  switch (color) {
    case 'secondary':
      return colors.text.secondary;
    case 'muted':
      return colors.text.muted;
    case 'inverse':
      return colors.text.inverse;
    case 'error':
      return colors.semantic.error;
    case 'success':
      return colors.semantic.success;
    case 'link':
      return colors.text.link;
    case 'primary':
    default:
      return colors.text.primary;
  }
}

const styles = StyleSheet.create({
  h1: {
    fontSize: typography.fontSize.xxxl,
    lineHeight: typography.lineHeight.xxxl,
    fontWeight: typography.fontWeight.bold,
  },
  h2: {
    fontSize: typography.fontSize.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontWeight: typography.fontWeight.bold,
  },
  h3: {
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: typography.fontWeight.semiBold,
  },
  body: {
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.fontWeight.regular,
  },
  bodySm: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.fontWeight.regular,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.fontWeight.regular,
  },
  label: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
