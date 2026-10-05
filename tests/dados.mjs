// Camada de dados (modo exemplo): portas de entrada da capa.
// O localStorage é trocado por um falso ANTES de importar dados.js, para o teste
// não depender de o Node não ter navegador.
const guardado = new Map()
let cheio = false
globalThis.localStorage = {
  getItem: (k) => guardado.get(k) ?? null,
  setItem: (k, v) => { if (cheio) throw new Error('QuotaExceededError'); guardado.set(k, v) },
  removeItem: (k) => guardado.delete(k),
}
const { definirUsuario, definirObraAtual, salvarImagem, salvarNomeConstrutora, buscarCapa } = await import('../src/lib/dados.js')

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const erro = async (p) => (await p).erro

definirObraAtual(1)
definirUsuario({ id: 1, role: 'Engenheiro' })
conferir('nome interno do JavaScript não passa como tipo de imagem', await erro(salvarImagem('toString', 'x')), 'Imagem desconhecida.')
conferir('tipo inventado não passa', await erro(salvarImagem('foto_qualquer', 'x')), 'Imagem desconhecida.')

conferir('foto da obra é guardada', await erro(salvarImagem('foto_obra', 'data:foto')), null)
conferir('a capa devolve a foto guardada', (await buscarCapa()).data.foto_obra, 'data:foto')
conferir('a chave leva o id da obra', guardado.get('minhaobra:obra:1:foto_obra'), 'data:foto')
conferir('remover apaga do navegador', [await erro(salvarImagem('foto_obra', null)), guardado.has('minhaobra:obra:1:foto_obra')], [null, false])

conferir('nome da construtora vazio é recusado', await erro(salvarNomeConstrutora('  ')), 'Informe o nome da construtora.')
conferir('nome da construtora é salvo sem espaços sobrando', [await erro(salvarNomeConstrutora(' Solutio Engenharia ')), (await buscarCapa()).data.construtora], [null, 'Solutio Engenharia'])

cheio = true
conferir('navegador cheio: imagem avisa', await erro(salvarImagem('logo_cliente', 'data:logo')), 'Não coube no navegador. Tente uma imagem menor.')
conferir('navegador cheio: nome avisa', await erro(salvarNomeConstrutora('Outra')), 'Não coube no navegador.')
conferir('navegador cheio: nada muda', (await buscarCapa()).data.construtora, 'Solutio Engenharia')
cheio = false

definirUsuario({ id: 3, role: 'Mestre' })
conferir('mestre não troca imagens', await erro(salvarImagem('foto_obra', 'x')), 'Seu perfil não troca as imagens.')
conferir('mestre não troca o nome da construtora', await erro(salvarNomeConstrutora('Outra')), 'Seu perfil não altera a construtora.')

console.log(`${ok}/${tot} — dados`)
process.exit(ok === tot ? 0 : 1)
