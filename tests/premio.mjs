// Prêmio de produção: proporcional aos dias, só mão de obra própria, centavo sobrando para quem tem mais dias.
import { dividirPremio, pacoteBateuMeta } from '../src/lib/premio.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const dias = (id, tipo, n) => Array.from({ length: n }, () => ({ funcionario_id: id, tipo_mao_obra: tipo }))

conferir('divide pelos dias de presença', dividirPremio(1000, [...dias(1, 'Direta', 3), ...dias(2, 'Direta', 1)]),
  [{ funcionario_id: 1, dias: 3, valor: 750 }, { funcionario_id: 2, dias: 1, valor: 250 }])

conferir('terceirizado não entra no prêmio', dividirPremio(900, [...dias(1, 'Direta', 2), ...dias(2, 'Terceirizada', 5)]),
  [{ funcionario_id: 1, dias: 2, valor: 900 }])

conferir('indireta entra no prêmio', dividirPremio(200, [...dias(1, 'Direta', 1), ...dias(2, 'Indireta', 1)]).length, 2)

const tres = dividirPremio(100, [...dias(1, 'Direta', 1), ...dias(2, 'Direta', 1), ...dias(3, 'Direta', 1)])
conferir('a soma bate exatamente o valor do pacote', Math.round(tres.reduce((t, l) => t + l.valor, 0) * 100), 10000)
conferir('o centavo que sobra vai para quem tem mais dias (empate: o primeiro)', tres.map((l) => l.valor), [33.34, 33.33, 33.33])

conferir('sem presença ninguém recebe', dividirPremio(500, []), [])

conferir('bateu 100% da meta paga', pacoteBateuMeta({ quantidade_meta: 400, quantidade_executada: 400 }), true)
conferir('99% da meta não paga', pacoteBateuMeta({ quantidade_meta: 400, quantidade_executada: 396 }), false)

console.log(`${ok}/${tot} — prêmio`)
process.exit(ok === tot ? 0 : 1)
