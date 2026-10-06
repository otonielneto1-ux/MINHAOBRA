// Pacotes de produção e prêmio na folha (PRD-BACKEND, "Fechamento dos pacotes na folha").
// Um pacote tem vários serviços, cada um com a sua meta e a sua MO profissional e MO ajudante (R$ de ORÇAMENTO);
// MO total = soma. Prêmio pago = MO orçada × % pago do pacote. Só conclui quando TODOS os serviços batem a meta.
// Meta sugerida = previsto no cronograma entre o início do pacote e o dia 20 (segunda a sexta), editável.
// No dia 21 o app pergunta se o pacote continua no período seguinte (renovação).
// A MO profissional paga vai para os colaboradores profissionais e a MO ajudante paga para os serventes, cada
// parte dividida EM PARTES IGUAIS entre os escolhidos (decidido em 05/10/2026: R$ 3.000 e 2 pedreiros = R$ 1.500
// cada); os centavos que sobram vão um a um para os primeiros (menor id). Os dias de presença são só informação.
// Quem entrou no pacote depois do início (troca de pacote no meio do mês) recebe a parte igual × dias úteis em que
// esteve ÷ dias úteis do pacote; o resto fica com quem estava desde o início.
// Pacote que fecha PAUSADO paga proporcional: prêmio × % executado da meta (decidido em 05/10/2026).
// A mesma conta roda no banco (função fechar_pacotes): mudou uma, mude a outra.

import { FUNCOES_AJUDANTE, PACOTE, PRESENTE, STATUS_PACOTE_MANUAL, TIPOS_COM_PREMIO } from './vocabulario.js'
import { arredondar, lerNumero } from './formato.js'
import { diasUteisEntre, somarDias } from './datas.js'
import { validarCusto } from './cronograma.js'


// Divide um valor em partes iguais entre os funcionários (ordem de id); os centavos que sobram vão um
// para cada, a partir do primeiro. Devolve [{ funcionario_id, valor }].
export function dividirIgual(valor, ids) {
  const ordem = [...new Set(ids)].sort((a, b) => a - b)
  if (!ordem.length) return []
  const centavos = Math.round(Number(valor) * 100)
  const base = Math.floor(centavos / ordem.length)
  const resto = centavos - base * ordem.length
  return ordem.map((funcionario_id, k) => ({ funcionario_id, valor: (base + (k < resto ? 1 : 0)) / 100 }))
}

// Divide uma parte do prêmio entre os colaboradores dela (centavos, em inteiros como o banco).
// pago: o que a parte paga no fechamento (pode ser 0); cheio: a parte a 100% (base de quem saiu).
// membros: [{ funcionario_id, cheio (desde o início), du (dias úteis no pacote), saiu, pctSaida }]; n = membros.
//   quem saiu do pacote pausado: round(cheio × du × pctSaida ÷ (diasPacote × n × 100)) — garantido, mesmo que o
//     pacote depois não pague;
//   quem entrou depois do início: round(pago × du ÷ (diasPacote × n));
//   o resto (pago − esses, mínimo 0) em partes iguais (dividirIgual) para quem está desde o início e ficou; se não
//   há, para quem ficou; se ninguém ficou, para quem saiu.
// Devolve [{ funcionario_id, valor }] sem os zerados. Mesma conta de fechar_pacotes no banco.
export function dividirParte(pago, cheio, membros, diasPacote) {
  if (!membros.length) return []
  const n = BigInt(membros.length)
  const D = BigInt(diasPacote || 1)
  const du = (m) => BigInt(diasPacote ? m.du : 1)
  const T = centesimos(pago)
  const C = centesimos(cheio)
  const arred = (num, den) => (2n * num + den) / (2n * den)
  const fixo = (m) => (m.saiu ? arred(C * du(m) * centesimos(m.pctSaida), D * n * 10000n) : m.cheio ? 0n : arred(T * du(m), D * n))
  const grupo = (m) => (m.cheio && !m.saiu ? 1 : m.saiu ? 3 : 2)
  const recebe = Math.min(...membros.map(grupo))
  const cent = new Map(membros.map((m) => [m.funcionario_id, fixo(m)]))
  const fixos = [...cent.values()].reduce((t, c) => t + c, 0n)
  const resto = T > fixos ? T - fixos : 0n
  for (const l of dividirIgual(Number(resto) / 100, membros.filter((m) => grupo(m) === recebe).map((m) => m.funcionario_id))) {
    cent.set(l.funcionario_id, cent.get(l.funcionario_id) + BigInt(Math.round(l.valor * 100)))
  }
  return [...cent].sort((a, b) => a[0] - b[0]).filter(([, c]) => c > 0n).map(([funcionario_id, c]) => ({ funcionario_id, valor: Number(c) / 100 }))
}

// Servente recebe da MO ajudante; as demais funções, da MO profissional.
export const ehAjudante = (f) => FUNCOES_AJUDANTE.includes(f?.funcao)

// Um pacote só paga prêmio se TODOS os serviços bateram 100% da meta.
export function pacoteBateuMeta(pacote) {
  return pacote.servicos.length > 0 && pacote.servicos.every((s) => Number(s.quantidade_executada) >= Number(s.quantidade_meta))
}

// % de um serviço do pacote (pode passar de 100) e do pacote: média dos serviços, cada um limitado a 100.
export const pctServicoDoPacote = (s) => (Number(s.quantidade_meta) ? (Number(s.quantidade_executada) / Number(s.quantidade_meta)) * 100 : 0)
export function pctPacote(p) {
  if (!p.servicos.length) return 0
  return p.servicos.reduce((t, s) => t + Math.min(100, pctServicoDoPacote(s)), 0) / p.servicos.length
}

// Soma das MO ORÇADAS dos serviços do pacote (só para quem vê dinheiro: o Mestre recebe os serviços sem MO).
export function valoresDoPacote(p) {
  const soma = (k) => arredondar(p.servicos.reduce((t, s) => t + Number(s[k] || 0), 0), 2)
  return { profissional: soma('mo_profissional'), ajudante: soma('mo_ajudante'), total: soma('mo_profissional') + soma('mo_ajudante') }
}

// Prêmio que será PAGO: cada parte orçada × % pago × % do prêmio (100, ou o executado de um pacote pausado),
// em centavos (igual ao banco: round(MO × pct_pago × pct ÷ 100) centavos).
// A conta é feita em inteiros (centavos × centésimos de %) para arredondar igual ao numeric do banco: em ponto
// flutuante, MO 1.045,60 × 15% × 12,5% dava 19,60 aqui e 19,61 no banco.
const centesimos = (v) => BigInt(Math.round(Number(v) * 100))
export function premioReal(p, pct = 100) {
  const orcado = valoresDoPacote(p)
  const base = 10n ** 8n
  const parte = (v) => Number((2n * centesimos(v) * centesimos(p.pct_pago) * centesimos(pct) + base) / (2n * base)) / 100
  const profissional = parte(orcado.profissional)
  const ajudante = parte(orcado.ajudante)
  return { profissional, ajudante, total: arredondar(profissional + ajudante, 2) }
}

// Quanto do prêmio o pacote paga no fechamento, em %: bateu a meta = 100; pausado = o % executado (2 casas,
// como o banco); senão = 0.
export function fatorDoPremio(p) {
  if (pacoteBateuMeta(p)) return 100
  // ponytail: o + 1e-9 corrige o ruído do ponto flutuante na meia-casa (12,345 → 12,35, como o banco); limite: só
  // erra se o % real estiver a menos de 1e-9 da meia-casa.
  return p.status === PACOTE.PAUSADO ? arredondar(pctPacote(p) + 1e-9, 2) : 0
}

// % do prêmio na prévia de um pacote aberto: pausado = o que pagaria se fechasse assim; senão, "se bater a meta".
export const pctPrevisto = (p) => (p.status === PACOTE.PAUSADO ? fatorDoPremio(p) : 100)

// Quem pode ser marcado como colaborador: ativo e de mão de obra própria.
export const elegiveisAoPacote = (funcionarios) => funcionarios.filter((f) => f.ativo && TIPOS_COM_PREMIO.includes(f.tipo_mao_obra))

// Ao mudar as datas do pacote, a meta acompanha a nova sugestão do cronograma, a não ser que tenha sido editada.
export const metaAoMudarData = (item, sugerida) => ({
  ...item, meta_cronograma: sugerida, quantidade_meta: metaEditada({ ...item, quantidade_meta: lerNumero(item.quantidade_meta) }) ? item.quantidade_meta : sugerida ?? '',
})

// Meta sugerida de um serviço no pacote: quanto o cronograma atual prevê entre `inicio` e `fim`,
// repartindo a quantidade prevista igual pelos dias de segunda a sexta do serviço.
export function metaDoCronograma(servico, inicio, fim) {
  const total = diasUteisEntre(servico.inicio_previsto, servico.fim_previsto, false)
  if (!total) return 0
  return arredondar((Number(servico.quantidade_prevista) * diasDoServicoNoPeriodo(servico, inicio, fim)) / total, servico.unidade === '%' ? 1 : 2)
}

// Dias de trabalho (segunda a sexta) em que o cronograma prevê o serviço dentro do período do pacote.
export function diasDoServicoNoPeriodo(servico, inicio, fim) {
  const de = inicio > servico.inicio_previsto ? inicio : servico.inicio_previsto
  const ate = fim < servico.fim_previsto ? fim : servico.fim_previsto
  return ate < de ? 0 : diasUteisEntre(de, ate, false)
}

// Produção média por dia para cumprir a meta nos dias que o cronograma prevê no período (null sem dias).
export function ritmoDaMeta(servico, inicio, fim, meta) {
  const dias = diasDoServicoNoPeriodo(servico, inicio, fim)
  return { dias, porDia: dias ? arredondar(Number(meta) / dias, servico.unidade === '%' ? 1 : 2) : null }
}

// A meta foi mudada à mão (diferente da sugerida pelo cronograma)? A tela deixa em destaque.
export const metaEditada = (item) => item.meta_cronograma !== null && item.meta_cronograma !== undefined
  && Math.abs(Number(item.quantidade_meta) - Number(item.meta_cronograma)) > 0.0005

// Dias de trabalho (segunda a sexta) de amanhã até o fechamento: os alertas saem com 7 e com 3.
export const diasUteisAteFechamento = (p, hoje) => diasUteisEntre(somarDias(hoje, 1), p.data_fechamento, false)

// Pergunta do dia 21: pacotes cujo fechamento já passou e que ainda não têm resposta (continua ou não).
export const renovacoesPendentes = (pacotes, hoje) => pacotes.filter((p) => p.data_fechamento < hoje && (p.continua === null || p.continua === undefined))

// Campos do pacote do período seguinte (para o formulário de renovação): mesmos serviços que ainda têm o que
// fazer, metas novas do cronograma, mesmas MO, colaboradores e % pago.
export function camposDaRenovacao(p, servicos, diaFolha) {
  const inicio = somarDias(p.data_fechamento, 1)
  const fim = proximoFechamento(inicio, diaFolha)
  const itens = p.servicos
    .map((x) => ({ x, s: servicos.find((y) => y.id === x.servico_id) }))
    .filter(({ s }) => s && !s.cancelado && !s.fim_real && Number(s.quantidade_executada) < Number(s.quantidade_prevista))
    .map(({ x, s }) => {
      const meta = metaDoCronograma(s, inicio, fim)
      return { servico_id: s.id, quantidade_meta: meta, meta_cronograma: meta, mo_profissional: x.mo_profissional ?? '', mo_ajudante: x.mo_ajudante ?? '' }
    })
  return {
    nome: p.nome, local: p.local, data_inicio: inicio, data_fechamento: fim, status: STATUS_PACOTE_MANUAL[1],
    pct_pago: p.pct_pago, itens, colaboradores: p.colaboradores.filter((id) => !p.saidas?.[id]), renovado_de_id: p.id,
  }
}

// Colaboradores do pacote que recebem cada parte (mão de obra própria; servente = ajudante).
export function colaboradoresPorParte(p, funcionarios) {
  const escolhidos = p.colaboradores.map((id) => funcionarios.find((f) => f.id === id))
    .filter((f) => f && TIPOS_COM_PREMIO.includes(f.tipo_mao_obra))
  return { profissional: escolhidos.filter((f) => !ehAjudante(f)), ajudante: escolhidos.filter(ehAjudante) }
}

// Saída do pacote pausado (levado para outro): { saiu_em, pct_saida } ou null.
export const saidaDe = (p, id) => p.saidas?.[id] ?? null

// Desde quando o colaborador conta no pacote: null = desde o início.
export const entrouEm = (p, id) => {
  const e = p.entradas?.[id]
  return e && e > p.data_inicio ? e : null
}

// Data de entrada de um colaborador marcado no formulário do pacote: quem já estava mantém a sua; quem é marcado
// num pacote que já começou entra hoje; num pacote novo, todos desde o início (null).
export const entradaNoFormulario = (atual, id, inicio, hoje) => (atual?.colaboradores.includes(id)
  ? atual.entradas?.[id] ?? null
  : atual && hoje && hoje > inicio ? hoje : null)

// Prêmio de um pacote: cada parte paga (profissional, ajudante) × pct (100 = bateu a meta; 0 = não paga) dividida
// em partes iguais entre os colaboradores daquela parte, com as regras de quem entrou depois e de quem saiu do
// pacote pausado (dividirParte). dias = presenças no pacote no período (só informação, vai na planilha).
// Devolve { linhas: [{ funcionario_id, dias, valor, parte }], avisos }.
export function premioDoPacote(p, presencas, funcionarios, pct = 100) {
  const valores = premioReal(p, pct)
  const cheios = premioReal(p, 100)
  const porParte = colaboradoresPorParte(p, funcionarios)
  const diasPacote = diasUteisEntre(p.data_inicio, p.data_fechamento, false)
  const membro = (f) => {
    const e = entrouEm(p, f.id)
    const s = saidaDe(p, f.id)
    return { funcionario_id: f.id, cheio: !e, du: e ? diasUteisEntre(e, p.data_fechamento, false) : diasPacote, saiu: !!s, pctSaida: s?.pct_saida ?? 0 }
  }
  const dias = (id) => presencas.filter((x) => x.pacote_id === p.id && x.funcionario_id === id && x.situacao === PRESENTE
    && x.data >= p.data_inicio && x.data <= p.data_fechamento).length
  const linhas = []
  const avisos = []
  for (const parte of ['profissional', 'ajudante']) {
    if (!(cheios[parte] > 0)) continue
    if (porParte[parte].length === 0) {
      if (valores[parte] > 0) avisos.push(`Pacote ${p.nome}: a MO ${parte} não tem nenhum colaborador ${parte === 'ajudante' ? 'servente' : 'profissional'} escolhido.`)
      continue
    }
    linhas.push(...dividirParte(valores[parte], cheios[parte], porParte[parte].map(membro), diasPacote).map((l) => ({ funcionario_id: l.funcionario_id, dias: dias(l.funcionario_id), valor: l.valor, parte })))
  }
  return { linhas, avisos }
}

// Pacote novo ou editado (PRD-FRONTEND, "Campos do pacote").
// campos: { nome, local, data_inicio, data_fechamento, status, itens: [{ servico_id, quantidade_meta, mo_profissional,
// mo_ajudante }], colaboradores: [funcionario_id] }. servicos: os do cronograma. atual: o pacote em edição (ou null).
// Colaborador novo num pacote que já começou entra hoje (recebe proporcional aos dias); quem já estava mantém a data.
// Devolve { registro, itens, colaboradores: [{ funcionario_id, entrou_em }] } prontos para gravar, ou { erro }.
export function validarPacote(campos, { servicos, atual = null, hoje = null }) {
  if (atual?.fechado_em) return { erro: 'Pacote fechado na folha não pode ser editado.' }
  if (!campos.nome?.trim()) return { erro: 'Dê um nome ao pacote.' }
  if (!campos.local?.trim()) return { erro: 'Informe o local.' }
  if (!campos.itens?.length) return { erro: 'Inclua pelo menos um serviço no pacote.' }
  const itens = []
  for (const it of campos.itens) {
    const s = servicos.find((x) => x.id === Number(it.servico_id))
    if (!s) return { erro: 'Escolha o serviço de cada linha.' }
    if (s.e_resumo || s.cancelado) return { erro: `"${s.nome}" não recebe produção.` }
    if (itens.some((x) => x.servico_id === s.id)) return { erro: `"${s.nome}" está duas vezes no pacote.` }
    const meta = lerNumero(it.quantidade_meta)
    if (!(meta > 0)) return { erro: `Informe a quantidade-meta de "${s.nome}".` }
    const prof = validarCusto(it.mo_profissional)
    const ajud = validarCusto(it.mo_ajudante)
    if (prof.erro || ajud.erro) return { erro: `Valor de MO inválido em "${s.nome}".` }
    const sugerida = it.meta_cronograma === '' || it.meta_cronograma === null || it.meta_cronograma === undefined ? null : Number(it.meta_cronograma)
    itens.push({ servico_id: s.id, quantidade_meta: meta, meta_cronograma: sugerida, mo_profissional: prof.custo ?? 0, mo_ajudante: ajud.custo ?? 0 })
  }
  if (!itens.some((x) => x.mo_profissional + x.mo_ajudante > 0)) return { erro: 'Informe a MO orçada de pelo menos um serviço.' }
  const pct = lerNumero(campos.pct_pago)
  if (!(pct > 0 && pct <= 100)) return { erro: 'Informe o % pago sobre o orçamento (de 1 a 100).' }
  const saiu = (atual?.servicos || []).find((x) => Number(x.quantidade_executada) > 0 && !itens.some((y) => y.servico_id === x.servico_id))
  if (saiu) return { erro: 'Um serviço com produção lançada não pode sair do pacote.' }
  if (!campos.data_inicio || !campos.data_fechamento) return { erro: 'Informe as datas de início e de fechamento.' }
  if (campos.data_fechamento < campos.data_inicio) return { erro: 'O fechamento não pode ser antes do início.' }
  const pausado = atual?.status === PACOTE.PAUSADO && campos.status === PACOTE.PAUSADO
  if (!pausado && !STATUS_PACOTE_MANUAL.includes(campos.status)) return { erro: 'Escolha o status (Planejado, Liberado ou Em execução).' }
  return {
    registro: {
      nome: campos.nome.trim(), local: campos.local.trim(), data_inicio: campos.data_inicio, data_fechamento: campos.data_fechamento,
      status: campos.status, pct_pago: pct, renovado_de_id: campos.renovado_de_id ?? null,
    },
    itens,
    // Quem saiu do pacote pausado fica (o garantido dele não some); o banco também não apaga.
    colaboradores: [...new Set([...(campos.colaboradores || []).map(Number), ...Object.keys(atual?.saidas || {}).map(Number)])].map((id) => ({
      funcionario_id: id, entrou_em: entradaNoFormulario(atual, id, campos.data_inicio, hoje),
    })),
  }
}

// Pausar o pacote inteiro: problema (motivo da lista) e data, do início do pacote até hoje.
export function validarPausa({ motivo, data }, p, hoje) {
  if (p.fechado_em) return { erro: 'Pacote fechado na folha não pode ser pausado.' }
  if (!motivo) return { erro: 'Escolha o problema que parou o pacote.' }
  if (!data || data > hoje || data < p.data_inicio) return { erro: 'A data da pausa vai do início do pacote até hoje.' }
  return { motivo, data }
}

// Para onde a equipe pode ir a partir de `data`: pacote aberto, não pausado, outro, que ainda não fechou.
export const destinosPossiveis = (pacotes, origem, data) => pacotes.filter((p) => p.id !== origem.id && !p.fechado_em
  && p.status !== PACOTE.PAUSADO && (!data || data <= p.data_fechamento))

// Primeiro dia em que a equipe pode sair do pacote: o dia da pausa (pausa = a que está sendo lançada junto; sem ela, a
// pausa_desde da origem). Mesma regra de remanejar_colaboradores no banco.
export const saidaDesde = (origem, pausa) => pausa || origem.pausa_desde || null

// obrigatorio: só levar a equipe (pacote já pausado); senão o destino é opcional e sem destino devolve null.
export function validarRemanejo({ destino, colaboradores, data, pausa }, pacotes, origem, obrigatorio = false) {
  if (!destino) return obrigatorio ? { erro: 'Escolha o pacote de destino.' } : null
  if (!data) return { erro: 'Informe a data em que a equipe entra no outro pacote.' }
  const desde = saidaDesde(origem, pausa)
  if (desde && data < desde) return { erro: 'A equipe só sai do pacote pausado a partir do dia da pausa.' }
  if (!destinosPossiveis(pacotes, origem, data).some((p) => p.id === Number(destino))) return { erro: 'Escolha um pacote aberto e não pausado.' }
  if (!colaboradores?.length) return { erro: 'Escolha quem vai para o outro pacote.' }
  return { destino: Number(destino), colaboradores, data }
}

// Próximo dia de fechamento da folha a partir de hoje (dia 31 em mês curto = último dia do mês).
export function proximoFechamento(hoje, diaFolha) {
  const [a, m] = hoje.split('-').map(Number)
  const este = fechamentoNoMes(a, m, diaFolha)
  return este >= hoje ? este : fechamentoNoMes(m === 12 ? a + 1 : a, m === 12 ? 1 : m + 1, diaFolha)
}

// Dia de fechamento da folha num mês (dia 31 em mês curto = último dia do mês).
function fechamentoNoMes(ano, mes, diaFolha) {
  const ultimo = new Date(ano, mes, 0).getDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(diaFolha, ultimo)).padStart(2, '0')}`
}

// Fechamento da folha do mês de `hoje` (data sugerida na tela de fechamento).
export const fechamentoDoMes = (hoje, diaFolha) => fechamentoNoMes(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), diaFolha)

// Prévia do fechamento até `data`: o que fecha (bateu a meta, pausado — paga proporcional — ou não), o prêmio de
// cada funcionário e o que impede fechar (parte do prêmio sem nenhum colaborador daquela parte).
export function previaFechamento({ pacotes, presencas, funcionarios, data }) {
  const aFechar = pacotes.filter((p) => !p.fechado_em && p.data_fechamento <= data)
  const linhas = []
  const avisos = []
  const resumo = aFechar.map((p) => {
    const bate = pacoteBateuMeta(p)
    const pausado = !bate && p.status === PACOTE.PAUSADO
    // Pausado fecha com o problema da pausa; só o que não bateu e não está pausado pede o motivo.
    return { pacote: p, bate, pausado, pct: fatorDoPremio(p), pedeMotivo: !bate && !pausado }
  })
  // Pacote que não paga ainda gera linha para quem saiu dele pausado (proporcional garantido).
  for (const { pacote: p, pct } of resumo) {
    const r = premioDoPacote(p, presencas, funcionarios, pct)
    avisos.push(...r.avisos)
    linhas.push(...r.linhas.map((l) => ({ ...l, pacote: p.nome })))
  }
  return {
    pacotes: resumo,
    linhas, avisos, total: arredondar(linhas.reduce((t, l) => t + l.valor, 0), 2),
  }
}

// ── Ajuste do prêmio e Resumo por funcionário ──
// Ajuste: acréscimo (positivo) ou desconto (negativo) em R$ para um funcionário, numa data de folha, com motivo.
export function validarAjustePremio({ funcionario_id, valor, motivo, data_folha }) {
  if (!funcionario_id) return { erro: 'Escolha o funcionário.' }
  if (!data_folha) return { erro: 'Informe a data da folha.' }
  const v = lerNumero(valor)
  if (!Number.isFinite(v) || v === 0) return { erro: 'Informe o valor do ajuste (negativo para desconto).' }
  if (!motivo?.trim()) return { erro: 'Informe o motivo do ajuste.' }
  return { registro: { funcionario_id: Number(funcionario_id), valor: arredondar(v, 2), motivo: motivo.trim(), data_folha } }
}

// Ajustes no formato da planilha (entram como uma linha "Ajuste: motivo").
export const linhasDosAjustes = (ajustes) => ajustes.map((a) => ({ funcionario_id: a.funcionario_id, dias: 0, valor: Number(a.valor), pacote: `Ajuste: ${a.motivo}` }))

// Os pacotes e os ajustes de uma folha: os do mesmo mês da data da folha.
const mesmoMes = (data, dataFolha) => data.slice(0, 7) === dataFolha.slice(0, 7)
const daFolha = (p, dataFolha) => mesmoMes(p.data_fechamento, dataFolha)
export const ajustesDaFolha = (ajustes, dataFolha) => ajustes.filter((a) => mesmoMes(a.data_folha, dataFolha))

// Resumo da folha por funcionário: cada pacote dele (valor pago se fechado; senão o previsto: se bater a meta, se
// fechar pausado, ou o proporcional garantido de quem saiu), os ajustes e o total. Mais pacotes primeiro, depois nome.
export function resumoDaFolha({ pacotes, funcionarios, premios, ajustes, dataFolha }) {
  const daData = pacotes.filter((p) => daFolha(p, dataFolha))
  const ajustesDaData = ajustesDaFolha(ajustes, dataFolha)
  const previstos = new Map(daData.filter((p) => !p.fechado_em).map((p) => [p.id, premioDoPacote(p, [], funcionarios, pctPrevisto(p)).linhas]))
  const ids = new Set([...daData.flatMap((p) => p.colaboradores), ...ajustesDaData.map((a) => a.funcionario_id)])
  return [...ids].map((id) => funcionarios.find((f) => f.id === id)).filter(Boolean).map((f) => {
    const itens = daData.filter((p) => p.colaboradores.includes(f.id)).map((p) => {
      const saida = saidaDe(p, f.id)
      const valor = p.fechado_em
        ? Number(premios.find((x) => x.pacote_id === p.id && x.funcionario_id === f.id)?.valor ?? 0)
        : previstos.get(p.id).filter((l) => l.funcionario_id === f.id).reduce((t, l) => t + l.valor, 0)
      const situacao = p.fechado_em ? 'pago na folha'
        : saida ? `saiu com ${Number(saida.pct_saida)}% da meta (garantido)`
          : p.status === PACOTE.PAUSADO ? 'se fechar pausado' : 'se bater a meta'
      return { pacote: p, valor, situacao, entrou_em: entrouEm(p, f.id), saida }
    })
    const seus = ajustesDaData.filter((a) => a.funcionario_id === f.id)
    const total = arredondar(itens.reduce((t, i) => t + i.valor, 0) + seus.reduce((t, a) => t + Number(a.valor), 0), 2)
    return { funcionario: f, itens, ajustes: seus, total }
  }).sort((a, b) => b.itens.length - a.itens.length || a.funcionario.nome.localeCompare(b.funcionario.nome, 'pt-BR'))
}

// Prêmios já gravados (tabela premios) no formato da planilha: um por funcionário e pacote.
export function linhasDosPremios(premios, pacotes) {
  return premios.map((p) => ({ funcionario_id: p.funcionario_id, dias: p.dias, valor: Number(p.valor), pacote: pacotes.find((x) => x.id === p.pacote_id)?.nome || '' }))
}

// Fechamentos anteriores: pacotes já fechados, agrupados pela data de fechamento (o mais recente primeiro).
export function fechamentosAnteriores(pacotes) {
  const grupos = {}
  for (const p of pacotes.filter((x) => x.fechado_em)) (grupos[p.data_fechamento] ??= []).push(p)
  return Object.entries(grupos).map(([data, lista]) => ({ data, pacotes: lista })).sort((a, b) => b.data.localeCompare(a.data))
}

// Planilha para a folha (abre no Excel): uma linha por funcionário e pacote, depois o total de cada
// funcionário e o total geral. Separador ";" e vírgula decimal, como o Excel em português espera.
export function planilhaPremios(linhas, funcionarios) {
  const func = (id) => funcionarios.find((f) => f.id === id) || {}
  const valor = (v) => arredondar(v, 2).toFixed(2).replace('.', ',')
  const campo = (t) => (/[";\n]/.test(String(t)) ? `"${String(t).replace(/"/g, '""')}"` : String(t))
  const linha = (cols) => cols.map(campo).join(';')
  const ordenadas = [...linhas].sort((a, b) => (func(a.funcionario_id).nome || '').localeCompare(func(b.funcionario_id).nome || '', 'pt-BR'))
  const saida = [linha(['Funcionário', 'Matrícula', 'Função', 'Pacote', 'Dias', 'Valor (R$)'])]
  for (const l of ordenadas) {
    const f = func(l.funcionario_id)
    saida.push(linha([f.nome || '', f.matricula || '', f.funcao || '', l.pacote, l.dias, valor(l.valor)]))
  }
  saida.push('', linha(['Total por funcionário', 'Matrícula', '', '', 'Dias', 'Valor (R$)']))
  const porFunc = new Map()
  for (const l of ordenadas) {
    const t = porFunc.get(l.funcionario_id) || { dias: 0, valor: 0 }
    porFunc.set(l.funcionario_id, { dias: t.dias + l.dias, valor: t.valor + l.valor })
  }
  for (const [id, t] of porFunc) saida.push(linha([func(id).nome || '', func(id).matricula || '', '', '', t.dias, valor(t.valor)]))
  saida.push('', linha(['Total geral', '', '', '', '', valor(linhas.reduce((t, l) => t + l.valor, 0))]))
  return saida.join('\r\n')
}

// Quem trabalhou no pacote e quantos dias (presenças "Presente" ligadas a ele), mais dias primeiro.
export function diasPorFuncionario(presencas) {
  const dias = new Map()
  for (const x of presencas) if (x.situacao === PRESENTE) dias.set(x.funcionario_id, (dias.get(x.funcionario_id) || 0) + 1)
  return [...dias].map(([funcionario_id, d]) => ({ funcionario_id, dias: d })).sort((a, b) => b.dias - a.dias || a.funcionario_id - b.funcionario_id)
}
