// A casca: menu lateral (tela larga), barra inferior (celular), topo com a obra,
// e a troca de telas por estado (sem endereço no navegador).

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { hoje } from '../lib/dados.js'
import { dataBr, nomeDia } from '../lib/datas.js'
import { USAR_MOCK } from '../lib/config.js'
import { divisaoCelular, menuDoPerfil, telaInicial } from '../lib/permissoes.js'
import { Folha, Icone } from '../components/index.jsx'

import Inicio from '../screens/inicio.jsx'
import Hoje from '../screens/hoje.jsx'
import Planejamento from '../screens/planejamento.jsx'
import Servico from '../screens/servico.jsx'
import Importar from '../screens/importar.jsx'
import Pacotes from '../screens/pacotes.jsx'
import Pacote from '../screens/pacote.jsx'
import Fechamento from '../screens/fechamento.jsx'
import Efetivo from '../screens/efetivo.jsx'
import Avanco from '../screens/avanco.jsx'
import Ocorrencias from '../screens/ocorrencias.jsx'
import Ocorrencia from '../screens/ocorrencia.jsx'
import NovaOcorrencia from '../screens/novaOcorrencia.jsx'
import Cadastros from '../screens/cadastros.jsx'
import Perfil from '../screens/perfil.jsx'

const ROTULOS = {
  inicio: 'Início', hoje: 'Hoje', planejamento: 'Planejamento', pacotes: 'Pacotes', efetivo: 'Efetivo',
  ocorrencias: 'Ocorrências', cadastros: 'Cadastros', avanco: 'Avanço',
}
const CURTOS = { planejamento: 'Planej.', ocorrencias: 'Ocorr.' }

// Tela de detalhe → item de menu que fica aceso.
const MENU_DA_TELA = {
  servico: 'planejamento', importar: 'planejamento', pacote: 'pacotes', fechamento: 'pacotes',
  ocorrencia: 'ocorrencias', novaOcorrencia: 'ocorrencias',
}

const TELAS = {
  inicio: Inicio, hoje: Hoje, planejamento: Planejamento, servico: Servico, importar: Importar,
  pacotes: Pacotes, pacote: Pacote, fechamento: Fechamento, efetivo: Efetivo, avanco: Avanco,
  ocorrencias: Ocorrencias, ocorrencia: Ocorrencia, novaOcorrencia: NovaOcorrencia,
  cadastros: Cadastros, perfil: Perfil,
}

export default function Shell({ usuario, sair }) {
  const { obras, obra, trocarObra } = useObra()
  const [rota, setRota] = useState({ screen: telaInicial(usuario.role), params: {} })
  const [maisAberto, setMaisAberto] = useState(false)

  const menu = menuDoPerfil(usuario.role)
  const { barra, mais } = divisaoCelular(usuario.role)
  const ativo = MENU_DA_TELA[rota.screen] || rota.screen

  function goto(screen, params = {}) {
    setRota({ screen, params })
    setMaisAberto(false)
    window.scrollTo(0, 0)
  }

  const Tela = TELAS[rota.screen] || TELAS[telaInicial(usuario.role)]
  const dia = hoje()

  return (
    <>
      <aside className="side" aria-label="Menu principal">
        <div className="brand"><div className="lab">Gestão de canteiro</div><div className="brand-name">Minha Obra</div></div>
        <nav>
          {menu.map((id) => (
            <button key={id} className="nav-btn" aria-current={ativo === id ? 'page' : undefined} onClick={() => goto(id)}>
              <Icone nome={id} /><span>{ROTULOS[id]}</span>
            </button>
          ))}
        </nav>
        <button className="side-foot" onClick={() => goto('perfil')}>
          <div><b>{usuario.nome}</b><span className="lab">{usuario.role}</span></div>
        </button>
      </aside>

      <div className="main">
        <header className="top">
          <div className="obra">
            <div className="lab">Obra selecionada</div>
            {obras.length > 1 ? (
              <select className="obra-select" value={obra.id} onChange={(e) => trocarObra(Number(e.target.value))} aria-label="Trocar de obra">
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            ) : (
              <div className="obra-name">{obra.nome}</div>
            )}
            <div className="meta obra-meta">{obra.cidade}/{obra.uf} · {obra.cliente}</div>
          </div>
          <div className="top-right">
            <div className="status-line">
              <span className="data">{nomeDia(dia)} · {dataBr(dia)}<br /></span>
              {USAR_MOCK && <><i />Modo exemplo</>}
            </div>
          </div>
        </header>
        <main className="content">
          <Tela goto={goto} params={rota.params} usuario={usuario} sair={sair} />
        </main>
      </div>

      <nav className="bottombar" aria-label="Menu principal">
        {barra.map((id) => (
          <button key={id} className="aba" aria-label={ROTULOS[id]} aria-current={ativo === id ? 'page' : undefined} onClick={() => goto(id)}>
            <Icone nome={id} /><span>{CURTOS[id] || ROTULOS[id]}</span>
          </button>
        ))}
        <button className="aba" aria-current={mais.includes(ativo) || ativo === 'perfil' ? 'page' : undefined} onClick={() => setMaisAberto(true)}>
          <Icone nome="mais" /><span>Mais</span>
        </button>
      </nav>

      <Folha aberta={maisAberto} fechar={() => setMaisAberto(false)} rotulo="Mais opções">
        <div className="lab" style={{ marginBottom: 8 }}>Mais opções</div>
        {mais.map((id) => (
          <button key={id} className="item-mais" onClick={() => goto(id)}><Icone nome={id} />{ROTULOS[id]}</button>
        ))}
        <button className="item-mais" onClick={() => goto('perfil')}><Icone nome="perfil" />Meu perfil</button>
        <button className="item-mais" onClick={sair}><Icone nome="sair" />Sair</button>
        <div className="folha-acoes" style={{ marginTop: 14 }}><button className="btn btn-quiet btn-lg" onClick={() => setMaisAberto(false)}>Fechar</button></div>
      </Folha>
    </>
  )
}
