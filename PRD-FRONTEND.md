# PRD Frontend — Minha Obra (Versão 1)

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`. Dados e permissões: `PRD-BACKEND.md`.
> Escopo: **Versão 1** (até 31/10/2026).

## O que o sistema é

Um sistema de gestão de obra de loteamento que transforma o cronograma do MS Project em PCP semanal, pacotes de produção com prêmio e controle de efetivo, com caminho crítico e atrasos calculados sozinhos, e dá ao cliente um espaço para acompanhar o avanço e registrar ocorrências. Usado no **celular e tablet no canteiro** (mestre, cliente) e no **computador no escritório** (engenheiro, coordenador).

## Padrão técnico

- React 19 + Vite 6, sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Estilo "Prancheta" (referência: `preview.html`): tema claro, linha fina, nada de sombra, rótulos técnicos em maiúsculas (IBM Plex Mono), texto em IBM Plex Sans, números grandes.
- Paleta: `#1F4E79` principal · `#132B40` texto · `#F4F7FA` fundo · `#F5A623` atenção · `#D64545` atraso/crítico · `#23874E` concluído/ok (derivado).
- Celular: barra inferior fixa com até 5 itens. Tablet e computador: menu lateral à esquerda.
- Seletor de obra no topo (com uma obra só, mostra o nome sem seta).
- Números no padrão brasileiro: `1.540,000 m`, `R$ 1.480.000,00`, datas `04/10/2026`.
- Botões e campos grandes no celular (alvo de toque de 44 px), pouca digitação.
- No máximo dois gráficos: curva S (Painel e Avanço do cliente) e motivos de não conclusão (PCP).

## Perfis

- **Engenheiro:** entra em Início. Vê e faz tudo, inclusive Usuários e apagar.
- **Coordenador:** entra em Início. Igual ao Engenheiro, sem Usuários e sem apagar.
- **Mestre:** entra em Hoje. Lança efetivo e dá baixa no PCP. Nunca vê R$.
- **Cliente:** entra em Avanço. Vê avanço e atrasos; abre e acompanha ocorrências. Nunca vê R$, motivos internos nem data projetada.
- **Técnico de Segurança:** entra em Planejamento › Semana. Só leitura do PCP e do plano de 3 meses.
- **Auxiliar Administrativo:** sem tela na Versão 1 (vê o aviso de conta aguardando).

## Mapa de navegação

```
Login · Criar conta · Aguardando liberação
├── Engenheiro / Coordenador
│   menu: Início · Planejamento · Pacotes · Efetivo · Ocorrências · Cadastros
│   celular: Início · Planejamento · Efetivo · Ocorrências · Mais (Pacotes, Cadastros, Meu perfil)
├── Mestre
│   menu: Hoje · Planejamento · Efetivo · Pacotes
├── Cliente
│   menu: Avanço · Ocorrências
└── Técnico de Segurança
    menu: Planejamento
Todos: Meu perfil (nome, trocar senha, sair) no topo/“Mais”.
```

Planejamento tem três abas: **Semana** · **3 meses** · **Cronograma**.

---

## Tela: Login

**Quem acessa:** todos, antes de entrar.

**O que aparece**
Nome "Minha Obra", campo de e-mail, campo de senha, botão Entrar, link Criar conta.

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil. Erro: "E-mail ou senha incorretos."
- **Criar conta:** abre o formulário (nome, e-mail, senha, repetir senha). Ao concluir, mostra a tela "Aguardando liberação".

**Estado vazio**
Não se aplica.

---

## Tela: Aguardando liberação

**Quem acessa:** perfil Aguardando e Auxiliar Administrativo (na Versão 1).

**O que aparece**
Ícone de relógio, texto "Conta aguardando liberação do administrador. Você vai conseguir entrar assim que o engenheiro liberar seu acesso.", botão Sair.

---

## Componente: Capa da obra

**Quem vê:** todos os perfis, no topo da tela inicial (Início, Hoje, Avanço; para o Técnico de Segurança, em Planejamento › Semana).

**O que aparece**
- À esquerda (no celular, em cima): a foto da obra, larga, com "Obra", o nome e a cidade por cima, sobre uma faixa escura. Sem foto: quadriculado de prancheta e "Sem foto da obra".
- À direita (no celular, embaixo): duas caixas lado a lado com **só as imagens** — logo do cliente e logo da construtora. Cada logo ocupa a caixa inteira (menos a margem), crescendo até encostar na largura ou na altura, sem distorcer nem cortar. Sem texto; o nome vai no texto alternativo da imagem. Sem logo: as iniciais (CU, SE).
- Engenheiro e Coordenador veem o botão **Trocar imagens**, que abre Cadastros › Obra e etapas.

---

## Tela: Início (Painel do dia)

**Quem acessa:** Engenheiro, Coordenador.
**Chega aqui por:** menu Início; é a tela de abertura.

**O que aparece** (de cima para baixo; no computador em grade de 2 colunas)
1. Cabeçalho: nome da obra, data de hoje, "Cronograma calculado em 04/10/2026 07:30".
2. **Avanço físico:** número grande do realizado (ex.: 41,8%) com o previsto para hoje ao lado (ex.: 45,2%) e a diferença em pontos (−3,4 p.p., vermelho se negativo). Abaixo, uma linha por etapa de entrega (Geral, Fase 01, Fase 02) com barra realizado x previsto. Mini curva S (previsto x realizado até hoje). Se houver serviço sem custo, aviso amarelo: "4 serviços sem custo — avanço ponderado por duração" (leva ao Cronograma em Editar custos).
3. **Atividades de hoje:** lista do PCP com data de hoje: serviço, local, quantidade planejada, equipe, etiqueta de status. Embaixo, o **bloco de PPC**: PPC da semana e PPC do mês lado a lado (com "x de y concluídas"), o mês anterior com a variação em pontos (▲ verde / ▼ vermelho), a situação contra a meta de 80% ("Mês 17 pontos abaixo da meta de 80%") e uma barra por semana que toca o mês (a semana inteira, igual à tela Semana) com a marca da meta. O PPC do mês soma todas as atividades com data no mês. Regra do PPC, a mesma no app inteiro: dia que já passou sem baixa conta como não concluído; hoje só conta depois da baixa; dias futuros não contam. Cor: verde na meta, âmbar até 20 pontos abaixo, vermelho abaixo disso.
4. **Efetivo de hoje:** total de presentes; três números por tipo (Direta, Indireta, Terceirizada); lista curta por função. Se não lançado: "Efetivo de hoje ainda não lançado" em amarelo.
5. **Alertas:** no topo, em destaque azul, o grupo **"Ocorrências do cliente · N abertas"** (abertas pelo perfil Cliente e ainda não resolvidas/recusadas): nº, título, status e prazo; sem resposta há mais de 48 h ou prazo vencido em vermelho e no topo do grupo; "Ver todas" leva à lista. Essas ocorrências não se repetem na lista geral. Avanço físico e Alertas ficam lado a lado com o mesmo topo e a mesma altura. Depois, a lista geral com ícone e cor:
   - vermelho: "Rede de esgoto – Fase 01 · crítico · 6 dias de atraso"
   - amarelo: "Pacote Galeria Rua 2 – trecho 1: 65% da meta, fecha em 4 dias"
   - amarelo: "Restrição vencida: liberação da Rua 5 (prazo 02/10)"
   - amarelo: "Ocorrência nº 4 sem resposta há 3 dias"
   - amarelo: "Efetivo de hoje não lançado"

**Ações**
- Clicar no bloco de avanço abre Planejamento › Cronograma.
- Clicar numa atividade abre Planejamento › Semana no dia de hoje.
- Clicar no efetivo abre Efetivo.
- Clicar num alerta abre o item correspondente (serviço, pacote, restrição, ocorrência).

**Regras por perfil**
- Engenheiro e Coordenador: iguais.

**Estado vazio**
"Ainda não há cronograma nesta obra. Importe o arquivo do MS Project para começar." com botão Importar do Project.

---

## Tela: Hoje (Mestre)

**Quem acessa:** Mestre.
**Chega aqui por:** menu Hoje; é a tela de abertura do Mestre.

**O que aparece**
1. Data de hoje e nome da obra.
2. Cartão "Efetivo de hoje": se não lançado, botão grande **Lançar efetivo**; se lançado, "23 presentes · 2 faltas" e botão Editar.
3. Lista "Atividades de hoje" (do PCP): serviço, local, quantidade planejada com unidade, equipe, pacote. Cada uma com botão **Dar baixa**.
4. Se houver atividades de ontem sem baixa: faixa amarela "2 atividades de ontem sem baixa" que leva a elas.

**Ações**
- **Lançar efetivo:** abre a tela Efetivo do dia.
- **Dar baixa:** abre a janela de baixa (ver tela Semana).

**Estado vazio**
"Nenhuma atividade planejada para hoje."

---

## Tela: Planejamento › Semana (PCP)

**Quem acessa:** Engenheiro, Coordenador, Mestre, Técnico de Segurança.
**Chega aqui por:** menu Planejamento, aba Semana.

**O que aparece**
1. Seletor de semana: "◀ 05/10 a 10/10/2026 ▶" e o PPC da semana (ex.: "PPC 67% · 4 de 6").
2. Computador: 6 colunas (segunda a sábado) com cartões. Celular: abas de dia (Seg, Ter, Qua, Qui, Sex, Sáb), um dia por vez, abrindo no dia de hoje.
3. Cada cartão: serviço, local, quantidade planejada, equipe, pacote (se houver), etiqueta de status (Planejada cinza, Concluída verde, Não concluída vermelha), quantidade executada e motivo quando houver baixa.
4. Abaixo (computador) ou em botão "Ver motivos" (celular): gráfico de barras dos motivos de não conclusão nas últimas 8 semanas, e o PPC de cada uma dessas semanas.

**Campos da atividade (criar/editar)**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Serviço | escolha | sim | só serviços não resumo e não cancelados; busca por nome ou EAP |
| Data prevista | data | sim | dentro da semana |
| Local | texto | sim | sugere o local do serviço |
| Quantidade planejada | número | sim | na unidade do serviço: em "%" (pontos do serviço, ex.: 5%) ou em m, m², m³, kg, t, un |
| Equipe | texto | não | |
| Pacote | escolha | não | só pacotes do mesmo serviço, não fechados |

**Campos da baixa**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Quantidade executada | número | sim | começa com a planejada preenchida; mesma unidade do serviço (% ou m, m², m³, kg, t, un) |
| Motivo | escolha | quando executada < planejada | Chuva, Falta de material, Falta de equipe, Projeto, Equipamento, Frente não liberada, Outro |

**Ações**
- **Nova atividade:** formulário acima; ao salvar o cartão aparece no dia sem recarregar.
- **Puxar do plano de 3 meses:** lista os serviços previstos para a semana; marcar vários cria atividades com local e quantidade sugeridos.
- **Copiar pendentes para a próxima semana:** cria na semana seguinte uma cópia de cada atividade Não concluída (quantidade = planejada − executada).
- **Dar baixa:** janela com quantidade executada e motivo. Ao salvar: executada ≥ planejada → Concluída; menor → Não concluída. A etiqueta muda na hora e o PPC é recalculado.
- **Desfazer baixa:** volta para Planejada.
- **Editar / Excluir atividade:** só enquanto Planejada.

**Regras por perfil**
- Engenheiro e Coordenador: tudo.
- Mestre: só Dar baixa e Desfazer baixa, até o fim do dia seguinte à data da atividade; depois o botão some e aparece "Baixa travada — fale com o engenheiro".
- Técnico de Segurança: só leitura (sem botões).

**Estado vazio**
"Semana sem atividades planejadas." (Engenheiro/Coordenador veem também o botão Puxar do plano de 3 meses.)

---

## Tela: Planejamento › 3 meses

**Quem acessa:** Engenheiro, Coordenador, Mestre, Técnico de Segurança.
**Chega aqui por:** menu Planejamento, aba 3 meses.

**O que aparece**
1. Filtro: etapa de entrega; chave "Só com restrição pendente".
2. Lista agrupada por semana (próximas 13 semanas, a partir da atual): "Semana 12/10 a 17/10".
3. Em cada semana, os serviços que começam ou continuam nela: nome, local, etapa de entrega, % executado, etiqueta Crítico (vermelha) se for o caso, contagem de restrições pendentes ("2 restrições").
4. Ao abrir um serviço: suas restrições com tipo, descrição, responsável, data limite e status; vencidas em vermelho.

**Campos da restrição**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Tipo | escolha | sim | Material, Projeto, Equipe, Equipamento, Liberação de área, Segurança, Outro |
| Descrição | texto | sim | |
| Responsável | texto | não | |
| Data limite | data | não | |

**Ações**
- **Nova restrição**, **Marcar como removida** (pede a data, padrão hoje), **Editar**.
- **Mandar para o PCP:** escolhe a semana e cria a atividade (abre o formulário da Semana já preenchido).

**Regras por perfil**
- Engenheiro e Coordenador: tudo.
- Mestre e Técnico de Segurança: só leitura.

**Estado vazio**
"Nada previsto para os próximos 3 meses."

---

## Tela: Planejamento › Cronograma

**Quem acessa:** Engenheiro, Coordenador, Mestre (sem R$).
**Chega aqui por:** menu Planejamento, aba Cronograma; ou clique no avanço do Painel.

**O que aparece**
1. Barra: filtro de etapa de entrega, chaves "Só críticos", "Só atrasados" e "Só sem custo", busca; botões **Importar do Project**, **Editar custos** e **Recalcular** (Engenheiro/Coordenador).
2. Lista em árvore (tarefas-resumo recolhíveis): EAP, serviço, unidade (% ou m, m², m³, kg, t, un), prevista, executada, % (barra), custo orçado ("—" em amarelo quando vazio), início e fim (linha de base), folga, etiqueta Crítico, dias de atraso (vermelho se > 0). Serviços cancelados aparecem riscados, escondidos por padrão.
3. Computador: à direita da lista, Gantt com três barras por serviço — linha de base (cinza), previsto atual (azul), realizado (verde até o % executado); críticos com borda vermelha; linha vertical em hoje.
4. Celular: só a lista, com as colunas EAP, serviço, %, atraso.

**Ações**
- **Clicar num serviço:** abre o Detalhe do serviço.
- **Importar do Project:** abre a tela de importação.
- **Editar custos:** a coluna de custo vira campo digitável em todas as linhas (Tab passa para a próxima); o total orçado da obra aparece no rodapé e se atualiza a cada valor; botões **Salvar custos** e **Cancelar**. Ao salvar: "Custos salvos · 148 de 152 serviços com custo".
- **Recalcular:** roda o cálculo; mostra "Cronograma recalculado: 8 críticos, 3 atrasados" ou a lista de problemas.

**Regras por perfil**
- Mestre: sem a coluna de custo, sem Importar e Recalcular.

**Estado vazio**
"Nenhum serviço ainda. Importe o arquivo do MS Project (Arquivo › Salvar como › XML)."

---

## Tela: Detalhe do serviço

**Quem acessa:** Engenheiro, Coordenador, Mestre (sem R$).
**Chega aqui por:** clique num serviço no Cronograma, no Painel ou no plano de 3 meses.

**O que aparece**
1. Cabeçalho: EAP, nome, etapa de entrega, local, etiquetas Crítico/Atrasado.
2. Números: prevista, executada, %, custo orçado (só Eng/Coord), linha de base (início–fim), previsto atual, início real, fim real, folga, dias de atraso.
3. Predecessoras e sucessoras (nome, tipo, defasagem), clicáveis.
4. Histórico de produção: data, quantidade, origem (PCP ou Ajuste), atividade/motivo, quem lançou.
5. Motivos de não conclusão deste serviço no PCP (contagem por motivo).
6. Pacotes deste serviço (nome, status, % da meta).
7. Restrições deste serviço.

**Ações**
- **Lançar ajuste** (Eng/Coord): quantidade (+ ou −, na unidade do serviço), data, motivo obrigatório. Atualiza executada e % na hora.
- **Editar custo orçado** (Eng/Coord).
- **Trocar % por quantidade** (Eng/Coord), só em serviço que está em %: escolhe a unidade (m, m², m³, kg, t, un) e informa a quantidade prevista. Antes de confirmar mostra a conversão: "Executado hoje: 44% → 1.408 m de 3.200 m. Atividades do PCP, pacotes e ajustes deste serviço serão convertidos." Depois da troca, tudo deste serviço aparece na unidade nova.
- **Editar local** (Eng/Coord).

**Estado vazio**
Histórico: "Nenhuma produção lançada neste serviço."

---

## Tela: Importar do Project

**Quem acessa:** Engenheiro, Coordenador.
**Chega aqui por:** botão Importar do Project.

**O que aparece**
1. Instrução: "No MS Project: Arquivo › Salvar como › XML. Depois escolha o arquivo aqui."
2. Campo de arquivo (.xml).
3. Após ler, a **prévia**:
   - "152 tarefas lidas · 140 serviços · 12 resumos · 196 predecessoras".
   - Etapas de entrega: lista das tarefas de nível 1 e a etapa correspondente (Geral, Fase 01, Fase 02), com escolha manual se o nome não bater.
   - Aviso: "Serviços novos entram medidos em % e sem custo. Custo e unidade são definidos depois, no Cronograma."
   - Diferenças (reimportação): novos, alterados (com data antiga → nova), que vão ficar cancelados. Custo, unidade e produção dos existentes não mudam.
   - Primeira importação: "A linha de base será gravada a partir de: linha de base do Project / datas atuais".
4. Botões **Confirmar importação** e **Cancelar**.

**Ações**
- **Confirmar importação:** grava, recalcula, e mostra "Importação concluída: 4 novos, 18 alterados, 1 cancelado. Cronograma recalculado." e volta ao Cronograma.

**Estado vazio**
"Escolha o arquivo XML exportado do MS Project."

---

## Tela: Pacotes

**Quem acessa:** Engenheiro, Coordenador, Mestre (sem valor).
**Chega aqui por:** menu Pacotes.

**O que aparece**
1. Filtro: status, serviço, data de fechamento; botão **Fechar pacotes do mês** (Eng/Coord).
2. Computador: quadro com colunas Planejado, Liberado, Em execução, Concluído, Não concluído. Celular: lista com etiqueta de status.
3. Cartão: nome, serviço, local, barra executada/meta (ex.: "260 / 400 m · 65%"), fechamento (ex.: "fecha 20/10 · 16 dias"), valor do prêmio (só Eng/Coord), cadeado se fechado.

**Campos do pacote**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | |
| Serviço | escolha | sim | só não resumo |
| Local | texto | sim | |
| Quantidade-meta | número | sim | na unidade do serviço (% ou m, m², m³, kg, t, un) |
| Valor do prêmio | dinheiro | sim | |
| Data de início | data | sim | |
| Data de fechamento | data | sim | sugere o próximo dia de fechamento da folha da obra |
| Status | escolha | sim | Planejado, Liberado, Em execução, Concluído, Não concluído |
| Motivo | escolha | quando Não concluído | lista de motivos |

**Ações**
- **Novo pacote**, **Editar** (enquanto não fechado), **Mudar status**, **Excluir** (Engenheiro, só Planejado).
- **Clicar no cartão:** Detalhe do pacote — dados acima, produção lançada (data, quantidade, atividade), funcionários com dias de presença no pacote e, se fechado, o prêmio de cada um (Eng/Coord).

**Regras por perfil**
- Mestre: só leitura e sem o valor do prêmio nem os prêmios por funcionário.

**Estado vazio**
"Nenhum pacote ainda. Crie o primeiro a partir de um serviço do cronograma."

---

## Tela: Fechamento da folha

**Quem acessa:** Engenheiro, Coordenador.
**Chega aqui por:** botão Fechar pacotes do mês.

**O que aparece**
1. Data de fechamento (padrão: o dia de fechamento da folha deste mês).
2. Lista dos pacotes não fechados com fechamento até essa data: meta, executada, %, e o resultado previsto (Concluído/Não concluído). Os Não concluídos pedem o motivo ali mesmo.
3. Prévia dos prêmios: por funcionário — nome, matrícula, função, pacote, dias, valor; total por funcionário e total geral.
4. Avisos que impedem fechar: "Pacote Galeria Rua 2 concluído sem nenhuma presença registrada".

**Ações**
- **Confirmar fechamento:** fecha e trava os pacotes; mostra "4 pacotes fechados · R$ 6.200,00 em prêmios" e o botão **Baixar planilha (Excel)**.
- **Baixar planilha:** disponível também depois, no Detalhe de cada pacote fechado e numa lista "Fechamentos anteriores".

**Estado vazio**
"Nenhum pacote para fechar até esta data."

---

## Tela: Efetivo

**Quem acessa:** Engenheiro, Coordenador, Mestre.
**Chega aqui por:** menu Efetivo; botão Lançar efetivo em Hoje; bloco de efetivo do Painel.

**O que aparece**
1. Seletor de data (padrão hoje) e botão **Repetir efetivo de ontem**.
2. Totais do dia: presentes, faltas, atestados, afastados; presentes por tipo (Direta, Indireta, Terceirizada).
3. Lista de funcionários ativos agrupada por tipo, cada linha com: nome, função (e empresa, se Terceirizada), quatro botões de situação (Presente, Falta, Atestado, Afastado) e, se Presente, escolha do pacote (opcional, só pacotes Liberado/Em execução).
4. Botão **Salvar efetivo**.
5. Aba **Histórico**: por data, os totais por tipo e por função; clicar abre o dia.

**Ações**
- **Repetir efetivo de ontem:** copia situação e pacote de ontem para quem ainda não foi marcado hoje.
- **Salvar efetivo:** grava; mostra "Efetivo de 04/10 salvo: 23 presentes".

**Regras por perfil**
- Mestre: edita só hoje e ontem; dias anteriores ficam só leitura.

**Estado vazio**
"Nenhum funcionário cadastrado. Cadastre a equipe em Cadastros › Funcionários." (Mestre vê: "Nenhum funcionário cadastrado. Peça ao engenheiro para cadastrar a equipe.")

---

## Tela: Avanço (Cliente)

**Quem acessa:** Cliente.
**Chega aqui por:** menu Avanço; é a tela de abertura do Cliente.

**O que aparece**
1. Nome da obra e "Atualizado em 04/10/2026".
2. Avanço geral realizado x previsto para hoje (ex.: 41,8% x 45,2%).
3. Uma linha por etapa de entrega (Geral, Fase 01, Fase 02): realizado x previsto, data de entrega contratual.
4. Curva S previsto x realizado **até hoje** (sem linha de projeção).
5. Lista "Serviços atrasados": serviço, etapa de entrega, dias de atraso. Sem motivo.

**Ações**
- Nenhuma ação de edição. Botão **Registrar ocorrência** leva à Nova ocorrência.

**Regras por perfil**
- Nunca mostra R$, data projetada de término, motivos, PCP, pacotes ou efetivo.

**Estado vazio**
"O cronograma desta obra ainda não foi publicado."

---

## Tela: Ocorrências

**Quem acessa:** Engenheiro, Coordenador, Cliente.
**Chega aqui por:** menu Ocorrências; alerta do Painel.

**O que aparece**
1. Filtro por status (padrão: abertas — Aberta, Em análise, Em tratamento) e por etapa de entrega.
2. Lista: nº, título, local, data de abertura, etiqueta de status, prazo (vermelho se vencido), miniatura da primeira foto.
3. Ordem: mais recentes primeiro.

**Campos da ocorrência (nova)**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Título | texto | sim | |
| Local | texto | sim | rua/quadra/lote |
| Etapa de entrega | escolha | não | Geral, Fase 01, Fase 02 |
| Descrição | texto longo | sim | |
| Fotos | fotos | não | até 5; câmera ou galeria; comprimidas antes de enviar |

**Detalhe da ocorrência:** todos os campos, fotos em tamanho grande, status, responsável, prazo, resposta, datas de abertura, resposta e fechamento.

**Ações**
- **Nova ocorrência** (Cliente, Eng, Coord): ao salvar aparece na lista como Aberta, com número.
- **Atribuir / Mudar status / Definir prazo / Responder** (Eng, Coord). Resolvida e Recusada exigem resposta.
- **Editar descrição e fotos** (Cliente, só enquanto Aberta).
- **Excluir** (Engenheiro).

**Regras por perfil**
- Cliente: vê todas as ocorrências da obra dele; não vê o responsável interno, só o status, o prazo e a resposta.

**Estado vazio**
"Nenhuma ocorrência registrada."

---

## Tela: Cadastros

**Quem acessa:** Engenheiro, Coordenador (Usuários só Engenheiro).
**Chega aqui por:** menu Cadastros.

Três abas:

**Obra e etapas**
- Imagens da capa: três espaços (Foto da obra, Logo do cliente, Logo da construtora), cada um com prévia, **Enviar imagem** / **Trocar imagem** e **Remover**. Aceita JPG, PNG ou WEBP até 15 MB; câmera ou galeria no celular. Foto reduzida a 1200 px; logos a 600 px, PNG mantém o fundo transparente.
- Nome da construtora (vale para todas as obras), com **Salvar**.
- Campos da obra: nome, cidade, UF, cliente, data de início, data de término contratual, dia de fechamento da folha, status (Em andamento, Paralisada, Concluída).
- Etapas de entrega: nome, ordem, data de entrega contratual. Ações: nova, editar, excluir (só sem serviço ligado).
- Botão **Nova obra** (Engenheiro).

**Funcionários**
- Lista: nome, função, tipo (Direta, Indireta, Terceirizada), empresa, matrícula, ativo. Filtro por tipo e por ativo.
- Campos: nome*, função* (Servente, Pedreiro, Carpinteiro, Armador, Encanador, Eletricista, Operador de máquina, Motorista, Encarregado, Apontador, Almoxarife, Técnico, Outro), tipo de mão de obra*, empresa (obrigatória se Terceirizada), matrícula.
- Ações: novo, editar, desativar/reativar; excluir (Engenheiro, só sem presença).
- Vazio: "Nenhum funcionário cadastrado."

**Usuários** (só Engenheiro)
- Lista: nome, e-mail, perfil, obras, ativo. No topo, destaque "3 contas aguardando liberação".
- Ações: **Liberar** (escolhe perfil e obras), mudar perfil, desativar.
- Vazio: "Nenhum usuário além de você."

---

## Tela: Meu perfil

**Quem acessa:** todos.
**O que aparece:** nome (editável), e-mail, perfil, botões Trocar senha e Sair.

---

## Textos do sistema

- Botões: Salvar, Cancelar, Novo, Editar, Excluir, Dar baixa, Desfazer baixa, Lançar efetivo, Repetir efetivo de ontem, Importar do Project, Recalcular, Fechar pacotes do mês, Baixar planilha, Liberar.
- Confirmação de exclusão: "Excluir este registro? Isso não pode ser desfeito."
- Aviso de conta pendente: "Conta aguardando liberação do administrador."
- Baixa travada: "Baixa travada — fale com o engenheiro."
- Salvo: "Salvo."
- Erro genérico: "Não foi possível salvar. Verifique a conexão e tente de novo."

## Dados de exemplo

Hoje nos dados = **04/10/2026**. Semana atual = 05/10 a 10/10/2026. Semana passada = 28/09 a 03/10/2026.

**Obra**
- Conviver Costamare · Parnaíba/PI · cliente Conviver Urbanismo · início 02/03/2026 · término contratual 31/12/2027 · fechamento da folha dia 20 · Em andamento.

**Etapas de entrega**
- Geral (ordem 1, entrega 30/06/2027) · Fase 01 (ordem 2, entrega 31/03/2027) · Fase 02 (ordem 3, entrega 31/12/2027).

**Serviços** (além das 3 tarefas-resumo de nível 1: Geral, Fase 01, Fase 02)

| UID | EAP | Serviço | Etapa | Un | Prevista | Executada | Custo orçado | Base início–fim | Crítico | Atraso |
|---|---|---|---|---|---|---|---|---|---|---|
| 11 | 1.1 | Instalação do canteiro | Geral | % | 100 | 100 | R$ 85.000,00 | 02/03–31/03/2026 | não | 3 (fim real 03/04) |
| 12 | 1.2 | Locação topográfica | Geral | % | 100 | 100 | R$ 38.000,00 | 09/03–30/04/2026 | não | 0 |
| 13 | 1.3 | Adutora de água – trecho externo | Geral | % | 100 | 55 | R$ 620.000,00 | 01/06–30/11/2026 | sim | 0 |
| 21 | 2.1 | Limpeza e terraplenagem – Fase 01 | Fase 01 | % | 100 | 100 | R$ 1.150.000,00 | 06/04–31/07/2026 | não | 14 (fim real 14/08) |
| 22 | 2.2 | Drenagem pluvial – galerias Fase 01 | Fase 01 | m (trocado em 15/09) | 3.200 | 1.410 | R$ 1.480.000,00 | 03/08–30/11/2026 | sim | 0 |
| 23 | 2.3 | Rede de água – Fase 01 | Fase 01 | m (trocado em 01/08) | 5.100 | 4.300 | R$ 690.000,00 | 01/07–25/09/2026 | não | 9 |
| 24 | 2.4 | Rede de esgoto – Fase 01 | Fase 01 | m (trocado em 20/09) | 4.900 | 600 | R$ 980.000,00 | 15/09–15/12/2026 | sim | 0 |
| 25 | 2.5 | Meio-fio e sarjeta – Fase 01 | Fase 01 | % | 100 | 0 | R$ 540.000,00 | 28/09–31/12/2026 | não | 6 (não iniciou) |
| 26 | 2.6 | Pavimentação intertravada – Fase 01 | Fase 01 | % | 100 | 0 | — (sem custo) | 01/12/2026–31/03/2027 | sim | 0 |
| 31 | 3.1 | Limpeza e terraplenagem – Fase 02 | Fase 02 | % | 100 | 19 | R$ 1.240.000,00 | 01/09–31/12/2026 | não | 0 |
| 32 | 3.2 | Drenagem pluvial – Fase 02 | Fase 02 | % | 100 | 0 | — (sem custo) | 04/01–30/04/2027 | sim | 0 |
| 33 | 3.3 | Rede elétrica e iluminação – Fase 02 | Fase 02 | % | 100 | 0 | R$ 870.000,00 | 01/03–30/06/2027 | não | 0 |

Com 2 serviços sem custo, o Painel mostra "2 serviços sem custo — avanço ponderado por duração".

Predecessoras: 2.1 → 2.2 (TI), 2.2 → 2.4 (II +14 dias), 2.4 → 2.5 (II +10), 2.2 → 2.6 (TI), 2.5 → 2.6 (TT), 3.1 → 3.2 (TI), 3.2 → 3.3 (TI), 1.2 → 2.1 (TI).

**Funcionários**
- Raimundo Sousa — Encarregado — Direta — mat. 1021
- Francisco Lima — Pedreiro — Direta — mat. 1034
- José Carlos Alves — Pedreiro — Direta — mat. 1035
- Antônio Pereira — Servente — Direta — mat. 1040
- Luiz Ferreira — Servente — Direta — mat. 1041
- Marcos Oliveira — Encanador — Direta — mat. 1050
- Ana Beatriz Moura — Apontador — Indireta — mat. 1060
- Carlos Eduardo Nunes — Almoxarife — Indireta — mat. 1061
- Paulo Henrique Costa — Operador de máquina — Terceirizada — Terraplan Delta Ltda
- Edson Rocha — Motorista — Terceirizada — Terraplan Delta Ltda
- Sérgio Batista — Servente — Direta — mat. 1042 — **inativo**

**Efetivo**
- 02/10/2026: todos presentes, exceto Luiz Ferreira (Falta). Raimundo, Francisco, Antônio no pacote "Galeria Rua 2 – trecho 1"; Marcos no "Rede de água Fase 01 – Quadras E e F".
- 03/10/2026: José Carlos Alves (Atestado), Edson Rocha (Afastado), demais presentes, mesmos pacotes.
- 04/10/2026: não lançado (para testar o alerta).

**Pacotes**

| Nome | Serviço | Meta | Executada | Prêmio | Início–fechamento | Status |
|---|---|---|---|---|---|---|
| Rede de água Fase 01 – Quadras A a D | 2.3 | 1.200 m | 1.200 m | R$ 2.400,00 | 01/09–20/09 | Concluído (fechado 20/09) |
| Galeria Rua 1 | 2.2 | 300 m | 210 m | R$ 1.300,00 | 01/09–20/09 | Não concluído — Chuva (fechado 20/09) |
| Galeria Rua 2 – trecho 1 | 2.2 | 400 m | 260 m | R$ 1.800,00 | 21/09–20/10 | Em execução |
| Rede de água Fase 01 – Quadras E e F | 2.3 | 800 m | 640 m | R$ 1.600,00 | 21/09–20/10 | Em execução |
| Esgoto Rua 5 – lado ímpar | 2.4 | 350 m | 0 | R$ 1.500,00 | 05/10–20/10 | Liberado |
| Meio-fio Rua 1 | 2.5 | 8% | 0% | R$ 1.200,00 | 12/10–20/11 | Planejado |

**PCP — semana passada (28/09 a 03/10) — PPC 67%**
- 29/09 Galeria Rua 2 – trecho 1 · 60 m · Concluída (62 m)
- 30/09 Rede de água Quadra E · 120 m · Concluída (120 m)
- 01/10 Esgoto Rua 3 · 80 m · Não concluída (35 m) — Falta de material
- 01/10 Terraplenagem Fase 02 – Quadra 12 · 3% · Concluída (3,2%)
- 02/10 Galeria Rua 2 – trecho 1 · 60 m · Concluída (60 m)
- 03/10 Meio-fio Rua 1 · 1% · Não concluída (0%) — Frente não liberada

**PCP — semana atual (05/10 a 10/10)** — todas Planejada
- 05/10 Galeria Rua 2 – trecho 1 · 60 m · Equipe do Raimundo
- 06/10 Esgoto Rua 5 – lado ímpar · 70 m · Equipe do Marcos
- 07/10 Rede de água Quadra F · 100 m
- 08/10 Terraplenagem Fase 02 – Quadra 13 · 3%

**Restrições**
- Meio-fio e sarjeta – Fase 01 · Liberação de área · "Liberação da Rua 5 pela topografia" · prazo 02/10 · Pendente (vencida)
- Rede de esgoto – Fase 01 · Material · "Tubos PVC 200 mm — pedido Sienge 4512" · prazo 09/10 · Pendente
- Pavimentação intertravada – Fase 01 · Projeto · "Projeto de paginação aprovado" · Removida em 25/09

**Ocorrências**
1. "Poça d'água na Rua 2 após chuva" · Rua 2, Quadra B · Fase 01 · Aberta · 01/10 (sem resposta há 3 dias)
2. "Meio-fio quebrado em frente ao lote 14" · Quadra C, lote 14 · Fase 01 · Em análise · 28/09
3. "Entulho na área verde" · Área verde 2 · Geral · Em tratamento · prazo 08/10
4. "Caixa de passagem sem tampa" · Rua 4 · Fase 01 · Resolvida · resposta "Tampa instalada em 22/09"
5. "Pedido de mudança no traçado da calçada" · Rua 1 · Fase 02 · Recusada · resposta "Fora do projeto aprovado"

**Usuários de exemplo** (um de cada perfil)
- Otoniel Neto — Engenheiro
- Larissa Mendes — Coordenador
- Valdir Araújo — Mestre
- Breno Cavalcante — Cliente
- Juliana Rocha — Técnico de Segurança
- Camila Sá — Auxiliar Administrativo
- Pedro Henrique Lopes — Aguardando

## Critérios de aceite

- [ ] O Engenheiro abre em Início com avanço geral e por etapa (Geral, Fase 01, Fase 02), atividades de hoje, efetivo e alertas.
- [ ] O Mestre abre em Hoje e lança o efetivo do dia em menos de 1 minuto usando "Repetir efetivo de ontem".
- [ ] Dar baixa com quantidade menor que a planejada exige o motivo e deixa a atividade como Não concluída.
- [ ] A baixa atualiza o PPC, o % do serviço e o % do pacote sem recarregar a página.
- [ ] "Copiar pendentes" cria na semana seguinte só o saldo das atividades Não concluídas.
- [ ] O Mestre nunca vê R$ (custo orçado, prêmio) em nenhuma tela.
- [ ] O Cliente vê avanço e serviços atrasados, mas não vê R$, data projetada, motivo, PCP, pacotes ou efetivo.
- [ ] O Técnico de Segurança vê Semana e 3 meses sem nenhum botão de edição.
- [ ] A importação mostra a prévia antes de gravar e reimportar não duplica serviços.
- [ ] Críticos aparecem em vermelho no Cronograma e no Gantt.
- [ ] O fechamento da folha mostra a prévia dos prêmios e gera a planilha.
- [ ] Criar uma ocorrência com foto pelo celular faz ela aparecer na lista como Aberta sem recarregar.
- [ ] Todas as telas funcionam no celular sem rolagem horizontal (o Gantt só aparece no computador e no tablet deitado).
- [ ] Cada lista tem estado vazio com texto próprio.

## A conta que vai chegar depois

- `[PENDENTE: digitar o custo orçado de cada serviço]` — até todos terem custo, o avanço é ponderado por duração e o Painel avisa.
- `[PENDENTE: armazenamento de fotos]` — fotos comprimidas no envio; acima de 1 GB, plano pago do Supabase.

## Decidir depois de usar

- Dia de montar o PCP — por enquanto: até sexta, para a semana seguinte.
- Prazo de correção do Mestre — por enquanto: até o fim do dia seguinte.
- Limites dos alertas — por enquanto: pacote a 5 dias do fechamento abaixo de 70%; ocorrência sem resposta há 48 h.
