import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMyProfile } from './useMyProfile';

const STOPPED_TYPING_AFTER_MS = 3000;
// CORREÇÃO C21: o guia mandava um broadcast a CADA tecla. Cada aviso conta
// na cota de mensagens do Realtime (por segundo e por mês, multiplicado pelo
// número de pessoas na sala). Um aviso a cada 1 s dá o mesmo efeito na tela,
// já que o outro lado só esquece quem está digitando depois de 3 s.
const NOTIFY_EVERY_MS = 1000;

interface TypingEntry {
  username: string;
  at: number;
}

// "Fulano está digitando..." sem gravar nada no banco: um canal de broadcast
// (mensagens efêmeras, ninguém guarda) avisa os outros enquanto alguém digita,
// e cada aparelho esquece sozinho quem não avisou de novo em 3 segundos — não
// existe um evento de "parei de digitar" para depender.
export function useTypingIndicator(roomId: string | undefined) {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const [typing, setTyping] = useState<Record<string, TypingEntry>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!roomId) {
      setTyping({});
      return undefined;
    }
    const channel = supabase.channel(`typing-${roomId}`);
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user?.id) return; // ignora o próprio aviso
        setTyping((prev) => ({
          ...prev,
          [payload.userId]: { username: payload.username, at: Date.now() },
        }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, user?.id]);

  // Limpa quem ficou quieto — sem isso, o aviso de "digitando" nunca sumiria
  // se a última tecla do outro lado coincidisse com uma queda de conexão.
  useEffect(() => {
    const id = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next: Record<string, TypingEntry> = {};
        let changed = false;
        for (const [uid, entry] of Object.entries(prev)) {
          if (now - entry.at < STOPPED_TYPING_AFTER_MS) next[uid] = entry;
          else changed = true;
        }
        // Mantém o mesmo objeto quando nada mudou: evita re-render a cada segundo.
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < NOTIFY_EVERY_MS) return; // CORREÇÃO C21
    lastSentRef.current = now;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user?.id, username: profile?.username ?? 'Alguém' },
    });
  }, [user?.id, profile?.username]);

  const typingUsernames = Object.values(typing).map((t) => t.username);
  return { typingUsernames, notifyTyping };
}
