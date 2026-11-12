import { supabase } from '@/lib/supabase';
import type { Room } from '@/types';

interface RoomRow {
  id: string;
  name: string;
  description: string;
  emoji: string;
  created_by: string;
  created_at: string;
  member_count: number | null;
}

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    createdBy: row.created_by,
    createdAt: row.created_at,
    memberCount: row.member_count ?? 0,
  };
}

// Todas as salas, com a contagem de membros (uma consulta só, sem N+1).
// CORREÇÃO C29: "room_members(count)" passava pelo RLS e dava 0 para quem
// não é membro; member_count é uma função do banco (coluna calculada).
export async function listRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, member_count')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RoomRow[]).map(toRoom);
}

// Os ids das salas em que o usuário logado já está — para marcar "Minhas salas".
// CORREÇÃO C19: a política de room_members também mostra as linhas dos
// COLEGAS de sala. Sem o filtro por user_id, a lista trazia linhas repetidas
// (uma por colega) — inofensivo para o Set, mas baixava dados à toa.
export async function listMyRoomIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data as { room_id: string }[]).map((r) => r.room_id));
}

export async function getRoom(id: string): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, member_count')
    .eq('id', id)
    .single();
  if (error) throw error;
  return toRoom(data as RoomRow);
}

export async function createRoom(
  name: string,
  description: string,
  emoji: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ name, description, emoji, created_by: userId })
    .select('id')
    .single();
  if (error) throw error;
  const room = data as { id: string };
  const { error: joinError } = await supabase
    .from('room_members')
    .insert({ room_id: room.id, user_id: userId });
  if (joinError) throw joinError;
  return room.id;
}

export async function joinRoom(roomId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('room_members')
    .insert({ room_id: roomId, user_id: userId });
  // CORREÇÃO C20: toque duplo em "Entrar na sala" mandava dois inserts; o
  // segundo falhava com "duplicate key" e mostrava um alerta de erro mesmo com
  // o usuário já dentro. A linha já existir significa sucesso.
  if (error && error.code !== '23505') throw error;
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);
  if (error) throw error;
}

interface MemberRow {
  user_id: string;
  profiles: { username: string; avatar_color: string } | null;
}

export interface RoomMember {
  userId: string;
  username: string;
  avatarColor: string;
}

export async function listRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('user_id, profiles(username, avatar_color)')
    .eq('room_id', roomId);
  if (error) throw error;
  return (data as unknown as MemberRow[]).map((r) => ({
    userId: r.user_id,
    username: r.profiles?.username ?? 'Alguém',
    avatarColor: r.profiles?.avatar_color ?? '#2563EB',
  }));
}
