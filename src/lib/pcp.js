// Regras do PCP (planejamento da semana). PLANO-DO-PROJETO.md, "4a. PCP".

import { GRUPOS_MOTIVO, STATUS_PCP, STATUS_RESTRICAO, TIPOS_RESTRICAO } from './vocabulario.js'
import { diasDaSemana, diasEntre, diasUteisEntre, inicioDoMesAnterior, segundaDaSemana, somarDias } from './datas.js'
import { diasAtraso } from './avanco.js'
import { lerNumero } from './formato.js'

// Decide o resultado de uma baixa. Devolve { status, motivo } ou { erro }.
// A mesma regra roda no banco (função dar_baixa): mudou uma, mude a outra.
export function resultadoBaixa(planejada, executada, motivo, equipe) {
  const exec = Number(executada)
  if (executada === '' || executada === null || executada === undefined || Number.isNaN(exec) || exec < 0) {
    return { erro: 'Informe quanto foi executado.' }
  }
  if (!equipe?.trim()) return { erro: 'Informe a equipe que fez a atividade.' }
  if (exec >= Number(planejada)) return { status: STATUS_PCP.CONCLUIDA, motivo: null }
  if (!motivo) return { erro: 'Escolha o motivo de não concluir.' }
  return { status: STATUS_PCP.NAO_CONCLUIDA, motivo }
}

// Meta de PPC (proposta; "Decidir depois de usar").
export const META_PPC = 80

// Cor do PPC: na meta = ok; até 20 pontos abaixo = atenção; mais que isso = crítico.
export function tomPpc(pct) {
  if (pct === null || pct === undefined) return 'neutral'
  if (pct >= META_PPC) return 'ok'
  if (pct >= META_PPC - 20) return 'warn'
  return 'crit'
}

// PPC — a única regra do app (Início, Semana, histórico):
// dia que já passou sem baixa conta como não concluído; hoje só conta se já teve baixa; futuro não conta.
export function ppcAte(atividades, hoje) {
  const contam = atividades.filter((a) => a.data_prevista < hoje || (a.data_prevista === hoje && a.status !== STATUS_PCP.PLANEJADA))
  const concluidas = contam.filter((a) => a.status === STATUS_PCP.CONCLUIDA).length
  return { concluidas, base: contam.length, pct: contam.length ? Math.round((concluidas / contam.length) * 100) : null }
}

// PPC do mês de `hoje` (soma de todas as atividades com data no mês), o do mês anterior,
// a variação em pontos, quanto falta para a meta e o PPC de cada semana que toca o mês
// (semana inteira, para bater com a tela Semana).
export function ppcDoMes(atividades, hoje) {
  const mes = hoje.slice(0, 7)
  const anterior = inicioDoMesAnterior(hoje).slice(0, 7)
  const doMes = atividades.filter((x) => x.data_prevista.slice(0, 7) === mes)
  const atual = ppcAte(doMes, hoje)
  const passado = ppcAte(atividades.filter((x) => x.data_prevista.slice(0, 7) === anterior), hoje)
  const semanas = [...new Set(doMes.map((x) => x.semana_inicio))].sort()
  return {
    mes,
    mesAnterior: anterior,
    atual,
    anterior: passado,
    variacao: atual.pct !== null && passado.pct !== null ? atual.pct - passado.pct : null,
    abaixoDaMeta: atual.pct === null ? null : Math.max(0, META_PPC - atual.pct),
    semanas: semanas.map((s) => ({ semana_inicio: s, ...ppcAte(atividades.filter((x) => x.semana_inicio === s), hoje) })),
  }
}

// O mestre só mexe numa baixa até o fim do dia seguinte à data da atividade.
export function mestrePodeAlterar(dataPrevista, hoje) {
  return diasEntre(dataPrevista, hoje) <= 1
}

// Quanto falta de uma atividade não concluída (vai para a semana seguinte).
export function saldoPendente(atividade) {
  return Math.max(0, Number(atividade.quantidade_planejada) - Number(atividade.quantidade_executada || 0))
}

// Serviços que começam ou continuam entre `de` e `ate` e ainda não terminaram (plano de 3 meses).
export function servicosNoPeriodo(servicos, de, ate) {
  return servicos.filter((s) => !s.e_resumo && !s.cancelado && !s.fim_real
    && s.inicio_previsto <= ate && s.fim_previsto >= de)
}

// Contagem de motivos de não conclusão, do mais frequente para o menos.
export function contarMotivos(atividades) {
  const conta = {}
  for (const a of atividades) {
    if (a.status === STATUS_PCP.NAO_CONCLUIDA && a.motivo_nao_conclusao) {
      conta[a.motivo_nao_conclusao] = (conta[a.motivo_nao_conclusao] || 0) + 1
    }
  }
  return Object.entries(conta)
    .map(([motivo, total]) => ({ motivo, total }))
    .sort((a, b) => b.total - a.total)
}

// Grupo macro de uma causa ("Chuva" → "Condição climática"); causa fora da lista vai para "Outros".
export function grupoDoMotivo(motivo) {
  return Object.keys(GRUPOS_MOTIVO).find((g) => GRUPOS_MOTIVO[g].includes(motivo)) || 'Outros'
}

// Gráfico de pizza de um mês ('AAAA-MM'): atividades não concluídas com data no mês, por grupo macro,
// cada grupo com as suas causas (para mostrar ao passar o mouse). Maior grupo primeiro.
export function motivosPorGrupo(atividades, mes) {
  const grupos = {}
  for (const a of atividades) {
    if (a.status !== STATUS_PCP.NAO_CONCLUIDA || !a.motivo_nao_conclusao || a.data_prevista.slice(0, 7) !== mes) continue
    const g = grupoDoMotivo(a.motivo_nao_conclusao)
    grupos[g] ??= {}
    grupos[g][a.motivo_nao_conclusao] = (grupos[g][a.motivo_nao_conclusao] || 0) + 1
  }
  return Object.entries(grupos)
    .map(([grupo, causas]) => ({
      grupo,
      total: Object.values(causas).reduce((t, n) => t + n, 0),
      causas: Object.entries(causas).map(([motivo, total]) => ({ motivo, total })).sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total)
}

// ── Montar a semana ────────────────────────────────────────────────────────

// Arredonda a quantidade sugerida: % com 1 casa, as demais unidades com 2.
const arredondar = (v, unidade) => {
  const casas = unidade === '%' ? 10 : 100
  return Math.max(1 / casas, Math.round(v * casas) / casas)
}

// Atividade nova ou editada (PRD-FRONTEND, "Campos da atividade"). Devolve { registro } ou { erro }.
export function validarAtividade(campos, { servico, pacote, segunda }) {
  if (!servico) return { erro: 'Escolha o serviço.' }
  if (servico.e_resumo || servico.cancelado) return { erro: 'Esse serviço não recebe atividade.' }
  const d = campos.data_prevista
  if (!d || d < segunda || d > somarDias(segunda, 5)) return { erro: 'Escolha um dia desta semana (segunda a sábado).' }
  if (!campos.local?.trim()) return { erro: 'Informe o local.' }
  const q = lerNumero(campos.quantidade_planejada)
  if (!(q > 0)) return { erro: 'Informe a quantidade planejada.' }
  if (pacote && (pacote.servico_id !== servico.id || pacote.fechado_em)) return { erro: 'Esse pacote não é deste serviço ou já foi fechado.' }
  return {
    registro: {
      semana_inicio: segunda, data_prevista: d, servico_id: servico.id, local: campos.local.trim(),
      quantidade_planejada: q, equipe: campos.equipe?.trim() || null, pacote_id: pacote?.id ?? null,
    },
  }
}

// A semana é o cronograma recortado em seis dias: cada serviço previsto (e cada atrasado que ainda
// não terminou) é uma linha; cada dia, uma coluna. "Distribuir na semana" reparte o que falta de
// forma igual pelos dias de trabalho até o fim previsto — recupera o atraso sem mexer no prazo final.

// Ritmo necessário acima de 1,5× o melhor ritmo do serviço = irreal ("Decidir depois de usar").
export const FATOR_IRREAL = 1.5
// Serviços que começam até 4 semanas depois desta podem ser sugeridos para antecipar.
export const SEMANAS_ANTECIPAR = 4

const terminou = (s) => !!s.fim_real || Number(s.quantidade_executada) >= Number(s.quantidade_prevista)
const comecou = (s) => !!s.inicio_real || Number(s.quantidade_executada) > 0
const porEap = (a, b) => a.servico.codigo_eap.localeCompare(b.servico.codigo_eap, 'pt-BR', { numeric: true })

// Linhas da tabela da semana: serviços com atividade nesta semana e — da semana atual em diante —
// os previstos no cronograma e os atrasados que ainda não terminaram. Atrasados primeiro (o maior atraso no topo).
export function linhasDaSemana(servicos, atividades, segunda, hoje) {
  const sabado = somarDias(segunda, 5)
  const daSemana = atividades.filter((a) => a.semana_inicio === segunda)
  const naoPassou = sabado >= hoje
  return servicos
    .filter((s) => !s.e_resumo && !s.cancelado)
    .map((s) => ({ servico: s, atraso: terminou(s) ? 0 : diasAtraso(s, hoje), atividades: daSemana.filter((a) => a.servico_id === s.id) }))
    .filter(({ servico: s, atraso, atividades: as }) => as.length > 0
      || (naoPassou && !terminou(s) && s.inicio_previsto <= sabado && (s.fim_previsto >= segunda || atraso > 0)))
    .sort((a, b) => (b.atraso > 0) - (a.atraso > 0) || b.atraso - a.atraso || porEap(a, b))
}

// Plano de 3 meses em tabela: serviços que tocam alguma das semanas, mais os atrasados que ainda
// não terminaram (esses aparecem ativos já na primeira semana: é para fazer agora).
// ativas = semanas (segundas) em que o serviço está previsto. Atrasados primeiro, depois por EAP.
export function linhasTresMeses(servicos, semanas, hoje) {
  const ultimoDia = somarDias(semanas[semanas.length - 1], 5)
  return servicos
    .filter((s) => !s.e_resumo && !s.cancelado && !terminou(s) && s.inicio_previsto <= ultimoDia)
    .map((s) => {
      const atraso = diasAtraso(s, hoje)
      const ativas = semanas.filter((seg) => s.inicio_previsto <= somarDias(seg, 5)
        && (s.fim_previsto >= seg || (atraso > 0 && seg === semanas[0])))
      return { servico: s, atraso, ativas, atividades: [] }
    })
    .filter((l) => l.ativas.length > 0)
    .sort((a, b) => (b.atraso > 0) - (a.atraso > 0) || b.atraso - a.atraso || porEap(a, b))
}

// Última coluna da semana: total previsto do serviço, acumulado executado até antes da semana
// (até o domingo anterior) e acumulado executado até o fim dela.
export function acumuladosDaSemana(servico, producoes, segunda) {
  const doServico = producoes.filter((p) => p.servico_id === servico.id)
  const ate = (dia) => Math.round(doServico.filter((p) => p.data <= dia).reduce((t, p) => t + Number(p.quantidade), 0) * 1000) / 1000
  return { total: Number(servico.quantidade_prevista), anterior: ate(somarDias(segunda, -1)), executado: ate(somarDias(segunda, 6)) }
}

// Melhor média diária do serviço nas 4 semanas completas antes da atual:
// em cada semana, produção ÷ dias em que houve produção. null se não houve produção.
export function melhorRitmo(producoes, servicoId, hoje) {
  const atual = segundaDaSemana(hoje)
  let melhor = null
  for (let i = 1; i <= 4; i++) {
    const de = somarDias(atual, -7 * i)
    const ate = somarDias(de, 6)
    const daSemana = producoes.filter((p) => p.servico_id === servicoId && p.data >= de && p.data <= ate)
    const dias = new Set(daSemana.filter((p) => Number(p.quantidade) > 0).map((p) => p.data)).size
    if (!dias) continue
    const media = daSemana.reduce((t, p) => t + Number(p.quantidade), 0) / dias
    if (melhor === null || media > melhor) melhor = media
  }
  return melhor
}

// Ritmo da linha de base: quantidade prevista ÷ dias de trabalho previstos.
export const ritmoPlanejado = (s) =>
  Number(s.quantidade_prevista) / Math.max(1, diasUteisEntre(s.inicio_base || s.inicio_previsto, s.fim_base || s.fim_previsto))

// Ritmo do serviço na semana (colunas "Produção média /dia"): o do cronograma (linha de base) e o
// necessário de agora em diante — o que falta ÷ dias de trabalho de `primeiro` até o fim previsto;
// se o fim previsto já passou, o que falta tem de caber até o sábado. irreal: passa de
// FATOR_IRREAL × o melhor ritmo do serviço (sem histórico, o do cronograma).
export function ritmoDaSemana(s, { segunda, hoje, producoes, antecipar = false }) {
  const sabado = somarDias(segunda, 5)
  const primeiro = [segunda, hoje, antecipar ? segunda : s.inicio_previsto].reduce((m, d) => (d > m ? d : m))
  const saldo = Math.max(0, Number(s.quantidade_prevista) - Number(s.quantidade_executada))
  const prazoVencido = s.fim_previsto < primeiro
  const necessario = saldo / Math.max(1, diasUteisEntre(primeiro, prazoVencido ? sabado : s.fim_previsto))
  const melhor = melhorRitmo(producoes, s.id, hoje)
  const planejado = ritmoPlanejado(s)
  const referencia = melhor ?? planejado
  return {
    primeiro, saldo, prazoVencido, planejado, necessario, referencia,
    base: melhor === null ? 'planejado' : 'histórico', irreal: necessario > FATOR_IRREAL * referencia,
  }
}

// Reparte o que falta do serviço pelos dias livres desta semana (sem atividade dele, a partir de hoje
// e do início previsto). Por dia = o que falta ÷ dias de trabalho até o fim previsto; se o fim
// previsto já passou, o que falta tem de caber nesta semana. antecipar: começa antes do previsto.
// Devolve null se não há o que distribuir.
export function distribuirNaSemana(s, { segunda, hoje, producoes, ocupados = [], antecipar = false }) {
  const r = ritmoDaSemana(s, { segunda, hoje, producoes, antecipar })
  if (r.saldo <= 0) return null
  const dias = diasDaSemana(segunda).filter((d) => d >= r.primeiro && (r.prazoVencido || d <= s.fim_previsto) && !ocupados.includes(d))
  if (dias.length === 0) return null
  const { necessario, referencia, base, irreal, prazoVencido } = r
  return {
    dias, porDia: arredondar(necessario, s.unidade), necessario, referencia, base, irreal, prazoVencido,
    registros: dias.map((d) => ({
      semana_inicio: segunda, data_prevista: d, servico_id: s.id, local: s.local || 'A definir',
      quantidade_planejada: arredondar(necessario, s.unidade), equipe: null, pacote_id: null,
    })),
  }
}

// Pode antecipar: ainda não começou, começa nas próximas SEMANAS_ANTECIPAR semanas, não tem restrição
// pendente e as predecessoras já deixam começar (término-início: terminou; início-início: começou).
// ponytail: a defasagem da ligação não entra nessa conferência.
export function podeAntecipar(servicos, dependencias, restricoes, segunda) {
  const sabado = somarDias(segunda, 5)
  const limite = somarDias(sabado, 7 * SEMANAS_ANTECIPAR)
  const porId = new Map(servicos.map((s) => [s.id, s]))
  const liberada = (d) => {
    const p = porId.get(d.predecessora_id)
    if (!p || p.cancelado || p.e_resumo) return true
    if (d.tipo === 'TI') return terminou(p)
    if (d.tipo === 'II') return comecou(p)
    return true
  }
  return servicos.filter((s) => !s.e_resumo && !s.cancelado && !comecou(s)
    && s.inicio_previsto > sabado && s.inicio_previsto <= limite
    && !restricoes.some((r) => r.servico_id === s.id && r.status === STATUS_RESTRICAO.PENDENTE)
    && dependencias.filter((d) => d.servico_id === s.id).every(liberada))
}

// Conferência antes da primeira atividade de um serviço: as quatro têm de ser "sim" para planejar.
export const CONFERENCIA_INICIO = [
  'Material está em obra?',
  'Ferramentas e equipamentos estão em obra?',
  'Mão de obra já está dimensionada?',
  'Projeto está sem dúvidas?',
]
export const precisaConferencia = (s, atividades) => !comecou(s) && !atividades.some((a) => a.servico_id === s.id)
export const conferenciaOk = (respostas) => CONFERENCIA_INICIO.every((_, i) => respostas?.[i] === true)

// "Copiar pendentes para a próxima semana": cada Não concluída vira uma atividade no mesmo dia da
// semana seguinte, com o saldo. Pacote fechado no meio do caminho fica de fora. Não copia duas vezes.
export function copiarPendentes(atividades, pacotes, segunda) {
  const jaCopiadas = new Set(atividades.map((a) => a.copiada_de_id).filter(Boolean))
  return atividades
    .filter((a) => a.semana_inicio === segunda && a.status === STATUS_PCP.NAO_CONCLUIDA && !jaCopiadas.has(a.id))
    .filter((a) => saldoPendente(a) > 0)
    .map((a) => {
      const pacote = pacotes.find((p) => p.id === a.pacote_id)
      return {
        semana_inicio: somarDias(segunda, 7), data_prevista: somarDias(a.data_prevista, 7), servico_id: a.servico_id,
        local: a.local, quantidade_planejada: saldoPendente(a), equipe: a.equipe,
        pacote_id: pacote && !pacote.fechado_em ? pacote.id : null, copiada_de_id: a.id,
      }
    })
}

// ── Restrições (plano de 3 meses) ──────────────────────────────────────────

export function validarRestricao(campos) {
  if (!TIPOS_RESTRICAO.includes(campos.tipo)) return { erro: 'Escolha o tipo da restrição.' }
  if (!campos.descricao?.trim()) return { erro: 'Descreva a restrição.' }
  return {
    registro: {
      tipo: campos.tipo, descricao: campos.descricao.trim(),
      responsavel: campos.responsavel?.trim() || null, data_limite: campos.data_limite || null,
    },
  }
}

export function validarRemocao(data, hoje) {
  if (!data) return { erro: 'Informe a data em que a restrição foi removida.' }
  if (data > hoje) return { erro: 'A data não pode ser futura.' }
  return { registro: { status: STATUS_RESTRICAO.REMOVIDA, removida_em: data } }
}
