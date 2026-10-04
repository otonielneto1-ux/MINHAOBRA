// Formatação no padrão brasileiro e saudação pela hora.
import { saudacao, quantidade, pontos } from '../src/lib/formato.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('5h é bom dia', saudacao(5), 'Bom dia')
conferir('11h é bom dia', saudacao(11), 'Bom dia')
conferir('12h é boa tarde', saudacao(12), 'Boa tarde')
conferir('17h é boa tarde', saudacao(17), 'Boa tarde')
conferir('18h é boa noite', saudacao(18), 'Boa noite')
conferir('madrugada é boa noite', saudacao(2), 'Boa noite')

conferir('quantidade em % com uma casa', quantidade(3.2, '%'), '3,2%')
conferir('quantidade inteira com milhar', quantidade(1540, 'm'), '1.540 m')
conferir('diferença negativa com sinal de menos', pontos(-3.44), '−3,4 p.p.')

console.log(`${ok}/${tot} — formato`)
process.exit(ok === tot ? 0 : 1)
