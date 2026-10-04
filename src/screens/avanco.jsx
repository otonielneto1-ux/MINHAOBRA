// Avanço — tela do Cliente. Só percentuais e atrasos: nada de R$, motivo ou data projetada.

import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { dataBr } from '../lib/datas.js'
import { numero, porcento } from '../lib/formato.js'
import { Barra, Cabecalho, Carregando, CurvaS, ErroCaixa, Icone, Secao, Status, Vazio, useCarga } from '../components/index.jsx'
import { Capa } from '../components/capa.jsx'

export default function Avanco({ goto }) {
  const { obra } = useObra()
  const dia = dados.hoje()
  const { data, erro, carregando, recarregar } = useCarga(dados.avancoDaObra, [obra.id])
  const registrar = <button className="btn btn-fill" onClick={() => goto('novaOcorrencia')}><Icone nome="mais_um" />Registrar ocorrência</button>
  const cab = <><Cabecalho rotulo={`${obra.nome} · atualizado em ${dataBr(dia)}`} titulo="Avanço da obra" acoes={registrar} /><Capa /></>

  if (carregando && !data) return <>{cab}<Carregando /></>
  if (erro) return <>{cab}<ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>
  if (!data.temCronograma) return <>{cab}<Vazio icone="avanco" titulo="O cronograma desta obra ainda não foi publicado" texto="Assim que a construtora publicar o cronograma, o avanço aparece aqui." /></>

  const { geral, etapas, curva, atrasados } = data
  return (
    <>
      {cab}
      <div className="kpis kpis-3">
        <div className="kpi"><b className="num">{numero(geral.realizado, 1)}<small>%</small></b><span className="lab">Realizado</span></div>
        <div className="kpi"><b className="num">{numero(geral.previsto, 1)}<small>%</small></b><span className="lab">Previsto para hoje</span></div>
        <div className={`kpi ${atrasados.length ? 'crit' : 'ok'}`}><b className="num">{atrasados.length}</b><span className="lab">Serviços atrasados</span></div>
      </div>
      <div className="grid">
        <Secao className="span-7" rotulo="Avanço por etapa de entrega">
          {etapas.map((e) => (
            <div key={e.id} className="etapa-row">
              <b>{e.nome}</b>
              <div>
                <Barra pct={e.realizado} marco={e.previsto} tom={e.diferenca < -5 ? 'crit' : ''} />
                <div className="meta" style={{ marginTop: 6 }}>Entrega contratual {dataBr(e.data_entrega_contratual)}</div>
              </div>
              <div className="etapa-val num"><b>{porcento(e.realizado)}</b> / {porcento(e.previsto)}</div>
            </div>
          ))}
          <CurvaS pontos={curva} />
        </Secao>
        <Secao className="span-5" rotulo={`Serviços atrasados · ${atrasados.length}`}>
          {atrasados.length === 0 && <p className="vazio-curto">Nenhum serviço atrasado.</p>}
          <div className="lista">
            {atrasados.map((s) => (
              <div key={s.id} className="linha">
                <span className="marca crit" />
                <div className="linha-main">
                  <div className="linha-titulo">{s.nome}</div>
                  <div className="meta">{etapas.find((e) => e.id === s.etapa_entrega_id)?.nome} · {porcento(s.avanco, 0)} feito</div>
                </div>
                <Status tom="crit">{s.dias} dias</Status>
              </div>
            ))}
          </div>
        </Secao>
      </div>
    </>
  )
}
