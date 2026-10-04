// A obra escolhida vive aqui, junto com a lista de obras que a pessoa pode ver.
// Trocar de obra remonta a casca inteira (key={obraId} no App), para nada da
// obra anterior sobrar na tela.

import { createContext, useContext, useEffect, useState } from 'react'
import { definirObraAtual, listarMinhasObras } from './dados.js'

const ObraCtx = createContext(null)

export function ObraProvider({ children }) {
  const [obras, setObras] = useState(null)
  const [obraId, setObraId] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    listarMinhasObras().then(({ data, erro: e }) => {
      if (e) { setErro(e); return }
      setObras(data)
      if (data.length) {
        definirObraAtual(data[0].id)
        setObraId(data[0].id)
      }
    })
  }, [])

  function trocarObra(id) {
    definirObraAtual(id)
    setObraId(id)
  }

  const obra = obras?.find((o) => o.id === obraId) || null
  return <ObraCtx.Provider value={{ obras, obra, obraId, trocarObra, erro }}>{children}</ObraCtx.Provider>
}

export const useObra = () => useContext(ObraCtx)
