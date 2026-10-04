// Divisão do prêmio de um pacote entre os funcionários (PRD-BACKEND, "Fechamento dos pacotes").
// Proporcional aos dias de presença; só mão de obra própria; o centavo que sobra vai
// para quem tem mais dias.

export const TIPOS_COM_PREMIO = ['Direta', 'Indireta']

// presencas: [{ funcionario_id, tipo_mao_obra }], uma linha por dia trabalhado no pacote.
// Devolve [{ funcionario_id, dias, valor }] ordenado por dias (maior primeiro).
export function dividirPremio(valorPremio, presencas) {
  const dias = new Map()
  for (const p of presencas) {
    if (!TIPOS_COM_PREMIO.includes(p.tipo_mao_obra)) continue
    dias.set(p.funcionario_id, (dias.get(p.funcionario_id) || 0) + 1)
  }
  const linhas = [...dias.entries()]
    .map(([funcionario_id, d]) => ({ funcionario_id, dias: d }))
    .sort((a, b) => b.dias - a.dias || a.funcionario_id - b.funcionario_id)
  const totalDias = linhas.reduce((t, l) => t + l.dias, 0)
  if (!totalDias) return []

  const totalCentavos = Math.round(Number(valorPremio) * 100)
  let distribuido = 0
  for (const l of linhas) {
    l.centavos = Math.floor((totalCentavos * l.dias) / totalDias)
    distribuido += l.centavos
  }
  linhas[0].centavos += totalCentavos - distribuido
  return linhas.map(({ funcionario_id, dias: d, centavos }) => ({ funcionario_id, dias: d, valor: centavos / 100 }))
}

// Um pacote só paga prêmio se bateu 100% da meta.
export function pacoteBateuMeta(pacote) {
  return Number(pacote.quantidade_executada) >= Number(pacote.quantidade_meta)
}
