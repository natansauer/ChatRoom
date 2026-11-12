import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, LoadingView } from '@/components/StateViews';
import { RoomCard } from '@/components/RoomCard';
import { Screen } from '@/components/Screen';
import { useMyRoomIds, useRooms } from '@/hooks/useRooms';
import { colors, radius, spacing } from '@/theme';
import { friendlyError } from '@/utils/errors';

export default function RoomsScreen() {
  const router = useRouter();
  const { data: rooms, isLoading, isError, error, refetch, isRefetching } = useRooms();
  const { data: myRoomIds, refetch: refetchMine } = useMyRoomIds();
  const memberIds = useMemo(() => myRoomIds ?? new Set<string>(), [myRoomIds]);

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorState message={friendlyError(error)} onRetry={refetch} />;

  // CORREÇÃO C16: a lista do guia era uma <View> sem área segura. Com o Expo
  // SDK 54 (edge-to-edge no Android) e no iPhone com notch, o título "Salas"
  // ficava embaixo da barra de status. <Screen> aplica a área segura do topo.
  return (
    <Screen>
      <FlatList
        data={rooms ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Salas</Text>
            <Text style={styles.subtitle}>
              Entre em uma sala e converse em tempo real.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Nenhuma sala ainda"
            message="Crie a primeira sala para começar a conversar."
          />
        }
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            isMember={memberIds.has(item.id)}
            onPress={() => router.push(`/room/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              refetchMine();
            }}
            tintColor={colors.primary}
          />
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nova sala"
        onPress={() => router.push('/room/new')}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 100,
    flexGrow: 1,
  },
  header: { marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
