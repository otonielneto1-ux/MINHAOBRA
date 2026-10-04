// Cadastros: obra e etapas, funcionários, usuários (só Engenheiro).

import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { pode } from '../lib/permissoes.js'
import { dataBr } from '../lib/datas.js'
import { TIPOS_MAO_OBRA } from '../lib/vocabulario.js'
import { Abas, Cabecalho, Carregando, ErroCaixa, Icone, Secao, Status, useAviso, useCarga } from '../components/index.jsx'

export default function Cadastros({ params, usuario }) {
  const abas = [
    { id: 'obra', texto: 'Obra e etapas' },
    { id: 'funcionarios', texto: 'Funcionários' },
    ...(pode(usuario.role, 'gerirUsuarios') ? [{ id: 'usuarios', texto: 'Usuários' }] : []),
  ]
  const [aba, setAba] = useState(abas.some((a) => a.id === params.aba) ? params.aba : 'obra')
  return (
    <>
      <Cabecalho rotulo="Cadastros" titulo={abas.find((a) => a.id === aba).texto} />
      <Abas abas={abas} atual={aba} trocar={setAba} />
      {aba === 'obra' && <ObraEtapas usuario={usuario} />}
      {aba === 'funcionarios' && <Funcionarios />}
      {aba === 'usuarios' && <Usuarios />}
    </>
  )
}

function ObraEtapas({ usuario }) {
  const { obra } = useObra()
  const aviso = useAviso()
  const { data: etapas, erro, carregando, recarregar } = useCarga(dados.listarEtapas, [obra.id])
  if (carregando && !etapas) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />
  const embreve = () => aviso('Editar cadastros chega na próxima etapa')
  return (
    <div className="grid">
      <Secao className="span-6" rotulo="Obra" link={{ texto: 'Editar', acao: embreve }}>
        <div className="pares">
          <div><span>Nome</span><b>{obra.nome}</b></div>
          <div><span>Cidade</span><b>{obra.cidade}/{obra.uf}</b></div>
          <div><span>Cliente</span><b>{obra.cliente}</b></div>
          <div><span>Início</span><b className="num">{dataBr(obra.data_inicio)}</b></div>
          <div><span>Término contratual</span><b className="num">{dataBr(obra.data_fim_contrato)}</b></div>
          <div><span>Fechamento da folha</span><b className="num">dia {obra.dia_fechamento_folha}</b></div>
          <div><span>Status</span><b>{obra.status}</b></div>
        </div>
        {pode(usuario.role, 'gerirUsuarios') && <button className="btn btn-quiet" style={{ marginTop: 16 }} onClick={embreve}><Icone nome="mais_um" />Nova obra</button>}
      </Secao>
      <Secao className="span-6" rotulo={`Etapas de entrega · ${etapas.length}`} link={{ texto: 'Nova etapa', acao: embreve }}>
        {etapas.length === 0 && <p className="vazio-curto">Nenhuma etapa de entrega cadastrada.</p>}
        <div className="pares">
          {etapas.map((e) => <div key={e.id}><span>{e.ordem}. {e.nome}</span><b className="num">entrega {dataBr(e.data_entrega_contratual)}</b></div>)}
        </div>
      </Secao>
    </div>
  )
}

function Funcionarios() {
  const { obra } = useObra()
  const aviso = useAviso()
  const [tipo, setTipo] = useState(null)
  const [soAtivos, setSoAtivos] = useState(true)
  const { data, erro, carregando, recarregar } = useCarga(dados.listarFuncionarios, [obra.id])
  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />
  const lista = data.filter((f) => (tipo === null || f.tipo_mao_obra === tipo) && (!soAtivos || f.ativo))
  return (
    <>
      <div className="filtros">
        <button className="chave" aria-pressed={tipo === null} onClick={() => setTipo(null)}>Todos</button>
        {TIPOS_MAO_OBRA.map((t) => <button key={t} className="chave" aria-pressed={tipo === t} onClick={() => setTipo(t)}>{t}</button>)}
        <button className="chave" aria-pressed={soAtivos} onClick={() => setSoAtivos(!soAtivos)}>Só ativos</button>
        <button className="btn btn-fill" style={{ marginLeft: 'auto' }} onClick={() => aviso('Cadastrar funcionário chega na próxima etapa')}><Icone nome="mais_um" />Novo funcionário</button>
      </div>
      <section className="section">
        {lista.length === 0 && <p className="vazio-curto">Nenhum funcionário cadastrado.</p>}
        <div className="lista">
          {lista.map((f) => (
            <div key={f.id} className="linha">
              <div className="linha-main">
                <div className="linha-titulo">{f.nome}</div>
                <div className="meta">{f.funcao} · {f.tipo_mao_obra}{f.empresa ? ` · ${f.empresa}` : ''}{f.matricula ? ` · mat. ${f.matricula}` : ''}</div>
              </div>
              {!f.ativo && <Status tom="neutral">Inativo</Status>}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Usuarios() {
  const aviso = useAviso()
  const { obras } = useObra()
  const { data, erro, carregando, recarregar } = useCarga(dados.listarUsuarios, [])
  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCaixa erro={erro} tentarDeNovo={recarregar} />
  const aguardando = data.filter((u) => u.role === 'Aguardando')
  return (
    <>
      {aguardando.length > 0 && (
        <div className="aviso" style={{ marginTop: 0, marginBottom: 16 }}>
          {aguardando.length} {aguardando.length === 1 ? 'conta aguardando liberação' : 'contas aguardando liberação'}
        </div>
      )}
      <section className="section">
        <div className="lista">
          {data.map((u) => (
            <div key={u.id} className="linha" style={{ flexWrap: 'wrap' }}>
              <div className="linha-main">
                <div className="linha-titulo">{u.nome}</div>
                <div className="meta">{u.email} · {u.role === 'Engenheiro' ? 'todas as obras' : u.obras.map((id) => obras.find((o) => o.id === id)?.nome).filter(Boolean).join(', ') || 'sem obra'}</div>
              </div>
              <Status tom={u.role === 'Aguardando' ? 'warn' : 'info'}>{u.role}</Status>
              {u.role === 'Aguardando' && <button className="btn btn-fill" onClick={() => aviso('Liberar contas chega com o login de verdade')}>Liberar</button>}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
