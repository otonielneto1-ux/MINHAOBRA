// Planejamento › 3 meses: serviços das próximas 13 semanas e suas restrições.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { servicosNoPeriodo } from '../lib/pcp.js'
import { avancoServico } from '../lib/avanco.js'
import { dataBr, diaMes, segundaDaSemana, somarDias } from '../lib/datas.js'
import { porcento } from '../lib/formato.js'
import { Carregando, ErroCaixa, Folha, Status, useAviso, useCarga } from '../components/index.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarServicos(), dados.listarRestricoes(), dados.listarEtapas()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { servicos: r[0].data, restricoes: r[1].data, etapas: r[2].data }, erro: null }
}

export default function TresMeses({ usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [etapa, setEtapa] = useState(null)
  const [soComRestricao, setSoComRestricao] = useState(false)
  const [aberto, setAberto] = useState(null)
  // As 4 primeiras semanas nascem abertas e as demais recolhidas; tocar no título inverte.
  const [alternadas, setAlternadas] = useState(new Set())
  const alternar = (seg) => {
    const novo = new Set(alternadas)
    if (novo.has(seg)) novo.delete(seg)
    else novo.add(seg)
    setAlternadas(novo)
  }
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const pendentes = (sid) => data.restricoes.filter((r) => r.servico_id === sid && r.status === 'Pendente')
  const primeira = segundaDaSemana(dia)
  const semanas = Array.from({ length: 13 }, (_, i) => somarDias(primeira, 7 * i))
  const ate4 = semanas[4]
  const filtrar = (lista) => lista
    .filter((s) => etapa === null || s.etapa_entrega_id === etapa)
    .filter((s) => !soComRestricao || pendentes(s.id).length > 0)
  const gestao = pode(usuario.role, 'editarPlanejamento')
  const blocos = semanas
    .map((seg) => ({ seg, lista: filtrar(servicosNoPeriodo(data.servicos, seg, somarDias(seg, 5))) }))
    .filter((b) => b.lista.length > 0)

  return (
    <>
      <div className="filtros">
        <button className="chave" aria-pressed={etapa === null} onClick={() => setEtapa(null)}>Todas as etapas</button>
        {data.etapas.map((e) => (
          <button key={e.id} className="chave" aria-pressed={etapa === e.id} onClick={() => setEtapa(e.id)}>{e.nome}</button>
        ))}
        <button className="chave" aria-pressed={soComRestricao} onClick={() => setSoComRestricao(!soComRestricao)}>Só com restrição pendente</button>
      </div>

      {blocos.length === 0 && <div className="section"><p className="vazio-curto" style={{ textAlign: 'center' }}>Nada previsto para os próximos 3 meses.</p></div>}

      {blocos.map(({ seg, lista }) => {
        const aberta = alternadas.has(seg) ? seg >= ate4 : seg < ate4
        const titulo = `Semana ${diaMes(seg)} a ${diaMes(somarDias(seg, 5))}${seg === primeira ? ' · esta semana' : ''}`
        return (
        <section key={seg} className="section">
          <button className="sec-head recolher" aria-expanded={aberta} onClick={() => alternar(seg)}>
            <span className="lab lab-ink">{titulo}</span>
            <span className="lab" style={{ marginLeft: 'auto' }}>{lista.length} {lista.length === 1 ? 'serviço' : 'serviços'} {aberta ? '▴' : '▾'}</span>
          </button>
          {aberta && <div className="lista">
            {lista.map((s) => {
              const n = pendentes(s.id).length
              const vencida = pendentes(s.id).some((r) => r.data_limite && r.data_limite < dia)
              return (
                <button key={s.id} className="linha" onClick={() => setAberto(s)}>
                  <div className="linha-main">
                    <div className="linha-titulo">{s.nome}</div>
                    <div className="meta">{s.local || '—'} · {data.etapas.find((e) => e.id === s.etapa_entrega_id)?.nome} · {porcento(avancoServico(s), 0)} feito</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {s.critico && <Status tom="crit">Crítico</Status>}
                    {n > 0 && <Status tom={vencida ? 'crit' : 'warn'}>{n} {n === 1 ? 'restrição' : 'restrições'}</Status>}
                  </div>
                </button>
              )
            })}
          </div>}
        </section>
        )
      })}

      <Folha aberta={!!aberto} fechar={() => setAberto(null)} rotulo="Restrições do serviço">
        {aberto && (
          <>
            <div className="lab">Restrições</div>
            <h2>{aberto.nome}</h2>
            <div className="sub">{aberto.local} · previsto de {dataBr(aberto.inicio_previsto)} a {dataBr(aberto.fim_previsto)}</div>
            <div className="lista">
              {data.restricoes.filter((r) => r.servico_id === aberto.id).length === 0 && <p className="vazio-curto">Nenhuma restrição cadastrada para este serviço.</p>}
              {data.restricoes.filter((r) => r.servico_id === aberto.id).map((r) => {
                const vencida = r.status === 'Pendente' && r.data_limite && r.data_limite < dia
                return (
                  <div key={r.id} className="linha">
                    <span className={`marca ${r.status === 'Removida' ? '' : vencida ? 'crit' : 'warn'}`} style={r.status === 'Removida' ? { background: 'var(--green)' } : undefined} />
                    <div className="linha-main">
                      <div className="linha-titulo">{r.descricao}</div>
                      <div className={`meta ${vencida ? 'crit' : ''}`}>
                        {r.tipo} · {r.responsavel || 'sem responsável'} · {r.status === 'Removida' ? `removida em ${dataBr(r.removida_em)}` : `prazo ${dataBr(r.data_limite)}${vencida ? ' · vencida' : ''}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="folha-acoes" style={{ marginTop: 16 }}>
              {gestao && <button className="btn btn-fill btn-lg" onClick={() => aviso('Nova restrição chega na próxima etapa')}>Nova restrição</button>}
              <button className="btn btn-quiet btn-lg" onClick={() => setAberto(null)}>Fechar</button>
            </div>
          </>
        )}
      </Folha>
    </>
  )
}
