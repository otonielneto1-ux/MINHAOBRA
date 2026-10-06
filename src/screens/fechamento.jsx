// Fechamento da folha (Engenheiro e Coordenador): prévia de quais pacotes fecham e do prêmio de cada
// funcionário (lib/premio.js), motivo dos que não bateram a meta, e confirmação — o banco refaz a conta
// e grava tudo de uma vez (função fechar_pacotes). Depois, a planilha para a folha.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { ajustesDaFolha, fechamentoDoMes, fechamentosAnteriores, linhasDosAjustes, linhasDosPremios, pctPacote, planilhaPremios, previaFechamento } from '../lib/premio.js'
import { dataBr } from '../lib/datas.js'
import { moeda, porcento } from '../lib/formato.js'
import { Cabecalho, Carregando, ErroCaixa, Icone, Secao, Status, baixarArquivo, useAviso, useCarga } from '../components/index.jsx'
import { EscolherMotivo } from '../components/motivo.jsx'

async function carregar() {
  const r = await Promise.all([
    dados.listarPacotes(), dados.listarServicos(), dados.listarPresencas(), dados.listarFuncionarios(), dados.listarPremios(), dados.listarAjustesPremio(),
  ])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [pacotes, servicos, presencas, funcionarios, premios, ajustes] = r.map((x) => x.data)
  return { data: { pacotes, servicos, presencas, funcionarios, premios, ajustes }, erro: null }
}

export default function Fechamento({ goto }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [dataFolha, setDataFolha] = useState(fechamentoDoMes(dia, obra.dia_fechamento_folha))
  const [motivos, setMotivos] = useState({})
  const [gravando, setGravando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])
  const voltar = { texto: 'Pacotes', acao: () => goto('pacotes') }

  if (carregando && !data) return <Carregando />
  if (erro) return <><Cabecalho voltar={voltar} titulo="Fechar pacotes do mês" /><ErroCaixa erro={erro} tentarDeNovo={recarregar} /></>

  const func = (id) => data.funcionarios.find((f) => f.id === id)
  const previa = previaFechamento({ pacotes: data.pacotes, presencas: data.presencas, funcionarios: data.funcionarios, data: dataFolha })
  const faltaMotivo = previa.pacotes.filter((x) => x.pedeMotivo && !motivos[x.pacote.id])
  const anteriores = fechamentosAnteriores(data.pacotes)
  const ajustesDe = (dataFolha) => linhasDosAjustes(ajustesDaFolha(data.ajustes, dataFolha))
  const planilhaDe = (pacotes, dataFolha) => planilhaPremios([
    ...linhasDosPremios(data.premios.filter((x) => pacotes.some((p) => p.id === x.pacote_id)), pacotes), ...ajustesDe(dataFolha)], data.funcionarios)

  async function confirmar() {
    setGravando(true)
    const r = await dados.fecharPacotes(dataFolha, motivos)
    setGravando(false)
    if (r.erro) { aviso(r.erro); return }
    setResultado({ ...r.data, data: dataFolha, ids: previa.pacotes.map((x) => x.pacote.id) })
    setMotivos({})
    recarregar()
  }

  return (
    <>
      <Cabecalho voltar={voltar} rotulo="Pacotes" titulo="Fechar pacotes do mês" />

      {resultado && (
        <div className="aviso" style={{ marginTop: 0, marginBottom: 16, justifyContent: 'space-between', flexWrap: 'wrap' }} role="status">
          <span>{resultado.fechados} {resultado.fechados === 1 ? 'pacote fechado' : 'pacotes fechados'} · {moeda(resultado.total)} em prêmios</span>
          <button className="btn btn-fill" onClick={() => baixarArquivo(`premios-${obra.nome}-${resultado.data}.csv`,
            planilhaDe(data.pacotes.filter((p) => resultado.ids.includes(p.id)), resultado.data))}>
            <Icone nome="arquivo" />Baixar planilha
          </button>
        </div>
      )}

      <div className="campo" style={{ maxWidth: 280 }}>
        <label className="lab" htmlFor="data-fech">Data de fechamento da folha</label>
        <input id="data-fech" className="ipt" type="date" value={dataFolha} onChange={(e) => { setDataFolha(e.target.value); setResultado(null) }} />
      </div>

      <Secao rotulo={`Pacotes que fecham até ${dataBr(dataFolha)} · ${previa.pacotes.length}`}>
        {previa.pacotes.length === 0 && <p className="vazio-curto">Nenhum pacote para fechar até esta data.</p>}
        <div className="lista">
          {previa.pacotes.map(({ pacote: p, bate, pausado, pct, pedeMotivo }) => {
            const nomes = p.servicos.map((x) => data.servicos.find((s) => s.id === x.servico_id)?.nome).filter(Boolean)
            return (
              <div key={p.id} className="linha" style={{ flexWrap: 'wrap' }}>
                <div className="linha-main">
                  <div className="linha-titulo">{p.nome}</div>
                  <div className="meta num">{nomes.join(', ')} · {Math.round(pctPacote(p))}% da meta · prêmio {moeda(p.valor_premio)}</div>
                </div>
                <Status tom={bate ? 'ok' : pausado ? 'warn' : 'crit'}>{bate ? 'Concluído' : pausado ? `Pausado · paga ${porcento(pct, 0)}` : 'Não concluído'}</Status>
                {pausado && <div className="meta" style={{ width: '100%' }}>Pausado desde {dataBr(p.pausa_desde)} · {p.pausa_motivo}. Fecha como Não concluído e paga o prêmio proporcional ao executado.</div>}
                {pedeMotivo && (
                  <div className="campo" style={{ width: '100%', marginTop: 8 }}>
                    <EscolherMotivo key={p.id} motivo={motivos[p.id] || null} rotulo="Por que não bateu a meta? Escolha o grupo"
                      mudar={(m) => setMotivos({ ...motivos, [p.id]: m })} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Secao>

      {previa.avisos.length > 0 && (
        <div className="erro-caixa" role="alert" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <b>Corrija antes de fechar:</b>
            {previa.avisos.map((a) => <div key={a} className="muted">{a} Escolha os colaboradores no pacote (Editar).</div>)}
          </div>
        </div>
      )}

      <Secao rotulo={`Prévia dos prêmios · ${moeda(previa.total)}`}>
        {previa.linhas.length === 0 && <p className="vazio-curto">Nenhum prêmio a pagar nesta data: nenhum pacote bateu a meta nem fecha pausado.</p>}
        <div className="pares">
          {previa.linhas.map((l) => {
            const f = func(l.funcionario_id)
            return <div key={`${l.pacote}-${l.parte}-${l.funcionario_id}`}><span>{f?.nome} <span className="meta">· {f?.matricula || 'sem matrícula'} · {f?.funcao} · {l.pacote} · MO {l.parte} · {l.dias} {l.dias === 1 ? 'dia' : 'dias'}</span></span><b className="num">{moeda(l.valor)}</b></div>
          })}
        </div>
        {ajustesDe(dataFolha).length > 0 && (
          <>
            <div className="lab lab-ink" style={{ margin: '14px 0 4px' }}>Ajustes desta folha · lançados na aba Resumo · entram na planilha</div>
            <div className="pares">
              {ajustesDe(dataFolha).map((l, i) => <div key={i}><span>{func(l.funcionario_id)?.nome} <span className="meta">· {l.pacote}</span></span><b className={`num ${l.valor < 0 ? 't-crit' : ''}`}>{moeda(l.valor)}</b></div>)}
            </div>
          </>
        )}
      </Secao>

      <div className="filtros" style={{ marginTop: 20 }}>
        <button className="btn btn-fill btn-lg" onClick={confirmar}
          disabled={gravando || previa.pacotes.length === 0 || previa.avisos.length > 0 || faltaMotivo.length > 0}>
          {gravando ? 'Fechando…' : 'Confirmar fechamento'}
        </button>
        {faltaMotivo.length > 0 && <span className="meta warn">Falta o motivo de {faltaMotivo.length} {faltaMotivo.length === 1 ? 'pacote' : 'pacotes'}.</span>}
        <span className="meta">Depois de fechar, os pacotes ficam travados.</span>
      </div>

      <Secao rotulo={`Fechamentos anteriores · ${anteriores.length}`}>
        {anteriores.length === 0 && <p className="vazio-curto">Nenhum fechamento ainda.</p>}
        <div className="lista">
          {anteriores.map((g) => (
            <div key={g.data} className="linha">
              <div className="linha-main">
                <div className="linha-titulo num">{dataBr(g.data)}</div>
                <div className="meta">{g.pacotes.length} {g.pacotes.length === 1 ? 'pacote' : 'pacotes'} · {g.pacotes.map((p) => p.nome).join(', ')}</div>
              </div>
              <button className="btn" onClick={() => baixarArquivo(`premios-${obra.nome}-${g.data}.csv`, planilhaDe(g.pacotes, g.data))}>
                <Icone nome="arquivo" />Planilha
              </button>
            </div>
          ))}
        </div>
      </Secao>
    </>
  )
}
