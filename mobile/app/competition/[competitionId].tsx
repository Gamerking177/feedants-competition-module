import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Screen, Text } from '../../src/components/ui';
import { spacing } from '../../src/theme';

export default function CompetitionDetailsPlaceholderScreen() {
  const router = useRouter();
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();

  return (
    <Screen scrollable safeArea={false} contentContainerStyle={styles.container}>
      <Card padding="lg" elevation="sm" style={styles.card}>
        <Text variant="h2" color="primary" style={styles.title}>
          Competition Details
        </Text>

        <View style={styles.badge}>
          <Text variant="caption" color="primary" weight="semiBold">
            ID: {competitionId || 'Unknown'}
          </Text>
        </View>

        <Text variant="body" color="secondary" style={styles.description}>
          This is the competition details placeholder screen. The scrolling architecture, safe-area handling,
          and route parameter parsing are verified. The complete visual design and API integration will be implemented
          in the subsequent task.
        </Text>

        <Button
          title="Back to Competitions"
          onPress={() => router.back()}
          variant="outline"
          size="md"
          accessibilityHint="Returns to the competition listing screen"
          style={styles.backButton}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  card: {
    marginTop: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginBottom: spacing.md,
  },
  description: {
    marginBottom: spacing.xl,
  },
  backButton: {
    marginTop: spacing.xs,
  },
});
