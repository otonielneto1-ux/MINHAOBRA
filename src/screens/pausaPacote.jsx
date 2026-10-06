// Pausar o pacote (Engenheiro e Coordenador): o problema, a data e, se quiser, levar a equipe para outro
// pacote para completar o mês. modo 'levar': só a troca de pacote (pacote já pausado).
// Quem entra no outro pacote depois do início dele recebe proporcional aos dias (lib/premio.js).

import { useState } from 'react'
import * as dados from '../lib/dados.js'
import { destinosPossiveis, saidaDesde, validarPausa, validarRemanejo } from '../lib/premio.js'
import { dataBr } from '../lib/datas.js'
import { Folha, useAoAbrir } from '../components/index.jsx'
import { EscolherMotivo } from '../components/motivo.jsx'

// aberta: { modo: 'pausar' | 'levar' } ou null.
export function FolhaPausa({ aberta, pacote: p, pacotes, funcionarios, hoje, fechar, salvo }) {
  const [campos, setCampos] = useState({})
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const levar = aberta?.modo === 'levar'

  useAoAbrir(aberta, () => {
    setCampos({ motivo: null, data: hoje, destino: '', entrada: hoje, colaboradores: p.colaboradores.filter((id) => !p.saidas?.[id]) })
    setErro(null)
  })

  if (!aberta || !campos.colaboradores) return null
  const mudar = (k, v) => { setCampos((c) => ({ ...c, [k]: v })); setErro(null) }
  const destinos = destinosPossiveis(pacotes, p, campos.entrada)
  // Quem já saiu não vai de novo.
  const equipe = p.colaboradores.filter((id) => !p.saidas?.[id]).map((id) => funcionarios.find((f) => f.id === id)).filter(Boolean)
  const marcado = (id) => campos.colaboradores.includes(id)

  async function salvar() {
    const pausa = levar ? null : validarPausa(campos, p, hoje)
    if (pausa?.erro) { setErro(pausa.erro); return }
    const troca = validarRemanejo({ destino: campos.destino, colaboradores: campos.colaboradores, data: campos.entrada, pausa: pausa?.data }, pacotes, p, levar)
    if (troca?.erro) { setErro(troca.erro); return }
    setSalvando(true)
    // Pausar e levar a equipe vão juntos ao banco (tudo ou nada).
    const r = pausa ? await dados.pausarPacote(p.id, pausa.motivo, pausa.data, troca) : await dados.remanejarColaboradores(troca.destino, troca.colaboradores, troca.data, p.id)
    setSalvando(false)
    if (r.erro) { setErro(r.erro); return }
    const nome = troca && pacotes.find((x) => x.id === troca.destino)?.nome
    salvo([pausa && 'Pacote pausado', nome && `equipe levada para ${nome}`].filter(Boolean).join(' · '))
  }

  return (
    <Folha aberta fechar={fechar} rotulo={levar ? 'Levar equipe para outro pacote' : 'Pausar pacote'}>
      <div className="lab">{levar ? 'Levar equipe para outro pacote' : 'Pausar pacote'}</div>
      <h2>{p.nome}</h2>
      {!levar && (
        <>
          <p className="sub">O pacote inteiro para. Se fechar a folha pausado, paga o prêmio proporcional ao que foi executado da meta.</p>
          <div className="campo">
            <EscolherMotivo motivo={campos.motivo} rotulo="Qual o problema? Escolha o grupo" mudar={(m) => mudar('motivo', m)} />
          </div>
          <div className="campo" style={{ maxWidth: 220 }}>
            <label className="lab" htmlFor="data-pausa">Parou em</label>
            <input id="data-pausa" type="date" className="ipt" min={p.data_inicio} max={hoje} value={campos.data} onChange={(e) => mudar('data', e.target.value)} />
          </div>
        </>
      )}

      <div className="campo">
        <label className="lab" htmlFor="destino-pacote">{levar ? 'Para qual pacote' : 'Levar a equipe para outro pacote (opcional)'}</label>
        <select id="destino-pacote" className="ipt" value={campos.destino} onChange={(e) => mudar('destino', e.target.value)}>
          <option value="">{levar ? '— escolha —' : 'Não levar agora'}</option>
          {destinos.map((x) => <option key={x.id} value={x.id}>{x.nome} · fecha {dataBr(x.data_fechamento)}</option>)}
        </select>
        {destinos.length === 0 && <span className="meta warn">Nenhum pacote aberto para receber a equipe. Crie um em Pacotes.</span>}
      </div>
      {campos.destino && (
        <>
          <div className="campo" style={{ maxWidth: 220 }}>
            <label className="lab" htmlFor="entrada-pacote">Entra no outro pacote em</label>
            <input id="entrada-pacote" type="date" className="ipt" min={saidaDesde(p, levar ? null : campos.data) ?? undefined} value={campos.entrada} onChange={(e) => mudar('entrada', e.target.value)} />
            <span className="meta">Quem entra depois do início recebe proporcional aos dias úteis no pacote.</span>
          </div>
          <div className="campo">
            <span className="lab">Quem vai · {campos.colaboradores.length}</span>
            <div className="lista">
              {equipe.map((f) => (
                <label key={f.id} className="linha marcar" style={{ minHeight: 48, padding: '8px 0' }}>
                  <input type="checkbox" checked={marcado(f.id)}
                    onChange={() => mudar('colaboradores', marcado(f.id) ? campos.colaboradores.filter((x) => x !== f.id) : [...campos.colaboradores, f.id])} />
                  <div className="linha-main"><b>{f.nome}</b> <span className="meta">· {f.funcao}</span></div>
                </label>
              ))}
            </div>
            <span className="meta">Quem vai sai deste pacote levando a parte dele × o % da meta atingida até agora (garantido), e soma com o que ganhar no outro.</span>
          </div>
        </>
      )}

      {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
      <div className="folha-acoes">
        <button className="btn btn-quiet btn-lg" onClick={fechar}>Cancelar</button>
        <button className="btn btn-fill btn-lg" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : levar ? 'Levar equipe' : 'Pausar'}</button>
      </div>
    </Folha>
  )
}
