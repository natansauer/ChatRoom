// CORREÇÃO C01: o guia importa friendlyError em 7 telas, mas nunca mostra
// este arquivo (ele vem dos projetos anteriores da série). Sem ele o app nem
// compila: "Unable to resolve module @/utils/errors".
//
// Os erros do Supabase (PostgrestError, AuthError) nem sempre são instâncias
// de Error, então a função aceita qualquer objeto com "message" e "code".

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
}

const NETWORK = /network request failed|failed to fetch|networkerror|fetch failed|timeout|load failed/i;

export function friendlyError(error: unknown): string {
  if (!error) return 'Algo deu errado. Tente novamente.';
  const e = (typeof error === 'object' ? error : { message: String(error) }) as ErrorLike;
  const message = typeof e.message === 'string' ? e.message : String(error);
  const code = typeof e.code === 'string' ? e.code : '';

  if (NETWORK.test(message)) return 'Sem conexão com a internet.';
  // CORREÇÃO C25: tabela inexistente = o supabase/schema.sql não foi executado
  // (ou foi executado em outro projeto). A mensagem crua do PostgREST
  // ("Could not find the table ... in the schema cache") não dizia o que fazer.
  if (code === 'PGRST205' || code === '42P01' || /could not find the table|schema cache|relation .* does not exist/i.test(message))
    return 'O banco ainda não foi configurado. Rode o arquivo supabase/schema.sql no SQL Editor do Supabase e toque em Tentar novamente.';
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message))
    return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/user already registered|already been registered/i.test(message))
    return 'Já existe uma conta com este e-mail.';
  if (/password should be at least/i.test(message))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit|too many requests/i.test(message) || e.status === 429)
    return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.';
  if (/jwt expired|invalid jwt|refresh token/i.test(message))
    return 'Sua sessão expirou. Entre novamente.';
  if (code === '42501' || /row-level security|permission denied/i.test(message))
    return 'Você não tem permissão para isso. Entre na sala primeiro.';
  if (code === '23505' || /duplicate key/i.test(message))
    return 'Isso já foi feito (registro duplicado).';
  if (code === '23514' || /check constraint/i.test(message))
    return 'O texto está vazio ou é longo demais.';
  if (code === 'PGRST116' || /no rows|0 rows/i.test(message))
    return 'Não encontrado. Talvez tenha sido apagado.';
  return message || 'Algo deu errado. Tente novamente.';
}
