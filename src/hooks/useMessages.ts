import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  deleteMessage,
  getMessage,
  listMessages,
  sendMessage,
} from '@/services/messages';
import { useMyProfile } from './useMyProfile';
import type { Message } from '@/types';
import { appendUnique, replaceOptimistic } from '@/utils/messages';

// Histórico da sala + a inscrição no Realtime: qualquer INSERT ou DELETE na
// tabela "messages" desta sala chega aqui e atualiza a lista sozinho, em
// qualquer aparelho que esteja com a tela aberta.
export function useMessages(roomId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => listMessages(roomId as string),
    enabled: Boolean(roomId),
  });

  useEffect(() => {
    if (!roomId) return undefined;

    // CORREÇÃO C10: nome do canal com um sufixo único por montagem. Nas
    // versões atuais do supabase-js, pedir um canal com um nome que ainda está
    // fechando devolve o canal antigo, e o .on() depois dele quebra com
    // "cannot add postgres_changes callbacks ... after subscribe()".
    // postgres_changes não precisa que todos usem o mesmo nome de canal.
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`room-messages-${roomId}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const id = payload.new.id as string;
          // O evento cru não traz o nome/cor do autor (não passa pelo join do
          // serviço); buscamos a versão completa antes de mostrar.
          try {
            const full = await getMessage(id);
            queryClient.setQueryData<Message[]>(['messages', roomId], (old) =>
              appendUnique(old, full),
            );
          } catch {
            // A mensagem pode ter sido apagada entre o evento e a busca — ignore.
          }
        },
      )
      .on(
        'postgres_changes',
        // CORREÇÃO C06: o Supabase Realtime NÃO aplica filtro a eventos DELETE
        // (o registro apagado só traz a chave primária). Com o filtro
        // room_id=eq... do guia, o evento nunca chegava e a mensagem apagada
        // continuava aparecendo no outro aparelho (cenário 11). Escutamos sem
        // filtro e removemos pelo id — se não estiver na lista, nada muda.
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (!id) return;
          queryClient.setQueryData<Message[]>(['messages', roomId], (old) =>
            old?.filter((m) => m.id !== id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return query;
}

// Envia com atualização otimista: a mensagem aparece na hora, com um id
// temporário, e é substituída pela confirmada assim que o servidor responde.
// Se der erro, ela é removida — e o campo de texto pode ser restaurado.
export function useSendMessage(roomId: string) {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error('Faça login para enviar mensagens.');
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Message = {
        id: tempId,
        roomId,
        userId: user.id,
        body,
        createdAt: new Date().toISOString(),
        username: profile?.username ?? 'Você',
        avatarColor: profile?.avatarColor ?? '#2563EB',
      };
      queryClient.setQueryData<Message[]>(['messages', roomId], (old) => [
        ...(old ?? []),
        optimistic,
      ]);

      try {
        const real = await sendMessage(roomId, user.id, body);
        // CORREÇÃO C07: se o Realtime já trouxe a mensagem real, só some com
        // a temporária (o guia trocava e ficavam duas com o mesmo id).
        queryClient.setQueryData<Message[]>(['messages', roomId], (old) =>
          replaceOptimistic(old, tempId, real),
        );
        return real;
      } catch (error) {
        queryClient.setQueryData<Message[]>(['messages', roomId], (old) =>
          old?.filter((m) => m.id !== tempId),
        );
        throw error;
      }
    },
  });
}

export function useDeleteMessage(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onMutate: async (id) => {
      // Otimista aqui também: some da tela antes mesmo da resposta chegar.
      queryClient.setQueryData<Message[]>(['messages', roomId], (old) =>
        old?.filter((m) => m.id !== id),
      );
    },
    // CORREÇÃO C14: no guia, se o servidor recusasse (sem internet, por
    // exemplo), a mensagem sumia só do seu aparelho e nunca voltava.
    // Recarregamos a lista para ela reaparecer; a tela mostra o erro.
    onError: () => queryClient.invalidateQueries({ queryKey: ['messages', roomId] }),
  });
}
