// Contas do efetivo do dia. Regra pura: sem React, sem banco.

// Efetivo de cada empresa terceirizada: quantos estão cadastrados (ativos) e quantos vieram no dia.
// funcionarios: os ativos da obra; presencas: as do dia.
export function efetivoTerceirizadas(funcionarios, presencas) {
  const presente = new Set(presencas.filter((p) => p.situacao === 'Presente').map((p) => p.funcionario_id))
  const porEmpresa = new Map()
  for (const f of funcionarios) {
    if (f.tipo_mao_obra !== 'Terceirizada' || !f.ativo) continue
    const nome = f.empresa?.trim() || 'Empresa não informada'
    const e = porEmpresa.get(nome) || { empresa: nome, presentes: 0, total: 0 }
    e.total += 1
    if (presente.has(f.id)) e.presentes += 1
    porEmpresa.set(nome, e)
  }
  return [...porEmpresa.values()].sort((a, b) => b.presentes - a.presentes || a.empresa.localeCompare(b.empresa, 'pt-BR'))
}
