# Minha Obra

Gestão de obra de loteamento (obra modelo: Conviver Costamare, Parnaíba/PI): cronograma do
MS Project → PCP semanal, pacotes com prêmio, efetivo diário, avanço físico, ocorrências do cliente.
React + Vite + Supabase (ainda não ligado) + Vercel. Uma só biblioteca no app: `@supabase/supabase-js`.
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
- `src/lib/dados.js` — **única porta dos dados.** Nenhuma tela lê o mock nem chama o Supabase direto.
- `src/lib/supabase.js` — a conexão (null enquanto `USAR_MOCK = true` em `src/lib/config.js`).

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

**Dinheiro não sai da camada para quem não pode ver:** `dados.js` tira `custo_orcado` e
`valor_premio` conforme `pode(role, ...)`. O Cliente recebe o avanço só em percentuais
(`avancoDaObra`). No banco isso vira visão sem a coluna + função — nunca só esconder na tela.

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
- **"Hoje" é fixo em 07/10/2026 no modo exemplo** (`HOJE_MOCK` em `config.js`). Toda tela pega a
  data por `dados.hoje()`; nunca `new Date()` direto na tela.
- **Datas são texto `AAAA-MM-DD`** e as contas são em `src/lib/datas.js` (meio-dia local).
  `toISOString().split('T')[0]` pula um dia no fuso do Brasil.
- **"Fase 01 / Fase 02" são etapas de entrega da obra**; as fases do sistema são "Versão 1 / Versão 2".
- O mock guarda as mudanças só na memória: recarregar a página volta ao estado inicial.
  **Exceção:** as imagens da capa e o nome da construtora ficam no `localStorage` do navegador
  (chaves `minhaobra:obra:<id>:...` e `minhaobra:config:...`), para sobreviver ao recarregar.
  No banco, isso vira Storage + colunas `obras.foto_obra`, `obras.logo_cliente` e a tabela `config`.
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
