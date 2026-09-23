import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { borderRadius, colors, shadows, spacing } from '../../theme';

export interface CardProps extends ViewProps {
  padding?: keyof typeof spacing;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  elevation = 'sm',
  bordered = true,
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.card,
        { padding: spacing[padding] },
        bordered && styles.bordered,
        shadows[elevation],
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.lg,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.border.default,
  },
});
