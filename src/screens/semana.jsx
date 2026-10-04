// Planejamento › Semana (PCP): atividades de segunda a sábado, baixa e PPC.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { ppcAte, contarMotivos, mestrePodeAlterar, resultadoBaixa } from '../lib/pcp.js'
import { diasDaSemana, diaMes, nomeDia, segundaDaSemana, somarDias } from '../lib/datas.js'
import { quantidade } from '../lib/formato.js'
import { MOTIVOS_NAO_CONCLUSAO, PERFIS } from '../lib/vocabulario.js'
import { Barra, Caixa, Carregando, ErroCaixa, Folha, Icone, Secao, Status, useAviso, useCarga } from '../components/index.jsx'

const tomDe = (status) => (status === 'Concluída' ? 'ok' : status === 'Não concluída' ? 'crit' : '')

async function carregarSemana(segunda) {
  const r = await Promise.all([
    dados.listarAtividades({ de: somarDias(segunda, -49), ate: somarDias(segunda, 5) }),
    dados.listarServicos(), dados.listarPacotes(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { atividades: r[0].data, servicos: r[1].data, pacotes: r[2].data }, erro: null }
}

export default function Semana({ usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [segunda, setSegunda] = useState(segundaDaSemana(dia))
  const [diaSel, setDiaSel] = useState(dia)
  const [baixa, setBaixa] = useState(null)
  const [verMotivos, setVerMotivos] = useState(false)
  const { data, erro, carregando, recarregar } = useCarga(() => carregarSemana(segunda), [obra.id, segunda])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const dias = diasDaSemana(segunda)
  const daSemana = data.atividades.filter((a) => a.semana_inicio === segunda)
  const encerrada = somarDias(segunda, 5) < dia
  const indicador = ppcAte(daSemana, dia)
  const motivos = contarMotivos(data.atividades)
  const maxMotivo = Math.max(1, ...motivos.map((m) => m.total))
  const servico = (id) => data.servicos.find((s) => s.id === id)
  const pacote = (id) => data.pacotes.find((p) => p.id === id)
  const gestao = pode(usuario.role, 'editarPlanejamento')
  const ehMestre = usuario.role === PERFIS.MESTRE

  function podeBaixar(a) {
    if (!pode(usuario.role, 'darBaixa')) return false
    return !ehMestre || mestrePodeAlterar(a.data_prevista, dia)
  }

  function mudarSemana(n) {
    const nova = somarDias(segunda, 7 * n)
    setSegunda(nova)
    setDiaSel(dia >= nova && dia <= somarDias(nova, 5) ? dia : nova)
  }

  return (
    <>
      <div className="semana-barra">
        <div className="semana-sel">
          <button aria-label="Semana anterior" onClick={() => mudarSemana(-1)}><Icone nome="esquerda" /></button>
          <b>{diaMes(segunda)} – {diaMes(somarDias(segunda, 5))}/{segunda.slice(0, 4)}</b>
          <button aria-label="Próxima semana" onClick={() => mudarSemana(1)}><Icone nome="direita" /></button>
        </div>
        <div className="caixa-num">
          <b className="num">{indicador.pct === null ? '—' : `${indicador.pct}%`}</b>
          <span className="lab">PPC{encerrada ? ' final' : ''}<br />{indicador.concluidas} de {indicador.base}</span>
        </div>
        {gestao && (
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button className="btn btn-quiet" onClick={() => aviso('Copiar pendentes chega na próxima etapa')}><Icone nome="copiar" />Copiar pendentes</button>
            <button className="btn btn-fill" onClick={() => aviso('Nova atividade chega na próxima etapa')}><Icone nome="mais_um" />Nova atividade</button>
          </div>
        )}
      </div>

      <div className="dias-abas" role="group" aria-label="Dia da semana">
        {dias.map((d) => (
          <button key={d} aria-pressed={diaSel === d} onClick={() => setDiaSel(d)}>{nomeDia(d)}<small>{diaMes(d)}</small></button>
        ))}
      </div>

      {daSemana.length === 0 ? (
        <div className="section"><p className="vazio-curto" style={{ textAlign: 'center' }}>Semana sem atividades planejadas.</p></div>
      ) : (
        <div className="semana">
          {dias.map((d) => {
            const lista = daSemana.filter((a) => a.data_prevista === d)
            return (
              <div key={d} className={`dia ${d === dia ? 'hoje' : ''} ${d === diaSel ? 'mostrar' : ''}`}>
                <h3><span>{nomeDia(d)} · {diaMes(d)}</span></h3>
                {lista.length === 0 && <p className="dia-vazio">Sem atividades.</p>}
                {lista.map((a) => {
                  const s = servico(a.servico_id)
                  const pac = a.pacote_id ? pacote(a.pacote_id) : null
                  const feita = a.status !== 'Planejada'
                  return (
                    <article key={a.id} className="tarefa">
                      <div className="tarefa-top">
                        <Caixa tom={tomDe(a.status)} />
                        <div>
                          <div className="tarefa-titulo">{s?.nome}</div>
                          <div className="tarefa-meta">{a.local} · {a.equipe || 'sem equipe'}{pac ? ` · pacote ${pac.nome}` : ''}</div>
                        </div>
                      </div>
                      <div className="tarefa-qtd">
                        <b className="num">{quantidade(feita ? a.quantidade_executada : a.quantidade_planejada, s?.unidade)}</b>
                        <span>{feita ? `de ${quantidade(a.quantidade_planejada, s?.unidade)}` : 'planejado'}</span>
                      </div>
                      <div className="tarefa-pe">
                        <Status tom={tomDe(a.status) || 'neutral'}>{a.status}{a.motivo_nao_conclusao ? ` · ${a.motivo_nao_conclusao}` : ''}</Status>
                        {podeBaixar(a) && (
                          <button className={`btn ${feita ? 'btn-quiet' : 'btn-fill'}`} onClick={() => setBaixa(a)}>{feita ? 'Corrigir baixa' : 'Dar baixa'}</button>
                        )}
                        {ehMestre && !podeBaixar(a) && <span className="meta">Baixa travada — fale com o engenheiro</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <div className="so-curto">
        <button className="btn btn-quiet btn-bloco" style={{ marginTop: 16 }} aria-expanded={verMotivos} onClick={() => setVerMotivos(!verMotivos)}>
          {verMotivos ? 'Esconder motivos' : 'Ver motivos de não conclusão'}
        </button>
      </div>
      <Secao className={`chart ${verMotivos ? '' : 'so-largo'}`} rotulo="Por que não concluímos · últimas 8 semanas">
        {motivos.length === 0 && <p className="vazio-curto">Nenhuma atividade deixou de ser concluída nesse período.</p>}
        {motivos.map((m) => (
          <div key={m.motivo} className="motivo"><span>{m.motivo}</span><Barra pct={(m.total / maxMotivo) * 100} /><b className="num">{m.total}</b></div>
        ))}
      </Secao>

      <JanelaBaixa atividade={baixa} servico={baixa && servico(baixa.servico_id)} fechar={() => setBaixa(null)}
        salvo={(msg) => { setBaixa(null); aviso(msg); recarregar() }} />
    </>
  )
}

export function JanelaBaixa({ atividade, servico, fechar, salvo }) {
  const [executada, setExecutada] = useState('')
  const [motivo, setMotivo] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [abertaPara, setAbertaPara] = useState(null)

  // Ao abrir para outra atividade, o formulário recomeça com os dados dela.
  if (atividade && abertaPara !== atividade.id) {
    setAbertaPara(atividade.id)
    setExecutada(String(atividade.quantidade_executada ?? atividade.quantidade_planejada))
    setMotivo(atividade.motivo_nao_conclusao)
    setErro(null)
  }
  if (!atividade && abertaPara !== null) setAbertaPara(null)

  const previa = atividade ? resultadoBaixa(atividade.quantidade_planejada, executada, motivo || 'x') : null
  const naoConclui = previa?.status === 'Não concluída'

  async function salvar() {
    setSalvando(true)
    const { data, erro: e } = await dados.darBaixa(atividade.id, { executada, motivo: naoConclui ? motivo : null })
    setSalvando(false)
    if (e) { setErro(e); return }
    salvo(`Baixa salva · ${data.status}`)
  }

  async function desfazer() {
    const { erro: e } = await dados.desfazerBaixa(atividade.id)
    if (e) { setErro(e); return }
    salvo('Baixa desfeita')
  }

  return (
    <Folha aberta={!!atividade} fechar={fechar} rotulo="Dar baixa">
      {atividade && (
        <>
          <div className="lab">Dar baixa · {nomeDia(atividade.data_prevista)} {diaMes(atividade.data_prevista)}</div>
          <h2>{servico?.nome}</h2>
          <div className="sub">{atividade.local} · planejado <b>{quantidade(atividade.quantidade_planejada, servico?.unidade)}</b></div>
          <div className="campo">
            <label className="lab" htmlFor="executada">Quanto foi executado?</label>
            <div className="qtd-ipt">
              <input id="executada" type="number" inputMode="decimal" step="any" min="0" value={executada}
                onChange={(e) => { setExecutada(e.target.value); setErro(null) }} />
              <span>{servico?.unidade}</span>
            </div>
            {previa?.status && <Status tom={naoConclui ? 'crit' : 'ok'}>{naoConclui ? 'Fica não concluída — escolha o motivo' : 'Fica concluída'}</Status>}
          </div>
          {naoConclui && (
            <div className="campo">
              <span className="lab">Motivo de não concluir</span>
              <div className="opcoes">
                {MOTIVOS_NAO_CONCLUSAO.map((m) => (
                  <button key={m} type="button" aria-pressed={motivo === m} onClick={() => { setMotivo(m); setErro(null) }}>{m}</button>
                ))}
              </div>
            </div>
          )}
          {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
          <div className="folha-acoes">
            <button className="btn btn-quiet btn-lg" onClick={fechar}>Cancelar</button>
            <button className="btn btn-fill btn-lg" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar baixa'}</button>
          </div>
          {atividade.status !== 'Planejada' && (
            <button className="btn btn-perigo btn-bloco" style={{ marginTop: 10 }} onClick={desfazer}>Desfazer baixa</button>
          )}
        </>
      )}
    </Folha>
  )
}
