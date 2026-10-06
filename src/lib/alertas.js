// Alertas do Painel do dia (PLANO-DO-PROJETO.md, "1. Painel do dia").
// Limites provisórios — "Decidir depois de usar".

import { dataBr, diasEntre } from './datas.js'
import { avancoServico, diasAtraso, servicosMedidos } from './avanco.js'
import { OCORRENCIA_ABERTA, PACOTE, PERFIS, STATUS_OCORRENCIA_ABERTOS, STATUS_PACOTE_MANUAL, STATUS_RESTRICAO } from './vocabulario.js'
import { diasUteisAteFechamento, pctPacote, renovacoesPendentes } from './premio.js'

const idsDeClientes = (pessoas) => new Set(pessoas.filter((p) => p.role === PERFIS.CLIENTE).map((p) => p.id))

export const LIMITES = {
  pacoteDiasAntesDoFechamento: 5,
  pacotePctMinimo: 70,
  // Aviso de fechamento / decisão de renovar: com 7 dias úteis (seg–sex) e, mais forte, com 3.
  pacoteDiasUteisAviso: 7,
  pacoteDiasUteisUrgente: 3,
  ocorrenciaHorasSemResposta: 48,
}


// Meta do pacote aberto em risco: abaixo de 70% a menos de 5 dias do fechamento (quadro de Pacotes e alerta).
export const metaEmRisco = (p, hoje) => {
  const faltam = diasEntre(hoje, p.data_fechamento)
  return !p.fechado_em && faltam >= 0 && faltam < LIMITES.pacoteDiasAntesDoFechamento && pctPacote(p) < LIMITES.pacotePctMinimo
}

// Lista geral de alertas. Ocorrências abertas pelo cliente ficam de fora: elas vão no
// grupo em destaque (ocorrenciasDoCliente), para não aparecerem duas vezes.
export function montarAlertas({ servicos, pacotes, restricoes, ocorrencias, pessoas, efetivoLancado, hoje }) {
  const alertas = []
  const clientes = idsDeClientes(pessoas)

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

  // Pacote aberto perto do fechamento: aviso com 7 dias úteis, urgente com 3 (decidir se continua no
  // período seguinte); e meta em risco (abaixo de 70% a menos de 5 dias). Um alerta só por pacote.
  for (const p of pacotes) {
    if (!STATUS_PACOTE_MANUAL.includes(p.status) || p.fechado_em || p.data_fechamento < hoje) continue
    const uteis = diasUteisAteFechamento(p, hoje)
    const pct = pctPacote(p)
    const perto = uteis <= LIMITES.pacoteDiasUteisAviso
    const emRisco = metaEmRisco(p, hoje)
    if (!perto && !emRisco) continue
    alertas.push({
      nivel: uteis <= LIMITES.pacoteDiasUteisUrgente ? 'crit' : 'warn',
      titulo: `Pacote ${p.nome}`,
      detalhe: [`fecha em ${uteis} ${uteis === 1 ? 'dia útil' : 'dias úteis'}`, `${Math.round(pct)}% da meta`, perto ? 'decidir se continua no próximo período' : null]
        .filter(Boolean).join(' · '),
      destino: { screen: 'pacote', params: { id: p.id } },
    })
  }

  // Pacote pausado: lembra o problema até alguém retomar ou levar a equipe para outro pacote.
  for (const p of pacotes.filter((x) => x.status === PACOTE.PAUSADO && !x.fechado_em)) {
    alertas.push({
      nivel: 'warn',
      titulo: `Pacote ${p.nome} pausado`,
      detalhe: `desde ${dataBr(p.pausa_desde)} · ${p.pausa_motivo}`,
      destino: { screen: 'pacote', params: { id: p.id } },
    })
  }

  // Dia 21 em diante: fechamento passou e ainda não se decidiu se o pacote continua.
  for (const p of renovacoesPendentes(pacotes, hoje)) {
    alertas.push({
      nivel: 'warn',
      titulo: `Pacote ${p.nome}`,
      detalhe: `fechamento ${dataBr(p.data_fechamento)} · continua no próximo período?`,
      destino: { screen: 'pacotes', params: {} },
    })
  }

  for (const r of restricoes) {
    if (r.status === STATUS_RESTRICAO.PENDENTE && r.data_limite && r.data_limite < hoje) {
      alertas.push({
        nivel: 'warn',
        titulo: r.descricao,
        detalhe: `Restrição vencida · prazo ${r.data_limite.split('-').reverse().slice(0, 2).join('/')}`,
        destino: { screen: 'planejamento', params: { aba: 'tresMeses' } },
      })
    }
  }

  for (const o of ocorrencias) {
    if (o.status !== OCORRENCIA_ABERTA || clientes.has(o.aberta_por)) continue
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

// Ocorrências abertas pelo cliente que ainda não fecharam — vão em destaque nos Alertas.
// pessoas: [{ id, role }]. Mais urgentes primeiro: sem resposta além do limite, prazo vencido, depois a mais antiga.
export function ocorrenciasDoCliente(ocorrencias, pessoas, hoje) {
  const clientes = idsDeClientes(pessoas)
  return ocorrencias
    .filter((o) => clientes.has(o.aberta_por) && STATUS_OCORRENCIA_ABERTOS.includes(o.status))
    .map((o) => {
      const dias = diasEntre(o.aberta_em, hoje)
      const semResposta = o.status === OCORRENCIA_ABERTA && dias * 24 > LIMITES.ocorrenciaHorasSemResposta
      const prazoVencido = !!o.prazo && o.prazo < hoje
      return { id: o.id, numero: o.numero, titulo: o.titulo, status: o.status, prazo: o.prazo, dias, semResposta, prazoVencido, urgente: semResposta || prazoVencido }
    })
    .sort((a, b) => Number(b.urgente) - Number(a.urgente) || b.dias - a.dias)
}

// Alertas críticos do painel: os vermelhos da lista geral + ocorrências do cliente urgentes.
export const contarCriticos = (alertas, doCliente) =>
  alertas.filter((a) => a.nivel === 'crit').length + doCliente.filter((o) => o.urgente).length

// Serviços atrasados para a tela do cliente: só nome, etapa e dias. Sem motivo.
export function servicosAtrasados(servicos, hoje) {
  return servicosMedidos(servicos)
    .map((s) => ({ id: s.id, nome: s.nome, etapa_entrega_id: s.etapa_entrega_id, dias: diasAtraso(s, hoje), avanco: avancoServico(s), concluido: !!s.fim_real }))
    .filter((s) => s.dias > 0 && !s.concluido)
    .sort((a, b) => b.dias - a.dias)
}
