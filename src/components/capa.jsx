// Capa da obra (foto + logos do cliente e da construtora) e o espaço de enviar imagem.

import { useRef, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import * as dados from '../lib/dados.js'
import { IMAGENS_CAPA, TAMANHO_MAXIMO_MB, TIPOS_IMAGEM, iniciais, validarArquivoImagem } from '../lib/imagem.js'
import { comprimirImagem } from './imagem.js'
import { Icone, useAviso, useCarga } from './index.jsx'

// Só a imagem; o nome vai no texto alternativo. Sem logo enviada, aparecem as iniciais.
function Logo({ src, papel, nome }) {
  return src
    ? <img className="logo-img" src={src} alt={`Logo ${papel}: ${nome}`} />
    : <span className="iniciais" role="img" aria-label={`${papel}: ${nome}`}>{iniciais(nome)}</span>
}

// Aparece no topo da tela inicial de todos os perfis.
export function Capa({ editar }) {
  const { obra } = useObra()
  const { data: c, erro } = useCarga(dados.buscarCapa, [obra.id])
  // A capa é só ilustração: se falhar, some e deixa o resto da tela funcionar.
  if (erro) return null
  if (!c) return <div className="capa capa-reserva" aria-hidden="true" />
  return (
    <section className="capa" aria-label="Obra, cliente e construtora">
      <div className={`capa-foto ${c.foto_obra ? 'com-foto' : ''}`} style={c.foto_obra ? { backgroundImage: `url(${c.foto_obra})` } : undefined}
        role={c.foto_obra ? 'img' : undefined} aria-label={c.foto_obra ? `Foto da obra ${c.obra}` : undefined}>
        {!c.foto_obra && <div className="capa-sem-foto"><Icone nome="arquivo" /><span className="lab">Sem foto da obra</span></div>}
        <div className="capa-titulo">
          <div className="lab">Obra</div>
          <div className="capa-nome">{c.obra}</div>
          <div className="meta">{c.local}</div>
        </div>
        {editar && <button className="btn btn-quiet capa-editar" onClick={editar}>Trocar imagens</button>}
      </div>
      <div className="capa-logos">
        <div className="capa-logo"><Logo src={c.logo_cliente} papel="do cliente" nome={c.cliente} /></div>
        <div className="capa-logo"><Logo src={c.logo_construtora} papel="da construtora" nome={c.construtora} /></div>
      </div>
    </section>
  )
}

// Um espaço de imagem com Enviar / Trocar / Remover (Cadastros › Obra).
export function EnviarImagem({ tipo, valor, nome, salvo }) {
  const aviso = useAviso()
  const entrada = useRef(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const cfg = IMAGENS_CAPA[tipo]

  // Grava a imagem (ou null para remover). "Salvando…" trava os botões até terminar.
  async function gravar(imagem, mensagem) {
    setSalvando(true)
    const { erro: falhou } = await dados.salvarImagem(tipo, imagem)
    setSalvando(false)
    if (falhou) { setErro(falhou); return }
    aviso(mensagem)
    salvo()
  }

  async function escolher(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    const problema = validarArquivoImagem(arquivo)
    setErro(problema)
    if (problema) return
    setSalvando(true)
    let imagem
    try {
      imagem = await comprimirImagem(arquivo, cfg)
    } catch {
      setSalvando(false)
      setErro('Não foi possível ler esta imagem. Tente outra.')
      return
    }
    gravar(imagem, `${cfg.rotulo} salva`)
  }

  return (
    <div className="enviar-img">
      <div className="lab lab-ink">{cfg.rotulo}</div>
      <div className={`enviar-previa ${cfg.formato}`}>
        {valor
          ? <img src={valor} alt={`${cfg.rotulo} atual`} />
          : cfg.formato === 'logo' ? <span className="iniciais">{iniciais(nome)}</span> : <span className="lab">Sem foto</span>}
      </div>
      <input ref={entrada} type="file" accept={TIPOS_IMAGEM.join(',')} hidden onChange={escolher} />
      <div className="enviar-acoes">
        <button className="btn btn-fill" onClick={() => entrada.current.click()} disabled={salvando}>
          {salvando ? 'Salvando…' : valor ? 'Trocar imagem' : 'Enviar imagem'}
        </button>
        {valor && <button className="btn btn-perigo" disabled={salvando} onClick={() => { setErro(null); gravar(null, `${cfg.rotulo} removida`) }}>Remover</button>}
      </div>
      {erro && <p className="erro-campo" role="alert">{erro}</p>}
      <p className="meta">{cfg.formato === 'logo' ? 'PNG com fundo transparente fica melhor' : 'Foto deitada fica melhor'} · até {TAMANHO_MAXIMO_MB} MB</p>
    </div>
  )
}
