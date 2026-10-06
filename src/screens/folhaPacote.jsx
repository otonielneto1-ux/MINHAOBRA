// Novo / editar / renovar pacote (Engenheiro e Coordenador): nome, serviços do cronograma (cada um com a meta
// sugerida pelo cronograma até o dia 20 — editável, em destaque se mudar — e a MO profissional e ajudante de
// ORÇAMENTO), % pago sobre o orçamento, colaboradores do efetivo e datas.
// aberta: {} para novo, { pacote } para editar, { inicial } para renovar (campos de camposDaRenovacao).

import { useState } from 'react'
import * as dados from '../lib/dados.js'
import { servicosMedidos } from '../lib/avanco.js'
import { colaboradoresPorParte, ehAjudante, elegiveisAoPacote, entradaNoFormulario, metaAoMudarData, metaDoCronograma, metaEditada, premioDoPacote, premioReal, proximoFechamento, ritmoDaMeta, validarPacote, valoresDoPacote } from '../lib/premio.js'
import { dataBr, diaMes } from '../lib/datas.js'
import { lerNumero, moeda, quantidade } from '../lib/formato.js'
import { PACOTE, STATUS_PACOTE_MANUAL } from '../lib/vocabulario.js'
import { Folha, useAoAbrir } from '../components/index.jsx'

const ITEM_VAZIO = { servico_id: '', quantidade_meta: '', meta_cronograma: null, mo_profissional: '', mo_ajudante: '' }
const num = (v) => { const n = lerNumero(v); return Number.isFinite(n) ? n : 0 }

export function FolhaPacote({ aberta, servicos, funcionarios, diaFolha, hoje, fechar, salvo }) {
  const [campos, setCampos] = useState({})
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const atual = aberta?.pacote || null

  useAoAbrir(aberta, () => {
    if (aberta.inicial) {
      setCampos({ ...aberta.inicial, itens: aberta.inicial.itens.length ? aberta.inicial.itens : [ITEM_VAZIO] })
    } else {
      const p = atual || {}
      setCampos({
        nome: p.nome ?? '', local: p.local ?? '', pct_pago: p.pct_pago ?? '',
        data_inicio: p.data_inicio ?? hoje, data_fechamento: p.data_fechamento ?? proximoFechamento(hoje, diaFolha),
        status: p.status ?? STATUS_PACOTE_MANUAL[0],
        itens: p.servicos?.length
          ? p.servicos.map((s) => ({
            servico_id: s.servico_id, quantidade_meta: s.quantidade_meta, meta_cronograma: s.meta_cronograma ?? null,
            mo_profissional: s.mo_profissional ?? '', mo_ajudante: s.mo_ajudante ?? '',
          }))
          : [ITEM_VAZIO],
        colaboradores: p.colaboradores ?? [],
      })
    }
    setErro(null)
  })

  // No primeiro desenho depois de abrir, o formulário ainda está sendo preenchido.
  if (!aberta || !campos.itens) return null
  const medidos = servicosMedidos(servicos)
  const servico = (id) => servicos.find((s) => s.id === Number(id))
  const sugerida = (id, inicio = campos.data_inicio, fim = campos.data_fechamento) =>
    (servico(id) && inicio && fim ? metaDoCronograma(servico(id), inicio, fim) : null)
  const mudar = (k, v) => { setCampos((c) => ({ ...c, [k]: v })); setErro(null) }
  const mudarItem = (i, k, v) => mudar('itens', campos.itens.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const editada = (it) => metaEditada({ quantidade_meta: num(it.quantidade_meta), meta_cronograma: it.meta_cronograma })
  const moDosItens = campos.itens.map((it) => ({ mo_profissional: num(it.mo_profissional), mo_ajudante: num(it.mo_ajudante) }))
  const pagos = premioReal({ pct_pago: num(campos.pct_pago), servicos: moDosItens })
  const orcado = valoresDoPacote({ servicos: moDosItens })
  // Só mão de obra própria e ativa entra no pacote (terceirizado não recebe prêmio).
  const elegiveis = elegiveisAoPacote(funcionarios)
  const grupos = [
    { titulo: 'Profissionais · recebem a MO profissional', lista: elegiveis.filter((f) => !ehAjudante(f)) },
    { titulo: 'Ajudantes · recebem a MO ajudante', lista: elegiveis.filter(ehAjudante) },
  ]
  const porParte = colaboradoresPorParte({ colaboradores: campos.colaboradores }, funcionarios)
  // Quem é marcado num pacote que já começou entra hoje e recebe proporcional aos dias.
  const entrada = (id) => entradaNoFormulario(atual, id, campos.data_inicio, hoje)
  const datasOk = campos.data_inicio && campos.data_fechamento && campos.data_inicio <= campos.data_fechamento
  const previa = datasOk ? premioDoPacote({
    id: 0, nome: '', data_inicio: campos.data_inicio, data_fechamento: campos.data_fechamento, pct_pago: num(campos.pct_pago),
    servicos: moDosItens, colaboradores: campos.colaboradores, entradas: Object.fromEntries(campos.colaboradores.map((id) => [id, entrada(id)])), saidas: atual?.saidas,
  }, [], funcionarios).linhas : []
  const marcado = (id) => campos.colaboradores.includes(id)
  const alternar = (id) => mudar('colaboradores', marcado(id) ? campos.colaboradores.filter((x) => x !== id) : [...campos.colaboradores, id])

  // Escolher o serviço já traz a meta do cronograma para o período do pacote.
  function escolherServico(i, id) {
    const sug = sugerida(id)
    setCampos((c) => ({
      ...c,
      local: c.local || servico(id)?.local || '',
      itens: c.itens.map((it, j) => (j === i ? { ...it, servico_id: id, meta_cronograma: sug, quantidade_meta: sug ?? '' } : it)),
    }))
    setErro(null)
  }

  // Mudar as datas recalcula a sugestão; a meta só acompanha se não tiver sido editada à mão.
  function mudarData(k, v) {
    const inicio = k === 'data_inicio' ? v : campos.data_inicio
    const fim = k === 'data_fechamento' ? v : campos.data_fechamento
    setCampos((c) => ({
      ...c,
      [k]: v,
      itens: c.itens.map((it) => (it.servico_id ? metaAoMudarData(it, sugerida(it.servico_id, inicio, fim)) : it)),
    }))
    setErro(null)
  }

  async function salvar() {
    const v = validarPacote(campos, { servicos, atual, hoje })
    if (v.erro) { setErro(v.erro); return }
    setSalvando(true)
    const r = await dados.salvarPacote(atual?.id, v)
    setSalvando(false)
    if (r.erro) { setErro(r.erro); return }
    salvo(campos.renovado_de_id ? 'Pacote renovado para o próximo período' : atual ? 'Pacote salvo' : 'Pacote criado', r.data)
  }

  const titulo = campos.renovado_de_id ? 'Renovar pacote' : atual ? 'Editar pacote' : 'Novo pacote'

  return (
    <Folha aberta fechar={fechar} rotulo={titulo}>
      <div className="lab">{titulo}</div>
      <h2>{campos.nome || 'Meta de produção com prêmio'}</h2>
      {campos.renovado_de_id && <p className="sub">Período de {dataBr(campos.data_inicio)} a {dataBr(campos.data_fechamento)}, com as metas novas do cronograma. Confira e salve.</p>}
      <div className="campo">
        <label className="lab" htmlFor="nome-pacote">Nome do pacote</label>
        <input id="nome-pacote" className="ipt" value={campos.nome} onChange={(e) => mudar('nome', e.target.value)} placeholder="Ex.: Galeria Rua 2 – trecho 1" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="campo">
          <label className="lab" htmlFor="inicio-pacote">Início</label>
          <input id="inicio-pacote" type="date" className="ipt" value={campos.data_inicio} onChange={(e) => mudarData('data_inicio', e.target.value)} />
        </div>
        <div className="campo">
          <label className="lab" htmlFor="fech-pacote">Fechamento da folha</label>
          <input id="fech-pacote" type="date" className="ipt" value={campos.data_fechamento} onChange={(e) => mudarData('data_fechamento', e.target.value)} />
        </div>
      </div>

      <div className="campo">
        <span className="lab">Serviços do cronograma</span>
        <span className="meta">A meta vem do cronograma (previsto no período, de segunda a sexta). Os valores de MO são de orçamento.</span>
        {campos.itens.map((it, i) => {
          const s = servico(it.servico_id)
          const usados = campos.itens.filter((_, j) => j !== i).map((x) => Number(x.servico_id))
          const mudou = editada(it)
          return (
            <div key={i} className="item-pacote">
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="ipt" aria-label={`Serviço ${i + 1}`} value={it.servico_id} onChange={(e) => escolherServico(i, e.target.value)}>
                  <option value="">— escolha o serviço —</option>
                  {medidos.filter((x) => !usados.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.codigo_eap} · {x.nome}</option>)}
                </select>
                {campos.itens.length > 1 && (
                  <button type="button" className="btn btn-quiet" aria-label={`Tirar ${s?.nome || 'serviço'} do pacote`}
                    onClick={() => mudar('itens', campos.itens.filter((_, j) => j !== i))}>Tirar</button>
                )}
              </div>
              <div className="item-pacote-campos">
                <label>
                  <span className="lab">Meta ({s?.unidade || '—'})</span>
                  <input className={`ipt ${mudou ? 'editada' : ''}`} inputMode="decimal" value={it.quantidade_meta} onChange={(e) => mudarItem(i, 'quantidade_meta', e.target.value)} />
                </label>
                <label>
                  <span className="lab">MO profissional (orçamento)</span>
                  <input className="ipt" inputMode="decimal" value={it.mo_profissional} onChange={(e) => mudarItem(i, 'mo_profissional', e.target.value)} placeholder="R$ 0,00" />
                </label>
                <label>
                  <span className="lab">MO ajudante (orçamento)</span>
                  <input className="ipt" inputMode="decimal" value={it.mo_ajudante} onChange={(e) => mudarItem(i, 'mo_ajudante', e.target.value)} placeholder="R$ 0,00" />
                </label>
                <div>
                  <span className="lab">MO total</span>
                  <div className="mo-total num">{moeda(num(it.mo_profissional) + num(it.mo_ajudante))}</div>
                </div>
              </div>
              {s && datasOk && (() => {
                const r = ritmoDaMeta(s, campos.data_inicio, campos.data_fechamento, num(it.quantidade_meta))
                return (
                  <p className="meta" style={{ marginTop: 6 }}>
                    Cronograma: {quantidade(s.quantidade_prevista, s.unidade)} no total · {quantidade(it.meta_cronograma ?? 0, s.unidade)} previstos no período
                    {r.dias ? <> em {r.dias} {r.dias === 1 ? 'dia útil' : 'dias úteis'} (seg a sex) · <b>{quantidade(r.porDia, s.unidade)}/dia</b> para cumprir a meta</> : ' · sem dias previstos no período'}
                  </p>
                )
              })()}
              {mudou && (
                <p className="meta warn" style={{ marginTop: 6 }}>
                  Meta editada · o cronograma prevê {quantidade(it.meta_cronograma, s?.unidade)}{' '}
                  <button type="button" className="link" onClick={() => mudarItem(i, 'quantidade_meta', it.meta_cronograma)}>usar a do cronograma</button>
                </p>
              )}
              {!mudou && s && it.meta_cronograma === 0 && <p className="meta warn" style={{ marginTop: 6 }}>O cronograma não prevê este serviço no período: informe a meta.</p>}
            </div>
          )
        })}
        <button type="button" className="btn btn-bloco" onClick={() => mudar('itens', [...campos.itens, ITEM_VAZIO])}>+ Incluir outro serviço</button>
      </div>

      <div className="campo">
        <label className="lab" htmlFor="pct-pacote">% pago sobre o orçamento</label>
        <input id="pct-pacote" className="ipt" style={{ maxWidth: 160 }} inputMode="decimal" value={campos.pct_pago} onChange={(e) => mudar('pct_pago', e.target.value)} placeholder="Ex.: 30" />
        <span className="meta">O prêmio pago é a MO orçada × este %.</span>
        <div className="pares" style={{ marginTop: 6 }}>
          <div><span>MO profissional · orçada → paga</span><b className="num">{moeda(orcado.profissional)} → {moeda(pagos.profissional)}</b></div>
          <div><span>MO ajudante · orçada → paga</span><b className="num">{moeda(orcado.ajudante)} → {moeda(pagos.ajudante)}</b></div>
          <div><span>Prêmio pago do pacote</span><b className="num">{moeda(pagos.total)}</b></div>
          {['profissional', 'ajudante'].map((parte) => {
            const lista = porParte[parte]
            if (!(pagos[parte] > 0)) return null
            const cheios = lista.filter((f) => !entrada(f.id))
            const cada = previa.find((l) => l.funcionario_id === (cheios[0] || lista[0])?.id)?.valor ?? 0
            const depois = lista.length - cheios.length
            return (
              <div key={parte}>
                <span>Cada {parte === 'ajudante' ? 'ajudante' : 'profissional'} recebe (partes iguais){depois > 0 ? ` · ${depois} entra${depois === 1 ? '' : 'm'} depois: proporcional aos dias` : ''}</span>
                <b className={`num ${lista.length ? '' : 't-warn'}`}>{lista.length ? `${moeda(cada)} · ${lista.length} ${lista.length === 1 ? 'pessoa' : 'pessoas'}` : 'escolha os colaboradores'}</b>
              </div>
            )
          })}
        </div>
      </div>

      <div className="campo">
        <label className="lab" htmlFor="local-pacote">Local</label>
        <input id="local-pacote" className="ipt" value={campos.local} onChange={(e) => mudar('local', e.target.value)} placeholder="Rua, quadra ou trecho" />
      </div>

      <div className="campo">
        <span className="lab">Colaboradores do pacote · {campos.colaboradores.length}</span>
        <span className="meta">Só eles recebem o prêmio, e no Efetivo o pacote só aparece para eles.</span>
        {elegiveis.length === 0 && <p className="vazio-curto">Cadastre a equipe em Cadastros › Funcionários.</p>}
        {grupos.map((g) => g.lista.length > 0 && (
          <div key={g.titulo}>
            <div className="lab lab-ink" style={{ margin: '10px 0 2px' }}>{g.titulo}</div>
            <div className="lista">
              {g.lista.map((f) => (
                <label key={f.id} className="linha marcar" style={{ minHeight: 48, padding: '8px 0' }}>
                  <input type="checkbox" checked={marcado(f.id)} onChange={() => alternar(f.id)} disabled={!!atual?.saidas?.[f.id]} />
                  <div className="linha-main">
                    <b>{f.nome}</b> <span className="meta">· {f.funcao}{f.matricula ? ` · mat. ${f.matricula}` : ''}</span>
                    {atual?.saidas?.[f.id] && <span className="meta"> · saiu {diaMes(atual.saidas[f.id].saiu_em)} com {atual.saidas[f.id].pct_saida}% (garantido, não sai do pacote)</span>}
                    {marcado(f.id) && entrada(f.id) && <span className="meta warn"> · entra {diaMes(entrada(f.id))}: recebe {moeda(previa.find((l) => l.funcionario_id === f.id)?.valor ?? 0)}</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="campo">
        <span className="lab">Status</span>
        {campos.status === PACOTE.PAUSADO
          ? <p className="meta warn">Pausado · para voltar, use Retomar na tela do pacote.</p>
          : (
            <div className="filtros" style={{ marginBottom: 0 }}>
              {STATUS_PACOTE_MANUAL.map((st) => (
                <button key={st} type="button" className="chave" aria-pressed={campos.status === st} onClick={() => mudar('status', st)}>{st}</button>
              ))}
            </div>
          )}
        <span className="meta">Pausado sai do botão Pausar; Concluído e Não concluído, do fechamento da folha.</span>
      </div>
      {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
      <div className="folha-acoes">
        <button className="btn btn-quiet btn-lg" onClick={fechar}>Cancelar</button>
        <button className="btn btn-fill btn-lg" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </Folha>
  )
}
