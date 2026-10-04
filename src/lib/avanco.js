// Avanço físico: as contas que decidem o número mais importante do sistema.
// Regras em PLANO-DO-PROJETO.md, "3. Avanço físico". Regra pura: sem React, sem banco.

import { diasEntre } from './datas.js'

// Só serviço de verdade entra na conta: não é tarefa-resumo e não foi cancelado.
export function servicosMedidos(servicos) {
  return servicos.filter((s) => !s.e_resumo && !s.cancelado)
}

// % executado de um serviço, limitado a 100.
export function avancoServico(s) {
  if (!s.quantidade_prevista) return 0
  return Math.min(100, (Number(s.quantidade_executada) / Number(s.quantidade_prevista)) * 100)
}

// Peso de cada serviço na média da obra.
// Custo orçado só vale se TODOS tiverem custo; faltou um, todos passam a pesar pela duração.
export function regraDePeso(servicos) {
  const medidos = servicosMedidos(servicos)
  const semCusto = medidos.filter((s) => !(Number(s.custo_orcado) > 0)).length
  if (medidos.length > 0 && semCusto === 0) {
    return { tipo: 'custo', semCusto: 0, peso: (s) => Number(s.custo_orcado) }
  }
  return { tipo: 'duracao', semCusto, peso: (s) => Math.max(1, Number(s.duracao_dias) || 1) }
}

// % previsto de um serviço numa data: distribuição linear entre início e fim da linha de base.
export function previstoServico(s, data) {
  const ini = s.inicio_base || s.inicio_previsto
  const fim = s.fim_base || s.fim_previsto
  if (data < ini) return 0
  if (data >= fim) return 100
  const total = diasEntre(ini, fim)
  if (total <= 0) return 100
  return (diasEntre(ini, data) / total) * 100
}

// % executado de um serviço até uma data, a partir das produções lançadas.
export function executadoAte(s, producoes, data) {
  if (!s.quantidade_prevista) return 0
  const soma = producoes
    .filter((p) => p.servico_id === s.id && p.data <= data)
    .reduce((t, p) => t + Number(p.quantidade), 0)
  return Math.max(0, Math.min(100, (soma / Number(s.quantidade_prevista)) * 100))
}

function mediaPonderada(servicos, peso, pct) {
  let soma = 0
  let pesos = 0
  for (const s of servicos) {
    const w = peso(s)
    soma += w * pct(s)
    pesos += w
  }
  return pesos ? soma / pesos : 0
}

// Avanço da obra (ou de uma etapa de entrega) hoje: realizado x previsto.
// A regra de peso é decidida com a obra inteira, para as etapas somarem com o mesmo critério.
export function resumoAvanco(servicos, data, etapaId = null) {
  const regra = regraDePeso(servicos)
  let alvo = servicosMedidos(servicos)
  if (etapaId !== null) alvo = alvo.filter((s) => s.etapa_entrega_id === etapaId)
  const realizado = mediaPonderada(alvo, regra.peso, avancoServico)
  const previsto = mediaPonderada(alvo, regra.peso, (s) => previstoServico(s, data))
  return { realizado, previsto, diferenca: realizado - previsto, peso: regra.tipo, semCusto: regra.semCusto }
}

// Pontos da curva S, um por data pedida. Realizado só até `hoje` (depois fica null: nada de projeção).
export function curvaS(servicos, producoes, datas, hoje) {
  const regra = regraDePeso(servicos)
  const alvo = servicosMedidos(servicos)
  return datas.map((d) => ({
    data: d,
    previsto: mediaPonderada(alvo, regra.peso, (s) => previstoServico(s, d)),
    realizado: d <= hoje ? mediaPonderada(alvo, regra.peso, (s) => executadoAte(s, producoes, d)) : null,
  }))
}

// Dias de atraso contra a linha de base (PRD-BACKEND, "Recalcular o cronograma", passo 3).
export function diasAtraso(s, hoje) {
  const iniBase = s.inicio_base || s.inicio_previsto
  const fimBase = s.fim_base || s.fim_previsto
  if (s.fim_real) return Math.max(0, diasEntre(fimBase, s.fim_real))
  if (hoje > fimBase) return diasEntre(fimBase, hoje)
  if (!s.inicio_real && hoje > iniBase) return diasEntre(iniBase, hoje)
  return 0
}
