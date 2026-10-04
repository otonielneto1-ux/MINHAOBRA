// Regras do PCP (planejamento da semana). PLANO-DO-PROJETO.md, "4a. PCP".

import { STATUS_PCP } from './vocabulario.js'
import { diasEntre } from './datas.js'

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

// PPC = atividades concluídas ÷ atividades que já tiveram baixa.
// Semana encerrada: o que ficou sem baixa conta como não concluído.
export function ppc(atividades, encerrada = false) {
  const concluidas = atividades.filter((a) => a.status === STATUS_PCP.CONCLUIDA).length
  const base = encerrada
    ? atividades.length
    : atividades.filter((a) => a.status !== STATUS_PCP.PLANEJADA).length
  return { concluidas, base, pct: base ? Math.round((concluidas / base) * 100) : null }
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
