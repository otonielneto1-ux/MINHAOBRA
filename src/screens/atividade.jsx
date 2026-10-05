// Planejamento › Semana: janelas de montar a semana (Engenheiro e Coordenador).
// FolhaAtividade: nova / editar / excluir. FolhaDistribuir: repartir o que falta pelos dias da semana.
// Conferencia: as quatro perguntas antes da primeira atividade de um serviço (bloqueia sem os quatro "sim").

import { useState } from 'react'
import * as dados from '../lib/dados.js'
import { CONFERENCIA_INICIO, conferenciaOk, distribuirNaSemana, precisaConferencia, validarAtividade } from '../lib/pcp.js'
import { diasDaSemana, diaMes, nomeDia, somarDias } from '../lib/datas.js'
import { arredondar, quantidade } from '../lib/formato.js'
import { servicosMedidos } from '../lib/avanco.js'
import { Folha, Status, useAoAbrir } from '../components/index.jsx'

const BLOQUEIO = 'Responda a conferência: as quatro precisam ser "sim" para planejar o início do serviço.'

export function Conferencia({ respostas = [], mudar }) {
  return (
    <div className="conferencia">
      <div className="lab lab-ink">Antes de começar o serviço</div>
      {CONFERENCIA_INICIO.map((pergunta, i) => (
        <div key={pergunta} className="conf-linha">
          <span>{pergunta}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="chave" aria-pressed={respostas[i] === true} onClick={() => mudar(i, true)}>Sim</button>
            <button type="button" className="chave" aria-pressed={respostas[i] === false} onClick={() => mudar(i, false)}>Não</button>
          </div>
        </div>
      ))}
      {respostas.some((r) => r === false) && (
        <p className="meta warn" style={{ marginTop: 8 }}>Resolva antes de planejar. Registre a pendência como restrição no plano de 3 meses.</p>
      )}
    </div>
  )
}

const responder = (respostas, i, v) => { const r = [...respostas]; r[i] = v; return r }

// aberta: { atividade } para editar, { inicial } para nova (inicial pode trazer servico_id, data_prevista e local).
export function FolhaAtividade({ aberta, segunda, hoje, servicos, pacotes, atividades, fechar, salvo }) {
  const [campos, setCampos] = useState({})
  const [busca, setBusca] = useState('')
  const [respostas, setRespostas] = useState([])
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)

  // Ao abrir, o formulário recomeça com os dados da atividade (ou com o que veio sugerido).
  // Atividade nova só de hoje em diante; editar mantém o dia que ela já tem.
  const editando = !!aberta?.atividade
  const dias = diasDaSemana(segunda).filter((d) => editando || d >= hoje)
  useAoAbrir(aberta, () => {
    const a = aberta.atividade || aberta.inicial || {}
    const s = servicos.find((x) => x.id === a.servico_id)
    setCampos({
      servico_id: a.servico_id ?? '', data_prevista: dias.includes(a.data_prevista) ? a.data_prevista : dias[0] || '', local: a.local ?? s?.local ?? '',
      quantidade_planejada: a.quantidade_planejada ?? '', equipe: a.equipe ?? '', pacote_id: a.pacote_id ?? '',
    })
    setBusca('')
    setRespostas([])
    setErro(null)
  })

  const servico = servicos.find((s) => s.id === Number(campos.servico_id))
  // Conferência de início: atividade nova, ou edição que troca para um serviço que ainda não começou.
  const outras = atividades.filter((a) => a.id !== aberta?.atividade?.id)
  const conferir = servico && (!editando || servico.id !== aberta.atividade.servico_id) && precisaConferencia(servico, outras)
  const termo = busca.trim().toLowerCase()
  const opcoes = servicosMedidos(servicos)
    .filter((s) => !termo || s.id === servico?.id || `${s.codigo_eap} ${s.nome}`.toLowerCase().includes(termo))
  const pacotesDoServico = pacotes.filter((p) => p.servico_id === servico?.id && !p.fechado_em)
  const mudar = (k, v) => { setCampos((c) => ({ ...c, [k]: v })); setErro(null) }

  function escolherServico(id) {
    const s = servicos.find((x) => x.id === Number(id))
    // Local vem do serviço, se a pessoa ainda não escreveu outro.
    setCampos((c) => ({ ...c, servico_id: id, pacote_id: '', local: c.local && c.local !== servico?.local ? c.local : s?.local || '' }))
    setRespostas([])
    setErro(null)
  }

  async function salvar() {
    if (conferir && !conferenciaOk(respostas)) { setErro(BLOQUEIO); return }
    const pacote = pacotes.find((p) => p.id === Number(campos.pacote_id))
    const v = validarAtividade(campos, { servico, pacote, segunda, hoje, nova: !editando })
    if (v.erro) { setErro(v.erro); return }
    setSalvando(true)
    const r = editando ? await dados.editarAtividade(aberta.atividade.id, v.registro) : await dados.criarAtividades([v.registro])
    setSalvando(false)
    if (r.erro) { setErro(r.erro); return }
    salvo(editando ? 'Atividade salva' : 'Atividade criada')
  }

  async function excluir() {
    setSalvando(true)
    const r = await dados.excluirAtividade(aberta.atividade.id)
    setSalvando(false)
    if (r.erro) { setErro(r.erro); return }
    salvo('Atividade excluída')
  }

  return (
    <Folha aberta={!!aberta} fechar={fechar} rotulo={editando ? 'Editar atividade' : 'Nova atividade'}>
      {aberta && (
        <>
          <div className="lab">{editando ? 'Editar atividade' : 'Nova atividade'} · semana {diaMes(segunda)} a {diaMes(somarDias(segunda, 5))}</div>
          <h2>{servico?.nome || 'Escolha o serviço'}</h2>
          <div className="campo">
            <label className="lab" htmlFor="busca-servico">Serviço</label>
            <input id="busca-servico" className="ipt" placeholder="Buscar por nome ou EAP" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <select className="ipt" aria-label="Serviço" value={campos.servico_id} onChange={(e) => escolherServico(e.target.value)}>
              <option value="">— escolha —</option>
              {opcoes.map((s) => <option key={s.id} value={s.id}>{s.codigo_eap} · {s.nome}</option>)}
            </select>
          </div>
          {conferir && <Conferencia respostas={respostas} mudar={(i, v) => { setRespostas(responder(respostas, i, v)); setErro(null) }} />}
          <div className="campo">
            <label className="lab" htmlFor="dia-atividade">Dia</label>
            <select id="dia-atividade" className="ipt" value={campos.data_prevista} onChange={(e) => mudar('data_prevista', e.target.value)}>
              {dias.length === 0 && <option value="">Semana encerrada</option>}
              {dias.map((d) => <option key={d} value={d}>{nomeDia(d)} · {diaMes(d)}</option>)}
            </select>
          </div>
          <div className="campo">
            <label className="lab" htmlFor="local-atividade">Local</label>
            <input id="local-atividade" className="ipt" value={campos.local} onChange={(e) => mudar('local', e.target.value)} placeholder="Rua, quadra ou trecho" />
          </div>
          <div className="campo">
            <label className="lab" htmlFor="qtd-atividade">Quantidade programada para o dia</label>
            <div className="qtd-ipt">
              <input id="qtd-atividade" inputMode="decimal" value={campos.quantidade_planejada} onChange={(e) => mudar('quantidade_planejada', e.target.value)} />
              <span>{servico?.unidade || '—'}</span>
            </div>
            {servico && <span className="meta">Executado {quantidade(servico.quantidade_executada, servico.unidade)} de {quantidade(servico.quantidade_prevista, servico.unidade)}</span>}
          </div>
          <div className="campo">
            <label className="lab" htmlFor="equipe-atividade">Equipe (opcional)</label>
            <input id="equipe-atividade" className="ipt" value={campos.equipe} onChange={(e) => mudar('equipe', e.target.value)} placeholder="Ex.: Eq. Raimundo" />
          </div>
          <div className="campo">
            <label className="lab" htmlFor="pacote-atividade">Pacote (opcional)</label>
            <select id="pacote-atividade" className="ipt" value={campos.pacote_id} onChange={(e) => mudar('pacote_id', e.target.value)} disabled={!servico}>
              <option value="">Sem pacote</option>
              {pacotesDoServico.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
          <div className="folha-acoes">
            <button className="btn btn-quiet btn-lg" onClick={fechar}>Cancelar</button>
            <button className="btn btn-fill btn-lg" onClick={salvar} disabled={salvando || (conferir && !conferenciaOk(respostas))}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
          {editando && <button className="btn btn-perigo btn-bloco" style={{ marginTop: 10 }} onClick={excluir} disabled={salvando}>Excluir atividade</button>}
        </>
      )}
    </Folha>
  )
}

// Distribuir na semana: para cada serviço previsto ou atrasado (e os que podem ser antecipados),
// o que falta ÷ os dias de trabalho até o fim previsto, nos dias livres desta semana.
// aberta: {} ou { foco: id do serviço a antecipar }.
export function FolhaDistribuir({ aberta, segunda, hoje, linhas, antecipaveis, atividades, producoes, fechar, salvo }) {
  const [marcados, setMarcados] = useState(new Set())
  const [respostas, setRespostas] = useState({})
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const itens = !aberta ? [] : [
    ...linhas.map((l) => ({
      s: l.servico, atraso: l.atraso, antecipar: false,
      d: distribuirNaSemana(l.servico, { segunda, hoje, producoes, ocupados: l.atividades.map((a) => a.data_prevista) }),
    })),
    ...antecipaveis.map((s) => ({ s, atraso: 0, antecipar: true, d: distribuirNaSemana(s, { segunda, hoje, producoes, antecipar: true }) })),
  ].filter((x) => x.d).map((x) => ({ ...x, conferir: precisaConferencia(x.s, atividades) }))

  // Ao abrir, vêm marcados os previstos e atrasados que não pedem conferência (e o serviço escolhido para antecipar).
  useAoAbrir(aberta, () => {
    setMarcados(new Set(itens.filter((x) => (!x.antecipar && !x.conferir) || x.s.id === aberta.foco).map((x) => x.s.id)))
    setRespostas({})
    setErro(null)
  })

  const liberado = (x) => !x.conferir || conferenciaOk(respostas[x.s.id])
  const escolhidos = itens.filter((x) => marcados.has(x.s.id))

  function alternar(id) {
    const novo = new Set(marcados)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setMarcados(novo)
    setErro(null)
  }

  async function criar() {
    if (escolhidos.some((x) => !liberado(x))) { setErro(BLOQUEIO); return }
    const registros = escolhidos.flatMap((x) => x.d.registros)
    setSalvando(true)
    const r = await dados.criarAtividades(registros)
    setSalvando(false)
    if (r.erro) { setErro(r.erro); return }
    salvo(`${registros.length} ${registros.length === 1 ? 'atividade criada' : 'atividades criadas'} · confira local e equipe`)
  }

  const bloco = (titulo, lista) => lista.length > 0 && (
    <>
      <div className="lab lab-ink" style={{ margin: '14px 0 4px' }}>{titulo}</div>
      <div className="lista">
        {lista.map((x) => {
          const { s, d } = x
          return (
            <div key={s.id} className="linha" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <label className="marcar" style={{ display: 'flex', gap: 14, flex: 1, minWidth: 0 }}>
                <input type="checkbox" checked={marcados.has(s.id)} onChange={() => alternar(s.id)} />
                <div className="linha-main">
                  <div className="linha-titulo">{s.codigo_eap} · {s.nome}</div>
                  <div className="meta">{nomeDia(d.dias[0])}{d.dias.length > 1 ? ` a ${nomeDia(d.dias[d.dias.length - 1])}` : ''} · {d.dias.length} {d.dias.length === 1 ? 'dia' : 'dias'} · {s.local || 'local a definir'}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {x.atraso > 0 && <Status tom="crit">Atrasado {x.atraso} d</Status>}
                    {d.prazoVencido && <Status tom="crit">Prazo vencido</Status>}
                    {x.antecipar && <Status tom="info">Antecipar</Status>}
                  </div>
                  {d.irreal && (
                    <p className="meta warn" style={{ marginTop: 6 }}>
                      ⚠ Ritmo irreal: precisa {quantidade(d.porDia, s.unidade)}/dia; o {d.base === 'histórico' ? 'melhor ritmo das últimas 4 semanas' : 'ritmo planejado'} é {quantidade(arredondar(d.referencia, 1), s.unidade)}/dia.
                    </p>
                  )}
                </div>
              </label>
              <div className="linha-qtd num">{quantidade(d.porDia, s.unidade)}<small>/dia</small></div>
              {x.conferir && marcados.has(s.id) && (
                <div style={{ width: '100%' }}>
                  <Conferencia respostas={respostas[s.id]} mudar={(i, v) => { setRespostas({ ...respostas, [s.id]: responder(respostas[s.id] || [], i, v) }); setErro(null) }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <Folha aberta={!!aberta} fechar={fechar} rotulo="Distribuir na semana">
      {aberta && (
        <>
          <div className="lab">Distribuir na semana</div>
          <h2>Semana {diaMes(segunda)} a {diaMes(somarDias(segunda, 5))}</h2>
          <p className="sub">O que falta de cada serviço, dividido igualmente pelos dias de trabalho até o fim previsto: recupera o atraso sem mudar o prazo final. Só entram os dias livres, de hoje em diante.</p>
          {itens.length === 0 && <p className="vazio-curto">Nada a distribuir: os dias desta semana já estão planejados.</p>}
          {bloco('Previstos e atrasados', itens.filter((x) => !x.antecipar))}
          {bloco('Pode antecipar', itens.filter((x) => x.antecipar))}
          {erro && <p className="erro-campo" role="alert" style={{ margin: '12px 0' }}>{erro}</p>}
          <div className="folha-acoes" style={{ marginTop: 16 }}>
            <button className="btn btn-quiet btn-lg" onClick={fechar}>Cancelar</button>
            <button className="btn btn-fill btn-lg" onClick={criar} disabled={salvando || escolhidos.length === 0 || escolhidos.some((x) => !liberado(x))}>
              {salvando ? 'Criando…' : `Criar ${escolhidos.reduce((t, x) => t + x.d.dias.length, 0) || ''}`.trim()}
            </button>
          </div>
        </>
      )}
    </Folha>
  )
}
