// Alertas do Painel do dia (PLANO-DO-PROJETO.md, "1. Painel do dia").
// Limites provisórios — "Decidir depois de usar".

import { diasEntre } from './datas.js'
import { avancoServico, diasAtraso, servicosMedidos } from './avanco.js'

export const LIMITES = {
  pacoteDiasAntesDoFechamento: 5,
  pacotePctMinimo: 70,
  ocorrenciaHorasSemResposta: 48,
}

const PACOTE_ABERTO = ['Planejado', 'Liberado', 'Em execução']

export function montarAlertas({ servicos, pacotes, restricoes, ocorrencias, efetivoLancado, hoje }) {
  const alertas = []

  for (const s of servicosMedidos(servicos)) {
    const atraso = diasAtraso(s, hoje)
    if (atraso <= 0 || s.fim_real) continue
    const naoIniciou = !s.inicio_real
    alertas.push({
      nivel: s.critico ? 'crit' : 'warn',
      titulo: s.nome,
      detalhe: `${s.critico ? 'Caminho crítico · ' : ''}${naoIniciou ? 'não iniciou · ' : ''}atrasado ${atraso} ${atraso === 1 ? 'dia' : 'dias'}`,
      destino: { screen: 'servico', params: { id: s.id } },
    })
  }

  for (const p of pacotes) {
    if (!PACOTE_ABERTO.includes(p.status) || p.fechado_em) continue
    const faltam = diasEntre(hoje, p.data_fechamento)
    const pct = (Number(p.quantidade_executada) / Number(p.quantidade_meta)) * 100
    if (faltam >= 0 && faltam < LIMITES.pacoteDiasAntesDoFechamento && pct < LIMITES.pacotePctMinimo) {
      alertas.push({
        nivel: 'warn',
        titulo: `Pacote ${p.nome}`,
        detalhe: `${Math.round(pct)}% da meta · fecha em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`,
        destino: { screen: 'pacote', params: { id: p.id } },
      })
    }
  }

  for (const r of restricoes) {
    if (r.status === 'Pendente' && r.data_limite && r.data_limite < hoje) {
      alertas.push({
        nivel: 'warn',
        titulo: r.descricao,
        detalhe: `Restrição vencida · prazo ${r.data_limite.split('-').reverse().slice(0, 2).join('/')}`,
        destino: { screen: 'planejamento', params: { aba: 'tresMeses' } },
      })
    }
  }

  for (const o of ocorrencias) {
    if (o.status !== 'Aberta') continue
    const dias = diasEntre(o.aberta_em, hoje)
    if (dias * 24 > LIMITES.ocorrenciaHorasSemResposta) {
      alertas.push({
        nivel: 'warn',
        titulo: `Ocorrência nº ${o.numero} — ${o.titulo}`,
        detalhe: `Sem resposta há ${dias} dias`,
        destino: { screen: 'ocorrencia', params: { id: o.id } },
      })
    }
  }

  if (!efetivoLancado) {
    alertas.push({ nivel: 'warn', titulo: 'Efetivo de hoje não lançado', detalhe: 'Peça ao mestre ou lance agora', destino: { screen: 'efetivo', params: {} } })
  }

  // Críticos primeiro.
  return alertas.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'crit' ? -1 : 1))
}

// Serviços atrasados para a tela do cliente: só nome, etapa e dias. Sem motivo.
export function servicosAtrasados(servicos, hoje) {
  return servicosMedidos(servicos)
    .map((s) => ({ id: s.id, nome: s.nome, etapa_entrega_id: s.etapa_entrega_id, dias: diasAtraso(s, hoje), avanco: avancoServico(s), concluido: !!s.fim_real }))
    .filter((s) => s.dias > 0 && !s.concluido)
    .sort((a, b) => b.dias - a.dias)
}
