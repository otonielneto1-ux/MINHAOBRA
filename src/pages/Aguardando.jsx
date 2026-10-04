import { Icone } from '../components/index.jsx'

export default function Aguardando({ usuario, sair }) {
  return (
    <div className="entrada">
      <div className="entrada-caixa" style={{ textAlign: 'center' }}>
        <div className="entrada-corpo" style={{ padding: '40px 24px' }}>
          <div className="vazio-icone"><Icone nome="relogio" /></div>
          <div className="lab">{usuario.nome} · {usuario.role}</div>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: '10px 0' }}>Conta aguardando liberação do administrador</h1>
          <p className="muted" style={{ marginBottom: 24 }}>Você vai conseguir entrar assim que o engenheiro liberar seu acesso.</p>
          <button className="btn btn-lg" onClick={sair}><Icone nome="sair" />Sair</button>
        </div>
      </div>
    </div>
  )
}
