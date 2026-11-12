import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  listMyRoomIds,
  listRoomMembers,
  listRooms,
} from '@/services/rooms';

export const useRooms = () =>
  useQuery({ queryKey: ['rooms', 'list'], queryFn: listRooms });

// CORREÇÃO C19: a chave leva o id do usuário e a consulta filtra por ele.
export function useMyRoomIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rooms', 'mine', user?.id],
    queryFn: () => listMyRoomIds(user!.id),
    enabled: Boolean(user),
  });
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: ['rooms', 'detail', id],
    queryFn: () => getRoom(id as string),
    enabled: Boolean(id),
  });
}

export function useRoomMembers(id: string | undefined) {
  return useQuery({
    queryKey: ['rooms', 'members', id],
    queryFn: () => listRoomMembers(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      description,
      emoji,
    }: {
      name: string;
      description: string;
      emoji: string;
    }) => {
      if (!user) throw new Error('Faça login para criar uma sala.');
      return createRoom(name, description, emoji, user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useJoinRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => {
      if (!user) throw new Error('Faça login para entrar na sala.');
      return joinRoom(roomId, user.id);
    },
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      // CORREÇÃO C08: o histórico da sala precisa ser buscado de novo agora
      // que o RLS libera a leitura (antes de entrar, ele vinha vazio).
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
    },
  });
}

export function useLeaveRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => {
      if (!user) throw new Error('Faça login para sair da sala.');
      return leaveRoom(roomId, user.id);
    },
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      // CORREÇÃO C08: quem saiu não deve continuar vendo o histórico em cache.
      queryClient.removeQueries({ queryKey: ['messages', roomId] });
    },
  });
}
