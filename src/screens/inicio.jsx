// Início — Painel do dia (Engenheiro e Coordenador).

import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { resumoAvanco, curvaS } from '../lib/avanco.js'
import { META_PPC, ppcAte, ppcDoMes, tomPpc, equipeDaAtividade } from '../lib/pcp.js'
import { contarCriticos, montarAlertas, ocorrenciasDoCliente } from '../lib/alertas.js'
import { efetivoTerceirizadas } from '../lib/efetivo.js'
import { inicioDoMesAnterior, mesesEntre, nomeMes, segundaDaSemana, somarDias, dataBr, diaMes, nomeDiaLongo } from '../lib/datas.js'
import { porcento, pontos, quantidade, numero, saudacao } from '../lib/formato.js'
import { TIPOS_MAO_OBRA } from '../lib/vocabulario.js'
import { pode } from '../lib/permissoes.js'
import { Barra, Caixa, Cabecalho, Carregando, CurvaS, ErroCaixa, Icone, Secao, Status, Vazio, useCarga } from '../components/index.jsx'
import { Capa } from '../components/capa.jsx'

async function carregarPainel(dia) {
  const segunda = segundaDaSemana(dia)
  const r = await Promise.all([
    dados.listarServicos(), dados.listarProducoes(), dados.listarEtapas(),
    // do mês anterior até o fim desta semana: PPC da semana, do mês e a comparação
    dados.listarAtividades({ de: inicioDoMesAnterior(dia), ate: somarDias(segunda, 5) }),
    dados.listarPresencas({ data: dia }), dados.listarFuncionarios(),
    dados.listarPacotes(), dados.listarRestricoes(), dados.listarOcorrencias(), dados.listarPessoas(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [servicos, producoes, etapas, atividades, presencas, funcionarios, pacotes, restricoes, ocorrencias, pessoas] = r.map((x) => x.data)
  return { data: { segunda, servicos, producoes, etapas, atividades, presencas, funcionarios, pacotes, restricoes, ocorrencias, pessoas }, erro: null }
}

// PPC da semana e do mês, com a comparação com o mês anterior e a meta.
function BlocoPpc({ semana, mes, abrir }) {
  const pct = (p) => porcento(p, 0)
  return (
    <div className="ppc-bloco">
      <div className="ppc-dois">
        <div>
          <div className="lab">PPC da semana</div>
          <div className={`ppc-valor num t-${tomPpc(semana.pct)}`}>{pct(semana.pct)}</div>
          <div className="meta">{semana.concluidas} de {semana.base} concluídas</div>
        </div>
        <div>
          <div className="lab">PPC de {nomeMes(mes.mes)}</div>
          <div className={`ppc-valor num t-${tomPpc(mes.atual.pct)}`}>{pct(mes.atual.pct)}</div>
          <div className="meta">
            {mes.atual.concluidas} de {mes.atual.base} no mês · {nomeMes(mes.mesAnterior)} {pct(mes.anterior.pct)}
            {!!mes.variacao && <span className={mes.variacao > 0 ? 'sobe' : 'desce'}> {mes.variacao > 0 ? '▲' : '▼'} {Math.abs(mes.variacao)} pts</span>}
          </div>
        </div>
      </div>
      {mes.abaixoDaMeta !== null && (
        <div style={{ margin: '12px 0 4px' }}>
          <Status tom={tomPpc(mes.atual.pct)}>{mes.abaixoDaMeta === 0 ? `Mês na meta de ${META_PPC}%` : `Mês ${mes.abaixoDaMeta} pontos abaixo da meta de ${META_PPC}%`}</Status>
        </div>
      )}
      <div className="ppc-semanas">
        {mes.semanas.map((s) => (
          <div key={s.semana_inicio} className="ppc-sem">
            <span className="lab">Sem. {diaMes(s.semana_inicio)}</span>
            <Barra pct={s.pct ?? 0} marco={META_PPC} tom={tomPpc(s.pct)} />
            <b className="num">{pct(s.pct)}</b>
          </div>
        ))}
      </div>
      <button className="btn btn-bloco" style={{ marginTop: 12 }} onClick={abrir}>Abrir a semana</button>
    </div>
  )
}

export default function Inicio({ goto, usuario }) {
  const { obra } = useObra()
  const dia = dados.hoje()
  const { data, erro, carregando, recarregar } = useCarga(() => carregarPainel(dia), [obra.id])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const { segunda, servicos, producoes, etapas, atividades, presencas, funcionarios, pacotes, restricoes, ocorrencias, pessoas } = data
  const primeiroNome = usuario.nome.split(' ')[0]
  const cabecalho = <Cabecalho rotulo={`Painel do dia · ${nomeDiaLongo(dia)}, ${dataBr(dia)}`} titulo={`${saudacao(dados.horaAgora())}, ${primeiroNome}`} />

  if (!servicos.some((s) => !s.e_resumo)) {
    return (
      <>
        {cabecalho}
        <Capa editar={() => goto('cadastros', { aba: 'obra' })} />
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
  const semana = ppcAte(atividades.filter((a) => a.semana_inicio === segunda), dia)
  const mes = ppcDoMes(atividades, dia)

  const funcPorId = new Map(funcionarios.map((f) => [f.id, f]))
  const presentes = presencas.filter((p) => p.situacao === 'Presente').map((p) => funcPorId.get(p.funcionario_id))
  const conta = (sit) => presencas.filter((p) => p.situacao === sit).length
  const terceirizadas = efetivoTerceirizadas(funcionarios, presencas)
  const porFuncao = Object.entries(presentes.reduce((m, f) => ({ ...m, [f.funcao]: (m[f.funcao] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])

  const doCliente = ocorrenciasDoCliente(ocorrencias, pessoas, dia)
  const alertas = montarAlertas({ servicos, pacotes, restricoes, ocorrencias, pessoas, efetivoLancado: presencas.length > 0, hoje: dia })
  const criticos = contarCriticos(alertas, doCliente)

  return (
    <>
      {cabecalho}
      <Capa editar={pode(usuario.role, 'gerirCadastros') ? () => goto('cadastros', { aba: 'obra' }) : null} />

      <div className="kpis">
        <button className="kpi" onClick={() => goto('planejamento', { aba: 'cronograma' })}>
          <b className="num">{numero(geral.realizado, 1)}<small>%</small></b><span className="lab">Avanço realizado</span>
        </button>
        <button className="kpi" onClick={() => goto('efetivo')}>
          <b className="num">{presentes.length}</b><span className="lab">Pessoas no canteiro</span>
        </button>
        <button className={`kpi ${tomPpc(semana.pct)}`} onClick={() => goto('planejamento', { aba: 'semana' })}>
          <b className="num">{semana.pct ?? '—'}{semana.pct !== null && <small>%</small>}</b>
          <span className="lab">PPC da semana · {nomeMes(dia)} {porcento(mes.atual.pct, 0)}</span>
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

        <Secao className="span-5" rotulo={`Alertas · ${alertas.length + doCliente.length}`}>
          {doCliente.length > 0 && (
            <div className="destaque" role="group" aria-label="Ocorrências do cliente">
              <div className="destaque-topo">
                <Icone nome="ocorrencias" />
                <span className="lab lab-ink">Ocorrências do cliente · {doCliente.length} {doCliente.length === 1 ? 'aberta' : 'abertas'}</span>
                <button className="link" onClick={() => goto('ocorrencias')}>Ver todas</button>
              </div>
              <div className="lista">
                {doCliente.map((o) => (
                  <button key={o.id} className="linha" onClick={() => goto('ocorrencia', { id: o.id })}>
                    <span className="destaque-num num">nº {o.numero}</span>
                    <div className="linha-main">
                      <div className="linha-titulo">{o.titulo}</div>
                      <div className={`meta ${o.urgente ? 'crit' : ''}`}>
                        {o.status}
                        {o.semResposta ? ` · sem resposta há ${o.dias} dias` : ''}
                        {o.prazo ? ` · prazo ${diaMes(o.prazo)}${o.prazoVencido ? ' vencido' : ''}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {alertas.length === 0 && doCliente.length === 0 && <p className="vazio-curto">Nenhum alerta hoje.</p>}
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
                    <div className="meta">{a.local} · {equipeDaAtividade(a) || 'sem equipe'}</div>
                  </div>
                  <div className="linha-qtd num">{quantidade(a.quantidade_planejada, s?.unidade)}</div>
                </button>
              )
            })}
          </div>
          <BlocoPpc semana={semana} mes={mes} abrir={() => goto('planejamento', { aba: 'semana' })} />
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
