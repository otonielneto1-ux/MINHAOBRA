// Regras do PCP (planejamento da semana). PLANO-DO-PROJETO.md, "4a. PCP".

import { STATUS_PCP } from './vocabulario.js'
import { diasEntre, inicioDoMesAnterior } from './datas.js'

// Decide o resultado de uma baixa. Devolve { status, motivo } ou { erro }.
export function resultadoBaixa(planejada, executada, motivo) {
  const exec = Number(executada)
  if (executada === '' || executada === null || executada === undefined || Number.isNaN(exec) || exec < 0) {
    return { erro: 'Informe quanto foi executado.' }
  }
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
