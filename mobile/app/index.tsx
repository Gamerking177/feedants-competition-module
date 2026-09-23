import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Screen, Text } from '../src/components/ui';
import { spacing } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const sampleCompetitionId = '60c72b2f9b1d8b001c8e4e01';

  const handleOpenCompetition = () => {
    router.push({
      pathname: '/competition/[competitionId]',
      params: { competitionId: sampleCompetitionId },
    });
  };

  return (
    <Screen scrollable safeArea={false} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="h1" color="primary" style={styles.title}>
          Feedants Competitions
        </Text>
        <Text variant="body" color="secondary">
          Welcome to the Feedants mobile competition module. Explore competitions, register, and track submissions.
        </Text>
      </View>

      <Card padding="lg" elevation="sm" style={styles.card}>
        <Text variant="h3" color="primary" style={styles.cardTitle}>
          Mobile Architecture Established
        </Text>
        <Text variant="body" color="secondary" style={styles.cardDescription}>
          The mobile foundation includes Expo Router navigation, centralized API client, secure token storage,
          domain types, and accessible UI primitives.
        </Text>

        <Button
          title="View Sample Competition"
          onPress={handleOpenCompetition}
          variant="primary"
          size="md"
          accessibilityHint="Navigates to the competition details placeholder screen"
          style={styles.button}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  card: {
    marginTop: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.sm,
  },
  cardDescription: {
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.sm,
  },
});
