// Pacotes de produção: quadro por status (largo) ou lista (celular).

import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { diasEntre, diaMes } from '../lib/datas.js'
import { moeda, quantidade } from '../lib/formato.js'
import { STATUS_PACOTE } from '../lib/vocabulario.js'
import { Barra, Cabecalho, Carregando, ErroCaixa, Icone, Vazio, useCarga } from '../components/index.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarPacotes(), dados.listarServicos()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { pacotes: r[0].data, servicos: r[1].data }, erro: null }
}

export const tomPacote = (status) => ({ Concluído: 'ok', 'Não concluído': 'crit', 'Em execução': 'info', Liberado: 'warn' }[status] || 'neutral')

export default function Pacotes({ goto, usuario }) {
  const { obra } = useObra()
  const dia = dados.hoje()
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])
  const gestao = pode(usuario.role, 'fecharFolha')
  const cab = (
    <Cabecalho rotulo="Metas de produção com prêmio na folha" titulo="Pacotes"
      acoes={gestao && <button className="btn btn-fill" onClick={() => goto('fechamento')}><Icone nome="cadeado" />Fechar pacotes do mês</button>} />
  )

  if (carregando && !data) return <>{cab}<Carregando /></>
  if (erro) return <>{cab}<ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>
  if (data.pacotes.length === 0) {
    return <>{cab}<Vazio icone="pacotes" titulo="Nenhum pacote ainda" texto="Crie o primeiro a partir de um serviço do cronograma." /></>
  }

  const servico = (id) => data.servicos.find((s) => s.id === id)

  return (
    <>
      {cab}
      <div className="quadro">
        {STATUS_PACOTE.map((st) => {
          const lista = data.pacotes.filter((p) => p.status === st)
          return (
            <div key={st} className="coluna">
              <h3><span>{st}</span><span>{lista.length}</span></h3>
              {lista.length === 0 && <p className="dia-vazio">Nenhum.</p>}
              {lista.map((p) => {
                const s = servico(p.servico_id)
                const pct = (p.quantidade_executada / p.quantidade_meta) * 100
                const faltam = diasEntre(dia, p.data_fechamento)
                return (
                  <button key={p.id} className="cartao" onClick={() => goto('pacote', { id: p.id })}>
                    <div className="tarefa-titulo">{p.fechado_em && <span title="Fechado na folha" style={{ display: 'inline-block', width: 16, verticalAlign: -2, marginRight: 4 }}><Icone nome="cadeado" /></span>}{p.nome}</div>
                    <div className="tarefa-meta">{s?.nome}</div>
                    <div style={{ margin: '10px 0 6px' }}><Barra pct={pct} tom={tomPacote(p.status) === 'crit' ? 'crit' : pct >= 100 ? 'ok' : ''} /></div>
                    <div className="meta num">{quantidade(p.quantidade_executada, s?.unidade)} / {quantidade(p.quantidade_meta, s?.unidade)} · {Math.round(pct)}%</div>
                    <div className={`meta ${!p.fechado_em && faltam >= 0 && faltam < 5 && pct < 70 ? 'warn' : ''}`}>
                      {p.fechado_em ? `fechado ${diaMes(p.data_fechamento)}` : `fecha ${diaMes(p.data_fechamento)} · ${faltam} dias`}
                    </div>
                    {'valor_premio' in p && <div className="meta" style={{ color: 'var(--ink)' }}>Prêmio {moeda(p.valor_premio)}</div>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </>
  )
}
