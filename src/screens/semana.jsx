// Planejamento › Semana (PCP): o cronograma recortado em seis dias.
// Tela larga: tabela serviço × dia (atrasados no topo, em vermelho). Celular: um dia por vez, em cartões.
// Engenheiro e Coordenador montam a semana; Mestre dá baixa; Técnico de Segurança só lê.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import {
  acumuladosDaSemana, ppcAte, copiarPendentes, grupoDoMotivo, motivosPorGrupo, linhasDaSemana, mestrePodeAlterar, podeAntecipar,
  resultadoBaixa, ritmoDaSemana, SEMANAS_ANTECIPAR,
} from '../lib/pcp.js'
import { avancoServico } from '../lib/avanco.js'
import { dataBr, diasDaSemana, diaMes, inicioDoMesAnterior, nomeDia, nomeMes, segundaDaSemana, somarDias } from '../lib/datas.js'
import { porcento, quantidade } from '../lib/formato.js'
import { GRUPOS_MOTIVO, PERFIS, STATUS_PCP } from '../lib/vocabulario.js'
import { Caixa, Carregando, ErroCaixa, Folha, Icone, Pizza, Secao, Status, useAviso, useCarga } from '../components/index.jsx'
import { FolhaAtividade, FolhaDistribuir } from './atividade.jsx'

const arredondar = (v) => Math.round(v * 10) / 10

// Cor de cada grupo macro no gráfico de pizza.
const COR_GRUPO = {
  'Condição climática': '#1F4E79', 'Execução': '#D64545', 'Planejamento': '#F5A623', 'Projetos': '#132B40',
  'Suprimentos': '#2E8B57', 'Segurança': '#7B4FA0', 'Outros': '#9AA5B1',
}

// Pizza de um mês: grupos macro, com as causas de cada um no detalhe.
function PizzaDoMes({ atividades, mes }) {
  const fatias = motivosPorGrupo(atividades, mes).map((g) => ({
    rotulo: g.grupo, valor: g.total, cor: COR_GRUPO[g.grupo], detalhe: g.causas.map((c) => `${c.motivo} · ${c.total}`),
  }))
  return <Pizza titulo={`${nomeMes(mes)} de ${mes.slice(0, 4)}`} fatias={fatias} vazio="Todas as metas diárias foram atingidas." />
}
const tomDe = (status) => (status === STATUS_PCP.CONCLUIDA ? 'ok' : status === STATUS_PCP.NAO_CONCLUIDA ? 'crit' : '')

async function carregarSemana(segunda) {
  const r = await Promise.all([
    // Até o sábado da semana seguinte: é lá que ficam as cópias das pendentes.
    // Desde o mês anterior (pizza dos motivos) até o sábado da semana seguinte (cópias das pendentes).
    dados.listarAtividades({ de: [somarDias(segunda, -49), inicioDoMesAnterior(dados.hoje())].sort()[0], ate: somarDias(segunda, 12) }),
    dados.listarServicos(), dados.listarPacotes(), dados.listarProducoes(), dados.listarDependencias(), dados.listarRestricoes(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [atividades, servicos, pacotes, producoes, dependencias, restricoes] = r.map((x) => x.data)
  return { data: { atividades, servicos, pacotes, producoes, dependencias, restricoes }, erro: null }
}

// params.semana: abrir nesta semana; params.novo: abrir a Nova atividade preenchida (vem do plano de 3 meses).
export default function Semana({ usuario, params = {} }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [segunda, setSegunda] = useState(params.semana || segundaDaSemana(dia))
  const [diaSel, setDiaSel] = useState(dia)
  const [baixa, setBaixa] = useState(null)
  const [verMotivos, setVerMotivos] = useState(false)
  const [folha, setFolha] = useState(params.novo ? { inicial: params.novo } : null)
  const [distribuir, setDistribuir] = useState(null)
  const [copiar, setCopiar] = useState(null)
  const { data, erro, carregando, recarregar } = useCarga(() => carregarSemana(segunda), [obra.id, segunda])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const dias = diasDaSemana(segunda)
  const daSemana = data.atividades.filter((a) => a.semana_inicio === segunda)
  const encerrada = somarDias(segunda, 5) < dia
  const indicador = ppcAte(daSemana, dia)
  const servico = (id) => data.servicos.find((s) => s.id === id)
  const pacote = (id) => data.pacotes.find((p) => p.id === id)
  const gestao = pode(usuario.role, 'editarPlanejamento')
  const ehMestre = usuario.role === PERFIS.MESTRE
  const linhas = linhasDaSemana(data.servicos, data.atividades, segunda, dia)
  const atrasoDe = (id) => linhas.find((l) => l.servico.id === id)?.atraso || 0
  const antecipaveis = gestao ? podeAntecipar(data.servicos, data.dependencias, data.restricoes, segunda) : []
  const veProducao = pode(usuario.role, 'verProducao')
  const ritmo = (s) => ritmoDaSemana(s, { segunda, hoje: dia, producoes: data.producoes })
  const salvo = (msg) => { setFolha(null); setDistribuir(null); setCopiar(null); setBaixa(null); aviso(msg); recarregar() }

  function abrirCopia() {
    const copias = copiarPendentes(data.atividades, data.pacotes, segunda)
    if (copias.length === 0) { aviso('Nenhuma atividade não concluída para copiar nesta semana'); return }
    setCopiar(copias)
  }

  async function confirmarCopia() {
    const r = await dados.criarAtividades(copiar)
    if (r.erro) { aviso(r.erro); return }
    salvo(`${copiar.length} ${copiar.length === 1 ? 'pendente copiada' : 'pendentes copiadas'} para a próxima semana`)
  }

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
            <button className="btn btn-quiet" onClick={abrirCopia}><Icone nome="copiar" />Copiar pendentes</button>
            <button className="btn btn-quiet" onClick={() => setFolha({ inicial: { data_prevista: diaSel } })}><Icone nome="mais_um" />Nova atividade</button>
            {!encerrada && <button className="btn btn-fill" onClick={() => setDistribuir({})}>Distribuir na semana</button>}
          </div>
        )}
      </div>

      {linhas.length === 0 && (
        <div className="section" style={{ textAlign: 'center' }}>
          <p className="vazio-curto">Semana sem atividades planejadas.</p>
          {gestao && !encerrada && <button className="btn btn-fill" style={{ marginTop: 12 }} onClick={() => setDistribuir({})}>Distribuir na semana</button>}
        </div>
      )}

      {/* Tela larga: igual ao cronograma, uma linha por serviço e uma coluna por dia. */}
      {linhas.length > 0 && (
        <div className="tabela-wrap so-largo">
          <table className="tabela semana-tabela">
            <thead>
              <tr>
                <th rowSpan={2}>Serviço</th>
                {dias.map((d) => <th key={d} rowSpan={2} className={d === dia ? 'hoje' : ''}>{nomeDia(d)} {diaMes(d)}</th>)}
                <th colSpan={2} className="acum-titulo">Produção média /dia</th>
                <th colSpan={3} className="acum-titulo">Acumulado do serviço</th>
              </tr>
              <tr>
                <th className="dir acum" title="Ritmo da linha de base: quantidade ÷ dias de trabalho previstos">Cronograma</th>
                <th className="dir" title="O que falta ÷ dias de trabalho até o fim previsto">Precisa</th>
                <th className="dir acum">Total</th><th className="dir">Anterior</th><th className="dir">Executado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ servico: s, atraso, atividades }) => {
                const r = ritmo(s)
                return (
                  <tr key={s.id} className={atraso > 0 ? 'atrasada' : ''}>
                    <td className="nome">
                      <div style={{ fontWeight: 600 }}>{s.codigo_eap} · {s.nome}</div>
                      <div className="meta">{s.local || 'sem local'} · {porcento(avancoServico(s), 0)} feito</div>
                      {(atraso > 0 || s.critico) && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {atraso > 0 && <Status tom="crit">Atrasado {atraso} d</Status>}
                          {s.critico && <Status tom="crit">Crítico</Status>}
                        </div>
                      )}
                    </td>
                    {dias.map((d) => {
                      const doDia = atividades.filter((a) => a.data_prevista === d)
                      return (
                        <td key={d} className={`cel-dia ${d === dia ? 'hoje' : ''}`}>
                          {doDia.map((a) => {
                            const feita = a.status !== STATUS_PCP.PLANEJADA
                            const travada = !podeBaixar(a)
                            return (
                              <button key={a.id} className={`cel-ativ ${tomDe(a.status)}`} disabled={travada}
                                title={ehMestre && travada ? 'Baixa travada — fale com o engenheiro' : undefined}
                                onClick={() => setBaixa(a)}>
                                <b className="num">{quantidade(feita ? a.quantidade_executada : a.quantidade_planejada, s.unidade)}</b>
                                <span>{feita ? `de ${quantidade(a.quantidade_planejada, s.unidade)}` : 'planejado'}</span>
                                {a.equipe && <span>{a.equipe}</span>}
                                {a.motivo_nao_conclusao && <span className="t-crit">{a.motivo_nao_conclusao}</span>}
                              </button>
                            )
                          })}
                          {gestao && doDia.length === 0 && d >= dia && (
                            <button className="cel-mais" aria-label={`Nova atividade de ${s.nome} em ${nomeDia(d)} ${diaMes(d)}`}
                              onClick={() => setFolha({ inicial: { servico_id: s.id, data_prevista: d, local: s.local } })}>+</button>
                          )}
                        </td>
                      )
                    })}
                    <td className="dir num acum">{quantidade(arredondar(r.planejado), s.unidade)}</td>
                    <td className={`dir num ${r.irreal ? 't-warn' : ''}`}>
                      {r.saldo > 0 ? <b>{r.irreal ? '⚠ ' : ''}{quantidade(arredondar(r.necessario), s.unidade)}</b> : '—'}
                      {r.irreal && <div className="meta warn">irreal · {r.base === 'histórico' ? 'melhor' : 'cronograma'} {quantidade(arredondar(r.referencia), s.unidade)}</div>}
                      {r.prazoVencido && r.saldo > 0 && <div className="meta crit">prazo vencido</div>}
                    </td>
                    <Acumulados servico={s} producoes={veProducao ? data.producoes : null} segunda={segunda} />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Celular: um dia por vez. */}
      {linhas.length > 0 && (
        <div className="so-curto">
          <div className="dias-abas" role="group" aria-label="Dia da semana">
            {dias.map((d) => (
              <button key={d} aria-pressed={diaSel === d} onClick={() => setDiaSel(d)}>{nomeDia(d)}<small>{diaMes(d)}</small></button>
            ))}
          </div>
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
                    const feita = a.status !== STATUS_PCP.PLANEJADA
                    const atraso = atrasoDe(a.servico_id)
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
                          {atraso > 0 && <Status tom="crit">Serviço atrasado {atraso} d</Status>}
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
        </div>
      )}

      {antecipaveis.length > 0 && !encerrada && (
        <Secao rotulo={`Pode antecipar · começam nas próximas ${SEMANAS_ANTECIPAR} semanas, sem restrição e já liberados`}>
          <div className="lista">
            {antecipaveis.map((s) => (
              <div key={s.id} className="linha">
                <div className="linha-main">
                  <div className="linha-titulo">{s.codigo_eap} · {s.nome}</div>
                  <div className="meta">início previsto {dataBr(s.inicio_previsto)}{s.folga_dias ? ` · folga ${s.folga_dias} d` : ''}</div>
                </div>
                <button className="btn" onClick={() => setDistribuir({ foco: s.id })}>Antecipar</button>
              </div>
            ))}
          </div>
        </Secao>
      )}

      <div className="so-curto">
        <button className="btn btn-quiet btn-bloco" style={{ marginTop: 16 }} aria-expanded={verMotivos} onClick={() => setVerMotivos(!verMotivos)}>
          {verMotivos ? 'Esconder motivos' : 'Ver motivos de não conclusão'}
        </button>
      </div>
      <Secao className={`chart ${verMotivos ? '' : 'so-largo'}`} rotulo="Por que a meta do dia não foi atingida · por grupo">
        <div className="pizzas">
          <PizzaDoMes atividades={data.atividades} mes={dia.slice(0, 7)} />
          <PizzaDoMes atividades={data.atividades} mes={inicioDoMesAnterior(dia).slice(0, 7)} />
        </div>
      </Secao>

      <FolhaAtividade aberta={folha} segunda={segunda} servicos={data.servicos} pacotes={data.pacotes} atividades={data.atividades}
        fechar={() => setFolha(null)} salvo={salvo} />
      <FolhaDistribuir aberta={distribuir} segunda={segunda} hoje={dia} linhas={linhas} antecipaveis={antecipaveis}
        atividades={data.atividades} producoes={data.producoes} fechar={() => setDistribuir(null)} salvo={salvo} />
      <Folha aberta={!!copiar} fechar={() => setCopiar(null)} rotulo="Copiar pendentes">
        {copiar && (
          <>
            <div className="lab">Copiar pendentes</div>
            <h2>{copiar.length} {copiar.length === 1 ? 'atividade não concluída' : 'atividades não concluídas'}</h2>
            <p className="sub">Vão para o mesmo dia da semana {diaMes(somarDias(segunda, 7))} a {diaMes(somarDias(segunda, 12))}, com o que faltou fazer.</p>
            <div className="lista">
              {copiar.map((c) => (
                <div key={c.copiada_de_id} className="linha">
                  <div className="linha-main"><div className="linha-titulo">{servico(c.servico_id)?.nome}</div><div className="meta">{nomeDia(c.data_prevista)} {diaMes(c.data_prevista)} · {c.local}</div></div>
                  <div className="linha-qtd num">{quantidade(c.quantidade_planejada, servico(c.servico_id)?.unidade)}</div>
                </div>
              ))}
            </div>
            <div className="folha-acoes" style={{ marginTop: 16 }}>
              <button className="btn btn-quiet btn-lg" onClick={() => setCopiar(null)}>Cancelar</button>
              <button className="btn btn-fill btn-lg" onClick={confirmarCopia}>Copiar</button>
            </div>
          </>
        )}
      </Folha>

      <JanelaBaixa atividade={baixa} servico={baixa && servico(baixa.servico_id)} fechar={() => setBaixa(null)} salvo={salvo}
        editar={gestao ? (a) => { setBaixa(null); setFolha({ atividade: a }) } : null} />
    </>
  )
}

// Última coluna: total previsto, acumulado até antes da semana e até o fim dela.
// Quem não lê a produção (Técnico de Segurança) vê só o total.
function Acumulados({ servico: s, producoes, segunda }) {
  const a = producoes ? acumuladosDaSemana(s, producoes, segunda) : null
  return (
    <>
      <td className="dir num acum">{quantidade(s.quantidade_prevista, s.unidade)}</td>
      <td className="dir num">{a ? quantidade(a.anterior, s.unidade) : '—'}</td>
      <td className="dir num">
        {a ? <><b>{quantidade(a.executado, s.unidade)}</b><div className="meta">{porcento(Math.min(100, (a.executado / a.total) * 100), 0)}</div></> : '—'}
      </td>
    </>
  )
}

// Baixa: quanto foi feito, qual equipe fez e, se não atingiu o programado do dia, o motivo.
// editar: Engenheiro e Coordenador também editam/excluem daqui a atividade ainda planejada.
export function JanelaBaixa({ atividade, servico, fechar, salvo, editar = null }) {
  const [executada, setExecutada] = useState('')
  const [equipe, setEquipe] = useState('')
  const [motivo, setMotivo] = useState(null)
  const [grupo, setGrupo] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [abertaPara, setAbertaPara] = useState(null)

  // Ao abrir para outra atividade, o formulário recomeça com os dados dela.
  if (atividade && abertaPara !== atividade.id) {
    setAbertaPara(atividade.id)
    setExecutada(String(atividade.quantidade_executada ?? atividade.quantidade_planejada))
    setEquipe(atividade.equipe || '')
    setMotivo(atividade.motivo_nao_conclusao)
    setGrupo(atividade.motivo_nao_conclusao ? grupoDoMotivo(atividade.motivo_nao_conclusao) : null)
    setErro(null)
  }
  if (!atividade && abertaPara !== null) setAbertaPara(null)

  // Só para mostrar se fica concluída ou não; a validação de verdade roda ao salvar.
  const previa = atividade ? resultadoBaixa(atividade.quantidade_planejada, executada, motivo || 'x', 'x') : null
  const naoConclui = previa?.status === STATUS_PCP.NAO_CONCLUIDA

  async function salvar() {
    setSalvando(true)
    const { data, erro: e } = await dados.darBaixa(atividade.id, { executada, equipe, motivo: naoConclui ? motivo : null })
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
          <div className="sub">{atividade.local} · programado para o dia <b>{quantidade(atividade.quantidade_planejada, servico?.unidade)}</b></div>
          <div className="campo">
            <label className="lab" htmlFor="executada">Quanto foi executado?</label>
            <div className="qtd-ipt">
              <input id="executada" type="number" inputMode="decimal" step="any" min="0" value={executada}
                onChange={(e) => { setExecutada(e.target.value); setErro(null) }} />
              <span>{servico?.unidade}</span>
            </div>
            {previa?.status && <Status tom={naoConclui ? 'crit' : 'ok'}>{naoConclui ? 'Não atingiu o programado — escolha o motivo' : 'Fica concluída'}</Status>}
          </div>
          <div className="campo">
            <label className="lab" htmlFor="equipe-baixa">Qual equipe fez?</label>
            <input id="equipe-baixa" className="ipt" value={equipe} onChange={(e) => { setEquipe(e.target.value); setErro(null) }} placeholder="Ex.: Eq. Raimundo" />
          </div>
          {naoConclui && (
            <div className="campo">
              <span className="lab">Por que não atingiu? Escolha o grupo</span>
              <div className="opcoes grupos">
                {Object.keys(GRUPOS_MOTIVO).map((g) => (
                  <button key={g} type="button" aria-pressed={grupo === g} onClick={() => { setGrupo(g); setMotivo(GRUPOS_MOTIVO[g].length === 1 ? GRUPOS_MOTIVO[g][0] : null); setErro(null) }}>{g}</button>
                ))}
              </div>
              {grupo && GRUPOS_MOTIVO[grupo].length > 1 && (
                <>
                  <span className="lab" style={{ marginTop: 8 }}>Qual a causa?</span>
                  <div className="opcoes">
                    {GRUPOS_MOTIVO[grupo].map((m) => (
                      <button key={m} type="button" aria-pressed={motivo === m} onClick={() => { setMotivo(m); setErro(null) }}>{m}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
          <div className="folha-acoes">
            <button className="btn btn-quiet btn-lg" onClick={fechar}>Cancelar</button>
            <button className="btn btn-fill btn-lg" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar baixa'}</button>
          </div>
          {atividade.status !== STATUS_PCP.PLANEJADA && (
            <button className="btn btn-perigo btn-bloco" style={{ marginTop: 10 }} onClick={desfazer}>Desfazer baixa</button>
          )}
          {editar && atividade.status === STATUS_PCP.PLANEJADA && (
            <button className="btn btn-quiet btn-bloco" style={{ marginTop: 10 }} onClick={() => editar(atividade)}>Editar ou excluir a atividade</button>
          )}
        </>
      )}
    </Folha>
  )
}
