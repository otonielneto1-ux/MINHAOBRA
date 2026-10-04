# Plano do Projeto — Minha Obra (nome provisório)

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 04/10/2026 — plano fechado com o Otoniel.
> Construtora: **Solutio Engenharia**.
> Obra modelo: **Conviver Costamare** (loteamento) — Parnaíba/PI. Cliente: **Conviver Urbanismo**, fiscal Breno Cavalcante.
> Etapas de entrega da obra: **Geral**, **Fase 01** e **Fase 02**.
> O sistema nasce com uma obra e já preparado para cadastrar outras.
>
> Atenção ao vocabulário: **"Fase 01 / Fase 02"** são etapas de entrega da obra. As etapas de construção do sistema se chamam **Versão 1** (até 31/10/2026) e **Versão 2** (novembro/2026).

## Em uma frase

Um sistema de **gestão de obra de loteamento** que resolve **o controle de cronograma, avanço físico e planejamento de curto prazo** para **o engenheiro responsável e sua equipe**, fazendo **o cronograma do MS Project virar PCP semanal, pacotes com prêmio e efetivo diário lançados no celular, com caminho crítico e atrasos calculados sozinhos**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — Não sei, a cada dia, se a obra está no prazo e no custo
- **Como acontece hoje:** cronograma (com o orçamento) no MS Project; orçamento também no Excel e no Sienge. As ferramentas não conversam: para saber avanço x prazo x custo é preciso cruzar na mão.
- **Frequência:** todo dia.
- **Custo:** **cerca de 8 horas por dia** do engenheiro controlando cronograma, avanço e custo nas três ferramentas. É a régua do projeto: daqui a 3 meses, quantas dessas horas o sistema devolveu?

### Problema 2 — A equipe não tem um planejamento de curto prazo visível
- **Como acontece hoje:** [PENDENTE: como a equipe fica sabendo hoje o que fazer na semana]
- **O que se quer:** PCP semanal com as atividades planejadas, pacotes de produção com prêmio, visão dos próximos 3 meses, alertas de caminho crítico e impacto de atraso.

### Problema 3 — Reclamações do cliente chegam soltas
- **Como acontece hoje:** [PENDENTE]
- **O que se quer:** a Conviver Urbanismo registra ocorrências com foto num espaço próprio e acompanha o avanço e os atrasos.

## A solução

O cronograma da obra (serviços, datas e predecessoras) é importado do MS Project, e o custo de cada serviço é digitado no sistema. A partir dele, o engenheiro e o coordenador montam o PCP da semana e os pacotes de produção. O mestre lança no celular o efetivo do dia e dá baixa nas atividades com a quantidade executada — é isso que gera o avanço físico. O sistema calcula sozinho o caminho crítico e os atrasos, e no fechamento da folha calcula o prêmio de cada funcionário. A Conviver Urbanismo acompanha o avanço e os atrasos (sem custo e sem data projetada) e registra ocorrências com foto.

**O que ele NÃO faz:**
- Financeiro (contas a pagar e receber, lançamento de nota) — o Sienge continua sendo o financeiro oficial.
- Compras e cotação.
- Folha de pagamento e ponto — o sistema gera a lista de prêmios para a folha, não a folha.
- App de loja — é um site que funciona no celular, tablet e computador.
- Integração automática com MS Project e Sienge — entra por importação de arquivo.
- Diário de obra completo (clima, fotos do dia, ocorrências internas) — a Versão 1 controla só o efetivo.
- Relatório em PDF.

## Versões

**Versão 1 — até 31/10/2026 — o controle do planejamento**
- Painel do dia: avanço físico (geral e por etapa de entrega), atividades de hoje, efetivo do dia, PPC da semana e alertas.
- Cronograma importado do MS Project, com caminho crítico e atrasos.
- PCP — planejamento da semana, com baixa e quantidade executada.
- Planejamento de 3 meses, com restrições.
- Pacotes de produção e fechamento do prêmio na folha.
- Controle de efetivo diário (por funcionário, função e tipo de mão de obra).
- Ocorrências do cliente, com fotos.
- Cadastros: obra e etapas de entrega, funcionários, usuários.

**Versão 2 — novembro/2026 — o controle de custo e de canteiro**
- Custo orçado x realizado por serviço (importado do Sienge) e o bloco de resultado financeiro no painel.
- Projeção de término e simulação de impacto de atraso.
- Equipe e aptidão (segurança do trabalho): ASO, NRs, EPIs; apto/inapto.
- Materiais e estoque: recebimento com nº da NF e nº do pedido/solicitação do Sienge, sem valor; bloco de estoque no painel.
- Diário de obra completo, se ainda fizer falta.

## Funcionalidades (Versão 1)

### 0. Capa da obra (todos os perfis)
- **Onde:** no topo da tela inicial de cada perfil (Início, Hoje, Avanço do cliente, Planejamento do técnico de segurança).
- **Mostra:** foto da obra com o nome por cima; ao lado, **só as imagens** das logos do cliente e da construtora (Solutio Engenharia), sem texto.
- **Sem imagem:** a foto vira um quadriculado de prancheta; a logo vira as iniciais (CU, SE).
- **Quem troca:** engenheiro e coordenador, em Cadastros › Obra e etapas (enviar, trocar, remover). A foto da obra e a logo do cliente são de cada obra; a logo e o nome da construtora valem para todas.
- **Arquivo:** JPG, PNG ou WEBP até 15 MB; a foto é reduzida para 1200 px, as logos para 600 px (PNG mantém o fundo transparente).

### 1. Painel do dia (Início)
- **Abre em:** painel com blocos; no celular, empilhados.
- **Mostra:** (1) avanço físico realizado x previsto para hoje, geral e por etapa de entrega (Geral, Fase 01, Fase 02); (2) atividades do PCP de hoje; (3) efetivo do dia: total, por tipo (Direta, Indireta, Terceirizada), por função e por empresa terceirizada; (4) PPC da semana e PPC do mês, comparado com o mês anterior e com a meta, e o PPC de cada semana do mês; (5) alertas, com as ocorrências abertas pelo cliente em destaque no topo; depois: serviço crítico atrasado, pacote a menos de 5 dias do fechamento abaixo de 70% da meta, restrição vencida, ocorrência sem resposta há mais de 48 h, efetivo de hoje não lançado.
- **Ações:** só leitura; cada bloco leva ao seu módulo.
- **Vazio:** "Ainda não há cronograma nesta obra. Importe o arquivo do MS Project para começar."

### 2. Cronograma
- **Abre em:** lista em árvore (etapa > serviço); no computador, com barras de Gantt (previsto, linha de base e realizado).
- **Mostra:** código EAP, serviço, etapa de entrega, unidade (% ou m, m², m³, kg, t, un), prevista, executada, % executado, custo orçado, início e fim previstos, folga, crítico, dias de atraso.
- **Filtros:** etapa de entrega, só críticos, só atrasados, só sem custo.
- **Ações:** importar do Project (XML), recalcular caminho crítico, **editar custos** (modo planilha: digita o custo de cada serviço direto na lista), abrir detalhe do serviço, lançar ajuste.
- **Nasce e morre:** nasce na importação; serviço que sumiu do Project numa reimportação fica "cancelado", nunca é apagado se tiver produção.

### 3. Avanço físico
- **Começa em %:** todo serviço nasce medido em percentual (previsto = 100%). O PCP planeja "avançar 5% do serviço" e a baixa informa o % executado.
- **Depois, quantidade:** em qualquer serviço o engenheiro ou o coordenador pode **trocar % por quantidade**, escolhendo a unidade (m, m², m³, kg, t, un) e a quantidade prevista. O que já foi lançado em % é convertido na mesma proporção (ex.: 40% de 3.200 m = 1.280 m), e daí em diante o PCP, a baixa e os pacotes desse serviço passam a usar a unidade.
- **Avanço do serviço** = executado ÷ previsto (soma das baixas do PCP + ajustes).
- **Avanço da obra** (e de cada etapa de entrega) = média dos serviços ponderada pelo **custo orçado, digitado à mão por serviço**. Enquanto houver serviço sem custo, o avanço é ponderado pela **duração** de todos os serviços, e o Painel avisa "12 serviços sem custo — avanço ponderado por duração". Quando todos tiverem custo, passa a ponderar por custo.
- **Previsto para hoje:** cada serviço distribui seu previsto de forma linear entre início e fim da linha de base.
- **Ajuste:** quando a conferência (topografia, medição com o fiscal) não bater, o engenheiro ou o coordenador lança um ajuste com motivo no detalhe do serviço.

### 4a. PCP — Planejamento da semana
- **Abre em:** a semana atual, por dia (segunda a sábado); no celular, um dia por vez.
- **Mostra:** serviço, local, quantidade planejada, equipe, pacote (se houver), status, quantidade executada.
- **Baixa:** o mestre informa o executado (em % do serviço ou na unidade, conforme o serviço); se for igual ou maior que a planejada a atividade fica **Concluída**, se for menor fica **Não concluída** e o motivo é obrigatório (Chuva, Falta de material, Falta de equipe, Projeto, Equipamento, Frente não liberada, Outro).
- **Indicadores:** PPC da semana e gráfico dos motivos de não conclusão das últimas 8 semanas.
- **Regra do PPC (única no app):** concluídas ÷ atividades que contam. Dia que já passou sem baixa conta como não concluído; hoje só conta depois da baixa; futuro não conta.
- **Ações:** montar a semana (engenheiro/coordenador), copiar pendentes para a semana seguinte, dar baixa (mestre, engenheiro, coordenador).
- **Vazio:** "Semana sem atividades planejadas."
- **Nasce e morre:** a semana é montada até sexta para a seguinte (proposta); o mestre corrige a baixa até o fim do dia seguinte; depois disso só engenheiro ou coordenador.

### 4b. Planejamento de 3 meses
- **Abre em:** lista agrupada por semana, próximas 13 semanas.
- **Mostra:** serviços que começam ou continuam no período, crítico ou não, e as restrições (Material, Projeto, Equipe, Equipamento, Liberação de área, Segurança, Outro) com status Pendente / Removida.
- **Ações:** cadastrar restrição, marcar como removida, mandar um serviço para o PCP de uma semana.
- **Vazio:** "Nada previsto para os próximos 3 meses."

### 5. Pacotes de produção
- **Mostra:** serviço, local, quantidade-meta, executada, data de início, data de fechamento (folha), valor do prêmio, status, funcionários que trabalharam.
- **Status:** Planejado → Liberado → Em execução → Concluído / Não concluído (com motivo).
- **Regra do prêmio:** a equipe que entrega 100% da meta até o fechamento da folha recebe o valor do pacote como adicional no salário. O prêmio se divide **proporcionalmente aos dias de presença** de cada funcionário no pacote (pelo efetivo). Terceirizados não entram no prêmio. (Proposta não contestada.)
- **Fechamento:** botão "Fechar pacotes do mês" gera a lista por funcionário para a folha (Excel).

### 6. Efetivo do dia
- **Abre em:** a lista de funcionários ativos da obra, agrupada por tipo (Direta, Indireta, Terceirizada).
- **Para cada funcionário:** situação (Presente, Falta, Atestado, Afastado) e, se Presente, o pacote em que trabalhou (opcional).
- **Atalho:** "Repetir efetivo de ontem".
- **Mostra também:** totais do dia por tipo e por função; histórico por data.
- **Vazio:** "Nenhum funcionário cadastrado. Cadastre a equipe em Cadastros."

### 7. Ocorrências do cliente
- **Mostra:** número, título, local (rua/quadra/lote), etapa de entrega, descrição, fotos, data, status, responsável, prazo, resposta.
- **Status:** Aberta → Em análise → Em tratamento → Resolvida / Recusada (resposta obrigatória).
- **Ações:** o cliente abre com fotos; engenheiro e coordenador atribuem, respondem e fecham.

### 8. Cadastros
- Obra e etapas de entrega (com data contratual de cada uma), imagens da capa e nome da construtora, funcionários, usuários (liberar, escolher perfil e obra).

## Perfis de usuário

- **Engenheiro (admin) — Otoniel:** vê e faz tudo · primeira tela: Início.
- **Coordenador:** vê tudo, não gerencia usuários e não apaga · primeira tela: Início.
- **Mestre de obras:** lança efetivo e dá baixa no PCP; não vê valor nenhum · primeira tela: Hoje.
- **Cliente (Conviver Urbanismo — fiscal Breno Cavalcante):** vê avanço e serviços atrasados, abre ocorrências com foto; não vê custo nem data projetada · primeira tela: Avanço.
- **Técnico de Segurança:** vê o planejamento (só leitura) · primeira tela: Planejamento › Semana. A aptidão entra na Versão 2.
- **Auxiliar Administrativo:** entra na Versão 2 (Materiais). Na Versão 1 não é liberado.

### Matriz de permissões (Versão 1)

| Ação | Engenheiro | Coordenador | Mestre | Cliente | Téc. Segurança |
|---|---|---|---|---|---|
| Painel do dia | sim | sim | não (tem a tela Hoje) | não | não |
| Ver cronograma e avanço | sim | sim | sim | resumo (tela Avanço) | sim |
| Ver custo orçado (R$) | sim | sim | **não** | **não** | **não** |
| Ver serviços atrasados | sim | sim | sim | sim (sem o motivo) | sim |
| Importar cronograma / recalcular | sim | sim | não | não | não |
| Lançar ajuste de quantidade | sim | sim | não | não | não |
| Montar PCP e plano de 3 meses | sim | sim | não | não | não |
| Dar baixa no PCP | sim | sim | sim | não | não |
| Ver PCP e 3 meses | sim | sim | sim | não | sim |
| Pacotes: criar e editar | sim | sim | não | não | não |
| Pacotes: ver | sim | sim | sim, sem o valor do prêmio | não | não |
| Fechar pacotes e ver prêmios | sim | sim | **não** | **não** | **não** |
| Lançar efetivo | sim | sim | sim | não | não |
| Ocorrências: abrir | sim | sim | não | sim | não |
| Ocorrências: ver | todas | todas | não | todas da obra dele | não |
| Ocorrências: responder e fechar | sim | sim | não | não | não |
| Cadastrar funcionários e etapas | sim | sim | não | não | não |
| Apagar qualquer registro | sim | não | não | não | não |
| Gerenciar usuários | sim | não | não | não | não |

## Fluxo de cadastro

1. A pessoa se cadastra sozinha com e-mail e senha.
2. Entra como "Aguardando" e não vê dado nenhum.
3. Vê o aviso "Conta aguardando liberação do administrador".
4. O engenheiro libera, escolhe o perfil e a obra a que ela tem acesso.

A primeira conta (Otoniel) é promovida a Engenheiro direto no banco, na implantação.

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que você já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até crescer |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |

**Total por mês:** R$ 0 no começo.
**O que custaria a alternativa pronta:** VEJA OBRA ≈ R$ 720/ano por obra no plano anual (sem PCP nem caminho crítico); Prevision sob consulta.

## Prazo

- **Versão 1 em uso na Costamare:** 31/10/2026.
- **Versão 2:** novembro/2026.
- **Horas disponíveis:** 3 horas por dia (≈ 80 horas até 31/10).

---

# 2. Insights do Mercado

## Benchmark (pesquisado em 04/10/2026)

### Prevision (Softplan — mesmo grupo do Sienge)
- Site: https://sienge.com.br/prevision-obras/ · Preço: sob consulta; teste grátis de 15 dias
- Faz bem: Last Planner, lookahead, linha de balanço, PPC; liga cronograma ao avanço físico; app e WhatsApp; conversa com o Sienge.
- Falta: não encontrei prêmio de produção ligado à folha nem portal de ocorrências do cliente.
- Vale copiar: lookahead com restrições e PPC com motivos.

### Mobuss Construção
- Site: https://www.mobussconstrucao.com.br/ · Preço: sob consulta, licença por módulo
- Faz bem: diário, segurança do trabalho, inspeções, entrega e assistência pós-obra.
- Falta: o planejamento fica no Prevision (dois produtos).
- Vale copiar: segurança do trabalho junto do canteiro.

### VEJA OBRA
- Site: https://www.vejaobra.com.br/ · Preço: R$ 109,90 por obra/mês (R$ 59,90 no anual); ilimitado de R$ 499,90 a R$ 999,90/mês
- Faz bem: diário com fotos, Gantt, orçamento, estoque, portal do cliente.
- Falta: não menciona curva S, caminho crítico nem PCP/PPC.
- Vale copiar: portal do cliente.

## Por que ainda vale construir o meu

Decisão do Otoniel: **não adotar o Prevision**; o planejamento continua no **MS Project**. O sistema não substitui o Project: recebe o cronograma dele e faz o que o Project não faz no canteiro — PCP semanal com PPC, pacotes com prêmio fechado na folha, efetivo no celular e o espaço de ocorrências da Conviver Urbanismo, num lugar só e sem mensalidade por módulo.

## Referências de interface

- **Usa mais em:** celular, tablet e computador — mobile primeiro, aproveitando tela larga no escritório (Gantt e tabelas).
- **Estilo:** "Prancheta" — claro e técnico, cara de papel de projeto: linha fina, nada de sombra, rótulos técnicos em maiúsculas, números grandes. Referência aprovada: `preview.html`.
- **Paleta:** `#1F4E79` (principal) · `#132B40` (texto/escuro) · `#F4F7FA` (fundo) · `#F5A623` (atenção) · `#D64545` (atraso/crítico) · verde derivado `#23874E` (ok)
- **Fontes:** IBM Plex Sans (texto) e IBM Plex Mono (rótulos e números técnicos)
- **Tema:** claro
- **Logo:** sem logo por enquanto

---

# 3. Arquitetura (Versão 1)

## De onde vem o cronograma

1. Arquivo do **MS Project salvo como XML** (Arquivo › Salvar como › XML). Traz serviços, EAP, datas, durações, linha de base e predecessoras com tipo e defasagem.
2. A **etapa de entrega** (Geral, Fase 01, Fase 02) de cada serviço é a tarefa-resumo de primeiro nível em que ele está. A tela de importação mostra essa correspondência para confirmar.
3. **Medição:** todo serviço importado nasce em **%**. A troca para quantidade (m, m², m³, kg, t, un) é feita depois, serviço a serviço.
4. **Custo:** **digitado à mão por serviço** no sistema (modo "Editar custos" do Cronograma ou no detalhe do serviço). A importação não traz nem apaga custo.
5. Na primeira importação o sistema guarda a **linha de base** (a do Project, se existir; senão as datas importadas).
6. **Reimportar** (replanejamento) casa os serviços pelo identificador único da tarefa no Project, atualiza só datas, nomes e predecessoras e **não apaga** custo, unidade, produção, baixas nem pacotes.

## Mapa de telas

```
Login · Criar conta · Conta aguardando liberação
│
├── Engenheiro / Coordenador
│   ├── Início (Painel do dia)
│   ├── Planejamento
│   │   ├── Semana (PCP)
│   │   ├── 3 meses (com restrições)
│   │   └── Cronograma → Detalhe do serviço
│   │                  → Importar do Project
│   ├── Pacotes → Detalhe do pacote → Fechamento da folha
│   ├── Efetivo (do dia + histórico)
│   ├── Ocorrências → Detalhe
│   └── Cadastros: Obra e etapas · Funcionários · Usuários (só Engenheiro)
│
├── Mestre
│   ├── Hoje (atividades de hoje + efetivo pendente)
│   ├── Planejamento (Semana com baixa · 3 meses · Cronograma, sem R$)
│   ├── Efetivo
│   └── Pacotes (sem valor)
│
├── Cliente
│   ├── Avanço (geral e por etapa, curva S até hoje, serviços atrasados)
│   └── Ocorrências → Nova · Detalhe
│
└── Técnico de Segurança
    └── Planejamento (Semana e 3 meses, só leitura)
```

**Navegação:** celular com barra inferior de até 5 itens; tablet e computador com menu lateral.

## Processos automáticos

### 1. Recalcular o cronograma (caminho crítico e atrasos)
- **Gatilho:** importação do Project, ajuste em datas/predecessoras, ou botão "Recalcular".
- **Passos:** 1. Ida e volta pela rede de predecessoras (TI, II, TT, IT com defasagem) para achar as datas mais cedo e mais tarde. 2. Folga total de cada serviço. 3. Folga zero = crítico. 4. Atraso de cada serviço contra a linha de base: se já devia ter terminado e não chegou a 100%, atraso = hoje − fim da linha de base; se terminou, atraso = fim real − fim da linha de base; se devia ter começado e não tem produção, atraso de início.
- **Resultado:** críticos em vermelho no cronograma; alertas no Painel.
- **Se falhar:** (predecessora circular, serviço sem data) não grava nada, mostra os serviços problemáticos e mantém o cálculo anterior.

### 2. Fechamento dos pacotes na folha
- **Gatilho:** botão "Fechar pacotes do mês" (engenheiro ou coordenador), a partir do dia de fechamento da folha da obra.
- **Passos:** 1. Soma a produção de cada pacote com fechamento no período. 2. 100% da meta = Concluído; senão Não concluído com motivo. 3. Divide o prêmio dos concluídos pelos dias de presença de cada funcionário próprio no pacote. 4. Gera a lista para a folha (Excel).
- **Resultado:** pacotes travados e planilha de prêmios.
- **Se falhar:** nada fecha pela metade; mostra o pacote com problema (ex.: concluído sem nenhuma presença) para corrigir.

## Modelagem de dados

16 tabelas: `profiles`, `config` (uma linha: nome e logo da construtora), `obras`, `obra_usuarios`, `etapas_entrega`, `servicos`, `servico_dependencias`, `restricoes`, `funcionarios`, `presencas`, `pacotes`, `premios`, `pcp_atividades`, `producoes`, `ocorrencias`, `ocorrencia_fotos`. Detalhe campo a campo em `PRD-BACKEND.md`.

Maior que o normal para uma primeira versão (o guia é até 7). Foi mantido porque caminho crítico, PCP e prêmio não funcionam com menos. Se o prazo apertar, o primeiro corte é a tabela `restricoes` (o plano de 3 meses continua, sem as restrições).

## A pergunta de um ano

1. **Quais atividades tiveram maior atraso e por quê?** Guardado desde já: datas da linha de base e datas reais de cada serviço (`servicos`), o motivo de cada atividade não concluída no PCP (`pcp_atividades`) e as restrições com tipo (`restricoes`).
2. **Qual atividade custou mais que o previsto?** O custo orçado por serviço já entra na Versão 1, digitado à mão. O custo real entra na Versão 2, vindo do Sienge. [PENDENTE: o Sienge precisa apropriar o custo pelo mesmo serviço/EAP do Project, senão essa pergunta não tem resposta.]

## Melhorias para a Versão 2 e depois

- Custo realizado (Sienge), projeção de término e simulação de atraso — novembro.
- Aptidão de segurança do trabalho — novembro.
- Materiais e estoque — novembro.
- Diário de obra completo (clima, fotos do dia) — cortado da Versão 1 pelo Otoniel.
- Comentários em sequência nas ocorrências — na Versão 1 é uma resposta só.
- Relatório em PDF.
- Integração automática com MS Project e Sienge.

---

# A conta que vai chegar depois

- `[PENDENTE: digitar o custo orçado de cada serviço]` — até todos terem custo, o avanço da obra é ponderado por duração, não por custo. É trabalho de uma vez, na implantação.
- `[PENDENTE: apropriação de custo no Sienge por serviço/EAP]` — sem isso, a Versão 2 não consegue dizer qual atividade custou mais que o previsto.
- `[PENDENTE: armazenamento de fotos]` — o plano grátis do Supabase guarda 1 GB; as fotos são comprimidas no envio, mas com muito uso será preciso o plano pago (cerca de US$ 25/mês).

# Decidir depois de usar

- `[DESCOBRIR NO USO: dia de montar o PCP]` — por enquanto: a semana é montada até sexta para a semana seguinte.
- `[DESCOBRIR NO USO: prazo para o mestre corrigir lançamentos]` — por enquanto: até o fim do dia seguinte.
- `[DESCOBRIR NO USO: meta de PPC]` — por enquanto: 80% (verde na meta, âmbar até 20 pontos abaixo, vermelho abaixo disso).
- `[DESCOBRIR NO USO: limites dos alertas]` — por enquanto: pacote a menos de 5 dias do fechamento abaixo de 70% da meta; ocorrência sem resposta há 48 h.
- `[DESCOBRIR NO USO: divisão do prêmio]` — por enquanto: proporcional aos dias de presença, só funcionários próprios, só com 100% da meta.
