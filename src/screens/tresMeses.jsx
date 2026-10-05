// Planejamento › 3 meses: serviços das próximas 13 semanas e suas restrições.
// Tela larga: tabela igual ao cronograma, com uma coluna por semana. Celular: lista agrupada por semana.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { linhasTresMeses, servicosNoPeriodo, validarRemocao, validarRestricao } from '../lib/pcp.js'
import { avancoServico } from '../lib/avanco.js'
import { dataBr, diaMes, segundaDaSemana, somarDias } from '../lib/datas.js'
import { porcento } from '../lib/formato.js'
import { STATUS_RESTRICAO, TIPOS_RESTRICAO } from '../lib/vocabulario.js'
import { Carregando, ErroCaixa, Folha, Status, useAviso, useCarga } from '../components/index.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarServicos(), dados.listarRestricoes(), dados.listarEtapas()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { servicos: r[0].data, restricoes: r[1].data, etapas: r[2].data }, erro: null }
}

export default function TresMeses({ goto, usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [etapa, setEtapa] = useState(null)
  const [soComRestricao, setSoComRestricao] = useState(false)
  const [aberto, setAberto] = useState(null)
  // As 4 primeiras semanas DA LISTA nascem abertas e as demais recolhidas; tocar no título inverte.
  const [alternadas, setAlternadas] = useState(new Set())
  const alternar = (seg) => {
    const novo = new Set(alternadas)
    if (novo.has(seg)) novo.delete(seg)
    else novo.add(seg)
    setAlternadas(novo)
  }
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const pendentes = (sid) => data.restricoes.filter((r) => r.servico_id === sid && r.status === STATUS_RESTRICAO.PENDENTE)
  const primeira = segundaDaSemana(dia)
  const semanas = Array.from({ length: 13 }, (_, i) => somarDias(primeira, 7 * i))
  const filtrar = (lista) => lista
    .filter((s) => etapa === null || s.etapa_entrega_id === etapa)
    .filter((s) => !soComRestricao || pendentes(s.id).length > 0)
  const gestao = pode(usuario.role, 'editarPlanejamento')
  const blocos = semanas
    .map((seg) => ({ seg, lista: filtrar(servicosNoPeriodo(data.servicos, seg, somarDias(seg, 5))) }))
    .filter((b) => b.lista.length > 0)
  const naJanela = new Set(filtrar(data.servicos).map((s) => s.id))
  const linhas = linhasTresMeses(data.servicos, semanas, dia).filter((l) => naJanela.has(l.servico.id))
  const etapaDe = (s) => data.etapas.find((e) => e.id === s.etapa_entrega_id)?.nome

  return (
    <>
      <div className="filtros">
        <button className="chave" aria-pressed={etapa === null} onClick={() => setEtapa(null)}>Todas as etapas</button>
        {data.etapas.map((e) => (
          <button key={e.id} className="chave" aria-pressed={etapa === e.id} onClick={() => setEtapa(e.id)}>{e.nome}</button>
        ))}
        <button className="chave" aria-pressed={soComRestricao} onClick={() => setSoComRestricao(!soComRestricao)}>Só com restrição pendente</button>
      </div>

      {linhas.length === 0 && <div className="section"><p className="vazio-curto" style={{ textAlign: 'center' }}>Nada previsto para os próximos 3 meses.</p></div>}

      {linhas.length > 0 && (
        <div className="tabela-wrap so-largo">
          <table className="tabela tres-tabela">
            <thead>
              <tr>
                <th>EAP</th><th>Serviço</th><th className="dir">%</th>
                {semanas.map((seg) => <th key={seg} className={`cel-semana ${seg === primeira ? 'hoje' : ''}`} title={`Semana ${diaMes(seg)} a ${diaMes(somarDias(seg, 5))}`}>{diaMes(seg)}</th>)}
                <th>Restrições</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ servico: s, atraso, ativas }) => {
                const n = pendentes(s.id).length
                const vencida = pendentes(s.id).some((r) => r.data_limite && r.data_limite < dia)
                return (
                  <tr key={s.id} className={`clicavel ${atraso > 0 ? 'atrasada' : ''}`} tabIndex={0}
                    onClick={() => setAberto({ servico: s, seg: ativas[0] })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAberto({ servico: s, seg: ativas[0] }) } }}>
                    <td className="num">{s.codigo_eap}</td>
                    <td className="nome">
                      <div style={{ fontWeight: 600 }}>{s.nome}</div>
                      <div className="meta">{s.local || '—'} · {etapaDe(s)}</div>
                      {(atraso > 0 || s.critico) && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {atraso > 0 && <Status tom="crit">Atrasado {atraso} d</Status>}
                          {s.critico && <Status tom="crit">Crítico</Status>}
                        </div>
                      )}
                    </td>
                    <td className="dir num">{porcento(avancoServico(s), 0)}</td>
                    {semanas.map((seg) => (
                      <td key={seg} className={`cel-semana ${seg === primeira ? 'hoje' : ''}`}>
                        {ativas.includes(seg) && <i className={`ativo ${atraso > 0 || s.critico ? 'crit' : ''}`} />}
                      </td>
                    ))}
                    <td>{n > 0 ? <Status tom={vencida ? 'crit' : 'warn'}>{n} {n === 1 ? 'pendente' : 'pendentes'}</Status> : <span className="meta">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="so-curto">
      {blocos.map(({ seg, lista }, i) => {
        const aberta = (i < 4) !== alternadas.has(seg)
        const titulo = `Semana ${diaMes(seg)} a ${diaMes(somarDias(seg, 5))}${seg === primeira ? ' · esta semana' : ''}`
        return (
        <section key={seg} className="section">
          <button className="sec-head recolher" aria-expanded={aberta} onClick={() => alternar(seg)}>
            <span className="lab lab-ink">{titulo}</span>
            <span className="lab" style={{ marginLeft: 'auto' }}>{lista.length} {lista.length === 1 ? 'serviço' : 'serviços'} {aberta ? '▴' : '▾'}</span>
          </button>
          {aberta && <div className="lista">
            {lista.map((s) => {
              const n = pendentes(s.id).length
              const vencida = pendentes(s.id).some((r) => r.data_limite && r.data_limite < dia)
              return (
                <button key={s.id} className="linha" onClick={() => setAberto({ servico: s, seg })}>
                  <div className="linha-main">
                    <div className="linha-titulo">{s.nome}</div>
                    <div className="meta">{s.local || '—'} · {data.etapas.find((e) => e.id === s.etapa_entrega_id)?.nome} · {porcento(avancoServico(s), 0)} feito</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {s.critico && <Status tom="crit">Crítico</Status>}
                    {n > 0 && <Status tom={vencida ? 'crit' : 'warn'}>{n} {n === 1 ? 'restrição' : 'restrições'}</Status>}
                  </div>
                </button>
              )
            })}
          </div>}
        </section>
        )
      })}
      </div>

      <FolhaServico aberto={aberto} restricoes={data.restricoes} semanas={semanas} gestao={gestao} dia={dia}
        fechar={() => setAberto(null)} salvo={(msg) => { aviso(msg); recarregar() }}
        mandarParaPcp={(seg, s) => goto('planejamento', { aba: 'semana', semana: seg, novo: { servico_id: s.id, local: s.local } })} />
    </>
  )
}

const VAZIA = { tipo: '', descricao: '', responsavel: '', data_limite: '' }

// Restrições de um serviço + "Mandar para o PCP". Engenheiro e Coordenador editam; os demais só leem.
// modo: null = lista; { form } = nova/editar restrição; { remover } = data da remoção.
function FolhaServico({ aberto, restricoes, semanas, gestao, dia, fechar, salvo, mandarParaPcp }) {
  const [modo, setModo] = useState(null)
  const [semanaPcp, setSemanaPcp] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [abertoPara, setAbertoPara] = useState(null)

  if (aberto && abertoPara !== aberto) {
    setAbertoPara(aberto)
    setModo(null)
    setSemanaPcp(aberto.seg)
    setErro(null)
  }
  if (!aberto && abertoPara !== null) setAbertoPara(null)
  if (!aberto) return null

  const s = aberto.servico
  const lista = restricoes.filter((r) => r.servico_id === s.id)
  const editar = (r) => {
    setModo({ form: r ? { id: r.id, tipo: r.tipo, descricao: r.descricao, responsavel: r.responsavel || '', data_limite: r.data_limite || '' } : VAZIA })
    setErro(null)
  }
  const mudar = (k, v) => { setModo((m) => ({ form: { ...m.form, [k]: v } })); setErro(null) }

  async function gravar(acao, mensagem) {
    setSalvando(true)
    const r = await acao()
    setSalvando(false)
    if (r.erro) { setErro(r.erro); return }
    setModo(null)
    salvo(mensagem)
  }

  function salvarRestricao() {
    const v = validarRestricao(modo.form)
    if (v.erro) { setErro(v.erro); return }
    const { id } = modo.form
    gravar(() => (id ? dados.editarRestricao(id, v.registro) : dados.criarRestricao(s.id, v.registro)), id ? 'Restrição salva' : 'Restrição criada')
  }

  function confirmarRemocao() {
    const v = validarRemocao(modo.remover.data, dia)
    if (v.erro) { setErro(v.erro); return }
    gravar(() => dados.editarRestricao(modo.remover.id, v.registro), 'Restrição removida')
  }

  return (
    <Folha aberta fechar={fechar} rotulo="Restrições do serviço">
      <div className="lab">{modo?.form ? (modo.form.id ? 'Editar restrição' : 'Nova restrição') : 'Restrições'}</div>
      <h2>{s.nome}</h2>
      <div className="sub">{s.local || 'sem local'} · previsto de {dataBr(s.inicio_previsto)} a {dataBr(s.fim_previsto)}</div>

      {modo?.form && (
        <>
          <div className="campo">
            <label className="lab" htmlFor="tipo-restricao">Tipo</label>
            <select id="tipo-restricao" className="ipt" value={modo.form.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
              <option value="">— escolha —</option>
              {TIPOS_RESTRICAO.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="campo">
            <label className="lab" htmlFor="desc-restricao">Descrição</label>
            <textarea id="desc-restricao" className="ipt" value={modo.form.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="O que precisa ser resolvido antes de começar" />
          </div>
          <div className="campo">
            <label className="lab" htmlFor="resp-restricao">Responsável (opcional)</label>
            <input id="resp-restricao" className="ipt" value={modo.form.responsavel} onChange={(e) => mudar('responsavel', e.target.value)} placeholder="Pode ser alguém de fora do sistema" />
          </div>
          <div className="campo">
            <label className="lab" htmlFor="prazo-restricao">Data limite (opcional)</label>
            <input id="prazo-restricao" type="date" className="ipt" value={modo.form.data_limite} onChange={(e) => mudar('data_limite', e.target.value)} />
          </div>
          {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
          <div className="folha-acoes">
            <button className="btn btn-quiet btn-lg" onClick={() => setModo(null)}>Voltar</button>
            <button className="btn btn-fill btn-lg" onClick={salvarRestricao} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </>
      )}

      {modo?.remover && (
        <>
          <div className="campo">
            <label className="lab" htmlFor="data-remocao">Removida em</label>
            <input id="data-remocao" type="date" className="ipt" max={dia} value={modo.remover.data}
              onChange={(e) => { setModo({ remover: { ...modo.remover, data: e.target.value } }); setErro(null) }} />
          </div>
          {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
          <div className="folha-acoes">
            <button className="btn btn-quiet btn-lg" onClick={() => setModo(null)}>Voltar</button>
            <button className="btn btn-fill btn-lg" onClick={confirmarRemocao} disabled={salvando}>{salvando ? 'Salvando…' : 'Marcar como removida'}</button>
          </div>
        </>
      )}

      {!modo && (
        <>
          <div className="lista">
            {lista.length === 0 && <p className="vazio-curto">Nenhuma restrição cadastrada para este serviço.</p>}
            {lista.map((r) => {
              const removida = r.status === STATUS_RESTRICAO.REMOVIDA
              const vencida = !removida && r.data_limite && r.data_limite < dia
              return (
                <div key={r.id} className="linha" style={{ flexWrap: 'wrap' }}>
                  <span className={`marca ${removida ? '' : vencida ? 'crit' : 'warn'}`} style={removida ? { background: 'var(--green)' } : undefined} />
                  <div className="linha-main">
                    <div className="linha-titulo">{r.descricao}</div>
                    <div className={`meta ${vencida ? 'crit' : ''}`}>
                      {r.tipo} · {r.responsavel || 'sem responsável'} · {removida ? `removida em ${dataBr(r.removida_em)}` : `prazo ${dataBr(r.data_limite)}${vencida ? ' · vencida' : ''}`}
                    </div>
                  </div>
                  {gestao && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-quiet" onClick={() => editar(r)}>Editar</button>
                      {!removida && <button className="btn" onClick={() => { setModo({ remover: { id: r.id, data: dia } }); setErro(null) }}>Removida</button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {gestao && (
            <>
              <button className="btn btn-bloco" style={{ marginTop: 12 }} onClick={() => editar(null)}>Nova restrição</button>
              <div className="campo" style={{ marginTop: 20 }}>
                <label className="lab" htmlFor="semana-pcp">Mandar para o PCP da semana</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select id="semana-pcp" className="ipt" value={semanaPcp} onChange={(e) => setSemanaPcp(e.target.value)}>
                    {semanas.map((seg) => <option key={seg} value={seg}>{diaMes(seg)} a {diaMes(somarDias(seg, 5))}</option>)}
                  </select>
                  <button className="btn btn-fill" onClick={() => mandarParaPcp(semanaPcp, s)}>Mandar</button>
                </div>
              </div>
            </>
          )}
          <div className="folha-acoes" style={{ marginTop: 16 }}>
            <button className="btn btn-quiet btn-lg" onClick={fechar}>Fechar</button>
          </div>
        </>
      )}
    </Folha>
  )
}
