// Cronograma: caminho crítico, ajuste de produção, troca de % por quantidade e custos digitados.
// Regras em PRD-BACKEND.md, "Processos automáticos". Regra pura: sem React, sem banco.

import { diasEntre, somarDias } from './datas.js'
import { diasAtraso } from './avanco.js'
import { arredondar, lerNumero } from './formato.js'

// Recalcula folga, crítico e atraso (PRD-BACKEND, "Recalcular o cronograma"), em dias corridos.
// Ida: cada serviço começa no previsto do Project ou depois, se uma predecessora empurrar.
// Volta: o fim mais tarde que não atrasa o fim da obra. Folga = fim mais tarde − fim mais cedo.
// Devolve { problemas } (nada a gravar) ou { linhas, criticos, atrasados }.
// ponytail: ligações com tarefa-resumo ficam de fora; o MS Project também desaconselha.
export function calcularCronograma(servicos, dependencias, hoje) {
  const ativos = servicos.filter((s) => !s.e_resumo && !s.cancelado)
  const semData = ativos.filter((s) => !s.inicio_previsto || !s.fim_previsto || s.fim_previsto < s.inicio_previsto)
  if (semData.length) return { problemas: semData.map((s) => ({ id: s.id, nome: s.nome, motivo: 'sem datas válidas' })) }
  if (ativos.length === 0) return { linhas: [], criticos: 0, atrasados: 0 }

  const ids = new Set(ativos.map((s) => s.id))
  const deps = dependencias.filter((d) => ids.has(d.servico_id) && ids.has(d.predecessora_id))
  const ref = ativos.reduce((m, s) => (s.inicio_previsto < m ? s.inicio_previsto : m), ativos[0].inicio_previsto)
  const dur = new Map(ativos.map((s) => [s.id, diasEntre(s.inicio_previsto, s.fim_previsto) + 1]))
  const antes = new Map(ativos.map((s) => [s.id, []]))
  const depois = new Map(ativos.map((s) => [s.id, []]))
  for (const d of deps) { antes.get(d.servico_id).push(d); depois.get(d.predecessora_id).push(d) }

  // Ordem em que cada serviço vem depois de todas as suas predecessoras; sobra = ciclo.
  const faltam = new Map(ativos.map((s) => [s.id, antes.get(s.id).length]))
  const fila = ativos.filter((s) => faltam.get(s.id) === 0).map((s) => s.id)
  const ordem = []
  while (fila.length) {
    const id = fila.shift()
    ordem.push(id)
    for (const d of depois.get(id)) {
      faltam.set(d.servico_id, faltam.get(d.servico_id) - 1)
      if (faltam.get(d.servico_id) === 0) fila.push(d.servico_id)
    }
  }
  if (ordem.length < ativos.length) {
    const noCiclo = ativos.filter((s) => !ordem.includes(s.id))
    return { problemas: noCiclo.map((s) => ({ id: s.id, nome: s.nome, motivo: 'dependência circular' })) }
  }

  // Dias contados a partir do primeiro início; o fim é exclusivo (início + duração).
  const ini = new Map()
  const fim = new Map()
  for (const id of ordem) {
    const s = ativos.find((x) => x.id === id)
    let c = diasEntre(ref, s.inicio_previsto)
    for (const d of antes.get(id)) {
      const lag = Number(d.defasagem_dias) || 0
      const p = d.predecessora_id
      if (d.tipo === 'TI') c = Math.max(c, fim.get(p) + lag)
      else if (d.tipo === 'II') c = Math.max(c, ini.get(p) + lag)
      else if (d.tipo === 'TT') c = Math.max(c, fim.get(p) + lag - dur.get(id))
      else if (d.tipo === 'IT') c = Math.max(c, ini.get(p) + lag - dur.get(id))
    }
    ini.set(id, c)
    fim.set(id, c + dur.get(id))
  }
  const fimObra = Math.max(...fim.values())

  const fimTarde = new Map()
  for (const id of [...ordem].reverse()) {
    let t = fimObra
    for (const d of depois.get(id)) {
      const lag = Number(d.defasagem_dias) || 0
      const sFim = fimTarde.get(d.servico_id)
      const sIni = sFim - dur.get(d.servico_id)
      if (d.tipo === 'TI') t = Math.min(t, sIni - lag)
      else if (d.tipo === 'II') t = Math.min(t, sIni - lag + dur.get(id))
      else if (d.tipo === 'TT') t = Math.min(t, sFim - lag)
      else if (d.tipo === 'IT') t = Math.min(t, sFim - lag + dur.get(id))
    }
    fimTarde.set(id, t)
  }

  const linhas = ativos.map((s) => {
    const folga = fimTarde.get(s.id) - fim.get(s.id)
    return {
      id: s.id,
      inicio_cedo: somarDias(ref, ini.get(s.id)),
      fim_tarde: somarDias(ref, fimTarde.get(s.id) - 1),
      folga_dias: folga,
      critico: folga <= 0,
      dias_atraso: diasAtraso(s, hoje),
    }
  })
  return {
    linhas,
    criticos: linhas.filter((l) => l.critico).length,
    atrasados: linhas.filter((l) => l.dias_atraso > 0).length,
  }
}

// Custo orçado digitado: vazio ou zero = sem custo (null); negativo ou texto = inválido. Centavos arredondados.
export function validarCusto(texto) {
  const v = lerNumero(texto)
  if (Number.isNaN(v) || (v !== null && v < 0)) return { erro: 'Custo inválido.' }
  return { custo: v === null || v === 0 ? null : arredondar(v, 2) }
}

// Custos digitados no modo planilha → só as linhas que mudaram, prontas para gravar.
// Campo vazio = sem custo (null). Devolve { erro } se algum valor não for número positivo.
export function custosAlterados(servicos, digitados) {
  const linhas = []
  for (const [id, texto] of Object.entries(digitados)) {
    const s = servicos.find((x) => String(x.id) === id)
    if (!s) continue
    const { custo: novo, erro } = validarCusto(texto)
    if (erro) return { erro: `Custo inválido em "${s.nome}".` }
    const antigo = Number(s.custo_orcado) > 0 ? Number(s.custo_orcado) : null
    if (novo !== antigo) linhas.push({ id: s.id, custo: novo })
  }
  return { linhas }
}

// Lançar ajuste no detalhe do serviço: quantidade (+ ou −), data e motivo.
export function validarAjuste({ quantidade, data, motivo }, servico, hoje) {
  const q = lerNumero(quantidade)
  if (q === null || Number.isNaN(q) || q === 0) return { erro: 'Informe a quantidade do ajuste (use − para tirar).' }
  if (!data) return { erro: 'Informe a data do ajuste.' }
  if (data > hoje) return { erro: 'O ajuste não pode ter data futura.' }
  if (!motivo?.trim()) return { erro: 'Explique o motivo do ajuste.' }
  if (Number(servico.quantidade_executada) + q < 0) return { erro: 'O ajuste deixaria o executado abaixo de zero.' }
  return { registro: { servico_id: servico.id, data, quantidade: q, motivo_ajuste: motivo.trim() } }
}

// Prévia da troca de % por quantidade: "Executado hoje: 44% → 1.408 m de 3.200 m".
export function previaTrocaUnidade(servico, unidade, quantidade) {
  if (servico.unidade !== '%') return { erro: 'Este serviço já está medido em quantidade.' }
  if (!unidade || unidade === '%') return { erro: 'Escolha a unidade nova.' }
  const q = lerNumero(quantidade)
  if (!(q > 0)) return { erro: 'Informe a quantidade prevista.' }
  const fator = q / Number(servico.quantidade_prevista)
  return { fator, executada: arredondar(Number(servico.quantidade_executada) * fator, 3), prevista: q }
}
