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

// Saudação pela hora do dia (0 a 23).
export function saudacao(hora) {
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Diferença em pontos percentuais com sinal: "−3,4 p.p." / "+1,2 p.p."
export function pontos(v) {
  const s = v < 0 ? '−' : '+'
  return `${s}${numero(Math.abs(v), 1)} p.p.`
}

// Arredonda para `casas` casas decimais (para mostrar e para gravar quantidade e dinheiro).
export function arredondar(v, casas) {
  const f = 10 ** casas
  return Math.round(Number(v) * f) / f
}

// O contrário: número digitado por gente → Number. "85.000,50", "85000,5", "85000.5", "−12".
// Ponto seguido de exatamente 3 dígitos é separador de milhar (jeito brasileiro).
// Vazio → null; texto que não é número → NaN.
export function lerNumero(texto) {
  if (texto === null || texto === undefined) return null
  let t = String(texto).trim().replace(/\s|R\$/g, '').replace('−', '-')
  if (t === '') return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}
