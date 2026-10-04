// Efetivo por empresa terceirizada.
import { efetivoTerceirizadas } from '../src/lib/efetivo.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const funcionarios = [
  { id: 1, tipo_mao_obra: 'Direta', ativo: true },
  { id: 2, tipo_mao_obra: 'Terceirizada', empresa: 'Terraplan', ativo: true },
  { id: 3, tipo_mao_obra: 'Terceirizada', empresa: 'Terraplan', ativo: true },
  { id: 4, tipo_mao_obra: 'Terceirizada', empresa: 'Eletro', ativo: true },
  { id: 5, tipo_mao_obra: 'Terceirizada', empresa: 'Eletro', ativo: false },
  { id: 6, tipo_mao_obra: 'Terceirizada', empresa: '', ativo: true },
]
const presencas = [
  { funcionario_id: 1, situacao: 'Presente' },
  { funcionario_id: 2, situacao: 'Presente' },
  { funcionario_id: 3, situacao: 'Falta' },
  { funcionario_id: 4, situacao: 'Presente' },
]

const r = efetivoTerceirizadas(funcionarios, presencas)
conferir('uma linha por empresa, mão de obra própria fora', r.map((e) => e.empresa), ['Eletro', 'Terraplan', 'Empresa não informada'])
conferir('conta presentes e cadastrados ativos', r.find((e) => e.empresa === 'Terraplan'), { empresa: 'Terraplan', presentes: 1, total: 2 })
conferir('inativo não entra no total', r.find((e) => e.empresa === 'Eletro').total, 1)
conferir('sem empresa cadastrada não some', r.find((e) => e.empresa === 'Empresa não informada'), { empresa: 'Empresa não informada', presentes: 0, total: 1 })
conferir('sem terceirizado na obra: lista vazia', efetivoTerceirizadas([{ id: 1, tipo_mao_obra: 'Direta', ativo: true }], []), [])

console.log(`${ok}/${tot} — efetivo`)
process.exit(ok === tot ? 0 : 1)
