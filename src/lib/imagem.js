// Regras das imagens da capa (foto da obra, logo do cliente, logo da construtora).
// Regra pura; a compressão no navegador fica em src/components/imagem.js.

export const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANHO_MAXIMO_MB = 15

// As três imagens da capa: onde moram e como são comprimidas.
export const IMAGENS_CAPA = {
  foto_obra: { rotulo: 'Foto da obra', maxLado: 1200, formato: 'foto' },
  logo_cliente: { rotulo: 'Logo do cliente', maxLado: 600, formato: 'logo' },
  logo_construtora: { rotulo: 'Logo da construtora', maxLado: 600, formato: 'logo' },
}

// Confere o arquivo escolhido antes de comprimir. Devolve null (ok) ou a mensagem de erro.
export function validarArquivoImagem({ type, size }) {
  if (!TIPOS_IMAGEM.includes(type)) return 'Escolha uma imagem JPG, PNG ou WEBP.'
  if (size > TAMANHO_MAXIMO_MB * 1024 * 1024) return `A imagem passa de ${TAMANHO_MAXIMO_MB} MB. Escolha uma menor.`
  return null
}

// Logo guarda transparência (PNG); foto vira JPEG, que é bem menor.
export function formatoDeSaida(formato, tipoOriginal) {
  if (formato === 'logo' && tipoOriginal === 'image/png') return 'image/png'
  return 'image/jpeg'
}

// Medidas finais mantendo a proporção, com o lado maior limitado.
export function medidasReduzidas(largura, altura, maxLado) {
  const maior = Math.max(largura, altura)
  if (maior <= maxLado) return { largura, altura }
  const f = maxLado / maior
  return { largura: Math.round(largura * f), altura: Math.round(altura * f) }
}

// "Conviver Urbanismo" → "CU"; "Solutio Engenharia" → "SE". Aparece enquanto não há logo.
export function iniciais(nome) {
  const palavras = (nome || '').split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
  const letras = palavras.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
  return letras || '—'
}
