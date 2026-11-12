# Relatório de correções — Projeto ChatRoom

12/11/2026 · Natan Sauer

Foram encontradas e corrigidas 22 falhas ao construir o ChatRoom pelo guia do Prof. Bruno Assunção Dias (IESB); outros 6 problemas apareceram e foram resolvidos na configuração e no teste no celular (C23 a C28). Os 31 testes do app passam, o app rodou no Android pelo Expo Go (SDK 54) e o tempo real funcionou entre dois aparelhos.

> Versão editável deste relatório: https://claude.ai/artifact/5MDSwrBX3QYsc7Cdcgxdrs

## 1. Objetivo, método e prompt

**Disciplina:** Programação para Dispositivos Móveis — IESB. **Professor:** Prof. Me. Bruno Assunção Dias. **Ferramenta de IA:** Claude (Anthropic), modelo Claude Opus 5.5.

O código do guia (Etapas 1 a 15, 50 blocos de código) foi transcrito arquivo por arquivo e revisado com a IA. Cada problema recebeu um código (C01 a C28) e um comentário `// CORREÇÃO:` no próprio código, localizável com `grep -rn "CORREÇÃO" app src supabase`.

Cada item a seguir traz: **Problema** (erro ou sintoma), **Diagnóstico da IA** (a resposta dada) e **Solução implementada**.

### Prompt utilizado

Enviado à IA junto com o PDF do guia (ChatRoom-Guia-Passo-a-Passo.pdf), no mesmo projeto em que o RotaFit foi feito:

> Faça do mesmo jeito do projeito rotafit

A IA recuperou as instruções do professor usadas no RotaFit: "criar um relatório com todas as soluções de correção que foram apresentadas durante o desenvolvimento do projeto, como erros, prompts utilizados, respostas das IAs e como foi implementada a solução" e "enviar o diretório do projeto funcional".

### Resposta da IA (resumo)

A IA montou o projeto completo a partir do guia, no mesmo formato do RotaFit: Expo SDK 54 fixado (o Expo Go instalado no celular é do SDK 54), scripts `.bat` para instalar e iniciar, comentários de correção no código e este relatório. Revisou cada arquivo procurando erros de compilação, de lógica do tempo real, de segurança do banco e de interface, corrigiu os encontrados e executou os testes que o ambiente permitia.

## 2. Arquivos e conteúdo que o guia cita mas não traz

Dois arquivos são importados pelas telas, mas o código deles nunca aparece; sem eles o app nem compila (Unable to resolve module). Os emojis do guia também se perderam no próprio PDF.

| Código | Problema | Diagnóstico da IA | Solução implementada |
| --- | --- | --- | --- |
| C01 | `friendlyError` (de `@/utils/errors`) usado em 6 telas, sem arquivo | Sobra dos projetos anteriores da série. O PostgrestError do Supabase não é Error; a função precisa aceitar objetos com message e code. O cenário 15 do roteiro exige o texto "Sem conexão com a internet." | Criado `src/utils/errors.ts`, que traduz rede, login, e-mail não confirmado, RLS (42501), texto vazio/longo (23514) e sessão expirada; testes em `__tests__/errors.test.ts` |
| C02 | Tipo `IconName` (de `@/utils/icons`) importado em StateViews e nas abas, sem arquivo | Deve derivar dos nomes válidos do Ionicons, para nome errado virar erro de compilação | Criado `src/utils/icons.ts` com `ComponentProps<typeof Ionicons>['name']` |
| C03 | Na tela Nova sala, os 10 botões de emoji ficavam vazios e o console avisava "two children with the same key"; o emoji padrão da tabela `rooms` também era um espaço | A fonte do PDF não desenha emojis: `EMOJIS` e o `default` do schema.sql viraram `' '` (confirmado renderizando a página 60) | Lista com 10 emojis reais (💬 🚀 🎮 📚 🎵 ⚽ 💻 🍕 🎬 🌎) e `default '💬'` no banco; o teste do banco confere o emoji padrão |

## 3. Configuração e plataforma

O projeto foi fixado no mesmo SDK do RotaFit, porque o Expo Go instalado no celular é o do SDK 54 (ver C37 do relatório do RotaFit).

| Código | Problema | Diagnóstico da IA | Solução implementada |
| --- | --- | --- | --- |
| C04 | `create-expo-app@latest` gera o SDK mais novo, e o Expo Go do celular (SDK 54) recusa: "Project is incompatible with this version of Expo Go" | Mesmo problema do RotaFit; além disso, nos SDKs novos o `@expo/vector-icons` saiu do pacote expo e precisa ser declarado | `package.json` fixado no SDK 54 (expo ~54, React Native 0.81, expo-router 6) com `@expo/vector-icons` declarado; `1-instalar.bat` roda `npx expo install --fix` para alinhar as versões |
| C05 | O `app.json` do guia aponta para `android-icon-foreground.png`, `android-icon-background.png` e `android-icon-monochrome.png`, que o template do SDK 54 não cria | Os nomes vêm de um template mais novo; o build do Android (o empacotamento citado na conferência do guia) falha por arquivo inexistente | Ícones gerados na pasta `assets/` (balão de chat azul) com os nomes que o `app.json` espera; identificadores trocados de `com.seuusuario` para `com.natansauer.chatroom` |

## 4. Banco de dados (Supabase)

O RLS do guia está correto (inclusive a correção da recursão com `is_room_member`), mas os privilégios não refletiam o Supabase real: o teste do visitante passava no PGlite e não no banco de verdade.

| Código | Problema | Diagnóstico da IA | Solução implementada |
| --- | --- | --- | --- |
| C13 | No Supabase real, toda tabela e função nova do schema public já nasce com ALL/EXECUTE para `anon` e `authenticated`. Os `grant` do guia só acrescentam, e o `revoke ... from public` não tira o EXECUTE de anon. A verificação da Etapa 14.2 ("nenhuma política de UPDATE em mensagens") ficava protegida só pelo RLS | Mesmo defeito do C10 do RotaFit. O RLS ainda esconde os dados, mas anon podia chamar `is_room_member` e o gatilho `handle_new_user` ficava exposto; o teste "visitante (anon)" não enxergava isso porque o PGlite não tem esses privilégios padrão | `schema.sql` faz `revoke all ... from anon, authenticated` em cada tabela e concede só o necessário; revoga EXECUTE do gatilho e de `is_room_member` para anon. Os stubs do teste recriam os privilégios padrão do Supabase, e um 13º teste confere que anon não chama a função nem altera mensagens |

O restante do banco foi revisado e mantido como no guia: gatilho de perfil, `search_path` fixo nas funções, `check` de 1 a 2.000 caracteres e a publicação de `messages` no Realtime.

## 5. Tempo real (mensagens, presença, digitando)

O erro mais grave estava aqui: mensagem apagada nunca sumia no outro aparelho (C06), e quem acabava de entrar numa sala não via o histórico (C08). O próprio guia avisa que esta parte só foi conferida por revisão de código.

| Código | Problema | Diagnóstico da IA | Solução implementada |
| --- | --- | --- | --- |
| C06 | Apagar uma mensagem não a removia no outro aparelho (cenário 11 do roteiro) | O Supabase Realtime não aplica filtro a eventos DELETE: o registro apagado só traz a chave primária, então o filtro `room_id=eq...` do guia faz o evento nunca chegar | A escuta de DELETE ficou sem filtro e remove pelo id; se a mensagem não está na lista, nada muda |
| C07 | Mensagem própria aparecendo duas vezes e aviso "Encountered two children with the same key" | Corrida: quando o evento do Realtime chega antes da resposta do insert, a mensagem real já está na lista e o guia ainda troca a temporária por ela | Funções puras `replaceOptimistic` e `appendUnique` em `utils/messages.ts`, com 4 testes novos |
| C08 | Ao tocar em "Entrar na sala", o histórico não aparecia (cenário 5); depois de sair, as mensagens antigas continuavam em cache | `useMessages(id)` rodava antes de entrar: o RLS devolvia lista vazia, que ficava em cache por 30 s; entrar só invalidava `['rooms']` | Mensagens, presença, digitação e membros só ligam depois de entrar; entrar invalida `['messages', id]` e sair remove esse cache |
| C10 | Risco de erro "cannot add presence callbacks ... after subscribe()" e canal de presença reaberto a cada hora | O efeito de presença dependia do objeto `user` (muda a cada renovação de token) e do nome (chega depois); reabrir um canal com o mesmo nome logo após fechá-lo pode devolver o canal antigo no supabase-js atual | Presença depende só da sala e do id do usuário, com o nome numa ref; o canal de mensagens ganhou um sufixo único por montagem |
| C14 | Se o servidor recusasse apagar (sem internet), a mensagem sumia só do seu aparelho e nunca voltava, sem aviso | O apagar otimista do guia não tinha `onError` | Em erro a lista é recarregada (a mensagem volta) e um alerta explica o motivo |
| C18 | Depois de trocar o nome no Perfil, a presença e a lista de membros mostravam o nome antigo | O `track()` só rodava ao abrir o canal; só o cache `['profile']` era invalidado | Novo `track()` quando o nome muda; membros e mensagens recarregados após salvar |
| C19 | "Minhas salas" baixava linhas repetidas | A política de `room_members` também mostra as linhas dos colegas de sala, e a consulta do guia não filtrava pelo usuário | Consulta com `.eq('user_id', ...)` e chave de cache com o id do usuário |
| C21 | Um broadcast de "digitando" a cada tecla | Cada aviso conta na cota de mensagens do Realtime, multiplicada pelo número de pessoas na sala; o outro lado só esquece após 3 s | No máximo um aviso por segundo; a limpeza periódica não redesenha a tela quando nada mudou |

## 6. Telas e interface

O guia sugere testar o tempo real com o celular e uma aba do navegador, mas no navegador nenhuma confirmação funcionava (C11).

| Código | Problema | Diagnóstico da IA | Solução implementada |
| --- | --- | --- | --- |
| C09 | Ao abrir uma sala em que já participa, a tela "Entrar na sala" piscava antes das mensagens | Enquanto "minhas salas" carregava, `isMember` era false | Indicador de carregamento até as duas consultas terminarem |
| C11 | No navegador (`npx expo start --web`), apagar mensagem, sair da sala e sair da conta não faziam nada | `Alert.alert` com botões não existe no react-native-web | Novo `src/utils/confirm.ts`: Alert no celular, `window.confirm`/`alert` no navegador; usado em todas as telas |
| C12 | App podia ficar preso para sempre no indicador de carregamento | `getSession()` sem `catch`: com token salvo inválido, `loading` nunca virava false (mesmo defeito do C31 do RotaFit) | `.catch` e `.finally` no AuthContext |
| C15 | Segurar uma mensagem ainda "enviando..." e apagar gerava "invalid input syntax for type uuid" | O id temporário `temp-...` não existe no banco | O toque longo só vale para mensagens confirmadas |
| C16 | Título "Salas" embaixo da barra de status; espaço vazio sob o cabeçalho em Nova sala | A lista era uma `View` sem área segura (o SDK 54 é edge-to-edge no Android); em Nova sala o cabeçalho já cuida do topo | Lista dentro de `<Screen>`; Nova sala sem a borda superior da área segura |
| C17 | Campo de envio em cima da barra de gestos (iPhone) e da barra de navegação (Android) | Sem `insets.bottom` no rodapé da sala | `paddingBottom` com `useSafeAreaInsets()` |
| C20 | Toque duplo em "Entrar na sala" mostrava um erro mesmo com o usuário já dentro | Dois inserts; o segundo falha com "duplicate key" | Botão travado durante o pedido e código 23505 tratado como sucesso |
| C22 | Se o envio falhasse, o texto digitado se perdia | O guia diz que "o campo de texto pode ser restaurado", mas o código não fazia isso | O texto volta ao campo junto com o alerta de erro |

## 7. Verificação

Os 31 testes do app passaram no ambiente da IA, o app rodou no celular e o tempo real foi confirmado entre dois aparelhos.

| Verificação | Resultado |
| --- | --- |
| 31 testes do app (20 do guia + 4 do envio otimista + 7 de erros) | 31/31 passando |
| Tipagem dos módulos puros (utils, types, testes) | Sem erros |
| Sintaxe dos arquivos .ts/.tsx e do teste do banco | Sem erros |
| 13 testes do banco (PGlite: 12 do guia + 1 de privilégios) | Escritos e revisados; rodar `npm run test:db` |
| Tempo real com dois aparelhos (cenários 7, 8 e 9) | Passou no celular + navegador (ver abaixo) |

O ambiente da IA não tinha acesso ao registro do npm, então os testes do app rodaram com um executor compatível com Jest sobre os mesmos arquivos. Verificação final no computador: `4-testes.bat` (ou `npm run typecheck`, `npm run test:app`, `npm run test:db`). Depois, seguir os 15 cenários manuais da Etapa 14.3 do guia, com duas contas em dois aparelhos (ou celular + navegador).

### Como rodar

1. `1-instalar.bat` — instala as dependências, alinha com o SDK 54 e abre o `.env` no Bloco de Notas.
2. No Supabase: criar o projeto, rodar `supabase/schema.sql` no SQL Editor e copiar a URL e a chave `anon`/`publishable` para o `.env`.
3. Opcional, para cadastrar sem confirmar e-mail: Authentication → Email → desligar "Confirm email".
4. `2-iniciar.bat` e ler o QR Code com o Expo Go (SDK 54); se não conectar, `3-iniciar-tunel.bat`.

### Teste no celular (12/11/2026, 19:19–19:35)

Primeira rodada no Android, pelo Expo Go (SDK 54), depois das correções C23 a C28. As capturas estão em `docs/screenshots/`.

| Cenário (Etapa 14.3) | Resultado | Captura |
| --- | --- | --- |
| 2 — Cadastro válido: perfil criado com nome e cor | Passou: "Natan Forte Sauer", iniciais NS, cor azul | [perfil.png](screenshots/perfil.png) |
| Lista de salas vazia | Passou: "Nenhuma sala ainda" e botão + | [salas-vazia.png](screenshots/salas-vazia.png) |
| 3 — Criar uma sala | Passou: sala "ads" (📚, "estudos") criada e aberta já como participante | [criar-sala.png](screenshots/criar-sala.png) |
| 6 — Mandar uma mensagem | Passou: "teste" à direita, em azul, com horário; "1 online · 1 na sala" | [sala-mensagem.png](screenshots/sala-mensagem.png) |
| 11 — Segurar e apagar mensagem própria | Passou no aparelho: confirmação exibida e a mensagem sumiu | [sala-apagar.png](screenshots/sala-apagar.png), [sala-apagada.png](screenshots/sala-apagada.png) |
| Sair da sala | Confirmação "Deseja sair de 'ads'?" exibida | [sala-sair.png](screenshots/sala-sair.png) |
| Lista com a sala criada | Passou: "ads", 1 participante, "Você participa" | [salas-com-sala.png](screenshots/salas-com-sala.png) |
| 8 — Dois aparelhos na mesma sala (19:34) | Passou: "2 online · 2 na sala" no celular, com a segunda conta (teste123) no navegador | [tempo-real-online.png](screenshots/tempo-real-online.png) |
| 9 — Digitar num aparelho | Passou: "teste123 está digitando..." apareceu no celular enquanto a outra conta digitava | [tempo-real-digitando.png](screenshots/tempo-real-digitando.png) |
| 7 — Mandar de um aparelho e ver no outro (19:35) | Passou: a mensagem "aaa" de teste123 chegou ao celular sem atualizar a tela, à esquerda, com nome, avatar laranja e horário | [tempo-real-mensagem.png](screenshots/tempo-real-mensagem.png) |

O tempo real foi confirmado entre dois aparelhos (celular com a conta principal e navegador com a conta teste123): presença, digitando e mensagem nova chegaram sozinhos, sem atualizar a tela. Os cenários 10 (aviso de digitando sumindo) e 11 entre aparelhos (mensagem apagada sumindo no outro lado) não foram registrados em captura.

## 8. Prompts para erros no teste do aparelho

| Situação | Prompt sugerido |
| --- | --- |
| Erro vermelho no Expo Go | "No ChatRoom (Expo SDK 54, Expo Router), ao abrir a tela X aparece este erro: [erro completo]. O arquivo é: [arquivo]. Qual a causa e a correção?" |
| "Variáveis do Supabase ausentes" | "O app mostra 'Variáveis do Supabase ausentes'. Meu .env tem [as duas linhas, sem a chave inteira]. Já rodei npx expo start -c. O que falta?" |
| Mensagem não aparece no outro aparelho | "Duas contas na mesma sala do ChatRoom: a mensagem só aparece no outro aparelho depois de sair e entrar. Em Database → Publications a tabela messages está [marcada/não]. O terminal mostra [log]." |
| Teclado cobre o campo de envio (Android) | "Na tela da sala do ChatRoom (SDK 54, Android edge-to-edge), o teclado cobre o campo de mensagem. O KeyboardAvoidingView usa behavior undefined no Android. Como corrigir?" |
| Teste falhando | "O comando npm test falha com esta saída: [saída]. Explique a causa e corrija sem mudar o objetivo do teste." |

## 9. Registro de novos problemas

Problemas encontrados durante a configuração e os testes no celular.

| # | Problema | Prompt usado | Resposta da IA | Solução aplicada |
| --- | --- | --- | --- | --- |
| C23 | Onde pegar a URL e a chave do Supabase para o `.env` | Print da página Settings → API Keys: "onde eu pego a url e a chave aqui mesmo?". Como a URL não aparecia nessa página, segundo prompt: "nao estou achando a url pode ser mais especifico?". Terceiro: o endereço do painel copiado do navegador, "a url da api eh essa monta ai" | A chave é a **Publishable key** (`sb_publishable_...`); a Secret key nunca vai no app, porque ignora o RLS. A URL não fica nessa página: é montada com o Project ID que aparece no endereço do painel (`/project/<id>/settings`), no formato `https://<id>.supabase.co` | `.env` preenchido com a URL do projeto e a publishable key copiada pelo botão do painel |
| C24 | Ao clicar no link de confirmação do e-mail de cadastro, o navegador abriu localhost com "ERR_CONNECTION_REFUSED" | Print da página de erro do navegador: "nao consigo verificar o email vai p essa pagina" | O link do e-mail confirma a conta no Supabase primeiro e só depois redireciona para o Site URL, que por padrão é localhost:3000 (não existe site nenhum ali). A conta já fica confirmada; a página de erro só aparece depois. Mesma causa do C39 do RotaFit | Voltar ao app e entrar com e-mail e senha. Para os próximos cadastros de teste: Authentication → Sign In / Providers → Email → desligar "Confirm email" |
| C25 | Aba Salas: "Algo deu errado — Could not find the table 'public.rooms' in the schema cache" | Prints das abas Salas e Perfil logo após o primeiro login: "algo esta errado na tela 1, e a tela 2 eu so achei muito vazia" | As tabelas não existem no projeto: o `supabase/schema.sql` ainda não tinha sido executado no SQL Editor. A mensagem crua do Supabase não dizia o que fazer | Executado o `schema.sql` no SQL Editor. No código, o `friendlyError` passou a reconhecer tabela inexistente (PGRST205/42P01) e orientar a rodar o `schema.sql`; 1 teste novo (31 no total) |
| C26 | Aba Perfil quase vazia: sem nome nem avatar, só o e-mail e "Editar nome" | Mesmo prompt do C25 | Mesma causa do C25. Além disso, a conta foi criada antes do gatilho existir, então o perfil dela nunca seria criado sozinho; e a tela do guia não mostrava erro quando o perfil não carregava | Rodada no SQL Editor a consulta que cria os perfis que faltam (incluída também no fim do `schema.sql`). Perfil redesenhado: cabeçalho na cor do avatar, contador de salas, cartão "Conta" (nome, e-mail, membro desde, salas) e tela de erro com "Tentar novamente" |
| C27 | Projeto em `Downloads\chatroom\chatroom` (uma pasta dentro da outra), e as correções do C25 e C26 ainda só no zip | "agora que ja tem a pasta C:\Users\natan\Downloads\chatroom\chatroom, voce nao pode mudar direto la? e viu q ela esta chatroom/chatroom, tire uma de dentro da outra ja" | O "Extrair tudo" do Windows cria uma pasta com o nome do zip e coloca a pasta do projeto dentro dela. Com acesso à pasta pelo app do Claude, a IA gravou a versão atualizada direto em `Downloads\chatroom`, mantendo o `package-lock.json` e o `tsconfig.json` já ajustados pelo Expo. Por segurança, a ferramenta não grava `.env` nem apaga pastas | 64 arquivos gravados na pasta de cima; `.env` e `node_modules` movidos à mão (Ctrl+X / Ctrl+V) para não reinstalar nem redigitar a chave |
| C28 | Ao apagar a pasta de dentro: "Acesso Negado à Pasta — Você precisa de permissão de NS_00\natan" | Print da janela de erro do Windows | O usuário pedido é o próprio dono da pasta, então não é falta de permissão: algum programa ainda estava com arquivos abertos, quase sempre o servidor do Expo (janela do `2-iniciar.bat`) ou o VS Code | Servidor do Expo encerrado (Ctrl+C) e janelas fechadas; a pasta foi apagada e o app iniciado de novo a partir de `Downloads\chatroom` |
