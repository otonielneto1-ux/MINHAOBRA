// Detalhe do pacote: meta, produção, quem trabalhou e (se fechado) o prêmio de cada um.

import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { dataBr } from '../lib/datas.js'
import { moeda, quantidade } from '../lib/formato.js'
import { Barra, Cabecalho, Carregando, ErroCaixa, Secao, Status, useCarga } from '../components/index.jsx'
import { tomPacote } from './pacotes.jsx'

async function carregar(id) {
  const r = await Promise.all([
    dados.buscarPacote(id), dados.listarServicos(), dados.listarProducoes(),
    dados.listarPresencas({ pacoteId: id }), dados.listarFuncionarios(), dados.listarPremios({ pacoteId: id }),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [pacote, servicos, producoes, presencas, funcionarios, premios] = r.map((x) => x.data)
  return { data: { pacote, servicos, producoes: producoes.filter((p) => p.pacote_id === id), presencas, funcionarios, premios }, erro: null }
}

export default function Pacote({ goto, params, usuario }) {
  const { obra } = useObra()
  const { data, erro, carregando, recarregar } = useCarga(() => carregar(params.id), [obra.id, params.id])
  const voltar = { texto: 'Pacotes', acao: () => goto('pacotes') }

  if (carregando && !data) return <Carregando />
  if (erro) return <><Cabecalho titulo="Pacote" voltar={voltar} /><ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>

  const { pacote: p, servicos, producoes, presencas, funcionarios, premios } = data
  const s = servicos.find((x) => x.id === p.servico_id)
  const pct = (p.quantidade_executada / p.quantidade_meta) * 100
  const dias = {}
  for (const x of presencas.filter((y) => y.situacao === 'Presente')) dias[x.funcionario_id] = (dias[x.funcionario_id] || 0) + 1
  const equipe = Object.entries(dias).map(([id, d]) => ({ f: funcionarios.find((x) => x.id === Number(id)), d })).sort((a, b) => b.d - a.d)

  return (
    <>
      <Cabecalho voltar={voltar} rotulo={`Pacote · ${s?.nome}`} titulo={p.nome} />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <Status tom={tomPacote(p.status)}>{p.status}{p.motivo_nao_conclusao ? ` · ${p.motivo_nao_conclusao}` : ''}</Status>
        {p.fechado_em && <Status tom="neutral">Fechado na folha</Status>}
      </div>
      <div className="grid">
        <Secao className="span-6" rotulo="Meta">
          <div className="linha-num">
            <div><div className="lab">Executado</div><div className="grande num">{Math.round(pct)}<small>%</small></div></div>
            <div><div className="lab">Quantidade</div><div className="medio num">{quantidade(p.quantidade_executada, s?.unidade)} de {quantidade(p.quantidade_meta, s?.unidade)}</div></div>
          </div>
          <div style={{ margin: '12px 0' }}><Barra pct={pct} tom={pct >= 100 ? 'ok' : ''} /></div>
          <div className="pares">
            <div><span>Local</span><b>{p.local}</b></div>
            <div><span>Início</span><b className="num">{dataBr(p.data_inicio)}</b></div>
            <div><span>Fechamento da folha</span><b className="num">{dataBr(p.data_fechamento)}</b></div>
            {'valor_premio' in p && <div><span>Prêmio do pacote</span><b className="num">{moeda(p.valor_premio)}</b></div>}
          </div>
        </Secao>
        <Secao className="span-6" rotulo={`Quem trabalhou · ${equipe.length}`}>
          {equipe.length === 0 && <p className="vazio-curto">Ninguém registrado neste pacote no efetivo ainda.</p>}
          <div className="pares">
            {equipe.map(({ f, d }) => {
              const pr = premios.find((x) => x.funcionario_id === f.id)
              return (
                <div key={f.id}>
                  <span>{f.nome} <span className="meta">· {f.funcao}{f.tipo_mao_obra === 'Terceirizada' ? ' · sem prêmio' : ''}</span></span>
                  <b className="num">{d} {d === 1 ? 'dia' : 'dias'}{pode(usuario.role, 'verPremio') && pr ? ` · ${moeda(pr.valor)}` : ''}</b>
                </div>
              )
            })}
          </div>
        </Secao>
        <Secao className="span-12" rotulo={`Produção lançada · ${producoes.length}`}>
          {producoes.length === 0 && <p className="vazio-curto">Nenhuma produção lançada neste pacote ainda.</p>}
          <div className="pares">
            {producoes.map((x) => <div key={x.id}><span className="num">{dataBr(x.data)} · {x.origem}</span><b className="num">{quantidade(x.quantidade, s?.unidade)}</b></div>)}
          </div>
        </Secao>
      </div>
    </>
  )
}
