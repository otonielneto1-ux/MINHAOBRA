// Hoje — tela de abertura do Mestre: efetivo do dia e atividades para dar baixa.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { equipeDaAtividade } from '../lib/pcp.js'
import { dataBr, nomeDiaLongo, somarDias } from '../lib/datas.js'
import { quantidade, saudacao } from '../lib/formato.js'
import { Caixa, Cabecalho, Carregando, ErroCaixa, Secao, Status, useAviso, useCarga } from '../components/index.jsx'
import { JanelaBaixa } from './semana.jsx'
import { Capa } from '../components/capa.jsx'

async function carregar(dia) {
  const r = await Promise.all([
    dados.listarAtividades({ de: somarDias(dia, -1), ate: dia }), dados.listarServicos(),
    dados.listarPresencas({ data: dia }), dados.listarPacotes(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [atividades, servicos, presencas, pacotes] = r.map((x) => x.data)
  return { data: { atividades, servicos, presencas, pacotes }, erro: null }
}

export default function Hoje({ goto, usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const ontem = somarDias(dia, -1)
  const [baixa, setBaixa] = useState(null)
  const { data, erro, carregando, recarregar } = useCarga(() => carregar(dia), [obra.id])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const servico = (id) => data.servicos.find((s) => s.id === id)
  const pacote = (id) => data.pacotes.find((p) => p.id === id)
  const deHoje = data.atividades.filter((a) => a.data_prevista === dia)
  const ontemSemBaixa = data.atividades.filter((a) => a.data_prevista === ontem && a.status === 'Planejada')
  const presentes = data.presencas.filter((p) => p.situacao === 'Presente').length
  const faltas = data.presencas.length - presentes

  return (
    <>
      <Cabecalho rotulo={`${nomeDiaLongo(dia)}, ${dataBr(dia)} · ${obra.nome}`} titulo={`${saudacao(dados.horaAgora())}, ${usuario.nome.split(' ')[0]}`} />
      <Capa />

      {ontemSemBaixa.length > 0 && (
        <button className="aviso" style={{ marginTop: 0, marginBottom: 16 }} onClick={() => goto('planejamento', { aba: 'semana' })}>
          {ontemSemBaixa.length} {ontemSemBaixa.length === 1 ? 'atividade de ontem sem baixa' : 'atividades de ontem sem baixa'}<span className="ir">Ver</span>
        </button>
      )}

      <Secao rotulo="Efetivo de hoje">
        {data.presencas.length === 0 ? (
          <div style={{ padding: '12px 0' }}>
            <p className="muted" style={{ marginBottom: 14 }}>Ainda não lançado.</p>
            <button className="btn btn-fill btn-lg btn-bloco" onClick={() => goto('efetivo')}>Lançar efetivo</button>
          </div>
        ) : (
          <div className="caixa-rodape" style={{ border: 0, padding: '10px 0 0', marginTop: 0 }}>
            <div><div className="v num">{presentes} <span className="lab">presentes · {faltas} ausentes</span></div></div>
            <button className="btn" onClick={() => goto('efetivo')}>Editar</button>
          </div>
        )}
      </Secao>

      <Secao rotulo={`Atividades de hoje · ${deHoje.length}`}>
        {deHoje.length === 0 && <p className="vazio-curto">Nenhuma atividade planejada para hoje.</p>}
        <div className="lista">
          {deHoje.map((a) => {
            const s = servico(a.servico_id)
            const feita = a.status !== 'Planejada'
            return (
              <div key={a.id} className="linha" style={{ flexWrap: 'wrap' }}>
                <Caixa tom={a.status === 'Concluída' ? 'ok' : a.status === 'Não concluída' ? 'crit' : ''} />
                <div className="linha-main">
                  <div className="linha-titulo">{s?.nome}</div>
                  <div className="meta">{a.local} · {equipeDaAtividade(a) || 'sem equipe'}{a.pacote_id ? ` · pacote ${pacote(a.pacote_id)?.nome}` : ''}</div>
                  {feita && <div style={{ marginTop: 6 }}><Status tom={a.status === 'Concluída' ? 'ok' : 'crit'}>{a.status} · {quantidade(a.quantidade_executada, s?.unidade)}</Status></div>}
                </div>
                <div className="linha-qtd num">{quantidade(a.quantidade_planejada, s?.unidade)}</div>
                <button className={`btn ${feita ? 'btn-quiet' : 'btn-fill'} btn-bloco`} style={{ marginTop: 6 }} onClick={() => setBaixa(a)}>
                  {feita ? 'Corrigir baixa' : 'Dar baixa'}
                </button>
              </div>
            )
          })}
        </div>
      </Secao>

      <JanelaBaixa atividade={baixa} servico={baixa && servico(baixa.servico_id)} pacotes={data.pacotes} fechar={() => setBaixa(null)}
        salvo={(msg) => { setBaixa(null); aviso(msg); recarregar() }} />
    </>
  )
}
