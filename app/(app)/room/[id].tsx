import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageBubble } from '@/components/MessageBubble';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useAuth } from '@/context/AuthContext';
import { useDeleteMessage, useMessages, useSendMessage } from '@/hooks/useMessages';
import { useRoomPresence } from '@/hooks/usePresence';
import {
  useJoinRoom,
  useLeaveRoom,
  useMyRoomIds,
  useRoom,
  useRoomMembers,
} from '@/hooks/useRooms';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import type { Message } from '@/types';
import { colors, radius, spacing } from '@/theme';
import { confirmAction, showMessage } from '@/utils/confirm';
import { friendlyError } from '@/utils/errors';
import { isPendingMessage, shouldGroupWithPrevious } from '@/utils/messages';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const room = useRoom(id);
  const myRooms = useMyRoomIds();
  const isMember = myRooms.data?.has(id) ?? false;
  // CORREÇÃO C08: no guia, useMessages(id) rodava mesmo ANTES de entrar na
  // sala. O RLS devolvia lista vazia, ela ficava em cache por 30 s e, ao tocar
  // em "Entrar na sala", o histórico não aparecia (cenário 5 do roteiro).
  // Agora mensagens, presença e digitação só ligam depois de entrar.
  const activeRoomId = isMember ? id : undefined;
  const messages = useMessages(activeRoomId);
  const sendMessage = useSendMessage(id);
  const deleteMessage = useDeleteMessage(id);
  const joinRoom = useJoinRoom();
  const leaveRoom = useLeaveRoom();
  const online = useRoomPresence(activeRoomId);
  const { typingUsernames, notifyTyping } = useTypingIndicator(activeRoomId);
  const { data: members } = useRoomMembers(activeRoomId);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.data?.length)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.data?.length]);

  // CORREÇÃO C09: enquanto a lista "minhas salas" carregava, isMember era
  // false e a tela de boas-vindas ("Entrar na sala") piscava até para quem já
  // participava — e um toque rápido gerava um insert desnecessário.
  if (room.isLoading || myRooms.isLoading) return <LoadingView />;
  if (room.isError || !room.data)
    return <ErrorState message={friendlyError(room.error)} onRetry={room.refetch} />;

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    sendMessage.mutate(body, {
      onError: (e) => {
        // CORREÇÃO C22: o guia promete que "o campo de texto pode ser
        // restaurado" se o envio falhar, mas o código não fazia isso: o texto
        // digitado se perdia. Devolvemos ao campo para tentar de novo.
        setText((current) => current || body);
        showMessage('Não foi possível enviar', friendlyError(e));
      },
    });
  }

  // CORREÇÃO C11: confirmAction funciona no celular (Alert) e no navegador.
  function confirmDelete(messageId: string) {
    confirmAction('Apagar mensagem', 'Esta ação não pode ser desfeita.', 'Apagar', () =>
      deleteMessage.mutate(messageId, {
        // CORREÇÃO C14: avisa quando o servidor recusa.
        onError: (e) => showMessage('Não foi possível apagar', friendlyError(e)),
      }),
    );
  }

  function confirmLeave() {
    confirmAction('Sair da sala', `Deseja sair de "${room.data!.name}"?`, 'Sair', () =>
      leaveRoom.mutate(id, {
        onSuccess: () => router.back(),
        onError: (e) => showMessage('Não foi possível sair', friendlyError(e)),
      }),
    );
  }

  if (!isMember) {
    return (
      <View style={styles.joinScreen}>
        <Stack.Screen options={{ title: room.data.name, headerRight: undefined }} />
        <Text style={styles.joinEmoji}>{room.data.emoji}</Text>
        <Text style={styles.joinTitle}>{room.data.name}</Text>
        {room.data.description ? (
          <Text style={styles.joinDescription}>{room.data.description}</Text>
        ) : null}
        <Text style={styles.joinCount}>{room.data.memberCount ?? 0} participantes</Text>
        <Pressable
          accessibilityRole="button"
          // CORREÇÃO C20: botão travado enquanto o pedido está em andamento.
          disabled={joinRoom.isPending}
          onPress={() =>
            joinRoom.mutate(id, {
              onError: (e) => showMessage('Não foi possível entrar', friendlyError(e)),
            })
          }
          style={[styles.joinButton, joinRoom.isPending && styles.sendDisabled]}
        >
          <Text style={styles.joinButtonText}>
            {joinRoom.isPending ? 'Entrando...' : 'Entrar na sala'}
          </Text>
        </Pressable>
      </View>
    );
  }

  const onlineCount = online.length;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: room.data.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sair da sala"
              onPress={confirmLeave}
              hitSlop={12}
            >
              <Ionicons name="exit-outline" size={22} color={colors.danger} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.onlineBar}>
        <View style={styles.onlineDot} />
        <Text style={styles.onlineText}>
          {onlineCount} online{members?.length ? ` · ${members.length} na sala` : ''}
        </Text>
      </View>

      {messages.isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          ref={listRef}
          data={messages.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              mine={item.userId === user?.id}
              showSender={!shouldGroupWithPrevious(item, messages.data?.[index - 1])}
              pending={isPendingMessage(item)}
              onLongPress={() => confirmDelete(item.id)}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <TypingIndicator usernames={typingUsernames} />

      <View
        style={[
          styles.composer,
          // CORREÇÃO C17: o campo de envio ficava em cima da barra de gestos do
          // iPhone e da barra de navegação do Android (edge-to-edge no SDK 54).
          { paddingBottom: spacing.md + insets.bottom },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            if (t.length > 0) notifyTyping();
          }}
          placeholder="Escreva uma mensagem"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          onPress={handleSend}
          disabled={!text.trim()}
          style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
        >
          <Ionicons name="send" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  onlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online },
  onlineText: { fontSize: 12, color: colors.muted },
  list: { padding: spacing.md, gap: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  joinScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  joinEmoji: { fontSize: 56 },
  joinTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  joinDescription: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  joinCount: { fontSize: 13, color: colors.muted, marginBottom: spacing.md },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  joinButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
});
