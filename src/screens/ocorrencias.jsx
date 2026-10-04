// Ocorrências do cliente: lista com filtro por status e por etapa de entrega.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { dataBr } from '../lib/datas.js'
import { STATUS_OCORRENCIA_ABERTOS } from '../lib/vocabulario.js'
import { Cabecalho, Carregando, ErroCaixa, Icone, Status, Vazio, useCarga } from '../components/index.jsx'

export const tomOcorrencia = (s) => ({ Aberta: 'warn', 'Em análise': 'info', 'Em tratamento': 'info', Resolvida: 'ok', Recusada: 'neutral' }[s])

async function carregar() {
  const r = await Promise.all([dados.listarOcorrencias(), dados.listarEtapas()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { ocorrencias: r[0].data, etapas: r[1].data }, erro: null }
}

export default function Ocorrencias({ goto, usuario }) {
  const { obra } = useObra()
  const dia = dados.hoje()
  const [filtro, setFiltro] = useState('abertas')
  const [etapa, setEtapa] = useState(null)
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])
  const podeAbrir = pode(usuario.role, 'abrirOcorrencia')
  const cab = (
    <Cabecalho rotulo={`Ocorrências do cliente · ${obra.cliente}`} titulo="Ocorrências"
      acoes={podeAbrir && <button className="btn btn-fill" onClick={() => goto('novaOcorrencia')}><Icone nome="mais_um" />Nova ocorrência</button>} />
  )

  if (carregando && !data) return <>{cab}<Carregando /></>
  if (erro) return <>{cab}<ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>
  if (data.ocorrencias.length === 0) {
    return (
      <>
        {cab}
        <Vazio icone="conversa" rotulo="0 registros" titulo="Nenhuma ocorrência por aqui"
          texto={`Quando a ${obra.cliente} registrar algo — com foto, local e descrição — aparece nesta lista com o prazo de resposta.`}
          acao={podeAbrir ? { texto: 'Registrar a primeira ocorrência', fn: () => goto('novaOcorrencia') } : null} />
      </>
    )
  }

  const lista = data.ocorrencias
    .filter((o) => filtro === 'todas' || (filtro === 'abertas') === STATUS_OCORRENCIA_ABERTOS.includes(o.status))
    .filter((o) => etapa === null || o.etapa_entrega_id === etapa)

  return (
    <>
      {cab}
      <div className="filtros">
        <button className="chave" aria-pressed={filtro === 'abertas'} onClick={() => setFiltro('abertas')}>Abertas</button>
        <button className="chave" aria-pressed={filtro === 'fechadas'} onClick={() => setFiltro('fechadas')}>Resolvidas e recusadas</button>
        <button className="chave" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</button>
        <span style={{ width: 8 }} />
        <button className="chave" aria-pressed={etapa === null} onClick={() => setEtapa(null)}>Todas as etapas</button>
        {data.etapas.map((e) => <button key={e.id} className="chave" aria-pressed={etapa === e.id} onClick={() => setEtapa(e.id)}>{e.nome}</button>)}
      </div>
      <section className="section">
        {lista.length === 0 && <p className="vazio-curto">Nenhuma ocorrência com esse filtro.</p>}
        <div className="lista">
          {lista.map((o) => {
            const vencido = o.prazo && o.prazo < dia && STATUS_OCORRENCIA_ABERTOS.includes(o.status)
            return (
              <button key={o.id} className="linha" onClick={() => goto('ocorrencia', { id: o.id })}>
                <div className="linha-qtd num" style={{ minWidth: 44, textAlign: 'left' }}><small>nº</small>{o.numero}</div>
                <div className="linha-main">
                  <div className="linha-titulo">{o.titulo}</div>
                  <div className={`meta ${vencido ? 'crit' : ''}`}>{o.local} · aberta {dataBr(o.aberta_em)}{o.prazo ? ` · prazo ${dataBr(o.prazo)}${vencido ? ' vencido' : ''}` : ''}</div>
                </div>
                <Status tom={tomOcorrencia(o.status)}>{o.status}</Status>
              </button>
            )
          })}
        </div>
      </section>
    </>
  )
}
