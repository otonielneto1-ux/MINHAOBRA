// Importar do MS Project: escolher o XML, conferir a prévia (etapas, novos, alterados,
// cancelados) e confirmar. Grava tudo de uma vez e recalcula o caminho crítico.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { casarEtapas, compararImportacao, lerXmlDoProject, montarCarga } from '../lib/importacao.js'
import { dataBr } from '../lib/datas.js'
import { Cabecalho, Carregando, ErroCaixa, Icone, Secao, useAviso, useCarga } from '../components/index.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarServicos({ incluirCancelados: true }), dados.listarEtapas()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { servicos: r[0].data, etapas: r[1].data }, erro: null }
}

const MOSTRAR = 8

export default function Importar({ goto }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])
  const [lido, setLido] = useState(null)
  const [erroArquivo, setErroArquivo] = useState(null)
  const [topo, setTopo] = useState([])
  const [etapaDoTopo, setEtapaDoTopo] = useState({})
  const [usarBase, setUsarBase] = useState(true)
  const [gravando, setGravando] = useState(false)

  const voltar = { texto: 'Cronograma', acao: () => goto('planejamento', { aba: 'cronograma' }) }
  if (carregando && !data) return <Carregando />
  if (erro) return <><Cabecalho voltar={voltar} titulo="Importar do MS Project" /><ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>

  async function escolher(e) {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    const r = lerXmlDoProject(await arquivo.text())
    if (r.erro) { setErroArquivo(r.erro); setLido(null); return }
    setErroArquivo(null)
    const casadas = casarEtapas(r.tarefas, data.etapas)
    setLido(r)
    setTopo(casadas)
    setEtapaDoTopo(Object.fromEntries(casadas.map((t) => [t.uid, t.etapa_id])))
  }

  const previa = lido && compararImportacao(lido, data.servicos)
  const semEtapa = topo.filter((t) => !etapaDoTopo[t.uid]).length

  async function confirmar() {
    setGravando(true)
    const r = await dados.importarCronograma(montarCarga(lido, etapaDoTopo, previa.primeira && usarBase))
    if (r.erro) { setGravando(false); aviso(r.erro); return }
    const c = await dados.recalcularCronograma()
    setGravando(false)
    const calculo = c.erro ? ` O recálculo falhou: ${c.erro}`
      : c.data.problemas ? ` O caminho crítico não foi calculado: ${c.data.problemas.length} serviço(s) com problema — veja em Recalcular.`
        : ' Cronograma recalculado.'
    aviso(`Importação concluída: ${previa.novos.length} novos, ${previa.alterados.length} alterados, ${previa.cancelados.length} cancelados.${calculo}`)
    goto('planejamento', { aba: 'cronograma' })
  }

  return (
    <>
      <Cabecalho voltar={voltar} rotulo="Planejamento · Cronograma" titulo="Importar do MS Project" />
      <Secao rotulo="Como fazer">
        <p style={{ marginBottom: 14 }}>No MS Project: <b>Arquivo › Salvar como › XML</b>. Depois escolha o arquivo aqui.</p>
        <label className="btn btn-lg">
          <Icone nome="arquivo" />{lido ? 'Escolher outro arquivo' : 'Escolher arquivo XML'}
          <input type="file" accept=".xml,text/xml,application/xml" onChange={escolher} style={{ display: 'none' }} />
        </label>
        {erroArquivo && <p className="erro-campo" role="alert" style={{ marginTop: 12 }}>{erroArquivo}</p>}
        {!lido && !erroArquivo && <p className="meta" style={{ marginTop: 12 }}>Escolha o arquivo XML exportado do MS Project.</p>}
      </Secao>

      {previa && (
        <>
          <Secao rotulo="Prévia">
            <p className="medio num" style={{ marginBottom: 10 }}>
              {previa.totais.tarefas} tarefas lidas · {previa.totais.servicos} serviços · {previa.totais.resumos} resumos · {previa.totais.ligacoes} predecessoras
            </p>
            <p className="muted">Serviços novos entram medidos em % e sem custo. Custo e unidade são definidos depois, no Cronograma.
              {!previa.primeira && ' Custo, unidade e produção dos serviços que já existem não mudam.'}</p>
          </Secao>

          <Secao rotulo="Etapas de entrega">
            <p className="muted" style={{ marginBottom: 10 }}>Cada tarefa de nível 1 do Project define a etapa de tudo o que está dentro dela.</p>
            <div className="lista">
              {topo.map((t) => (
                <div key={t.uid} className="linha" style={{ flexWrap: 'wrap' }}>
                  <div className="linha-main"><div className="linha-titulo">{t.nome}</div></div>
                  <select className="ipt" style={{ maxWidth: 220 }} aria-label={`Etapa de ${t.nome}`} value={etapaDoTopo[t.uid] ?? ''}
                    onChange={(e) => setEtapaDoTopo({ ...etapaDoTopo, [t.uid]: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Sem etapa</option>
                    {data.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {semEtapa > 0 && <p className="meta warn" style={{ marginTop: 8 }}>{semEtapa} sem etapa: esses serviços não entram no avanço por etapa.</p>}
          </Secao>

          {previa.primeira ? (
            previa.temBaseNoProject && (
              <Secao rotulo="Linha de base">
                <p className="muted" style={{ marginBottom: 10 }}>É a primeira importação: a linha de base (contra a qual o atraso é medido) será gravada a partir de:</p>
                <div className="filtros">
                  <button className="chave" aria-pressed={usarBase} onClick={() => setUsarBase(true)}>Linha de base do Project</button>
                  <button className="chave" aria-pressed={!usarBase} onClick={() => setUsarBase(false)}>Datas atuais</button>
                </div>
              </Secao>
            )
          ) : (
            <Secao rotulo={`Diferenças · ${previa.novos.length} novos · ${previa.alterados.length} alterados · ${previa.cancelados.length} ficam cancelados`}>
              {previa.novos.length + previa.alterados.length + previa.cancelados.length === 0 && <p className="vazio-curto">Nada mudou desde a última importação.</p>}
              <div className="lista">
                {previa.novos.slice(0, MOSTRAR).map((t) => (
                  <div key={`n${t.uid}`} className="linha"><div className="linha-main"><div className="linha-titulo">{t.eap} · {t.nome}</div><div className="meta">novo · {dataBr(t.inicio)} – {dataBr(t.fim)}</div></div></div>
                ))}
                {previa.alterados.slice(0, MOSTRAR).map((a) => (
                  <div key={`a${a.tarefa.uid}`} className="linha">
                    <div className="linha-main">
                      <div className="linha-titulo">{a.tarefa.eap} · {a.tarefa.nome}</div>
                      <div className="meta">{a.mudou.map((m) => `${m.campo}: ${m.data ? `${dataBr(m.de)} → ${dataBr(m.para)}` : `${m.de} → ${m.para}`}`).join(' · ')}</div>
                    </div>
                  </div>
                ))}
                {previa.cancelados.slice(0, MOSTRAR).map((s) => (
                  <div key={`c${s.id}`} className="linha"><div className="linha-main"><div className="linha-titulo">{s.codigo_eap} · {s.nome}</div><div className="meta crit">sumiu do Project · fica cancelado (a produção é mantida)</div></div></div>
                ))}
              </div>
              {(previa.novos.length > MOSTRAR || previa.alterados.length > MOSTRAR || previa.cancelados.length > MOSTRAR) && <p className="meta" style={{ marginTop: 8 }}>Mostrando até {MOSTRAR} de cada tipo.</p>}
            </Secao>
          )}

          <div className="folha-acoes" style={{ maxWidth: 520 }}>
            <button className="btn btn-quiet btn-lg" onClick={() => setLido(null)} disabled={gravando}>Cancelar</button>
            <button className="btn btn-fill btn-lg" onClick={confirmar} disabled={gravando}>{gravando ? 'Importando…' : 'Confirmar importação'}</button>
          </div>
        </>
      )}
    </>
  )
}
