// Início — Painel do dia (Engenheiro e Coordenador).

import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { resumoAvanco, curvaS } from '../lib/avanco.js'
import { ppc } from '../lib/pcp.js'
import { montarAlertas } from '../lib/alertas.js'
import { efetivoTerceirizadas } from '../lib/efetivo.js'
import { mesesEntre, segundaDaSemana, somarDias, dataBr, nomeDiaLongo } from '../lib/datas.js'
import { porcento, pontos, quantidade, numero } from '../lib/formato.js'
import { TIPOS_MAO_OBRA } from '../lib/vocabulario.js'
import { Barra, Caixa, Cabecalho, Carregando, CurvaS, ErroCaixa, Secao, Vazio, useCarga } from '../components/index.jsx'

async function carregarPainel(dia) {
  const segunda = segundaDaSemana(dia)
  const r = await Promise.all([
    dados.listarServicos(), dados.listarProducoes(), dados.listarEtapas(),
    dados.listarAtividades({ de: segunda, ate: somarDias(segunda, 5) }),
    dados.listarPresencas({ data: dia }), dados.listarFuncionarios(),
    dados.listarPacotes(), dados.listarRestricoes(), dados.listarOcorrencias(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [servicos, producoes, etapas, atividades, presencas, funcionarios, pacotes, restricoes, ocorrencias] = r.map((x) => x.data)
  return { data: { servicos, producoes, etapas, atividades, presencas, funcionarios, pacotes, restricoes, ocorrencias }, erro: null }
}

export default function Inicio({ goto, usuario }) {
  const { obra } = useObra()
  const dia = dados.hoje()
  const { data, erro, carregando, recarregar } = useCarga(() => carregarPainel(dia), [obra.id])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const { servicos, producoes, etapas, atividades, presencas, funcionarios, pacotes, restricoes, ocorrencias } = data
  const primeiroNome = usuario.nome.split(' ')[0]
  const cabecalho = <Cabecalho rotulo={`Painel do dia · ${nomeDiaLongo(dia)}, ${dataBr(dia)}`} titulo={`Bom dia, ${primeiroNome}`} />

  if (!servicos.some((s) => !s.e_resumo)) {
    return (
      <>
        {cabecalho}
        <Vazio icone="planejamento" titulo="Ainda não há cronograma nesta obra"
          texto="Importe o arquivo do MS Project para começar. Depois disso o painel mostra o avanço, as atividades e os alertas."
          acao={{ texto: 'Importar do Project', fn: () => goto('importar') }} />
      </>
    )
  }

  const geral = resumoAvanco(servicos, dia)
  const porEtapa = etapas.map((e) => ({ ...e, ...resumoAvanco(servicos, dia, e.id) }))
  const curva = curvaS(servicos, producoes, mesesEntre(obra.data_inicio, obra.data_fim_contrato), dia)
  const deHoje = atividades.filter((a) => a.data_prevista === dia)
  const nomeServico = (id) => servicos.find((s) => s.id === id)
  const semana = ppc(atividades)

  const funcPorId = new Map(funcionarios.map((f) => [f.id, f]))
  const presentes = presencas.filter((p) => p.situacao === 'Presente').map((p) => funcPorId.get(p.funcionario_id))
  const conta = (sit) => presencas.filter((p) => p.situacao === sit).length
  const terceirizadas = efetivoTerceirizadas(funcionarios, presencas)
  const porFuncao = Object.entries(presentes.reduce((m, f) => ({ ...m, [f.funcao]: (m[f.funcao] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])

  const alertas = montarAlertas({ servicos, pacotes, restricoes, ocorrencias, efetivoLancado: presencas.length > 0, hoje: dia })
  const criticos = alertas.filter((a) => a.nivel === 'crit').length

  return (
    <>
      {cabecalho}

      <div className="kpis">
        <button className="kpi" onClick={() => goto('planejamento', { aba: 'cronograma' })}>
          <b className="num">{numero(geral.realizado, 1)}<small>%</small></b><span className="lab">Avanço realizado</span>
        </button>
        <button className="kpi" onClick={() => goto('efetivo')}>
          <b className="num">{presentes.length}</b><span className="lab">Pessoas no canteiro</span>
        </button>
        <button className={`kpi ${semana.pct !== null && semana.pct < 80 ? 'warn' : ''}`} onClick={() => goto('planejamento', { aba: 'semana' })}>
          <b className="num">{semana.pct ?? '—'}{semana.pct !== null && <small>%</small>}</b><span className="lab">PPC da semana</span>
        </button>
        <div className={`kpi ${criticos ? 'crit' : 'ok'}`}>
          <b className="num">{criticos}</b><span className="lab">Alertas críticos</span>
        </div>
      </div>

      <div className="grid">
        <Secao className="span-7" rotulo="Avanço físico" link={{ texto: 'Cronograma', acao: () => goto('planejamento', { aba: 'cronograma' }) }}>
          <div className="linha-num">
            <div><div className="lab">Realizado</div><div className="grande num">{numero(geral.realizado, 1)}<small>%</small></div></div>
            <div><div className="lab">Previsto hoje</div><div className="medio num">{porcento(geral.previsto)}</div></div>
            <span className={`st ${geral.diferenca < 0 ? 'st-crit' : 'st-ok'}`}>{pontos(geral.diferenca)} {geral.diferenca < 0 ? 'abaixo' : 'acima'}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            {porEtapa.map((e) => (
              <div key={e.id} className="etapa-row">
                <b>{e.nome}</b>
                <Barra pct={e.realizado} marco={e.previsto} tom={e.diferenca < -5 ? 'crit' : ''} />
                <div className="etapa-val num"><b>{porcento(e.realizado)}</b> / {porcento(e.previsto)}</div>
              </div>
            ))}
          </div>
          <CurvaS pontos={curva} />
          {geral.peso === 'duracao' && (
            <button className="aviso" onClick={() => goto('planejamento', { aba: 'cronograma', semCusto: true })}>
              {geral.semCusto} {geral.semCusto === 1 ? 'serviço sem custo' : 'serviços sem custo'} — avanço ponderado por duração
              <span className="ir">Editar custos</span>
            </button>
          )}
        </Secao>

        <Secao className="span-5" rotulo={`Alertas · ${alertas.length}`}>
          {alertas.length === 0 && <p className="vazio-curto">Nenhum alerta hoje.</p>}
          <div className="lista">
            {alertas.map((a, i) => (
              <button key={i} className="linha" onClick={() => goto(a.destino.screen, a.destino.params)}>
                <span className={`marca ${a.nivel}`} />
                <div className="linha-main">
                  <div className="linha-titulo">{a.titulo}</div>
                  <div className={`meta ${a.nivel}`}>{a.detalhe}</div>
                </div>
              </button>
            ))}
          </div>
        </Secao>

        <Secao className="span-7" rotulo={`Atividades de hoje · ${deHoje.length}`} link={{ texto: 'Ver semana', acao: () => goto('planejamento', { aba: 'semana' }) }}>
          {deHoje.length === 0 && <p className="vazio-curto">Nenhuma atividade planejada para hoje.</p>}
          <div className="lista">
            {deHoje.map((a) => {
              const s = nomeServico(a.servico_id)
              return (
                <button key={a.id} className="linha" onClick={() => goto('planejamento', { aba: 'semana' })}>
                  <Caixa tom={a.status === 'Concluída' ? 'ok' : a.status === 'Não concluída' ? 'crit' : ''} />
                  <div className="linha-main">
                    <div className="linha-titulo">{s?.nome}</div>
                    <div className="meta">{a.local} · {a.equipe || 'sem equipe'}</div>
                  </div>
                  <div className="linha-qtd num">{quantidade(a.quantidade_planejada, s?.unidade)}</div>
                </button>
              )
            })}
          </div>
          <div className="caixa-rodape">
            <div><div className="lab">PPC da semana até agora</div><div className="v num">{semana.pct ?? '—'}{semana.pct !== null && '%'} <span className="lab">· {semana.concluidas} de {semana.base}</span></div></div>
            <button className="btn" onClick={() => goto('planejamento', { aba: 'semana' })}>Abrir</button>
          </div>
        </Secao>

        <Secao className="span-5" rotulo="Efetivo de hoje" link={{ texto: presencas.length ? 'Editar' : 'Lançar', acao: () => goto('efetivo') }}>
          {presencas.length === 0 ? (
            <button className="aviso" onClick={() => goto('efetivo')}>Efetivo de hoje ainda não lançado<span className="ir">Lançar</span></button>
          ) : (
            <>
              <div className="linha-num">
                <div><div className="grande num">{presentes.length}</div><div className="lab" style={{ marginTop: 6 }}>Presentes</div></div>
                <div className="lab" style={{ lineHeight: 1.7 }}>{conta('Falta')} falta<br />{conta('Atestado')} atestado<br />{conta('Afastado')} afastado</div>
              </div>
              <div className="tri">
                {TIPOS_MAO_OBRA.map((t) => (
                  <div key={t}><b className="num">{presentes.filter((f) => f.tipo_mao_obra === t).length}</b><span className="lab">{t}</span></div>
                ))}
              </div>
              <div className="sec-head" style={{ marginTop: 18 }}>
                <span className="lab lab-ink">Terceirizadas na obra · {terceirizadas.length}</span>
              </div>
              {terceirizadas.length === 0 && <p className="vazio-curto">Nenhuma empresa terceirizada cadastrada.</p>}
              <div className="pares">
                {terceirizadas.map((e) => (
                  <div key={e.empresa}>
                    <span>{e.empresa}</span>
                    <b className="num"><span style={{ fontSize: 22 }}>{e.presentes}</span> <span className="lab">de {e.total} presentes</span></b>
                  </div>
                ))}
              </div>
              <div className="sec-head" style={{ marginTop: 18 }}>
                <span className="lab lab-ink">Presentes por função</span>
              </div>
              <div className="pares">
                {porFuncao.map(([f, n]) => <div key={f}><span>{f}</span><b className="num">{n}</b></div>)}
              </div>
            </>
          )}
        </Secao>
      </div>
    </>
  )
}
