// Detalhe da ocorrência.

import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { dataBr } from '../lib/datas.js'
import { Cabecalho, Carregando, ErroCaixa, Icone, Secao, Status, useAviso, useCarga } from '../components/index.jsx'
import { tomOcorrencia } from './ocorrencias.jsx'

async function carregar(id) {
  const r = await Promise.all([dados.buscarOcorrencia(id), dados.listarEtapas(), dados.listarPessoas()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { o: r[0].data, etapas: r[1].data, pessoas: r[2].data }, erro: null }
}

export default function Ocorrencia({ goto, params, usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const { data, erro, carregando, recarregar } = useCarga(() => carregar(params.id), [obra.id, params.id])
  const voltar = { texto: 'Ocorrências', acao: () => goto('ocorrencias') }

  if (carregando && !data) return <Carregando />
  if (erro) return <><Cabecalho titulo="Ocorrência" voltar={voltar} /><ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>

  const { o, etapas, pessoas } = data
  const pessoa = (id) => pessoas.find((p) => p.id === id)?.nome || '—'
  const gestao = pode(usuario.role, 'responderOcorrencia')

  return (
    <>
      <Cabecalho voltar={voltar} rotulo={`Ocorrência nº ${o.numero} · ${etapas.find((e) => e.id === o.etapa_entrega_id)?.nome || 'sem etapa'}`} titulo={o.titulo}
        acoes={gestao && <button className="btn btn-fill" onClick={() => aviso('Responder e mudar status chega na próxima etapa')}>Responder</button>} />
      <div style={{ marginBottom: 16 }}><Status tom={tomOcorrencia(o.status)}>{o.status}</Status></div>
      <div className="grid">
        <Secao className="span-7" rotulo="Descrição">
          <p style={{ padding: '10px 0' }}>{o.descricao}</p>
          <div className="vazio-curto" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 22, display: 'inline-block' }}><Icone nome="arquivo" /></span>Sem fotos. O envio de fotos entra junto com o banco.
          </div>
          {o.resposta && (
            <div className="aviso" style={{ borderColor: 'var(--primary)', cursor: 'default' }}>
              <div><div className="lab">Resposta da construtora</div><div style={{ fontWeight: 500 }}>{o.resposta}</div></div>
            </div>
          )}
        </Secao>
        <Secao className="span-5" rotulo="Dados">
          <div className="pares">
            <div><span>Local</span><b>{o.local}</b></div>
            <div><span>Aberta em</span><b className="num">{dataBr(o.aberta_em)} · {pessoa(o.aberta_por)}</b></div>
            {'responsavel_id' in o && <div><span>Responsável</span><b>{o.responsavel_id ? pessoa(o.responsavel_id) : 'não atribuído'}</b></div>}
            <div><span>Prazo</span><b className="num">{dataBr(o.prazo)}</b></div>
            <div><span>Primeira resposta</span><b className="num">{o.respondida_em ? dataBr(o.respondida_em.slice(0, 10)) : '—'}</b></div>
            <div><span>Fechada em</span><b className="num">{o.fechada_em ? dataBr(o.fechada_em.slice(0, 10)) : '—'}</b></div>
          </div>
        </Secao>
      </div>
    </>
  )
}
