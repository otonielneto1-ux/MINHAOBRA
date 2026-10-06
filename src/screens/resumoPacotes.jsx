// Pacotes › Resumo: os funcionários da folha; ao clicar, os pacotes dele (pago, previsto, ou o proporcional
// garantido de quem saiu de um pacote pausado), os ajustes em R$ e o total. Engenheiro e Coordenador veem os
// valores e lançam ajustes (acréscimo ou desconto, com motivo, que entram na planilha da folha); o Mestre vê só
// quem está em qual pacote.

import { useState } from 'react'
import * as dados from '../lib/dados.js'
import { fechamentoDoMes, resumoDaFolha, validarAjustePremio } from '../lib/premio.js'
import { dataBr, diaMes } from '../lib/datas.js'
import { moeda } from '../lib/formato.js'
import { Carregando, ErroCaixa, Secao, Status, useAviso, useCarga } from '../components/index.jsx'
import { tomPacote } from './pacotes.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarPremios(), dados.listarAjustesPremio()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  return { data: { premios: r[0].data, ajustes: r[1].data }, erro: null }
}

export function ResumoPacotes({ pacotes, funcionarios, obraId, diaFolha, hoje, verMo, gestao, goto }) {
  const aviso = useAviso()
  const [dataFolha, setDataFolha] = useState(fechamentoDoMes(hoje, diaFolha))
  const [aberto, setAberto] = useState(null)
  const [campos, setCampos] = useState({ valor: '', motivo: '' })
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const { data, erro: erroCarga, carregando, recarregar } = useCarga(carregar, [obraId])

  if (carregando && !data) return <Carregando />
  if (erroCarga) return <ErroCaixa erro={erroCarga} tentarDeNovo={recarregar} />

  const linhas = resumoDaFolha({ pacotes, funcionarios, premios: data.premios, ajustes: data.ajustes, dataFolha })
  const total = linhas.reduce((t, l) => t + l.total, 0)

  function abrir(id) {
    setAberto(aberto === id ? null : id)
    setCampos({ valor: '', motivo: '' })
    setErro(null)
  }

  async function lancar(funcionarioId) {
    const v = validarAjustePremio({ ...campos, funcionario_id: funcionarioId, data_folha: dataFolha })
    if (v.erro) { setErro(v.erro); return }
    setSalvando(true)
    const r = await dados.criarAjustePremio(v.registro)
    setSalvando(false)
    if (r.erro) { setErro(r.erro); return }
    setCampos({ valor: '', motivo: '' })
    aviso('Ajuste lançado · entra na planilha da folha')
    recarregar()
  }

  async function excluir(id) {
    const r = await dados.excluirAjustePremio(id)
    if (r.erro) { aviso(r.erro); return }
    aviso('Ajuste excluído')
    recarregar()
  }

  return (
    <>
      <div className="filtros">
        <label className="lab" htmlFor="data-resumo">Folha de</label>
        <input id="data-resumo" type="date" className="ipt" style={{ maxWidth: 190 }} value={dataFolha}
          onChange={(e) => { setDataFolha(e.target.value); setAberto(null) }} />
        <span className="meta">pacotes que fecham em {dataFolha ? dataBr(dataFolha).slice(3) : '—'}{verMo ? ` · total ${moeda(total)}` : ''}</span>
      </div>

      <Secao rotulo={`Funcionários · ${linhas.length}`}>
        {linhas.length === 0 && <p className="vazio-curto">Nenhum funcionário em pacote nesta folha.</p>}
        <div className="lista">
          {linhas.map((l) => {
            const f = l.funcionario
            const estaAberto = aberto === f.id
            return (
              <div key={f.id}>
                <button className="linha clicavel" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0 }}
                  aria-expanded={estaAberto} onClick={() => abrir(f.id)}>
                  <div className="linha-main">
                    <div className="linha-titulo">{f.nome}</div>
                    <div className="meta">{f.funcao}{f.matricula ? ` · mat. ${f.matricula}` : ''} · {l.itens.length} {l.itens.length === 1 ? 'pacote' : 'pacotes'}{l.ajustes.length ? ` · ${l.ajustes.length} ${l.ajustes.length === 1 ? 'ajuste' : 'ajustes'}` : ''}</div>
                  </div>
                  {verMo && <b className="num">{moeda(l.total)}</b>}
                </button>
                {estaAberto && (
                  <div style={{ padding: '4px 0 16px 12px', borderLeft: '3px solid var(--line)' }}>
                    <div className="pares">
                      {l.itens.map((i) => (
                        <div key={i.pacote.id}>
                          <span>
                            <button className="link" onClick={() => goto('pacote', { id: i.pacote.id })}>{i.pacote.nome}</button>{' '}
                            <Status tom={tomPacote(i.pacote.status)}>{i.pacote.status}</Status>
                            <span className="meta"> · {i.situacao}{i.entrou_em ? ` · entrou ${diaMes(i.entrou_em)}` : ''}{i.saida ? ` · saiu ${diaMes(i.saida.saiu_em)}` : ''}</span>
                          </span>
                          {verMo && <b className="num">{moeda(i.valor)}</b>}
                        </div>
                      ))}
                      {verMo && l.ajustes.map((a) => (
                        <div key={a.id}>
                          <span>Ajuste · {a.motivo}{gestao && <> · <button className="link" onClick={() => excluir(a.id)}>excluir</button></>}</span>
                          <b className={`num ${Number(a.valor) < 0 ? 't-crit' : ''}`}>{moeda(a.valor)}</b>
                        </div>
                      ))}
                      {verMo && <div><span><b>Total na folha</b></span><b className="num">{moeda(l.total)}</b></div>}
                    </div>
                    {gestao && (
                      <div className="filtros" style={{ marginTop: 10, alignItems: 'flex-end' }}>
                        <label style={{ maxWidth: 150 }}>
                          <span className="lab">Ajuste (R$)</span>
                          <input className="ipt" inputMode="decimal" placeholder="-50,00" value={campos.valor}
                            onChange={(e) => { setCampos({ ...campos, valor: e.target.value }); setErro(null) }} />
                        </label>
                        <label style={{ flex: 1, minWidth: 180 }}>
                          <span className="lab">Motivo</span>
                          <input className="ipt" placeholder="Ex.: falta sem justificativa" value={campos.motivo}
                            onChange={(e) => { setCampos({ ...campos, motivo: e.target.value }); setErro(null) }} />
                        </label>
                        <button className="btn btn-fill" onClick={() => lancar(f.id)} disabled={salvando}>{salvando ? 'Lançando…' : 'Lançar ajuste'}</button>
                        <span className="meta" style={{ width: '100%' }}>Positivo = acréscimo; negativo = desconto. Entra na planilha da folha de {dataBr(dataFolha)}.</span>
                        {erro && <p className="erro-campo" role="alert" style={{ width: '100%' }}>{erro}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Secao>
    </>
  )
}
