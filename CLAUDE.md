# Minha Obra

Gestão de obra de loteamento (obra modelo: Conviver Costamare, Parnaíba/PI): cronograma do
MS Project → PCP semanal, pacotes com prêmio, efetivo diário, avanço físico, ocorrências do cliente.
React + Vite + Supabase + Vercel. Uma só biblioteca no app: `@supabase/supabase-js`.
Banco: projeto Supabase **minha-obra** (`ejpiatgjvnpmpubkwyho`, São Paulo). Chaves no `.env.local` (fora do Git).
Perfis: Engenheiro, Coordenador, Mestre, Cliente, Técnico de Segurança (Auxiliar Administrativo só na Versão 2).
Uma casca só (`src/pages/Shell.jsx`); o menu de cada perfil vem de `src/lib/permissoes.js`.

Decisões do produto: `PLANO-DO-PROJETO.md`. Telas: `PRD-FRONTEND.md`. Banco: `PRD-BACKEND.md`.
Quando mudar de ideia, mude o plano primeiro.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão, formatação.
  Sem React, sem banco, sem `window`. Roda no Node sem bundler (import com
  `.js` explícito). É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout, o que se toca.
  A tela **pede a decisão à lib**; não decide.
- `src/lib/dados.js` — **única porta do banco.** Nenhuma tela chama o Supabase direto.
- `src/lib/supabase.js` — a conexão.

Três consequências práticas:

1. **`if` de negócio dentro de tela vai para `lib`**, mesmo com três linhas —
   se a linha decide *o que é verdade*, e não *o que aparece*. Regra que mora
   na tela passa por build e lint verdes e só quebra na mão de quem usa.
2. **Constante compartilhada tem um dono só.** Status, motivos, perfis, unidades, funções:
   `src/lib/vocabulario.js`, com o texto **idêntico** ao CHECK do banco (PRD-BACKEND, "Listas fechadas").
3. **Arquivo grande não é problema; arquivo confuso é.** Quebre quando o arquivo
   passar a ter *dois motivos para mudar*.

**Mais de uma obra:** toda tabela tem `obra_id`. A camada de dados injeta a obra atual
(`definirObraAtual`); as telas nunca passam nem filtram obra. Trocar de obra remonta a casca
(`<Shell key={obraId}>`). Hoje só existe a Costamare; o teste `tests/obra-e-permissoes.mjs`
guarda o filtro.

**Dinheiro é protegido no banco, não na tela.** Só Engenheiro e Coordenador leem as tabelas
`servicos` e `pacotes`; os outros perfis leem pelas funções `servicos_sem_custo` e
`pacotes_sem_premio`, que não devolvem custo nem prêmio. O Cliente pondera o avanço pelo `peso`
relativo que o banco calcula. Quem decide o acesso é a RLS (`minhas_obras()`, `papel_em()`),
testada simulando cada perfil — ver `supabase/migrations/20261005-02-acesso.sql`.

## Banco (Supabase)

- **Toda mudança no banco vira arquivo** em `supabase/migrations/AAAAMMDD-NN-descricao.sql`, aplicado
  pelas ferramentas do Supabase **e** salvo no Git. SQL que só existe no painel não existe.
- **Depois de qualquer migration, regenere `tests/_schema-snapshot.json`** (colunas de cada tabela,
  tirado do banco). Snapshot velho passa verde mentindo.
- **Baixa do PCP passa pela função `dar_baixa`** (confere a regra e grava a produção). A mesma regra
  existe em `src/lib/pcp.js` para a mensagem rápida: mudou uma, mude a outra.
- **Fechamento da folha passa pela função `fechar_pacotes`** (fecha, divide o prêmio e trava tudo de uma vez). A
  mesma conta existe em `src/lib/premio.js` (`premioDoPacote` / `dividirParte`: orçado × % × % executado se pausado, partes iguais, quem entrou depois proporcional aos dias, quem saiu do pausado com o % da saída garantido) para a prévia: mudou uma, mude a outra. O pacote tem
  vários serviços (`pacote_servicos`, com MO profissional/ajudante) e colaboradores (`pacote_colaboradores`); é salvo
  inteiro pela função `salvar_pacote`. "Servente" = ajudante (`FUNCOES_AJUDANTE`), igual no banco e na lib. Status Concluído / Não
  concluído e `fechado_em` só saem dali; à mão o pacote só anda entre Planejado, Liberado e Em execução.
- **Quantidade executada** de serviços e pacotes abertos é mantida por gatilho a partir de `producoes`. A atividade da semana
  entra sozinha no pacote único possível: `pacote_unico` / `pacote_para` no banco ↔ `pacotesPara` / `ligarPacotes` em `src/lib/pcp.js`
  (mudou uma, mude a outra). Dinheiro na lib é conta em inteiros (BigInt) para arredondar igual ao `numeric` do banco.
- **Caminho crítico** é calculado em `src/lib/cronograma.js` (com teste) e gravado de uma vez pela função
  `gravar_calculo`. Importação do Project, custos em lote e troca de % por quantidade também são funções
  do banco (`importar_cronograma`, `salvar_custos`, `trocar_unidade`): tudo ou nada, nunca metade.
- **Conta nova nasce "Aguardando"** (gatilho `handle_new_user`). Papel e obra só mudam pela função
  `liberar_usuario` (Engenheiro) ou por SQL — nunca por update direto em `profiles` pelo navegador.
- **Carga de exemplo:** `node scripts/gerar-seed.mjs` gera `supabase-seed.sql` a partir de
  `scripts/dadosExemplo.js`. As pessoas de exemplo não têm login (`auth_uid` vazio).

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base herdada aqui.
Aviso novo é seu e é de agora; conserte no mesmo lote.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra e clique.

**Todo bug corrigido em `src/lib/` nasce com teste junto**, no mesmo lote.
Build e lint não pegam regra errada.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/lib/permissoes.js`,
`src/lib/premio.js`, políticas RLS, migrations ou fluxo de dinheiro (prêmio, custo) → rodar a
revisão de código (`/code-review` no Claude Code, `/review` no Codex) antes de subir. É por
caminho, não por julgamento: nesses arquivos o erro não aparece na tela. RLS frouxa vaza dado
sem nenhum sintoma; prêmio errado só aparece na folha.

## Deploy

Ainda não publicado. Padrão desta casa: o Otoniel diz "sobe pro GitHub", o agente sobe com git,
e a Vercel publica sozinha. Ele não digita comando: o agente roda npm e git na pasta dele.

## Armadilhas desta base

- **Windows:** `npm` pode falhar por política do PowerShell (`npm.ps1`). Use `npm.cmd` / `npx.cmd`.
  Nunca mexa na política de execução do Windows.
- **Toda tela pega a data por `dados.hoje()`**; nunca `new Date()` direto na tela. No banco, o
  "hoje" do Mestre (janela de baixa e efetivo) é `hoje_local()`, no fuso America/Fortaleza.
- **Datas são texto `AAAA-MM-DD`** e as contas são em `src/lib/datas.js` (meio-dia local).
  `toISOString().split('T')[0]` pula um dia no fuso do Brasil.
- **"Fase 01 / Fase 02" são etapas de entrega da obra**; as fases do sistema são "Versão 1 / Versão 2".
- **Imagens da capa** vão para o bucket público `capa` do Storage (só Engenheiro e Coordenador
  gravam); o banco guarda a URL em `obras.foto_obra`, `obras.logo_cliente` e `config.logo_construtora`.
  Cada envio tem nome novo; a imagem antiga fica no bucket (limpar quando o espaço pesar).
- Compressão de imagem usa canvas, então mora em `src/components/imagem.js`; as regras puras
  (tipo, tamanho, medidas, iniciais) ficam em `src/lib/imagem.js`, com teste.

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em
  `lib/dados.js` → a exposição no contexto → os chamadores nas telas → a query.
  Função exposta que nenhuma tela chama é lixo.
- **Zero avisos novos de lint.** Aviso antigo que você encontrar, limpe se já
  estiver tocando no arquivo.
- **Código comentado não é backup, o git é.** Comentário explica *por quê*.
  Bloco comentado sem explicação, apague.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto
  inteiro, e verifique quem chama o *wrapper*, não só a função. Depois confira
  órfãos: quem só era chamado pelo que você removeu morre no mesmo commit.
- **Estado que nunca muda ou nunca é lido é lixo** — `useState` sem setter,
  prop que ninguém consome, flag que ninguém liga.
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna
  órfã continua existindo até decisão de quem é dono. Na dúvida, pergunte.

## O que entra neste arquivo

Ele é lido inteiro em toda sessão — cada linha custa em todas elas. Só entra o
que o código não conta sozinho: armadilha, o porquê de uma decisão, convenção que
difere do padrão, proibição, comando não óbvio, o que a verificação exige.
Nada de árvore de pastas, lista de dependências ou histórico do que foi feito.
