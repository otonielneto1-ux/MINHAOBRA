// Detalhe do serviço: números, predecessoras, produção, motivos, pacotes e restrições.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { avancoServico, diasAtraso } from '../lib/avanco.js'
import { contarMotivos } from '../lib/pcp.js'
import { previaTrocaUnidade, validarAjuste, validarCusto } from '../lib/cronograma.js'
import { UNIDADES } from '../lib/vocabulario.js'
import { dataBr } from '../lib/datas.js'
import { moeda, porcento, quantidade } from '../lib/formato.js'
import { Barra, Cabecalho, Carregando, ErroCaixa, Folha, Secao, Status, useAoAbrir, useAviso, useCarga } from '../components/index.jsx'

async function carregar(id) {
  const r = await Promise.all([
    dados.buscarServico(id), dados.listarServicos(), dados.listarDependencias(), dados.listarProducoes({ servicoId: id }),
    dados.listarAtividades(), dados.listarPacotes(), dados.listarRestricoes(), dados.listarEtapas(), dados.listarPessoas(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [servico, servicos, deps, producoes, atividades, pacotes, restricoes, etapas, pessoas] = r.map((x) => x.data)
  return { data: { servico, servicos, deps, producoes, atividades, pacotes, restricoes, etapas, pessoas }, erro: null }
}

export default function Servico({ goto, params, usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const { data, erro, carregando, recarregar } = useCarga(() => carregar(params.id), [obra.id, params.id])
  const [acao, setAcao] = useState(null)

  const voltar = { texto: 'Cronograma', acao: () => goto('planejamento', { aba: 'cronograma' }) }
  if (carregando && !data) return <Carregando />
  if (erro) return <><Cabecalho titulo="Serviço" voltar={voltar} /><ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>

  const { servico: s, servicos, deps, producoes, atividades, pacotes, restricoes, etapas, pessoas } = data
  const nome = (id) => servicos.find((x) => x.id === id)?.nome || '—'
  const pct = avancoServico(s)
  const atraso = diasAtraso(s, dia)
  const gestao = pode(usuario.role, 'lancarAjuste')
  const motivos = contarMotivos(atividades.filter((a) => a.servico_id === s.id))
  const deste = (lista) => lista.filter((x) => x.servico_id === s.id)

  return (
    <>
      <Cabecalho voltar={voltar} rotulo={`${s.codigo_eap} · ${etapas.find((e) => e.id === s.etapa_entrega_id)?.nome} · ${s.local || 'sem local'}`} titulo={s.nome}
        acoes={gestao && (
          <>
            <button className="btn" onClick={() => setAcao('ajuste')}>Lançar ajuste</button>
            <button className="btn btn-quiet" onClick={() => setAcao('editar')}>{pode(usuario.role, 'verCusto') ? 'Editar custo e local' : 'Editar local'}</button>
            {s.unidade === '%' && <button className="btn btn-quiet" onClick={() => setAcao('unidade')}>Trocar % por quantidade</button>}
          </>
        )} />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        {s.critico && <Status tom="crit">Caminho crítico</Status>}
        {atraso > 0 && <Status tom="crit">Atrasado {atraso} dias</Status>}
        {s.fim_real && <Status tom="ok">Concluído em {dataBr(s.fim_real)}</Status>}
      </div>

      <div className="grid">
        <Secao className="span-6" rotulo="Avanço">
          <div className="linha-num">
            <div><div className="lab">Executado</div><div className="grande num">{porcento(pct, 1)}</div></div>
            <div><div className="lab">Quantidade</div><div className="medio num">{quantidade(s.quantidade_executada, s.unidade)} de {quantidade(s.quantidade_prevista, s.unidade)}</div></div>
          </div>
          <div style={{ margin: '12px 0' }}><Barra pct={pct} tom={atraso > 0 ? 'crit' : ''} /></div>
          <div className="pares">
            <div><span>Linha de base</span><b className="num">{dataBr(s.inicio_base)} – {dataBr(s.fim_base)}</b></div>
            <div><span>Previsto atual</span><b className="num">{dataBr(s.inicio_previsto)} – {dataBr(s.fim_previsto)}</b></div>
            <div><span>Início real</span><b className="num">{dataBr(s.inicio_real)}</b></div>
            <div><span>Fim real</span><b className="num">{dataBr(s.fim_real)}</b></div>
            <div><span>Folga</span><b className="num">{s.folga_dias ?? '—'} dias</b></div>
            {pode(usuario.role, 'verCusto') && <div><span>Custo orçado</span><b className={Number(s.custo_orcado) > 0 ? 'num' : 'falta'}>{Number(s.custo_orcado) > 0 ? moeda(s.custo_orcado) : 'sem custo'}</b></div>}
          </div>
        </Secao>

        <Secao className="span-6" rotulo="Predecessoras e sucessoras">
          {deps.filter((d) => d.servico_id === s.id || d.predecessora_id === s.id).length === 0 && <p className="vazio-curto">Sem ligações no cronograma.</p>}
          <div className="lista">
            {deps.filter((d) => d.servico_id === s.id).map((d) => (
              <button key={d.id} className="linha" onClick={() => goto('servico', { id: d.predecessora_id })}>
                <div className="linha-main"><div className="meta">Depende de · {d.tipo}{d.defasagem_dias ? ` +${d.defasagem_dias} d` : ''}</div><div className="linha-titulo">{nome(d.predecessora_id)}</div></div>
              </button>
            ))}
            {deps.filter((d) => d.predecessora_id === s.id).map((d) => (
              <button key={d.id} className="linha" onClick={() => goto('servico', { id: d.servico_id })}>
                <div className="linha-main"><div className="meta">Libera · {d.tipo}{d.defasagem_dias ? ` +${d.defasagem_dias} d` : ''}</div><div className="linha-titulo">{nome(d.servico_id)}</div></div>
              </button>
            ))}
          </div>
        </Secao>

        <Secao className="span-7" rotulo={`Histórico de produção · ${producoes.length}`}>
          {producoes.length === 0 && <p className="vazio-curto">Nenhuma produção lançada neste serviço.</p>}
          <div className="lista">
            {producoes.slice(0, 12).map((p) => (
              <div key={p.id} className="linha">
                <div className="linha-main">
                  <div className="linha-titulo num">{dataBr(p.data)}</div>
                  <div className="meta">{p.origem}{p.motivo_ajuste ? ` · ${p.motivo_ajuste}` : ''} · {pessoas.find((x) => x.id === p.lancado_por)?.nome}</div>
                </div>
                <div className="linha-qtd num">{quantidade(p.quantidade, s.unidade)}</div>
              </div>
            ))}
          </div>
        </Secao>

        <div className="span-5">
          <Secao rotulo="Por que não concluiu (PCP)">
            {motivos.length === 0 && <p className="vazio-curto">Nenhuma atividade deste serviço ficou sem concluir.</p>}
            <div className="pares">{motivos.map((m) => <div key={m.motivo}><span>{m.motivo}</span><b className="num">{m.total}</b></div>)}</div>
          </Secao>
          <Secao rotulo="Pacotes">
            {deste(pacotes).length === 0 && <p className="vazio-curto">Nenhum pacote deste serviço.</p>}
            <div className="lista">
              {deste(pacotes).map((p) => (
                <button key={p.id} className="linha" onClick={() => goto('pacote', { id: p.id })}>
                  <div className="linha-main"><div className="linha-titulo">{p.nome}</div><div className="meta">{p.status}</div></div>
                  <div className="linha-qtd num">{porcento((p.quantidade_executada / p.quantidade_meta) * 100, 0)}</div>
                </button>
              ))}
            </div>
          </Secao>
          <Secao rotulo="Restrições">
            {deste(restricoes).length === 0 && <p className="vazio-curto">Nenhuma restrição.</p>}
            <div className="pares">
              {deste(restricoes).map((r) => <div key={r.id}><span>{r.descricao}</span><b className={r.status === 'Pendente' ? 'falta' : ''}>{r.status}</b></div>)}
            </div>
          </Secao>
        </div>
      </div>

      <FolhaAcao acao={acao} servico={s} verCusto={pode(usuario.role, 'verCusto')} dia={dia} fechar={() => setAcao(null)}
        salvo={(msg) => { setAcao(null); aviso(msg); recarregar() }} />
    </>
  )
}

const TITULOS = { ajuste: 'Lançar ajuste', editar: 'Editar serviço', unidade: 'Trocar % por quantidade' }

// Ações do Engenheiro e do Coordenador no serviço. acao: 'ajuste' | 'editar' | 'unidade'.
function FolhaAcao({ acao, servico: s, verCusto, dia, fechar, salvo }) {
  const [campos, setCampos] = useState({})
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useAoAbrir(acao, () => {
    setCampos({ quantidade: '', data: dia, motivo: '', custo: s.custo_orcado ?? '', local: s.local ?? '', unidade: 'm' })
    setErro(null)
  })

  const mudar = (k, v) => { setCampos((c) => ({ ...c, [k]: v })); setErro(null) }
  const previa = acao === 'unidade' ? previaTrocaUnidade(s, campos.unidade, campos.quantidade) : null

  async function salvar() {
    let r
    if (acao === 'ajuste') {
      const v = validarAjuste(campos, s, dia)
      if (v.erro) { setErro(v.erro); return }
      r = () => dados.lancarAjuste(v.registro)
    } else if (acao === 'editar') {
      const c = verCusto ? validarCusto(campos.custo) : null
      if (c?.erro) { setErro(c.erro); return }
      r = () => dados.editarServico(s.id, verCusto ? { custo_orcado: c.custo, local: campos.local } : { local: campos.local })
    } else {
      if (previa.erro) { setErro(previa.erro); return }
      r = () => dados.trocarUnidade(s.id, campos.unidade, previa.prevista)
    }
    setSalvando(true)
    const g = await r()
    setSalvando(false)
    if (g.erro) { setErro(g.erro); return }
    salvo(acao === 'ajuste' ? 'Ajuste lançado' : acao === 'editar' ? 'Serviço salvo' : `Serviço agora medido em ${campos.unidade}`)
  }

  return (
    <Folha aberta={!!acao} fechar={fechar} rotulo={TITULOS[acao] || 'Serviço'}>
      {acao && (
        <>
          <div className="lab">{TITULOS[acao]}</div>
          <h2>{s.nome}</h2>
          <div className="sub">Executado {quantidade(s.quantidade_executada, s.unidade)} de {quantidade(s.quantidade_prevista, s.unidade)}</div>

          {acao === 'ajuste' && (
            <>
              <div className="campo">
                <label className="lab" htmlFor="qtd-ajuste">Quantidade (use − para tirar)</label>
                <div className="qtd-ipt">
                  <input id="qtd-ajuste" inputMode="decimal" value={campos.quantidade} onChange={(e) => mudar('quantidade', e.target.value)} />
                  <span>{s.unidade}</span>
                </div>
              </div>
              <div className="campo">
                <label className="lab" htmlFor="data-ajuste">Data</label>
                <input id="data-ajuste" type="date" className="ipt" max={dia} value={campos.data} onChange={(e) => mudar('data', e.target.value)} />
              </div>
              <div className="campo">
                <label className="lab" htmlFor="motivo-ajuste">Motivo</label>
                <input id="motivo-ajuste" className="ipt" value={campos.motivo} onChange={(e) => mudar('motivo', e.target.value)} placeholder="Ex.: medição de campo" />
              </div>
            </>
          )}

          {acao === 'editar' && (
            <>
              {verCusto && (
                <div className="campo">
                  <label className="lab" htmlFor="custo-servico">Custo orçado (R$)</label>
                  <input id="custo-servico" className="ipt" inputMode="decimal" value={campos.custo} onChange={(e) => mudar('custo', e.target.value)} placeholder="Vazio = sem custo" />
                </div>
              )}
              <div className="campo">
                <label className="lab" htmlFor="local-servico">Local</label>
                <input id="local-servico" className="ipt" value={campos.local} onChange={(e) => mudar('local', e.target.value)} placeholder="Rua, quadra ou trecho" />
              </div>
            </>
          )}

          {acao === 'unidade' && (
            <>
              <div className="campo">
                <label className="lab" htmlFor="unidade-nova">Unidade</label>
                <select id="unidade-nova" className="ipt" value={campos.unidade} onChange={(e) => mudar('unidade', e.target.value)}>
                  {UNIDADES.filter((u) => u !== '%').map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="campo">
                <label className="lab" htmlFor="prevista-nova">Quantidade prevista</label>
                <div className="qtd-ipt">
                  <input id="prevista-nova" inputMode="decimal" value={campos.quantidade} onChange={(e) => mudar('quantidade', e.target.value)} />
                  <span>{campos.unidade}</span>
                </div>
              </div>
              {!previa.erro && (
                <p className="aviso" style={{ marginBottom: 16 }}>
                  Executado hoje: {quantidade(s.quantidade_executada, '%')} → {quantidade(previa.executada, campos.unidade)} de {quantidade(previa.prevista, campos.unidade)}.
                  Atividades do PCP, pacotes e ajustes deste serviço serão convertidos. Não tem volta automática.
                </p>
              )}
            </>
          )}

          {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
          <div className="folha-acoes">
            <button className="btn btn-quiet btn-lg" onClick={fechar}>Cancelar</button>
            <button className="btn btn-fill btn-lg" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : acao === 'unidade' ? 'Converter' : 'Salvar'}</button>
          </div>
        </>
      )}
    </Folha>
  )
}
