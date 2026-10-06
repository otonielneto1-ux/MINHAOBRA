// Pacotes de produção: quadro por status (largo) ou lista (celular), com filtros; aba Resumo por funcionário.
// Engenheiro e Coordenador criam e fecham; o Mestre só lê, sem o valor do prêmio (o banco nem manda).

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { camposDaRenovacao, pctPacote, renovacoesPendentes } from '../lib/premio.js'
import { diasEntre, diaMes } from '../lib/datas.js'
import { moeda } from '../lib/formato.js'
import { PACOTE, STATUS_PACOTE } from '../lib/vocabulario.js'
import { metaEmRisco } from '../lib/alertas.js'
import { Abas, Barra, Cabecalho, Carregando, ErroCaixa, Icone, Vazio, useAviso, useCarga } from '../components/index.jsx'
import { ResumoPacotes } from './resumoPacotes.jsx'
import { FolhaPacote } from './folhaPacote.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarPacotes(), dados.listarServicos(), dados.listarFuncionarios()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { pacotes: r[0].data, servicos: r[1].data, funcionarios: r[2].data }, erro: null }
}

const TOM = { [PACOTE.CONCLUIDO]: 'ok', [PACOTE.NAO_CONCLUIDO]: 'crit', [PACOTE.EM_EXECUCAO]: 'info', [PACOTE.LIBERADO]: 'warn', [PACOTE.PAUSADO]: 'crit' }
export const tomPacote = (status) => TOM[status] || 'neutral'
const ABAS = [{ id: 'quadro', texto: 'Quadro' }, { id: 'resumo', texto: 'Resumo' }]

export default function Pacotes({ goto, usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [status, setStatus] = useState(null)
  const [servicoId, setServicoId] = useState('')
  const [ate, setAte] = useState('')
  const [novo, setNovo] = useState(null)
  const [aba, setAba] = useState('quadro')
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])
  const gestao = pode(usuario.role, 'gerirPacotes')
  const cab = (
    <Cabecalho rotulo="Metas de produção com prêmio na folha" titulo="Pacotes"
      acoes={gestao && (
        <>
          <button className="btn" onClick={() => goto('fechamento')}><Icone nome="cadeado" />Fechar pacotes do mês</button>
          <button className="btn btn-fill" onClick={() => setNovo({})}><Icone nome="mais_um" />Novo pacote</button>
        </>
      )} />
  )
  const folha = data && gestao && (
    <FolhaPacote aberta={novo} servicos={data.servicos} funcionarios={data.funcionarios} diaFolha={obra.dia_fechamento_folha} hoje={dia}
      fechar={() => setNovo(null)} salvo={(msg, id) => { setNovo(null); aviso(msg); goto('pacote', { id }) }} />
  )

  if (carregando && !data) return <>{cab}<Carregando /></>
  if (erro) return <>{cab}<ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>
  if (data.pacotes.length === 0) {
    return (
      <>
        {cab}
        <Vazio icone="pacotes" titulo="Nenhum pacote ainda" texto="Crie o primeiro a partir de um serviço do cronograma."
          acao={gestao ? { texto: 'Novo pacote', fn: () => setNovo({}) } : null} />
        {folha}
      </>
    )
  }

  const servico = (id) => data.servicos.find((s) => s.id === id)
  const comServico = [...new Set(data.pacotes.flatMap((p) => p.servicos.map((x) => x.servico_id)))].map(servico).filter(Boolean)
  const filtrados = data.pacotes
    .filter((p) => !servicoId || p.servicos.some((x) => x.servico_id === Number(servicoId)))
    .filter((p) => !ate || p.data_fechamento <= ate)
  const colunas = status ? [status] : STATUS_PACOTE
  const pendentes = gestao ? renovacoesPendentes(data.pacotes, dia) : []

  if (aba === 'resumo') {
    return (
      <>
        {cab}
        <Abas abas={ABAS} atual={aba} trocar={setAba} />
        <ResumoPacotes pacotes={data.pacotes} funcionarios={data.funcionarios} obraId={obra.id} diaFolha={obra.dia_fechamento_folha} hoje={dia}
          verMo={pode(usuario.role, 'verPremio')} gestao={gestao} goto={goto} />
      </>
    )
  }

  async function naoContinua(p) {
    const r = await dados.marcarRenovacao(p.id, false)
    if (r.erro) { aviso(r.erro); return }
    aviso(`${p.nome}: não continua`)
    recarregar()
  }

  return (
    <>
      {cab}
      <Abas abas={ABAS} atual={aba} trocar={setAba} />
      {pendentes.length > 0 && (
        <section className="section destaque" style={{ marginBottom: 16 }}>
          <div className="sec-head"><span className="lab lab-ink">Fechamento passou · o pacote continua no próximo período?</span></div>
          <div className="lista">
            {pendentes.map((p) => {
              const ren = camposDaRenovacao(p, data.servicos, obra.dia_fechamento_folha)
              return (
                <div key={p.id} className="linha pergunta-renovacao">
                  <div className="linha-main">
                    <div className="linha-titulo">{p.nome}</div>
                    <div className="meta">fechou {diaMes(p.data_fechamento)} · próximo período {diaMes(ren.data_inicio)} a {diaMes(ren.data_fechamento)}{ren.itens.length === 0 ? ' · os serviços já terminaram' : ''}</div>
                  </div>
                  <button className="btn btn-fill" onClick={() => setNovo({ inicial: ren })}>Sim, renovar</button>
                  <button className="btn btn-quiet" onClick={() => naoContinua(p)}>Não</button>
                </div>
              )
            })}
          </div>
        </section>
      )}
      <div className="filtros">
        <button className="chave" aria-pressed={status === null} onClick={() => setStatus(null)}>Todos</button>
        {STATUS_PACOTE.map((st) => <button key={st} className="chave" aria-pressed={status === st} onClick={() => setStatus(st)}>{st}</button>)}
      </div>
      <div className="filtros">
        <select className="ipt" style={{ maxWidth: 320 }} aria-label="Filtrar por serviço" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          <option value="">Todos os serviços</option>
          {comServico.map((s) => <option key={s.id} value={s.id}>{s.codigo_eap} · {s.nome}</option>)}
        </select>
        <label className="lab" htmlFor="fecha-ate">Fecha até</label>
        <input id="fecha-ate" type="date" className="ipt" style={{ maxWidth: 190 }} value={ate} onChange={(e) => setAte(e.target.value)} />
        {(servicoId || ate) && <button className="btn btn-quiet" onClick={() => { setServicoId(''); setAte('') }}>Limpar</button>}
      </div>

      <div className="quadro" style={status ? { gridTemplateColumns: '1fr' } : undefined}>
        {colunas.map((st) => {
          const lista = filtrados.filter((p) => p.status === st)
          return (
            <div key={st} className="coluna">
              <h3><span>{st}</span><span>{lista.length}</span></h3>
              {lista.length === 0 && <p className="dia-vazio">Nenhum.</p>}
              {lista.map((p) => {
                const nomes = p.servicos.map((x) => servico(x.servico_id)?.nome).filter(Boolean)
                const pct = pctPacote(p)
                const faltam = diasEntre(dia, p.data_fechamento)
                return (
                  <button key={p.id} className="cartao" onClick={() => goto('pacote', { id: p.id })}>
                    <div className="tarefa-titulo">{p.fechado_em && <span title="Fechado na folha" style={{ display: 'inline-block', width: 16, verticalAlign: -2, marginRight: 4 }}><Icone nome="cadeado" /></span>}{p.nome}</div>
                    <div className="tarefa-meta">{nomes[0] || 'sem serviço'}{nomes.length > 1 ? ` + ${nomes.length - 1}` : ''} · {p.local}</div>
                    <div style={{ margin: '10px 0 6px' }}><Barra pct={pct} tom={tomPacote(p.status) === 'crit' ? 'crit' : pct >= 100 ? 'ok' : ''} /></div>
                    <div className="meta num">
                      {Math.round(pct)}% da meta{p.servicos.length > 1 ? ` · média de ${p.servicos.length} serviços` : ''} · {p.colaboradores.length} {p.colaboradores.length === 1 ? 'colaborador' : 'colaboradores'}
                    </div>
                    <div className={`meta ${metaEmRisco(p, dia) ? 'warn' : ''}`}>
                      {p.fechado_em ? `fechado ${diaMes(p.data_fechamento)}` : faltam < 0 ? `fechamento ${diaMes(p.data_fechamento)} · vencido` : `fecha ${diaMes(p.data_fechamento)} · ${faltam} dias`}
                    </div>
                    {p.status === PACOTE.PAUSADO && <div className="meta warn">pausado desde {diaMes(p.pausa_desde)} · {p.pausa_motivo}</div>}
                    {'valor_premio' in p && <div className="meta" style={{ color: 'var(--ink)' }}>Prêmio {moeda(p.valor_premio)} · {Number(p.pct_pago)}% de {moeda(p.valor_orcado)}</div>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      {folha}
    </>
  )
}
