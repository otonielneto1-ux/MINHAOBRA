// Efetivo do dia: situação de cada funcionário e o pacote em que trabalhou.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { mestrePodeAlterar } from '../lib/pcp.js'
import { dataBr, nomeDia, somarDias } from '../lib/datas.js'
import { PERFIS, SITUACOES, TIPOS_MAO_OBRA } from '../lib/vocabulario.js'
import { Abas, Cabecalho, Carregando, ErroCaixa, Icone, Vazio, useAviso, useCarga } from '../components/index.jsx'

const NOME_GRUPO = { Direta: 'Mão de obra direta', Indireta: 'Mão de obra indireta', Terceirizada: 'Terceirizada' }

// Dia útil anterior (pula o domingo).
const diaAnterior = (d) => (nomeDia(somarDias(d, -1)) === 'Dom' ? somarDias(d, -2) : somarDias(d, -1))

async function carregar(data) {
  const r = await Promise.all([
    dados.listarFuncionarios({ soAtivos: true }), dados.listarPresencas({ data }),
    dados.listarPresencas({ data: diaAnterior(data) }), dados.listarPacotes(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [funcionarios, doDia, deOntem, pacotes] = r.map((x) => x.data)
  return { data: { funcionarios, doDia, deOntem, pacotes: pacotes.filter((p) => ['Liberado', 'Em execução'].includes(p.status)) }, erro: null }
}

export default function Efetivo({ goto, usuario }) {
  const [aba, setAba] = useState('dia')
  const [data, setData] = useState(dados.hoje())
  return (
    <>
      <Cabecalho rotulo="Efetivo · quem trabalhou em pacote conta para o prêmio" titulo="Efetivo do dia" />
      <Abas abas={[{ id: 'dia', texto: 'Lançar' }, { id: 'historico', texto: 'Histórico' }]} atual={aba} trocar={setAba} />
      {aba === 'dia'
        ? <EfetivoDia key={data} data={data} setData={setData} usuario={usuario} goto={goto} />
        : <Historico abrir={(d) => { setData(d); setAba('dia') }} />}
    </>
  )
}

function EfetivoDia({ data, setData, usuario, goto }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const hoje = dados.hoje()
  const { data: base, erro, carregando, recarregar } = useCarga(() => carregar(data), [obra.id, data])
  const [rascunho, setRascunho] = useState(null)
  const [salvando, setSalvando] = useState(false)

  if (carregando && !base) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const editavel = pode(usuario.role, 'lancarEfetivo') && (usuario.role !== PERFIS.MESTRE || mestrePodeAlterar(data, hoje)) && data <= hoje
  if (base.funcionarios.length === 0) {
    return <Vazio icone="efetivo" titulo="Nenhum funcionário cadastrado"
      texto={pode(usuario.role, 'gerirCadastros') ? 'Cadastre a equipe em Cadastros › Funcionários.' : 'Peça ao engenheiro para cadastrar a equipe.'}
      acao={pode(usuario.role, 'gerirCadastros') ? { texto: 'Cadastrar funcionários', fn: () => goto('cadastros', { aba: 'funcionarios' }) } : null} />
  }

  const marcado = rascunho || Object.fromEntries(base.doDia.map((p) => [p.funcionario_id, { situacao: p.situacao, pacote_id: p.pacote_id }]))
  const marcar = (id, mudanca) => setRascunho({ ...marcado, [id]: { ...(marcado[id] || { pacote_id: null }), ...mudanca } })

  function repetirOntem() {
    const novo = { ...marcado }
    let n = 0
    for (const p of base.deOntem) {
      if (novo[p.funcionario_id]) continue
      if (!base.funcionarios.some((f) => f.id === p.funcionario_id)) continue
      novo[p.funcionario_id] = { situacao: p.situacao, pacote_id: base.pacotes.some((x) => x.id === p.pacote_id) ? p.pacote_id : null }
      n++
    }
    setRascunho(novo)
    aviso(n ? `${n} pessoas copiadas de ${dataBr(diaAnterior(data))}` : 'Todos já estavam marcados')
  }

  async function salvar() {
    const linhas = Object.entries(marcado).map(([id, v]) => ({ funcionario_id: Number(id), ...v }))
    setSalvando(true)
    const { erro: e } = await dados.salvarEfetivo(data, linhas)
    setSalvando(false)
    if (e) { aviso(e); return }
    setRascunho(null)
    recarregar()
    aviso(`Efetivo de ${dataBr(data).slice(0, 5)} salvo: ${conta('Presente')} presentes`)
  }

  const conta = (sit) => Object.values(marcado).filter((v) => v.situacao === sit).length
  const faltaMarcar = base.funcionarios.filter((f) => !marcado[f.id]).length
  const presentesTipo = (t) => base.funcionarios.filter((f) => f.tipo_mao_obra === t && marcado[f.id]?.situacao === 'Presente').length

  return (
    <>
      <div className="filtros">
        <label className="lab" htmlFor="data-efetivo" style={{ position: 'absolute', left: -9999 }}>Data</label>
        <input id="data-efetivo" className="ipt" type="date" style={{ width: 200 }} value={data} max={hoje} onChange={(e) => e.target.value && setData(e.target.value)} />
        {editavel && <button className="btn btn-quiet" onClick={repetirOntem}><Icone nome="copiar" />Repetir efetivo de ontem</button>}
        {!editavel && <span className="meta warn">Só leitura{usuario.role === PERFIS.MESTRE ? ' — o mestre edita hoje e ontem' : ''}</span>}
      </div>

      <div className="kpis">
        <div className="kpi ok"><b className="num">{conta('Presente')}</b><span className="lab">Presentes</span></div>
        <div className="kpi crit"><b className="num">{conta('Falta')}</b><span className="lab">Faltas</span></div>
        <div className="kpi warn"><b className="num">{conta('Atestado')}</b><span className="lab">Atestados</span></div>
        <div className="kpi"><b className="num">{conta('Afastado')}</b><span className="lab">Afastados</span></div>
      </div>

      {TIPOS_MAO_OBRA.map((t) => {
        const lista = base.funcionarios.filter((f) => f.tipo_mao_obra === t)
        if (!lista.length) return null
        return (
          <section key={t} className="grupo">
            <div className="sec-head"><span className="lab lab-ink">{NOME_GRUPO[t]}</span><span className="lab" style={{ marginLeft: 'auto' }}>{presentesTipo(t)} / {lista.length} presentes</span></div>
            {lista.map((f) => {
              const m = marcado[f.id]
              return (
                <div key={f.id} className="pessoa">
                  <div><div className="pessoa-nome">{f.nome}</div><div className="meta">{f.funcao}{f.empresa ? ` · ${f.empresa}` : ''}</div></div>
                  <div className="seg" role="group" aria-label={`Situação de ${f.nome}`}>
                    {SITUACOES.map((s) => (
                      <button key={s} className={`v-${s}`} aria-pressed={m?.situacao === s} disabled={!editavel}
                        onClick={() => marcar(f.id, { situacao: s, ...(s !== 'Presente' ? { pacote_id: null } : {}) })}>{s}</button>
                    ))}
                  </div>
                  <select className="ipt" aria-label={`Pacote de ${f.nome}`} value={m?.pacote_id || ''}
                    disabled={!editavel || m?.situacao !== 'Presente' || t === 'Terceirizada'}
                    onChange={(e) => marcar(f.id, { pacote_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">{t === 'Terceirizada' ? 'Terceirizado — sem pacote' : 'Sem pacote'}</option>
                    {base.pacotes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )
            })}
          </section>
        )
      })}

      {editavel && (
        <div className="salvar-barra">
          <span className="lab num">
            <span className="so-largo">{conta('Presente')} presentes · Direta {presentesTipo('Direta')} · Indireta {presentesTipo('Indireta')} · Terceirizada {presentesTipo('Terceirizada')}{faltaMarcar ? ` · ${faltaMarcar} sem marcar` : ''}</span>
            <span className="so-curto">{conta('Presente')} presentes{faltaMarcar ? ` · ${faltaMarcar} sem marcar` : ''}</span>
          </span>
          <button className="btn btn-fill btn-lg" onClick={salvar} disabled={salvando || !rascunho}>{salvando ? 'Salvando…' : 'Salvar efetivo'}</button>
        </div>
      )}
    </>
  )
}

async function carregarHistorico(ate) {
  const r = await Promise.all([dados.listarPresencas({ de: somarDias(ate, -20), ate }), dados.listarFuncionarios()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { presencas: r[0].data, funcionarios: r[1].data }, erro: null }
}

function Historico({ abrir }) {
  const { obra } = useObra()
  const hoje = dados.hoje()
  const { data, erro, carregando, recarregar } = useCarga(() => carregarHistorico(hoje), [obra.id])
  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const tipo = new Map(data.funcionarios.map((f) => [f.id, f.tipo_mao_obra]))
  const dias = [...new Set(data.presencas.map((p) => p.data))].sort().reverse()
  if (!dias.length) return <p className="vazio-curto">Nenhum efetivo lançado nos últimos 20 dias.</p>

  return (
    <section className="section">
      <div className="lista">
        {dias.map((d) => {
          const pres = data.presencas.filter((p) => p.data === d && p.situacao === 'Presente')
          const ausentes = data.presencas.filter((p) => p.data === d && p.situacao !== 'Presente').length
          const t = (x) => pres.filter((p) => tipo.get(p.funcionario_id) === x).length
          return (
            <button key={d} className="linha" onClick={() => abrir(d)}>
              <div className="linha-main">
                <div className="linha-titulo num">{nomeDia(d)} · {dataBr(d)}</div>
                <div className="meta">Direta {t('Direta')} · Indireta {t('Indireta')} · Terceirizada {t('Terceirizada')} · {ausentes} ausentes</div>
              </div>
              <div className="linha-qtd num">{pres.length} <small>presentes</small></div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
