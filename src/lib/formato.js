// Números no padrão brasileiro. Só formatação: nenhuma regra de negócio aqui.

export function numero(v, casas = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

// Quantidade na unidade do serviço: "5,0%" ou "1.540 m".
export function quantidade(v, unidade) {
  if (v === null || v === undefined) return '—'
  if (unidade === '%') return `${numero(v, 1)}%`
  const casas = Number.isInteger(Number(v)) ? 0 : 1
  return `${numero(v, casas)} ${unidade}`
}

export function porcento(v, casas = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${numero(v, casas)}%`
}

export function moeda(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Diferença em pontos percentuais com sinal: "−3,4 p.p." / "+1,2 p.p."
export function pontos(v) {
  const s = v < 0 ? '−' : '+'
  return `${s}${numero(Math.abs(v), 1)} p.p.`
}
