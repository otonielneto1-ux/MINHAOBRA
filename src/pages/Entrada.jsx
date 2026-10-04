import { useEffect, useState } from 'react'
import { listarUsuariosDeExemplo } from '../lib/dados.js'
import { Icone } from '../components/index.jsx'

// Entrada do modo exemplo: escolher como quem entrar, para ver o app de cada perfil.
// Na etapa do Supabase, vira a tela de login com e-mail e senha.
export default function Entrada({ entrar }) {
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    listarUsuariosDeExemplo().then(({ data }) => setUsuarios(data || []))
  }, [])

  return (
    <div className="entrada">
      <div className="entrada-caixa">
        <div className="entrada-topo">
          <div className="lab">Gestão de canteiro · modo de exemplo</div>
          <h1>Minha Obra</h1>
          <p className="muted" style={{ marginTop: 8 }}>Ainda não há login de verdade. Escolha como quem você quer entrar para ver o app de cada perfil.</p>
        </div>
        <div className="entrada-corpo lista">
          {usuarios.map((u) => (
            <button key={u.id} className="linha" onClick={() => entrar(u)}>
              <span className="box" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}><Icone nome="perfil" /></span>
              <div className="linha-main">
                <div className="linha-titulo">{u.nome}</div>
                <div className="meta">{u.role}</div>
              </div>
              <Icone nome="direita" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
