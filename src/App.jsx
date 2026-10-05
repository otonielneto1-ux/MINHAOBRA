import { useEffect, useState } from 'react'
import * as dados from './lib/dados.js'
import { perfilLiberado } from './lib/permissoes.js'
import { ObraProvider, useObra } from './lib/ObraContext.jsx'
import { AvisoProvider, Carregando, ErroCaixa, Vazio } from './components/index.jsx'
import Login from './pages/Login.jsx'
import Aguardando from './pages/Aguardando.jsx'
import Shell from './pages/Shell.jsx'

// Escuta o login do Supabase e busca o perfil (profiles) de quem entrou.
export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const [usuario, setUsuario] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    dados.sessaoAtual().then(setSessao)
    const inscricao = dados.aoMudarSessao(setSessao)
    return () => inscricao.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) { dados.definirUsuario(null); setUsuario(null); return }
    dados.buscarMeuPerfil(sessao.user.id).then(({ data, erro: e }) => {
      if (e) { setErro(e); return }
      dados.definirUsuario(data)
      setUsuario(data)
    })
  }, [sessao?.user?.id])

  const sair = () => dados.sair()

  if (sessao === undefined) return <Carregando />
  if (!sessao) return <Login />
  if (erro) return <div className="content"><ErroCaixa erro={erro} tentarDeNovo={() => location.reload()} /></div>
  if (!usuario) return <Carregando />
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
