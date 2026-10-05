// Planejamento › Cronograma: lista em árvore com Gantt (tela larga).

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { avancoServico, diasAtraso } from '../lib/avanco.js'
import { custosAlterados } from '../lib/cronograma.js'
import { dataHoraBr, diasEntre } from '../lib/datas.js'
import { lerNumero, moeda, numero, porcento } from '../lib/formato.js'
import { Carregando, ErroCaixa, Folha, Icone, Status, Vazio, useAviso, useCarga } from '../components/index.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarServicos(), dados.listarEtapas()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { servicos: r[0].data, etapas: r[1].data }, erro: null }
}

export default function Cronograma({ goto, usuario, soSemCusto }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [etapa, setEtapa] = useState(null)
  const [chaves, setChaves] = useState({ criticos: false, atrasados: false, semCusto: soSemCusto })
  const [editando, setEditando] = useState(false)
  const [digitados, setDigitados] = useState({})
  const [ocupado, setOcupado] = useState(false)
  const [problemas, setProblemas] = useState(null)
  const [calculadoEm, setCalculadoEm] = useState(obra.ultimo_calculo_em)
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const verCusto = pode(usuario.role, 'verCusto')
  const gestao = pode(usuario.role, 'importarCronograma')

  if (!data.servicos.some((s) => !s.e_resumo)) {
    return <Vazio icone="planejamento" titulo="Nenhum serviço ainda" texto="Importe o arquivo do MS Project (Arquivo › Salvar como › XML)."
      acao={gestao ? { texto: 'Importar do Project', fn: () => goto('importar') } : null} />
  }

  const inicioObra = obra.data_inicio
  const total = Math.max(1, diasEntre(inicioObra, obra.data_fim_contrato))
  const pos = (d) => Math.max(0, Math.min(100, (diasEntre(inicioObra, d) / total) * 100))
  const largura = (a, b) => Math.max(0.6, pos(b) - pos(a))

  const linhas = data.servicos.filter((s) => {
    if (s.e_resumo) return etapa === null || s.etapa_entrega_id === etapa
    if (etapa !== null && s.etapa_entrega_id !== etapa) return false
    if (chaves.criticos && !s.critico) return false
    if (chaves.atrasados && diasAtraso(s, dia) <= 0) return false
    if (chaves.semCusto && Number(s.custo_orcado) > 0) return false
    return true
  })
  const filtrando = chaves.criticos || chaves.atrasados || chaves.semCusto
  const visiveis = filtrando ? linhas.filter((s) => !s.e_resumo) : linhas
  // No modo planilha, o rodapé soma o que está digitado (o que não foi tocado vale o salvo).
  const custoAtual = (s) => (s.id in digitados ? lerNumero(digitados[s.id]) : Number(s.custo_orcado))
  const comCusto = data.servicos.filter((s) => !s.e_resumo && custoAtual(s) > 0)
  const totalOrcado = comCusto.reduce((t, s) => t + custoAtual(s), 0)
  const alternar = (k) => setChaves({ ...chaves, [k]: !chaves[k] })

  async function salvarCustos() {
    const r = custosAlterados(data.servicos, digitados)
    if (r.erro) { aviso(r.erro); return }
    setOcupado(true)
    const g = r.linhas.length ? await dados.salvarCustos(r.linhas) : { erro: null }
    setOcupado(false)
    if (g.erro) { aviso(g.erro); return }
    setEditando(false)
    setDigitados({})
    aviso(`Custos salvos · ${comCusto.length} de ${data.servicos.filter((s) => !s.e_resumo).length} serviços com custo`)
    recarregar()
  }

  async function recalcular() {
    setOcupado(true)
    const r = await dados.recalcularCronograma()
    setOcupado(false)
    if (r.erro) { aviso(r.erro); return }
    if (r.data.problemas) { setProblemas(r.data.problemas); return }
    setCalculadoEm(new Date().toISOString())
    aviso(`Cronograma recalculado: ${r.data.criticos} críticos, ${r.data.atrasados} atrasados`)
    recarregar()
  }

  return (
    <>
      <div className="filtros">
        <button className="chave" aria-pressed={etapa === null} onClick={() => setEtapa(null)}>Todas</button>
        {data.etapas.map((e) => <button key={e.id} className="chave" aria-pressed={etapa === e.id} onClick={() => setEtapa(e.id)}>{e.nome}</button>)}
        <button className="chave" aria-pressed={chaves.criticos} onClick={() => alternar('criticos')}>Só críticos</button>
        <button className="chave" aria-pressed={chaves.atrasados} onClick={() => alternar('atrasados')}>Só atrasados</button>
        {verCusto && <button className="chave" aria-pressed={chaves.semCusto} onClick={() => alternar('semCusto')}>Só sem custo</button>}
      </div>
      {gestao && (
        <div className="filtros">
          <button className="btn" onClick={() => goto('importar')}><Icone nome="arquivo" />Importar do Project</button>
          {!editando && <button className="btn so-largo" onClick={() => setEditando(true)}>Editar custos</button>}
          <span className="meta so-curto">Custos: edite no computador</span>
          <button className="btn btn-quiet" onClick={recalcular} disabled={ocupado || editando}>{ocupado && !editando ? 'Calculando…' : 'Recalcular'}</button>
          {verCusto && (
            <span className="caixa-num" style={{ padding: '4px 12px' }}>
              <b className="num" style={{ fontSize: 22 }}>{moeda(totalOrcado)}</b>
              <span className="lab">Orçado<br />{comCusto.length} de {data.servicos.filter((s) => !s.e_resumo).length} com custo</span>
            </span>
          )}
          <span className="lab" style={{ marginLeft: 'auto' }}>{calculadoEm ? `Calculado em ${dataHoraBr(calculadoEm)}` : 'Caminho crítico ainda não calculado'}</span>
        </div>
      )}

      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr>
              <th>EAP</th><th>Serviço</th><th className="dir">%</th><th className="dir">Atraso</th>
              <th className="dir so-largo">Executado / previsto</th>
              {verCusto && <th className="dir so-largo">Custo orçado</th>}
              <th className="dir so-largo">Folga</th>
              <th className="so-largo">Linha de base · previsto · realizado</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((s) => {
              if (s.e_resumo) {
                return (
                  <tr key={s.id} className="resumo">
                    <td>{s.codigo_eap}</td><td colSpan={3}>{s.nome}</td>
                    <td className="so-largo" colSpan={verCusto ? 4 : 3} />
                  </tr>
                )
              }
              const pct = avancoServico(s)
              const atraso = diasAtraso(s, dia)
              const semCusto = !(Number(s.custo_orcado) > 0)
              return (
                <tr key={s.id} className="clicavel" tabIndex={editando ? undefined : 0}
                  onClick={() => !editando && goto('servico', { id: s.id })}
                  onKeyDown={(e) => { if (!editando && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goto('servico', { id: s.id }) } }}>
                  <td className="num">{s.codigo_eap}</td>
                  <td className="nome">
                    <div style={{ fontWeight: 600 }}>{s.nome}</div>
                    {s.critico && <Status tom="crit">Crítico</Status>}
                  </td>
                  <td className="dir num">{porcento(pct, 0)}</td>
                  <td className="dir num" style={{ color: atraso > 0 ? 'var(--crit-ink)' : undefined, fontWeight: atraso > 0 ? 600 : 400 }}>{atraso > 0 ? `${atraso} d` : '—'}</td>
                  <td className="dir num so-largo">{numero(s.quantidade_executada, s.unidade === '%' ? 1 : 0)} / {numero(s.quantidade_prevista)} {s.unidade}</td>
                  {verCusto && (
                    <td className="dir num so-largo" onClick={(e) => editando && e.stopPropagation()}>
                      {editando ? (
                        <input className="ipt" style={{ minHeight: 40, width: 150, textAlign: 'right' }} inputMode="decimal"
                          value={s.id in digitados ? digitados[s.id] : s.custo_orcado ?? ''} placeholder="R$" aria-label={`Custo de ${s.nome}`}
                          onChange={(e) => setDigitados({ ...digitados, [s.id]: e.target.value })} />
                      ) : semCusto ? <span className="falta">— sem custo</span> : moeda(s.custo_orcado)}
                    </td>
                  )}
                  <td className="dir num so-largo">{s.folga_dias ?? '—'} d</td>
                  <td className="gantt-cel so-largo">
                    <div className="gantt">
                      <span className="base" style={{ left: `${pos(s.inicio_base)}%`, width: `${largura(s.inicio_base, s.fim_base)}%` }} />
                      <span className={`prev ${s.critico ? 'crit' : ''}`} style={{ left: `${pos(s.inicio_previsto)}%`, width: `${largura(s.inicio_previsto, s.fim_previsto)}%` }} />
                      {pct > 0 && <span className="real" style={{ left: `${pos(s.inicio_previsto)}%`, width: `${(largura(s.inicio_previsto, s.fim_previsto) * pct) / 100}%` }} />}
                      <span className="hoje" style={{ left: `${pos(dia)}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {visiveis.length === 0 && <p className="vazio-curto" style={{ textAlign: 'center' }}>Nenhum serviço com esse filtro.</p>}
      {editando && (
        <div className="salvar-barra">
          <span className="lab num">{comCusto.length} de {data.servicos.filter((s) => !s.e_resumo).length} com custo · total {moeda(totalOrcado)}</span>
          <button className="btn btn-quiet btn-lg" onClick={() => { setEditando(false); setDigitados({}) }}>Cancelar</button>
          <button className="btn btn-fill btn-lg" onClick={salvarCustos} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar custos'}</button>
        </div>
      )}

      <Folha aberta={!!problemas} fechar={() => setProblemas(null)} rotulo="Problemas no cronograma">
        {problemas && (
          <>
            <div className="lab">Recalcular</div>
            <h2>O cálculo não foi feito</h2>
            <p className="sub">Corrija no MS Project e importe de novo. O cálculo anterior continua valendo.</p>
            <div className="lista">
              {problemas.map((p) => (
                <div key={p.id} className="linha"><div className="linha-main"><div className="linha-titulo">{p.nome}</div><div className="meta crit">{p.motivo}</div></div></div>
              ))}
            </div>
            <div className="folha-acoes" style={{ marginTop: 16 }}><button className="btn btn-quiet btn-lg" onClick={() => setProblemas(null)}>Fechar</button></div>
          </>
        )}
      </Folha>
    </>
  )
}
