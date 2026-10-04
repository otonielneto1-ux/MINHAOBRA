// Nova ocorrência (Cliente, Engenheiro, Coordenador).

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { Cabecalho, Secao, useAviso, useCarga } from '../components/index.jsx'

export default function NovaOcorrencia({ goto }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const { data: etapas } = useCarga(dados.listarEtapas, [obra.id])
  const [form, setForm] = useState({ titulo: '', local: '', etapa_entrega_id: '', descricao: '' })
  const [faltando, setFaltando] = useState({})
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setFaltando({ ...faltando, [k]: false }) }

  async function salvar(e) {
    e.preventDefault()
    const vazios = Object.fromEntries(['titulo', 'local', 'descricao'].map((k) => [k, !form[k].trim()]))
    if (Object.values(vazios).some(Boolean)) { setFaltando(vazios); return }
    setSalvando(true)
    const { data, erro } = await dados.criarOcorrencia({ ...form, etapa_entrega_id: form.etapa_entrega_id ? Number(form.etapa_entrega_id) : null })
    setSalvando(false)
    if (erro) { aviso(erro); return }
    aviso(`Ocorrência nº ${data.numero} registrada`)
    goto('ocorrencias')
  }

  return (
    <>
      <Cabecalho voltar={{ texto: 'Voltar', acao: () => goto('ocorrencias') }} rotulo={obra.nome} titulo="Nova ocorrência" />
      <Secao rotulo="O que aconteceu">
        <form onSubmit={salvar} style={{ paddingTop: 12, maxWidth: 640 }} noValidate>
          <div className="campo">
            <label className="lab" htmlFor="oc-titulo">Título *</label>
            <input id="oc-titulo" className="ipt" value={form.titulo} onChange={campo('titulo')} placeholder="Ex.: Poça d'água na Rua 2" />
            {faltando.titulo && <span className="erro-campo">Diga em poucas palavras o que é.</span>}
          </div>
          <div className="campo">
            <label className="lab" htmlFor="oc-local">Local *</label>
            <input id="oc-local" className="ipt" value={form.local} onChange={campo('local')} placeholder="Rua, quadra ou lote" />
            {faltando.local && <span className="erro-campo">Informe onde fica.</span>}
          </div>
          <div className="campo">
            <label className="lab" htmlFor="oc-etapa">Etapa de entrega</label>
            <select id="oc-etapa" className="ipt" value={form.etapa_entrega_id} onChange={campo('etapa_entrega_id')}>
              <option value="">Não sei</option>
              {(etapas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label className="lab" htmlFor="oc-desc">Descrição *</label>
            <textarea id="oc-desc" className="ipt" value={form.descricao} onChange={campo('descricao')} placeholder="Conte o que viu e desde quando" />
            {faltando.descricao && <span className="erro-campo">Descreva a ocorrência.</span>}
          </div>
          <div className="campo">
            <span className="lab">Fotos</span>
            <span className="meta">O envio de fotos (até 5, da câmera ou da galeria) entra junto com o banco.</span>
          </div>
          <div className="folha-acoes">
            <button type="button" className="btn btn-quiet btn-lg" onClick={() => goto('ocorrencias')}>Cancelar</button>
            <button type="submit" className="btn btn-fill btn-lg" disabled={salvando}>{salvando ? 'Salvando…' : 'Registrar'}</button>
          </div>
        </form>
      </Secao>
    </>
  )
}
