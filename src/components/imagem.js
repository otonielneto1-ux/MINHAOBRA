// Compressão de imagem no navegador antes de guardar (PRD: máx. 1200 px, qualidade 0.8).
// Fica fora de src/lib porque usa canvas do navegador.

import { formatoDeSaida, medidasReduzidas } from '../lib/imagem.js'

function carregar(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler esta imagem.')) }
    img.src = url
  })
}

// Devolve a imagem reduzida como texto (data URL), pronta para guardar.
export async function comprimirImagem(arquivo, { maxLado, formato }) {
  const img = await carregar(arquivo)
  const { largura, altura } = medidasReduzidas(img.naturalWidth, img.naturalHeight, maxLado)
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  const tipo = formatoDeSaida(formato, arquivo.type)
  if (tipo === 'image/jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, largura, altura) }
  ctx.drawImage(img, 0, 0, largura, altura)
  return canvas.toDataURL(tipo, 0.8)
}
