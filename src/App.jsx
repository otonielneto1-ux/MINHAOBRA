import { useState } from 'react'
import { definirUsuario } from './lib/dados.js'
import { perfilLiberado } from './lib/permissoes.js'
import { ObraProvider, useObra } from './lib/ObraContext.jsx'
import { AvisoProvider, Carregando, Vazio } from './components/index.jsx'
import Entrada from './pages/Entrada.jsx'
import Aguardando from './pages/Aguardando.jsx'
import Shell from './pages/Shell.jsx'

// Modo exemplo: escolhe-se um usuário de exemplo na entrada.
// Na etapa do Supabase, aqui passa a escutar o login real e buscar o `profiles`.
export default function App() {
  const [usuario, setUsuario] = useState(null)

  function entrar(profile) {
    definirUsuario(profile)
    setUsuario(profile)
  }

  function sair() {
    definirUsuario(null)
    setUsuario(null)
  }

  if (!usuario) return <Entrada entrar={entrar} />
  if (!perfilLiberado(usuario.role)) return <Aguardando usuario={usuario} sair={sair} />

  return (
    <AvisoProvider>
      <ObraProvider key={usuario.id}>
        <ComObra usuario={usuario} sair={sair} />
      </ObraProvider>
    </AvisoProvider>
  )
}

function ComObra({ usuario, sair }) {
  const { obras, obraId } = useObra()
  if (!obras) return <Carregando />
  if (!obraId) {
    return (
      <div className="content">
        <Vazio icone="cadastros" titulo="Nenhuma obra liberada para você" texto="Peça ao engenheiro para te dar acesso a uma obra." />
        <div style={{ textAlign: 'center' }}><button className="btn" onClick={sair}>Sair</button></div>
      </div>
    )
  }
  // key={obraId}: trocar de obra remonta tudo, sem sobrar nada da anterior.
  return <Shell key={obraId} usuario={usuario} sair={sair} />
}
