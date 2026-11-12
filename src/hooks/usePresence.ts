import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMyProfile } from './useMyProfile';

export interface OnlineUser {
  userId: string;
  username: string;
}

// "Quem está online agora, nesta sala" — sem nenhuma tabela no banco. O
// Presence do Supabase Realtime mantém essa lista em memória, compartilhada
// entre todo mundo que está com o canal aberto, e a atualiza sozinho quando
// alguém entra ou sai (inclusive por queda de conexão).
export function useRoomPresence(roomId: string | undefined): OnlineUser[] {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: profile } = useMyProfile();
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const usernameRef = useRef(profile?.username ?? 'Você');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);

  usernameRef.current = profile?.username ?? 'Você';

  // CORREÇÃO C10: no guia as dependências eram [roomId, user, profile?.username].
  // O objeto "user" muda a cada renovação de token (a cada hora) e o nome
  // chega depois do primeiro render, então o canal era fechado e reaberto com
  // o MESMO nome logo em seguida — o que, no supabase-js atual, pode devolver
  // o canal antigo e quebrar com "cannot add presence callbacks ... after
  // subscribe()". Agora o canal só depende da sala e do id do usuário; o nome
  // é lido de uma ref e reenviado no efeito de baixo.
  useEffect(() => {
    if (!roomId || !userId) {
      setOnline([]);
      return undefined;
    }

    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ username: string }>();
        const list = Object.entries(state).map(([id, metas]) => ({
          userId: id,
          username: metas[0]?.username ?? 'Alguém',
        }));
        setOnline(list);
      })
      .subscribe(async (status) => {
        // Só "avisa presença" depois de confirmado que o canal está aberto.
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true;
          await channel.track({ username: usernameRef.current });
        }
      });

    return () => {
      subscribedRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  // CORREÇÃO C18: trocar o nome no Perfil (ou o perfil carregar depois do
  // canal) atualiza o nome mostrado para os outros, sem reabrir o canal.
  useEffect(() => {
    if (subscribedRef.current && channelRef.current && profile?.username) {
      channelRef.current.track({ username: profile.username });
    }
  }, [profile?.username]);

  return online;
}
