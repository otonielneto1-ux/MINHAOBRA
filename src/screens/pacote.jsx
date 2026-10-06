// Detalhe do pacote: serviços (meta, executado e, para Eng/Coord, as MO), colaboradores com os dias no pacote
// e, se fechado, o prêmio de cada um; produção lançada (de qual atividade).
// Engenheiro e Coordenador editam e mudam o status enquanto não fechado; excluir só o Engenheiro e só Planejado.
// Engenheiro e Coordenador também pausam (com o problema), retomam e levam a equipe para outro pacote.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { equipeDaAtividade } from '../lib/pcp.js'
import { diasPorFuncionario, ehAjudante, entrouEm, saidaDe, fatorDoPremio, linhasDosPremios, pctPrevisto, metaEditada, pctPacote, pctServicoDoPacote, planilhaPremios, premioDoPacote, premioReal, valoresDoPacote } from '../lib/premio.js'
import { dataBr, diaMes } from '../lib/datas.js'
import { moeda, porcento, quantidade } from '../lib/formato.js'
import { ORIGEM_PRODUCAO, PACOTE, STATUS_PACOTE_MANUAL } from '../lib/vocabulario.js'
import { Barra, Cabecalho, Carregando, ErroCaixa, Folha, Icone, Secao, Status, baixarArquivo, useAviso, useCarga } from '../components/index.jsx'
import { tomPacote } from './pacotes.jsx'
import { FolhaPacote } from './folhaPacote.jsx'
import { FolhaPausa } from './pausaPacote.jsx'

async function carregar(id) {
  const r = await Promise.all([
    dados.listarPacotes(), dados.listarServicos(), dados.listarProducoes(), dados.listarAtividades(),
    dados.listarPresencas({ pacoteId: id }), dados.listarFuncionarios(), dados.listarPremios({ pacoteId: id }),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [pacotes, servicos, producoes, atividades, presencas, funcionarios, premios] = r.map((x) => x.data)
  const pacote = pacotes.find((p) => p.id === id)
  if (!pacote) return { data: null, erro: 'Pacote não encontrado.' }
  return { data: { pacote, pacotes, servicos, producoes: producoes.filter((p) => p.pacote_id === id), atividades, presencas, funcionarios, premios }, erro: null }
}

export default function Pacote({ goto, params, usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [editar, setEditar] = useState(null)
  const [excluir, setExcluir] = useState(false)
  const [pausa, setPausa] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const { data, erro, carregando, recarregar } = useCarga(() => carregar(params.id), [obra.id, params.id])
  const voltar = { texto: 'Pacotes', acao: () => goto('pacotes') }

  if (carregando && !data) return <Carregando />
  if (erro) return <><Cabecalho titulo="Pacote" voltar={voltar} /><ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>

  const { pacote: p, pacotes, servicos, producoes, atividades, presencas, funcionarios, premios } = data
  const servico = (id) => servicos.find((x) => x.id === id)
  const func = (id) => funcionarios.find((x) => x.id === id)
  const pct = pctPacote(p)
  const verMo = pode(usuario.role, 'verPremio')
  const valores = verMo ? valoresDoPacote(p) : null
  const pago = verMo ? premioReal(p) : null
  // Antes de fechar, quanto cada colaborador vai receber se o pacote bater a meta (pausado: se fechar pausado).
  const pausado = p.status === PACOTE.PAUSADO
  const previsto = verMo && !p.fechado_em ? premioDoPacote(p, [], funcionarios, pctPrevisto(p)).linhas : []
  const gestao = pode(usuario.role, 'gerirPacotes') && !p.fechado_em
  const podePausar = pode(usuario.role, 'pausarPacote') && !p.fechado_em
  const podeExcluir = pode(usuario.role, 'apagar') && p.status === PACOTE.PLANEJADO
  const dias = new Map(diasPorFuncionario(presencas).map((x) => [x.funcionario_id, x.dias]))
  const colaboradores = p.colaboradores.map(func).filter(Boolean).sort((a, b) => (dias.get(b.id) || 0) - (dias.get(a.id) || 0))

  async function mudarStatus(st) {
    setOcupado(true)
    const r = await dados.editarPacote(p.id, { status: st })
    setOcupado(false)
    if (r.erro) { aviso(r.erro); return }
    aviso(`Pacote agora está ${st}`)
    recarregar()
  }

  async function retomar() {
    setOcupado(true)
    const r = await dados.retomarPacote(p.id)
    setOcupado(false)
    if (r.erro) { aviso(r.erro); return }
    aviso('Pacote retomado · Em execução')
    recarregar()
  }

  async function confirmarExclusao() {
    setOcupado(true)
    const r = await dados.excluirPacote(p.id)
    setOcupado(false)
    if (r.erro) { setExcluir(false); aviso(r.erro); return }
    aviso('Pacote excluído')
    goto('pacotes')
  }

  function baixarPlanilha() {
    baixarArquivo(`premios-${p.nome}-${p.data_fechamento}.csv`, planilhaPremios(linhasDosPremios(premios, [p]), funcionarios))
  }

  // De onde veio cada produção: a atividade do PCP (local, equipe) ou o ajuste (motivo).
  const origem = (x) => {
    if (x.origem === ORIGEM_PRODUCAO.AJUSTE) return `Ajuste${x.motivo_ajuste ? ` · ${x.motivo_ajuste}` : ''}`
    const a = atividades.find((y) => y.id === x.pcp_atividade_id)
    return a ? `PCP · ${a.local}${equipeDaAtividade(a) ? ` · ${equipeDaAtividade(a)}` : ''}` : x.origem
  }

  return (
    <>
      <Cabecalho voltar={voltar} rotulo={`Pacote · ${p.local}`} titulo={p.nome}
        acoes={(gestao || podePausar || podeExcluir || (p.fechado_em && verMo)) && (
          <>
            {podePausar && !pausado && <button className="btn" onClick={() => setPausa({ modo: 'pausar' })}>Pausar</button>}
            {podePausar && pausado && <button className="btn btn-fill" onClick={retomar} disabled={ocupado}>Retomar</button>}
            {podePausar && pausado && <button className="btn" onClick={() => setPausa({ modo: 'levar' })}>Levar equipe para outro pacote</button>}
            {gestao && <button className="btn" onClick={() => setEditar({ pacote: p })}>Editar</button>}
            {podeExcluir && <button className="btn btn-quiet" onClick={() => setExcluir(true)}>Excluir</button>}
            {p.fechado_em && verMo && premios.length > 0 && <button className="btn btn-fill" onClick={baixarPlanilha}><Icone nome="arquivo" />Baixar planilha</button>}
          </>
        )} />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <Status tom={tomPacote(p.status)}>{p.status}{p.motivo_nao_conclusao ? ` · ${p.motivo_nao_conclusao}` : ''}</Status>
        {p.fechado_em && <Status tom="neutral">Fechado na folha</Status>}
      </div>
      {pausado && (
        <p className="meta warn" style={{ marginTop: -8, marginBottom: 16 }}>
          Pausado desde {dataBr(p.pausa_desde)} · {p.pausa_motivo}. Se a folha fechar assim, paga o prêmio proporcional: {porcento(fatorDoPremio(p), 0)} da meta executada.
        </p>
      )}

      {gestao && !pausado && (
        <div className="filtros">
          <span className="lab">Mudar status</span>
          {STATUS_PACOTE_MANUAL.map((st) => (
            <button key={st} className="chave" aria-pressed={p.status === st} disabled={ocupado || p.status === st} onClick={() => mudarStatus(st)}>{st}</button>
          ))}
        </div>
      )}

      <div className="grid">
        <Secao className="span-12" rotulo={`Serviços do pacote · ${p.servicos.length} · conclui quando todos chegam a 100%`}>
          <div className="linha-num">
            <div><div className="lab">Executado (média)</div><div className="grande num">{Math.round(pct)}<small>%</small></div></div>
            {pago && <div><div className="lab">Prêmio pago · {Number(p.pct_pago)}% do orçado</div><div className="medio num">{moeda(pago.total)} <small>de {moeda(valores.total)}</small></div></div>}
          </div>
          <div style={{ margin: '12px 0' }}><Barra pct={pct} tom={pct >= 100 ? 'ok' : ''} /></div>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Serviço</th><th className="dir">Executado / meta</th><th className="dir">%</th>
                  {verMo && <><th className="dir">MO profissional (orç.)</th><th className="dir">MO ajudante (orç.)</th><th className="dir">MO total (orç.)</th></>}
                </tr>
              </thead>
              <tbody>
                {p.servicos.map((x) => {
                  const s = servico(x.servico_id)
                  const pctS = pctServicoDoPacote(x)
                  return (
                    <tr key={x.servico_id} className="clicavel" tabIndex={0} onClick={() => goto('servico', { id: x.servico_id })}
                      onKeyDown={(e) => { if (e.key === 'Enter') goto('servico', { id: x.servico_id }) }}>
                      <td className="nome"><b>{s?.codigo_eap} · {s?.nome}</b></td>
                      <td className="dir num">
                        {quantidade(x.quantidade_executada, s?.unidade)} / <span className={metaEditada(x) ? 't-warn' : ''}>{quantidade(x.quantidade_meta, s?.unidade)}</span>
                        {metaEditada(x) && <div className="meta warn">meta editada · cronograma {quantidade(x.meta_cronograma, s?.unidade)}</div>}
                      </td>
                      <td className={`dir num ${pctS >= 100 ? 't-ok' : ''}`}>{porcento(pctS, 0)}</td>
                      {verMo && <><td className="dir num">{moeda(x.mo_profissional)}</td><td className="dir num">{moeda(x.mo_ajudante)}</td><td className="dir num"><b>{moeda(x.mo_total)}</b></td></>}
                    </tr>
                  )
                })}
                {valores && p.servicos.length > 1 && (
                  <tr className="resumo">
                    <td colSpan={3}>Total orçado do pacote</td>
                    <td className="dir num">{moeda(valores.profissional)}</td><td className="dir num">{moeda(valores.ajudante)}</td><td className="dir num">{moeda(valores.total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao className="span-6" rotulo="Dados">
          <div className="pares">
            <div><span>Local</span><b>{p.local}</b></div>
            <div><span>Início</span><b className="num">{dataBr(p.data_inicio)}</b></div>
            <div><span>Fechamento da folha</span><b className="num">{dataBr(p.data_fechamento)}{!p.fechado_em && p.data_fechamento < dia ? ' · vencido' : ''}</b></div>
          </div>
        </Secao>
        <Secao className="span-6" rotulo={`Colaboradores · ${colaboradores.length}`}>
          {colaboradores.length === 0 && <p className="vazio-curto">Nenhum colaborador escolhido. Sem colaborador, ninguém recebe o prêmio nem lança o pacote no Efetivo.</p>}
          <div className="pares">
            {colaboradores.map((f) => {
              const d = dias.get(f.id) || 0
              const pr = premios.find((x) => x.funcionario_id === f.id) || previsto.find((x) => x.funcionario_id === f.id)
              return (
                <div key={f.id}>
                  <span>{f.nome} <span className="meta">· {f.funcao} · MO {ehAjudante(f) ? 'ajudante' : 'profissional'}{entrouEm(p, f.id) ? ` · entrou ${diaMes(entrouEm(p, f.id))}` : ''}{saidaDe(p, f.id) ? ` · saiu ${diaMes(saidaDe(p, f.id).saiu_em)} com ${saidaDe(p, f.id).pct_saida}% da meta` : ''}</span></span>
                  <b className="num">{d} {d === 1 ? 'dia' : 'dias'}{verMo && pr ? ` · ${moeda(pr.valor)}${p.fechado_em ? '' : saidaDe(p, f.id) ? ' garantido' : pausado ? ' se fechar pausado' : ' se bater a meta'}` : ''}</b>
                </div>
              )
            })}
          </div>
          {verMo && premios.length > 0 && <p className="meta" style={{ marginTop: 10 }}>Total pago: {moeda(premios.reduce((t, x) => t + Number(x.valor), 0))}</p>}
        </Secao>

        <Secao className="span-12" rotulo={`Produção lançada · ${producoes.length}`}>
          {producoes.length === 0 && <p className="vazio-curto">Nenhuma produção lançada neste pacote ainda.</p>}
          <div className="pares">
            {producoes.map((x) => {
              const s = servico(x.servico_id)
              return <div key={x.id}><span className="num">{dataBr(x.data)} · {s?.nome} · {origem(x)}</span><b className="num">{quantidade(x.quantidade, s?.unidade)}</b></div>
            })}
          </div>
        </Secao>
      </div>

      {gestao && (
        <FolhaPacote aberta={editar} servicos={servicos} funcionarios={funcionarios} diaFolha={obra.dia_fechamento_folha} hoje={dia}
          fechar={() => setEditar(null)} salvo={(msg) => { setEditar(null); aviso(msg); recarregar() }} />
      )}
      {podePausar && (
        <FolhaPausa aberta={pausa} pacote={p} pacotes={pacotes} funcionarios={funcionarios} hoje={dia}
          fechar={() => setPausa(null)} salvo={(msg) => { setPausa(null); aviso(msg); recarregar() }} />
      )}
      <Folha aberta={excluir} fechar={() => setExcluir(false)} rotulo="Excluir pacote">
        <div className="lab">Excluir pacote</div>
        <h2>{p.nome}</h2>
        <p className="sub">O pacote some do quadro. Não dá para desfazer.</p>
        <div className="folha-acoes">
          <button className="btn btn-quiet btn-lg" onClick={() => setExcluir(false)}>Cancelar</button>
          <button className="btn btn-perigo btn-lg" onClick={confirmarExclusao} disabled={ocupado}>Excluir</button>
        </div>
      </Folha>
    </>
  )
}
