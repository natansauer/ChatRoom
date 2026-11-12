// CORREÇÃO C01: testes do arquivo errors.ts, que o guia não traz.
import { friendlyError } from '@/utils/errors';

describe('friendlyError', () => {
  it('falta de internet vira a mensagem do roteiro de testes (cenário 15)', () => {
    expect(friendlyError(new TypeError('Network request failed'))).toBe(
      'Sem conexão com a internet.',
    );
  });

  it('traduz login inválido do Supabase Auth', () => {
    expect(friendlyError({ message: 'Invalid login credentials' })).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('aceita o PostgrestError (objeto que não é Error) com código de RLS', () => {
    expect(friendlyError({ message: 'new row violates…', code: '42501' })).toContain(
      'permissão',
    );
  });

  it('mensagem vazia ou longa demais (check constraint)', () => {
    expect(friendlyError({ message: 'violates check constraint', code: '23514' })).toBe(
      'O texto está vazio ou é longo demais.',
    );
  });

  // CORREÇÃO C25
  it('tabela inexistente orienta a rodar o schema.sql', () => {
    expect(
      friendlyError({
        code: 'PGRST205',
        message: "Could not find the table 'public.rooms' in the schema cache",
      }),
    ).toContain('schema.sql');
  });

  it('sem erro, devolve um texto genérico', () => {
    expect(friendlyError(undefined)).toBe('Algo deu errado. Tente novamente.');
  });

  it('erro desconhecido mantém a mensagem original', () => {
    expect(friendlyError(new Error('Falha X'))).toBe('Falha X');
  });
});
