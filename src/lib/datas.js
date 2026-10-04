// Datas como texto 'AAAA-MM-DD' (o mesmo formato da coluna `date` do banco).
// Toda conta é feita em meio-dia local, para o fuso do Brasil nunca pular um dia.

const DIA_MS = 86400000
const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const NOMES_DIA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function paraData(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d, 12)
}

export function paraIso(data) {
  const a = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function somarDias(iso, n) {
  const d = paraData(iso)
  d.setDate(d.getDate() + n)
  return paraIso(d)
}

// Dias corridos de `de` até `ate` (positivo se `ate` vem depois).
export function diasEntre(de, ate) {
  return Math.round((paraData(ate) - paraData(de)) / DIA_MS)
}

// Segunda-feira da semana da data (semana de obra: segunda a sábado).
export function segundaDaSemana(iso) {
  const d = paraData(iso)
  const dow = d.getDay()
  const volta = dow === 0 ? 6 : dow - 1
  return somarDias(iso, -volta)
}

// Os seis dias de trabalho (segunda a sábado) da semana que começa em `segunda`.
export function diasDaSemana(segunda) {
  return [0, 1, 2, 3, 4, 5].map((i) => somarDias(segunda, i))
}

export function nomeDia(iso) {
  return NOMES_DIA[paraData(iso).getDay()]
}

export function nomeDiaLongo(iso) {
  return NOMES_DIA_LONGO[paraData(iso).getDay()]
}

// Primeiro dia de cada mês entre duas datas (pontos da curva S), mais a data final.
export function mesesEntre(de, ate) {
  const lista = []
  let [a, m] = de.split('-').map(Number)
  for (;;) {
    const iso = `${a}-${String(m).padStart(2, '0')}-01`
    if (iso > ate) break
    if (iso >= de) lista.push(iso)
    m += 1
    if (m > 12) { m = 1; a += 1 }
  }
  if (!lista.length || lista[0] !== de) lista.unshift(de)
  if (lista[lista.length - 1] !== ate) lista.push(ate)
  return lista
}

// 07/10/2026
export function dataBr(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// 07/10
export function diaMes(iso) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
