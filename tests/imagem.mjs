// Imagens da capa: arquivo aceito, formato de saída, redução e iniciais.
import { validarArquivoImagem, formatoDeSaida, medidasReduzidas, iniciais } from '../src/lib/imagem.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const MB = 1024 * 1024

conferir('JPG pequeno é aceito', validarArquivoImagem({ type: 'image/jpeg', size: 2 * MB }), null)
conferir('PNG é aceito', validarArquivoImagem({ type: 'image/png', size: 1 * MB }), null)
conferir('PDF é recusado', validarArquivoImagem({ type: 'application/pdf', size: 1 * MB }), 'Escolha uma imagem JPG, PNG ou WEBP.')
conferir('acima de 15 MB é recusado', validarArquivoImagem({ type: 'image/jpeg', size: 16 * MB }), 'A imagem passa de 15 MB. Escolha uma menor.')

conferir('logo PNG continua PNG (transparência)', formatoDeSaida('logo', 'image/png'), 'image/png')
conferir('logo JPG vira JPEG', formatoDeSaida('logo', 'image/jpeg'), 'image/jpeg')
conferir('foto sempre vira JPEG', formatoDeSaida('foto', 'image/png'), 'image/jpeg')

conferir('foto grande deitada reduz pelo lado maior', medidasReduzidas(4000, 3000, 1200), { largura: 1200, altura: 900 })
conferir('foto em pé reduz pela altura', medidasReduzidas(3000, 4000, 1200), { largura: 900, altura: 1200 })
conferir('imagem pequena não aumenta', medidasReduzidas(500, 300, 1200), { largura: 500, altura: 300 })

conferir('iniciais do cliente', iniciais('Conviver Urbanismo'), 'CU')
conferir('iniciais da construtora', iniciais('Solutio Engenharia'), 'SE')
conferir('ignora "de", "da"', iniciais('Construtora de Obras'), 'CO')
conferir('nome vazio não quebra', iniciais(''), '—')

console.log(`${ok}/${tot} — imagem`)
process.exit(ok === tot ? 0 : 1)
