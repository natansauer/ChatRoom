import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getProfile, updateUsername } from '@/services/profile';

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: Boolean(user),
  });
}

export function useUpdateUsername() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => {
      if (!user) throw new Error('Faça login para editar o perfil.');
      return updateUsername(user.id, username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // CORREÇÃO C18: membros e mensagens já carregados mostram o nome do
      // autor vindo de "profiles"; recarregamos para refletir o nome novo.
      queryClient.invalidateQueries({ queryKey: ['rooms', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
