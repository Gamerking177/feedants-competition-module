import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { spacing } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorViewProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  title = 'Something went wrong',
  message,
  code,
  onRetry,
  retryLabel = 'Try Again',
  style,
}) => {
  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message}`}
    >
      <View style={styles.content}>
        <Text variant="h3" color="primary" align="center" style={styles.title}>
          {title}
        </Text>

        <Text variant="body" color="secondary" align="center" style={styles.message}>
          {message}
        </Text>

        {code ? (
          <Text variant="caption" color="muted" align="center" style={styles.code}>
            Error Code: {code}
          </Text>
        ) : null}

        {onRetry ? (
          <Button
            title={retryLabel}
            onPress={onRetry}
            variant="primary"
            size="md"
            style={styles.button}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.sm,
  },
  message: {
    marginBottom: spacing.md,
  },
  code: {
    marginBottom: spacing.lg,
  },
  button: {
    minWidth: 160,
  },
});
