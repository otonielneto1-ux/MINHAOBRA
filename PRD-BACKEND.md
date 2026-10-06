# PRD Backend — Minha Obra (Versão 1)

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.
> Escopo: **Versão 1** (até 31/10/2026). A Versão 2 (custo, projeção, segurança, materiais) está no fim, só como reserva de espaço.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline.
- Colunas em minúsculo com underline.
- Toda tabela tem `id` (int8, chave) e `created_at` (timestamptz, automático). Nas tabelas abaixo esses dois não são repetidos.
- Chave estrangeira termina em `_id`. Referências a pessoas apontam para `profiles.id`.
- Campo de lista fechada vira CHECK, e o texto é **idêntico** ao usado na interface, com acento e maiúscula como está escrito aqui.
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`. Quantidades como `numeric(14,3)`.
- Fotos vão para o Storage; o banco guarda só o caminho.
- Quase todas as tabelas têm `obra_id`: o acesso a qualquer dado passa por "a pessoa tem acesso a esta obra" (`obra_usuarios`).

## Listas fechadas (vocabulário único — banco e tela usam exatamente estes textos)

| Onde | Valores |
|---|---|
| `profiles.role` | Aguardando, Engenheiro, Coordenador, Mestre, Cliente, Técnico de Segurança, Auxiliar Administrativo |
| `obras.status` | Em andamento, Paralisada, Concluída |
| `servicos.unidade` | %, m, m², m³, kg, t, un |
| `servico_dependencias.tipo` | TI, II, TT, IT |
| `restricoes.tipo` | Material, Projeto, Equipe, Equipamento, Liberação de área, Segurança, Outro |
| `restricoes.status` | Pendente, Removida |
| `funcionarios.funcao` | Servente, Pedreiro, Carpinteiro, Armador, Encanador, Eletricista, Operador de máquina, Motorista, Encarregado, Apontador, Almoxarife, Técnico, Outro |
| `funcionarios.tipo_mao_obra` | Direta, Indireta, Terceirizada |
| `presencas.situacao` | Presente, Falta, Atestado, Afastado |
| `pacotes.status` | Planejado, Liberado, Em execução, Pausado, Concluído, Não concluído |
| `pcp_atividades.status` | Planejada, Concluída, Não concluída |
| motivo de não conclusão (`pacotes`, `pcp_atividades`) | a causa; o grupo macro sai dela (`GRUPOS_MOTIVO` em vocabulario.js): Condição climática (Chuva, Solo encharcado, Vento ou calor excessivo) · Execução (Falta de equipe, Baixa produtividade, Retrabalho) · Planejamento (Frente não liberada, Meta acima da capacidade, Interferência de outra equipe, Mudança de prioridade) · Projetos (Falta de projeto, Dúvida ou erro de projeto) · Suprimentos (Falta de material, Atraso na entrega de material, Equipamento (falta ou quebra)) · Segurança (Acidente ou incidente, Paralisação por segurança, Falta de EPI) · Outros (Outro) |
| `producoes.origem` | PCP, Ajuste |
| `ocorrencias.status` | Aberta, Em análise, Em tratamento, Resolvida, Recusada |

---

## Tabela `profiles`

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| auth_uid | uuid | sim | vem do login, único |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | CHECK com a lista acima; padrão "Aguardando" |
| ativo | boolean | sim | padrão verdadeiro |

Criado automaticamente por um gatilho quando alguém se cadastra, já como "Aguardando".
**Regra:** "Auxiliar Administrativo" existe na lista, mas não tem tela na Versão 1.

---

## Tabela `config`

Uma linha só: dados da construtora, que valem para todas as obras.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| nome_construtora | text | sim | "Solutio Engenharia" |
| logo_construtora | text | não | caminho no Storage (`config/logo_construtora.png` ou `.jpg` (PNG continua PNG; JPG e WEBP viram JPEG)) |

**Regra:** existe exatamente uma linha (CHECK em `id = 1`).

---

## Tabela `obras`

Cada obra. Hoje só a Conviver Costamare.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| nome | text | sim | "Conviver Costamare" |
| cidade | text | sim | "Parnaíba" |
| uf | text | sim | "PI" |
| cliente | text | sim | "Conviver Urbanismo" |
| data_inicio | date | sim | |
| data_fim_contrato | date | sim | término contratual da obra toda |
| dia_fechamento_folha | int2 | sim | 1 a 31 |
| status | text | sim | CHECK: Em andamento, Paralisada, Concluída |
| ultimo_calculo_em | timestamptz | não | quando o caminho crítico foi recalculado |
| foto_obra | text | não | caminho no Storage (`obras/<obra_id>/foto_obra.jpg`) |
| logo_cliente | text | não | caminho no Storage (`obras/<obra_id>/logo_cliente.png` ou `.jpg` (PNG continua PNG; JPG e WEBP viram JPEG)) |

**Relações:** tem várias etapas de entrega, serviços, funcionários, pacotes, atividades de PCP, ocorrências.

---

## Tabela `obra_usuarios`

Quem tem acesso a qual obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| profile_id | int8 | sim | → profiles |

**Regra:** o par (obra_id, profile_id) é único. O Engenheiro tem acesso a todas as obras mesmo sem linha aqui.

---

## Tabela `etapas_entrega`

As etapas de entrega contratual da obra (na Costamare: Geral, Fase 01, Fase 02).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| nome | text | sim | texto livre; único por obra |
| ordem | int2 | sim | ordem de exibição |
| data_entrega_contratual | date | não | |

---

## Tabela `servicos`

Cada linha do cronograma importado do MS Project (etapas-resumo e serviços).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| uid_project | int4 | sim | identificador único da tarefa no Project (UID); único por obra; é por ele que a reimportação casa os serviços |
| pai_id | int8 | não | → servicos (tarefa-resumo acima) |
| etapa_entrega_id | int8 | não | → etapas_entrega |
| codigo_eap | text | sim | ex.: "2.3.1" |
| nome | text | sim | |
| nivel | int2 | sim | nível no Project (1 = topo) |
| e_resumo | boolean | sim | verdadeiro = agrupador, não recebe produção |
| local | text | não | rua/quadra/trecho |
| unidade | text | sim | CHECK: %, m, m², m³, kg, t, un; padrão "%" |
| quantidade_prevista | numeric(14,3) | sim | padrão 100 (quando a unidade é %); maior que zero |
| custo_orcado | numeric(14,2) | não | **digitado à mão** por serviço; a importação nunca preenche nem apaga |
| unidade_alterada_em | timestamptz | não | quando o serviço trocou % por quantidade |
| inicio_previsto | date | sim | |
| fim_previsto | date | sim | |
| duracao_dias | int4 | sim | |
| inicio_base | date | não | linha de base |
| fim_base | date | não | linha de base |
| inicio_cedo | date | não | calculado |
| fim_tarde | date | não | calculado |
| folga_dias | int4 | não | calculado |
| critico | boolean | sim | calculado; padrão falso |
| quantidade_executada | numeric(14,3) | sim | padrão 0; soma de `producoes`, mantida pelo banco |
| inicio_real | date | não | data da primeira produção |
| fim_real | date | não | data em que chegou a 100% |
| dias_atraso | int4 | sim | calculado; padrão 0 |
| cancelado | boolean | sim | padrão falso; sumiu do Project numa reimportação |

**Índices úteis:** (obra_id, codigo_eap), (obra_id, critico), (obra_id, etapa_entrega_id).
**Regras de negócio:**
- `quantidade_executada`, `inicio_real` e `fim_real` são atualizados sozinhos quando entra, muda ou sai uma `producoes`.
- Serviço com produção nunca é apagado; vira `cancelado`.
- Serviço `e_resumo` não recebe produção.
- Todo serviço nasce com unidade "%" e prevista 100. A troca para quantidade é feita pelo processo "Trocar % por quantidade" (abaixo) e não tem volta automática.
- Avanço do serviço = `quantidade_executada` ÷ `quantidade_prevista`, limitado a 100%.

---

## Tabela `servico_dependencias`

As predecessoras, para o caminho crítico.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| servico_id | int8 | sim | → servicos (o sucessor) |
| predecessora_id | int8 | sim | → servicos |
| tipo | text | sim | CHECK: TI, II, TT, IT (TI = término-início) |
| defasagem_dias | int4 | sim | padrão 0; pode ser negativa |

**Regra:** o par (servico_id, predecessora_id) é único; um serviço não pode ser predecessor de si mesmo.

---

## Tabela `restricoes`

O que precisa ser resolvido antes de um serviço do plano de 3 meses começar.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| servico_id | int8 | sim | → servicos |
| tipo | text | sim | CHECK: lista acima |
| descricao | text | sim | |
| responsavel | text | não | texto livre (pode ser alguém de fora do sistema) |
| data_limite | date | não | |
| status | text | sim | CHECK: Pendente, Removida; padrão Pendente |
| removida_em | date | não | obrigatório quando status = Removida |

---

## Tabela `funcionarios`

A equipe da obra (quem trabalha, não quem usa o sistema).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| nome | text | sim | |
| funcao | text | sim | CHECK: lista acima |
| tipo_mao_obra | text | sim | CHECK: Direta, Indireta, Terceirizada |
| empresa | text | não | obrigatório quando Terceirizada |
| matricula | text | não | a da folha |
| ativo | boolean | sim | padrão verdadeiro |

**Regra:** funcionário com presença nunca é apagado; vira inativo.

---

## Tabela `presencas`

O efetivo: a situação de cada funcionário em cada dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| data | date | sim | |
| funcionario_id | int8 | sim | → funcionarios |
| situacao | text | sim | CHECK: Presente, Falta, Atestado, Afastado |
| pacote_id | int8 | não | → pacotes; só quando Presente |
| lancado_por | int8 | sim | → profiles |

**Índices úteis:** (obra_id, data).
**Regras:** o par (funcionario_id, data) é único. `pacote_id` vazio quando a situação não é Presente.

---

## Tabela `pacotes`

A meta de produção com prêmio até o fechamento da folha. Os serviços, metas e MO ficam em `pacote_servicos`;
quem participa, em `pacote_colaboradores`. Salvo (com serviços e colaboradores) pela função `salvar_pacote`.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| nome | text | sim | ex.: "Meio-fio Rua 4 – lado par" |
| local | text | sim | |
| data_inicio | date | sim | |
| data_fechamento | date | sim | data de fechamento da folha; não antes do início |
| status | text | sim | CHECK: lista acima; padrão Planejado. À mão só Planejado, Liberado, Em execução; Pausado só pela função `pausar_pacote` |
| motivo_nao_conclusao | text | não | CHECK: lista de motivos; obrigatório quando Não concluído |
| fechado_em | timestamptz | não | preenchido pelo fechamento da folha |
| pct_pago | numeric(5,2) | sim | padrão 100; de >0 a 100; prêmio pago = MO orçada × pct_pago |
| continua | boolean | não | resposta da pergunta do dia 21 (null = sem resposta); muda pela função `marcar_renovacao` |
| renovado_de_id | int8 | não | → pacotes: o pacote do período anterior que este renova |
| pausa_motivo | text | não | CHECK: lista de motivos; obrigatório quando Pausado (o problema) |
| pausa_desde | date | não | obrigatório quando Pausado; do início do pacote até hoje. Fora de Pausado só fica preenchido depois de fechado (CHECK) |
| pausado_por | int8 | não | → profiles: quem pausou |

**Regra:** pacote com `fechado_em` preenchido não pode mais ser editado; Concluído / Não concluído só pelo fechamento.

---

## Tabela `pacote_servicos`

Os serviços de cada pacote (decidido em 05/10/2026: pacote com vários serviços). Leitura com MO só para Engenheiro e
Coordenador; o Mestre lê pela função `pacote_servicos_sem_mo`.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| pacote_id | int8 | sim | → pacotes (apaga junto) |
| servico_id | int8 | sim | → servicos (não resumo, da mesma obra); único por pacote |
| quantidade_meta | numeric(14,3) | sim | maior que zero |
| quantidade_executada | numeric(14,3) | sim | padrão 0; soma das `producoes` do pacote neste serviço, mantida pelo banco |
| mo_profissional | numeric(14,2) | sim | padrão 0; não negativo |
| mo_ajudante | numeric(14,2) | sim | padrão 0; não negativo |
| mo_total | numeric(14,2) | — | calculado pelo banco: mo_profissional + mo_ajudante (valores de orçamento) |
| meta_cronograma | numeric(14,3) | não | meta sugerida pelo cronograma quando o pacote foi salvo; diferente de quantidade_meta = meta editada |

## Tabela `pacote_colaboradores`

Quem participa do pacote: só eles recebem o prêmio e só para eles o efetivo aceita o pacote.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| pacote_id | int8 | sim | → pacotes (apaga junto) |
| funcionario_id | int8 | sim | → funcionarios (da mesma obra, não terceirizado); único por pacote |
| entrou_em | date | não | null = desde o início; com data depois do início, recebe proporcional aos dias úteis |
| saiu_em | date | não | levado do pacote pausado para outro (função `remanejar_colaboradores` com origem) |
| pct_saida | numeric(5,2) | não | % da meta atingida na saída (junto com saiu_em); recebe a parte cheia × este %, garantido |

**Regra:** quem saiu não é apagado ao editar o pacote nem vai na renovação; `saiu_em`/`pct_saida` só pela função. Pausar com data no passado tira do pacote as baixas do dia da pausa em diante (antes de calcular o % de quem sai); retomar liga de volta as atividades sem pacote.

## Tabela `premio_ajustes`

Acréscimo ou desconto no prêmio de um funcionário numa folha (aba Resumo). Só Engenheiro e Coordenador veem, lançam e
excluem; não se edita (exclui e lança de novo). Entra na planilha da folha da `data_folha`.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| funcionario_id | int8 | sim | → funcionarios (da mesma obra) |
| data_folha | date | sim | data de fechamento da folha a que o ajuste pertence |
| valor | numeric(14,2) | sim | diferente de zero; negativo = desconto |
| motivo | text | sim | |
| criado_por | int8 | sim | → profiles: quem lançou |

## Tabela `premios`

Resultado do fechamento: quanto cada funcionário recebe de cada pacote.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| pacote_id | int8 | sim | → pacotes |
| funcionario_id | int8 | sim | → funcionarios |
| dias | int2 | sim | dias com presença no pacote |
| valor | numeric(14,2) | sim | |

**Regra:** só é escrita pelo processo de fechamento; ninguém cria ou edita à mão.

---

## Tabela `pcp_atividades`

O planejamento da semana.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| semana_inicio | date | sim | sempre uma segunda-feira |
| data_prevista | date | sim | dentro da semana (segunda a sábado) |
| servico_id | int8 | sim | → servicos (não resumo) |
| pacote_id | int8 | não | → pacotes |
| local | text | sim | |
| quantidade_planejada | numeric(14,3) | sim | maior que zero |
| equipe | text | não | equipe planejada; ex.: "Equipe do Raimundo" |
| equipe_executou | text | não | equipe que fez, informada na baixa (obrigatória nela); não apaga a planejada |
| status | text | sim | CHECK: Planejada, Concluída, Não concluída; padrão Planejada |
| quantidade_executada | numeric(14,3) | não | informada na baixa |
| motivo_nao_conclusao | text | não | CHECK: lista de motivos; obrigatório quando Não concluída |
| baixa_por | int8 | não | → profiles |
| baixa_em | timestamptz | não | |
| copiada_de_id | int8 | não | → pcp_atividades (repasse da semana anterior) |

**Índices úteis:** (obra_id, semana_inicio), (obra_id, data_prevista).
**Regras:**
- Atividade nova só de hoje em diante; editar e excluir só enquanto Planejada (o banco confere).
- Na baixa: executada ≥ planejada → Concluída; executada < planejada → Não concluída com motivo obrigatório; a equipe que fez é obrigatória.
- A baixa cria (ou atualiza) uma linha em `producoes` com origem "PCP" e a quantidade executada. Desfazer a baixa apaga essa produção.
- O Mestre só altera a baixa até o fim do dia seguinte à `data_prevista`.

---

## Tabela `producoes`

A quantidade feita. É daqui que sai o avanço físico.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| data | date | sim | |
| servico_id | int8 | sim | → servicos |
| quantidade | numeric(14,3) | sim | negativa só quando origem = Ajuste |
| origem | text | sim | CHECK: PCP, Ajuste |
| pcp_atividade_id | int8 | não | → pcp_atividades; obrigatório quando origem = PCP; único |
| pacote_id | int8 | não | → pacotes (copiado da atividade) |
| motivo_ajuste | text | não | obrigatório quando origem = Ajuste |
| lancado_por | int8 | sim | → profiles |

---

## Tabela `ocorrencias`

O que a Conviver Urbanismo registra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | int8 | sim | → obras |
| numero | int4 | sim | sequencial por obra, gerado pelo banco |
| titulo | text | sim | |
| local | text | sim | rua/quadra/lote |
| etapa_entrega_id | int8 | não | → etapas_entrega |
| descricao | text | sim | |
| status | text | sim | CHECK: lista acima; padrão Aberta |
| aberta_por | int8 | sim | → profiles |
| responsavel_id | int8 | não | → profiles |
| prazo | date | não | |
| resposta | text | não | obrigatória quando Resolvida ou Recusada |
| respondida_em | timestamptz | não | primeira mudança de status a partir de Aberta |
| fechada_em | timestamptz | não | quando vira Resolvida ou Recusada |

---

## Tabela `ocorrencia_fotos`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| ocorrencia_id | int8 | sim | → ocorrencias |
| caminho | text | sim | caminho no Storage |
| enviada_por | int8 | sim | → profiles |

---

## Leituras protegidas (o que esconde dinheiro)

Permissão de linha não esconde coluna. Por isso:

- **Mestre, Cliente e Técnico de Segurança** leem os serviços por uma visão **sem `custo_orcado`**.
- **Mestre** lê os pacotes por uma visão **sem `valor_premio`** e não lê `premios`.
- **O avanço ponderado** (geral e por etapa, previsto x realizado, e os pontos da curva S) é entregue por uma função do banco que devolve **só percentuais**, para que o Cliente veja o avanço sem receber o custo de nenhum serviço.
  - Peso de cada serviço (não resumo, não cancelado): `custo_orcado`, se **todos** os serviços da obra tiverem custo; se faltar custo em algum, o peso de todos passa a ser `duracao_dias`. A função devolve também qual peso foi usado e quantos serviços estão sem custo.
  - Previsto para uma data: cada serviço distribui 100% de forma linear entre `inicio_base` e `fim_base`.
- O Cliente lê os serviços atrasados (nome, etapa, dias de atraso), mas não lê `pcp_atividades` nem `restricoes`, onde estão os motivos.

---

## Permissões

"Da obra" = a pessoa tem linha em `obra_usuarios` para aquela obra (o Engenheiro sempre tem). "Aguardando" e inativos não leem nada.

### `profiles`
- **Ver:** cada um vê o próprio; Engenheiro vê todos; Coordenador vê nome e perfil de todos.
- **Criar:** só o gatilho do cadastro.
- **Editar:** cada um edita o próprio nome; perfil e ativo só o Engenheiro.
- **Apagar:** ninguém (desativa).

### `obras`, `etapas_entrega`
- **Ver:** todos os perfis liberados, da obra (inclui a foto da obra e a logo do cliente).
- **Criar / editar:** Engenheiro e Coordenador (inclui trocar a foto e a logo).
- **Apagar:** Engenheiro.

### `config`
- **Ver:** todos os perfis liberados.
- **Editar:** Engenheiro e Coordenador.
- **Criar / apagar:** ninguém (a linha nasce na migration).

### `obra_usuarios`
- **Ver:** Engenheiro; cada um vê as próprias.
- **Criar / editar / apagar:** Engenheiro.

### `servicos`, `servico_dependencias`
- **Ver:** Engenheiro e Coordenador (tudo); Mestre e Técnico de Segurança pela visão sem custo; Cliente pela visão sem custo, só nome, etapa, datas da linha de base, avanço e atraso.
- **Criar / editar:** Engenheiro e Coordenador (importação e ajustes).
- **Apagar:** Engenheiro, só serviço sem produção.

### `restricoes`
- **Ver:** Engenheiro, Coordenador, Mestre, Técnico de Segurança.
- **Criar / editar:** Engenheiro e Coordenador.
- **Apagar:** Engenheiro.

### `funcionarios`
- **Ver:** Engenheiro, Coordenador, Mestre.
- **Criar / editar:** Engenheiro e Coordenador.
- **Apagar:** Engenheiro, só sem presença.

### `presencas`
- **Ver:** Engenheiro, Coordenador, Mestre.
- **Criar / editar:** Engenheiro e Coordenador sempre; Mestre até o fim do dia seguinte à data.
- **Apagar:** Engenheiro.

### `pacotes`
- **Ver:** Engenheiro e Coordenador (tudo); Mestre pela visão sem valor.
- **Criar / editar:** Engenheiro e Coordenador, enquanto não fechado.
- **Pausar / retomar / levar a equipe para outro pacote:** Engenheiro e Coordenador, pelas funções `pausar_pacote`, `retomar_pacote` e `remanejar_colaboradores`.
- **Apagar:** Engenheiro, só com status Planejado.

### `premios`
- **Ver:** Engenheiro e Coordenador.
- **Criar / editar / apagar:** só o processo de fechamento.

### `premio_ajustes`
- **Ver / criar / apagar:** Engenheiro e Coordenador. Editar: ninguém.

### `pcp_atividades`
- **Ver:** Engenheiro, Coordenador, Mestre, Técnico de Segurança.
- **Criar / editar:** Engenheiro e Coordenador.
- **Dar baixa (status, quantidade executada, motivo):** Engenheiro e Coordenador sempre; Mestre até o fim do dia seguinte à data prevista.
- **Apagar:** Engenheiro e Coordenador, só com status Planejada.

### `producoes`
- **Ver:** Engenheiro, Coordenador, Mestre.
- **Criar:** origem PCP — pela baixa (Engenheiro, Coordenador, Mestre); origem Ajuste — Engenheiro e Coordenador.
- **Editar / apagar:** Engenheiro (ajustes); as de origem PCP mudam só pela baixa.

### `ocorrencias`, `ocorrencia_fotos`
- **Ver:** Engenheiro e Coordenador; Cliente vê todas as da obra dele.
- **Criar:** Cliente, Engenheiro e Coordenador.
- **Editar:** Engenheiro e Coordenador (status, responsável, prazo, resposta); Cliente só a descrição e as fotos enquanto Aberta.
- **Apagar:** Engenheiro.

---

## Fluxo de cadastro e liberação

1. A pessoa se cadastra com nome, e-mail e senha.
2. O gatilho cria o `profiles` com role "Aguardando".
3. Ela vê só o aviso "Conta aguardando liberação do administrador".
4. O Engenheiro, em Cadastros › Usuários, escolhe o perfil e a obra (cria `obra_usuarios`).
5. No próximo acesso ela entra na tela inicial do perfil.

**Primeiro uso:** a conta do Otoniel é a primeira a ser criada e é promovida a Engenheiro direto no banco, na implantação. Daí em diante ele cria a obra, as etapas de entrega, importa o cronograma, cadastra os funcionários e libera os demais.

## Processos automáticos

### Recalcular o cronograma (caminho crítico e atrasos)
- **Gatilho:** fim de uma importação do Project; alteração em datas ou predecessoras; botão "Recalcular".
- **Passos:**
  1. Ida pela rede (datas mais cedo) e volta (datas mais tarde), respeitando TI, II, TT, IT e a defasagem, em dias corridos.
     Cada serviço começa no início previsto do Project ou depois, se uma predecessora empurrar (nunca antes). Ligações com tarefa-resumo ficam de fora.
  2. `folga_dias` = fim mais tarde − fim mais cedo; `critico` = folga ≤ 0.
  3. `dias_atraso` contra a linha de base: terminado → fim_real − fim_base (mínimo 0); não terminado e hoje > fim_base → hoje − fim_base; sem produção e hoje > inicio_base → hoje − inicio_base.
  4. Grava tudo de uma vez e atualiza `obras.ultimo_calculo_em`.
- **Resultado:** críticos e atrasos atualizados; alertas no Painel.
- **Se falhar:** dependência circular ou serviço sem data → nada é gravado; a tela lista os serviços com problema; o cálculo anterior continua valendo.

### Atividade da semana → pacote
- **Regra:** o pacote que recebe a produção de um serviço num dia é o único pacote aberto, com o serviço, com o dia no período e — se pausado — com o dia **antes** da pausa (`pacote_unico` / `pacote_para`; em `src/lib/pcp.js`, `pacotesPara` / `ligarPacotes`). O pacote que a atividade já tem só vale enquanto for possível naquele dia. Com dois possíveis, a tela pede para escolher (e a baixa avisa que não vai somar em nenhum).
- **Quando:** ao criar a atividade (tela), em toda baixa (`dar_baixa`) e ao salvar um pacote (`ligar_baixas_ao_pacote`: o que ficou fora do novo período sai dele, e as atividades e produções do período sem pacote passam para ele; o gatilho refaz o executado). Produção de Ajuste (correção de medição) não entra em pacote.

### Fechamento dos pacotes na folha
- **Gatilho:** botão "Fechar pacotes do mês" (Engenheiro ou Coordenador), com a data de fechamento escolhida.
- **Passos:**
  1. Pega os pacotes não fechados com `data_fechamento` até a data escolhida.
  2. Todos os serviços do pacote com `quantidade_executada` ≥ `quantidade_meta` → Concluído (paga 100%); senão, se **Pausado** → Não concluído com o problema da pausa e paga o **% executado** (média dos serviços, cada um até 100%, 2 casas); senão Não concluído (motivo obrigatório antes de confirmar), sem prêmio.
  3. Para cada pacote que paga: cada parte (centavos) = round(MO orçada × `pct_pago` × % ÷ 100), a profissional para os **colaboradores** profissionais e a ajudante para os serventes (nunca terceirizado). Quem entrou depois do início (`entrou_em`) recebe round(parte × dias úteis dele ÷ (dias úteis do pacote × n)); quem saiu do pacote pausado (`saiu_em`) recebe round(parte cheia (100%) × dias úteis dele × `pct_saida` ÷ (dias úteis do pacote × n × 100)), **mesmo que o pacote não pague**; o resto (mínimo 0) vai **em partes iguais** para quem está desde o início e ficou (se ninguém, para quem ficou; se ninguém ficou, para quem saiu); os centavos que sobrarem vão um para cada, a partir do menor id; grava `premios` (com os dias de presença no pacote no período, só como informação). Parte com valor e sem nenhum colaborador daquela parte → o fechamento para e diz qual.
  4. Marca `fechado_em` em todos.
  5. Gera o Excel: funcionário, matrícula, função, pacote, dias, valor; total por funcionário.
- **Resultado:** pacotes travados e planilha para a folha.
- **Se falhar:** tudo em uma transação; nada fecha pela metade. Pacote Concluído sem nenhuma presença → o fechamento para e mostra qual é.

### Importação do MS Project (XML)
- **Gatilho:** Engenheiro ou Coordenador envia o arquivo.
- **Passos:**
  1. Lê as tarefas (UID, EAP, nome, nível, resumo, início, término, duração, linha de base) e as predecessoras (tipo e defasagem).
  2. Mostra a prévia: quantos serviços novos, alterados e que sumiram; a etapa de entrega de cada um (tarefa-resumo de nível 1, casada pelo nome com `etapas_entrega`).
  3. Na confirmação, grava casando pelo `uid_project`: novos entram com unidade "%" e prevista 100; existentes têm nome, EAP, datas e predecessoras atualizados (custo, unidade, quantidade e produção **não são tocados**); os que sumiram ficam `cancelado`.
  4. Na primeira importação, grava a linha de base (a do Project, se houver; senão as datas importadas).
  5. Dispara o recálculo do cronograma.
- **Se falhar:** arquivo inválido ou sem tarefas → nada gravado, mensagem dizendo o que faltou.

### Trocar % por quantidade (por serviço)
- **Gatilho:** Engenheiro ou Coordenador, no detalhe do serviço, escolhe a unidade (m, m², m³, kg, t, un) e informa a quantidade prevista.
- **Passos:**
  1. Fator = quantidade prevista nova ÷ 100.
  2. Multiplica pelo fator, no serviço: `quantidade_executada`; nas `producoes` do serviço: `quantidade`; nas `pcp_atividades` do serviço: `quantidade_planejada` e `quantidade_executada`; nos `pacotes` do serviço: `quantidade_meta` e `quantidade_executada`.
  3. Grava `unidade`, `quantidade_prevista` e `unidade_alterada_em`.
- **Resultado:** o % de avanço do serviço não muda; tudo passa a aparecer na unidade nova. Ex.: 44% de 3.200 m → 1.408 m.
- **Se falhar:** tudo em uma transação; nada fica metade em % e metade em metros.
- **Regra:** pacote já fechado também é convertido, mas os `premios` (R$) não mudam.

## Arquivos

- **Capa:** Storage, pastas `obras/<obra_id>/` (foto da obra, logo do cliente) e `config/` (logo da construtora). Todos os perfis liberados leem; só Engenheiro e Coordenador gravam. Foto reduzida a 1200 px (JPEG 0.8); logos a 600 px (logo em PNG continua PNG e mantém a transparência; JPG e WEBP viram JPEG).
- Storage, pasta `ocorrencias/<obra_id>/<ocorrencia_id>/`.
- Imagem comprimida no navegador antes de subir (máx. 1200 px, qualidade 0.8); até 5 fotos por ocorrência.
- O banco guarda o caminho em `ocorrencia_fotos.caminho`.
- Só quem pode ver a ocorrência consegue abrir a foto.

## Critérios de aceite

- [ ] Usuário recém-cadastrado ("Aguardando") não enxerga nenhum dado.
- [ ] O Mestre não recebe `valor_premio` nem `custo_orcado` em nenhuma consulta, nem olhando a resposta do servidor.
- [ ] O Cliente recebe o avanço em percentual sem receber o custo de nenhum serviço.
- [ ] O Cliente não lê `pcp_atividades`, `restricoes`, `presencas`, `pacotes` nem `premios`.
- [ ] O Cliente vê todas as ocorrências da obra dele e nenhuma de outra obra.
- [ ] O Mestre não consegue alterar uma baixa ou um efetivo de dois dias atrás.
- [ ] Só o Engenheiro apaga; o Coordenador não consegue apagar nada.
- [ ] Dar baixa numa atividade com quantidade menor que a planejada sem motivo é recusado.
- [ ] A baixa atualiza `servicos.quantidade_executada` e `pacotes.quantidade_executada` sozinha.
- [ ] Reimportar o mesmo XML não duplica serviços e não apaga produção, custo nem unidade.
- [ ] Trocar % por quantidade mantém o % de avanço do serviço igual ao de antes da troca.
- [ ] Com um serviço sem custo, o avanço da obra é ponderado por duração e a função informa isso.
- [ ] Uma dependência circular faz o recálculo falhar sem gravar nada.
- [ ] O fechamento da folha soma exatamente o `valor_premio` de cada pacote concluído entre os funcionários.
- [ ] Os valores de todas as listas fechadas são idênticos aos da interface.
- [ ] Todo campo obrigatório recusa cadastro vazio.

## Reserva para a Versão 2 (não construir agora)

- `custos_realizados` (importados do Sienge por serviço/EAP, por mês).
- `funcionario_documentos` (ASO, NRs, validade) e aptidão.
- `materiais`, `recebimentos` (nº NF, nº pedido/solicitação Sienge, quantidade, foto; sem valor), `consumos`.

## A conta que vai chegar depois

- `[PENDENTE: digitar o custo orçado de cada serviço]` — até todos terem custo, o avanço da obra é ponderado por duração.
- `[PENDENTE: apropriação de custo no Sienge por serviço/EAP]` — necessária para a Versão 2 responder "qual atividade custou mais que o previsto".
- `[PENDENTE: armazenamento de fotos]` — 1 GB grátis no Supabase; depois, plano pago (cerca de US$ 25/mês).
