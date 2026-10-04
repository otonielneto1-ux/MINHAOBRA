// Meu perfil.

import { Cabecalho, Icone, Secao, useAviso } from '../components/index.jsx'

export default function Perfil({ usuario, sair }) {
  const aviso = useAviso()
  return (
    <>
      <Cabecalho rotulo="Meu perfil" titulo={usuario.nome} />
      <Secao rotulo="Conta">
        <div className="pares">
          <div><span>E-mail</span><b>{usuario.email}</b></div>
          <div><span>Perfil</span><b>{usuario.role}</b></div>
        </div>
        <div className="filtros" style={{ marginTop: 18 }}>
          <button className="btn" onClick={() => aviso('Trocar senha chega com o login de verdade')}>Trocar senha</button>
          <button className="btn btn-perigo" onClick={sair}><Icone nome="sair" />Sair</button>
        </div>
      </Secao>
    </>
  )
}
