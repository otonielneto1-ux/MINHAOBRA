// Fechamento da folha: prévia de quais pacotes fecham e do prêmio de cada funcionário.
// A prévia já é calculada pela regra real (lib/premio.js); gravar chega na próxima etapa.

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { dividirPremio, pacoteBateuMeta } from '../lib/premio.js'
import { dataBr } from '../lib/datas.js'
import { moeda, quantidade } from '../lib/formato.js'
import { Cabecalho, Carregando, ErroCaixa, Secao, Status, useAviso, useCarga } from '../components/index.jsx'

async function carregar() {
  const r = await Promise.all([dados.listarPacotes(), dados.listarServicos(), dados.listarPresencas(), dados.listarFuncionarios()])
  const erro = r.find((x) => x.erro)?.erro
  if (erro) return { data: null, erro }
  const [pacotes, servicos, presencas, funcionarios] = r.map((x) => x.data)
  return { data: { pacotes, servicos, presencas, funcionarios }, erro: null }
}

export default function Fechamento({ goto }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const dia = dados.hoje()
  const [data_, setData] = useState(`${dia.slice(0, 8)}${String(obra.dia_fechamento_folha).padStart(2, '0')}`)
  const { data, erro, carregando, recarregar } = useCarga(carregar, [obra.id])
  const voltar = { texto: 'Pacotes', acao: () => goto('pacotes') }

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />

  const func = (id) => data.funcionarios.find((f) => f.id === id)
  const aFechar = data.pacotes.filter((p) => !p.fechado_em && p.data_fechamento <= data_)
  const linhas = aFechar.flatMap((p) => {
    if (!pacoteBateuMeta(p)) return []
    const dias = data.presencas
      .filter((x) => x.pacote_id === p.id && x.situacao === 'Presente' && x.data >= p.data_inicio && x.data <= p.data_fechamento)
      .map((x) => ({ funcionario_id: x.funcionario_id, tipo_mao_obra: func(x.funcionario_id).tipo_mao_obra }))
    return dividirPremio(p.valor_premio, dias).map((l) => ({ ...l, pacote: p.nome }))
  })
  const total = linhas.reduce((t, l) => t + l.valor, 0)

  return (
    <>
      <Cabecalho voltar={voltar} rotulo="Pacotes" titulo="Fechar pacotes do mês" />
      <div className="campo" style={{ maxWidth: 280 }}>
        <label className="lab" htmlFor="data-fech">Data de fechamento da folha</label>
        <input id="data-fech" className="ipt" type="date" value={data_} onChange={(e) => setData(e.target.value)} />
      </div>

      <Secao rotulo={`Pacotes que fecham até ${dataBr(data_)} · ${aFechar.length}`}>
        {aFechar.length === 0 && <p className="vazio-curto">Nenhum pacote para fechar até esta data.</p>}
        <div className="lista">
          {aFechar.map((p) => {
            const s = data.servicos.find((x) => x.id === p.servico_id)
            const bate = pacoteBateuMeta(p)
            return (
              <div key={p.id} className="linha">
                <div className="linha-main">
                  <div className="linha-titulo">{p.nome}</div>
                  <div className="meta num">{quantidade(p.quantidade_executada, s?.unidade)} de {quantidade(p.quantidade_meta, s?.unidade)}</div>
                </div>
                <Status tom={bate ? 'ok' : 'crit'}>{bate ? 'Concluído' : 'Não concluído · pede motivo'}</Status>
              </div>
            )
          })}
        </div>
      </Secao>

      <Secao rotulo={`Prévia dos prêmios · ${moeda(total)}`}>
        {linhas.length === 0 && <p className="vazio-curto">Nenhum prêmio a pagar nesta data: nenhum pacote bateu a meta.</p>}
        <div className="pares">
          {linhas.map((l, i) => {
            const f = func(l.funcionario_id)
            return <div key={i}><span>{f.nome} <span className="meta">· {f.matricula || 'sem matrícula'} · {l.pacote} · {l.dias} dias</span></span><b className="num">{moeda(l.valor)}</b></div>
          })}
        </div>
      </Secao>

      <div className="filtros" style={{ marginTop: 20 }}>
        <button className="btn btn-fill btn-lg" disabled={aFechar.length === 0} onClick={() => aviso('Confirmar o fechamento chega na próxima etapa')}>Confirmar fechamento</button>
      </div>
    </>
  )
}
