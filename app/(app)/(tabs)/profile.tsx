import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useMyProfile, useUpdateUsername } from '@/hooks/useMyProfile';
import { useMyRoomIds } from '@/hooks/useRooms';
import { colors, radius, spacing } from '@/theme';
import { confirmAction, showMessage } from '@/utils/confirm';
import { friendlyError } from '@/utils/errors';
import type { IconName } from '@/utils/icons';

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  const { data: myRoomIds } = useMyRoomIds();
  const updateUsername = useUpdateUsername();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  function startEditing() {
    setName(profile?.username ?? '');
    setEditing(true);
  }

  // CORREÇÃO C11: alertas e confirmações também funcionam no navegador.
  function save() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showMessage('Nome muito curto', 'Use pelo menos 2 caracteres.');
      return;
    }
    updateUsername.mutate(trimmed, {
      onSuccess: () => setEditing(false),
      onError: (e) => showMessage('Não foi possível salvar', friendlyError(e)),
    });
  }

  function confirmSignOut() {
    confirmAction('Sair', 'Deseja encerrar a sessão?', 'Sair', () => {
      signOut().catch((e) => showMessage('Erro', friendlyError(e)));
    });
  }

  // CORREÇÃO C26: no guia, se o perfil não carregasse (tabela inexistente ou
  // perfil não criado), a tela ficava só com o e-mail e um "Editar nome" que
  // não salvava nada, sem dizer o que estava errado.
  if (profileQuery.isLoading) return <LoadingView />;
  if (profileQuery.isError || !profile) {
    return (
      <Screen>
        <ErrorState
          message={
            profileQuery.isError
              ? friendlyError(profileQuery.error)
              : 'Seu perfil não foi encontrado. Rode o supabase/schema.sql no Supabase e tente de novo.'
          }
          onRetry={profileQuery.refetch}
        />
        <Button
          title="Sair da conta"
          variant="ghost"
          onPress={confirmSignOut}
          style={styles.signOutGhost}
        />
      </Screen>
    );
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';
  const roomCount = myRoomIds?.size ?? 0;

  return (
    <Screen scroll>
      <Text style={styles.title}>Perfil</Text>

      {/* CORREÇÃO C26: tela mais completa — cabeçalho colorido com o avatar,
          contador de salas e dados da conta, em vez de um cartão quase vazio. */}
      <View style={[styles.hero, { backgroundColor: profile.avatarColor }]}>
        <View style={styles.avatarRing}>
          <Avatar username={profile.username} color={profile.avatarColor} size={84} />
        </View>
        {editing ? null : (
          <>
            <Text style={styles.heroName}>{profile.username}</Text>
            <Text style={styles.heroEmail}>{user?.email}</Text>
          </>
        )}
      </View>

      {editing ? (
        <Card style={styles.editCard}>
          <Input
            label="Nome exibido no chat"
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoFocus
          />
          <View style={styles.editButtons}>
            <Button
              title="Cancelar"
              variant="ghost"
              onPress={() => setEditing(false)}
              style={styles.editButton}
            />
            <Button
              title="Salvar"
              onPress={save}
              loading={updateUsername.isPending}
              style={styles.editButton}
            />
          </View>
        </Card>
      ) : (
        <Button
          title="Editar nome"
          variant="secondary"
          onPress={startEditing}
          style={styles.editName}
        />
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{roomCount}</Text>
          <Text style={styles.statLabel}>{roomCount === 1 ? 'sala' : 'salas'}</Text>
        </View>
        <View style={styles.stat}>
          <View style={[styles.colorDot, { backgroundColor: profile.avatarColor }]} />
          <Text style={styles.statLabel}>sua cor no chat</Text>
        </View>
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Conta</Text>
        <InfoRow icon="person-outline" label="Nome" value={profile.username} />
        <InfoRow icon="mail-outline" label="E-mail" value={user?.email ?? '—'} />
        <InfoRow icon="calendar-outline" label="Membro desde" value={memberSince} />
        <InfoRow icon="chatbubbles-outline" label="Salas" value={String(roomCount)} />
      </Card>

      <Button
        title="Sair da conta"
        variant="danger"
        onPress={confirmSignOut}
        style={styles.signOut}
      />
      <Text style={styles.footer}>ChatRoom · v1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  hero: {
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: spacing.sm,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroEmail: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  editName: { marginTop: spacing.md },
  editCard: { marginTop: spacing.md },
  editButtons: { flexDirection: 'row', gap: spacing.sm },
  editButton: { flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted },
  colorDot: { width: 28, height: 28, borderRadius: 14, marginVertical: 2 },
  infoCard: { marginTop: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 14, color: colors.muted, width: 110 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  signOut: { marginTop: spacing.lg },
  signOutGhost: { margin: spacing.md },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: spacing.md },
});
