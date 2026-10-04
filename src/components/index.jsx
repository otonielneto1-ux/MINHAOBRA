// Peças reutilizáveis da interface. Nenhuma regra de negócio aqui.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// ── Ícones (traço fino, SVG inline) ──────────────────────────────────────
const P = {
  inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  hoje: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  planejamento: '<rect x="3" y="4" width="18" height="17"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h8"/>',
  pacotes: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  efetivo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16.5 14.6c2.6.2 4.4 1.8 5 4.9"/>',
  ocorrencias: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  cadastros: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  avanco: '<path d="M3 20h18"/><path d="M5 17l4-6 4 3 6-8"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  mais: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  esquerda: '<path d="M15 18l-6-6 6-6"/>',
  direita: '<path d="M9 18l6-6-6-6"/>',
  mais_um: '<path d="M12 5v14M5 12h14"/>',
  copiar: '<rect x="9" y="9" width="12" height="12"/><path d="M5 15V5a2 2 0 012-2h10"/>',
  conversa: '<path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z"/>',
  calendario: '<rect x="3" y="4" width="18" height="17"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arquivo: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  sair: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
  equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
}

export function Icone({ nome, grosso = false }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosso ? 3 : 1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[nome] || '' }} />
  )
}

// ── Cabeçalho de página ──────────────────────────────────────────────────
export function Cabecalho({ rotulo, titulo, acoes, voltar }) {
  return (
    <div className="page-head">
      <div>
        {voltar && <button className="voltar" onClick={voltar.acao}><Icone nome="esquerda" />{voltar.texto}</button>}
        {rotulo && <div className="lab">{rotulo}</div>}
        <h1>{titulo}</h1>
      </div>
      {acoes && <div className="actions">{acoes}</div>}
    </div>
  )
}

export function Secao({ rotulo, link, children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      <div className="sec-head">
        <span className="lab lab-ink">{rotulo}</span>
        {link && <button className="link" onClick={link.acao}>{link.texto}</button>}
      </div>
      {children}
    </section>
  )
}

// ── Status: quadradinho colorido + texto ─────────────────────────────────
// tom: ok | warn | crit | info | neutral
export function Status({ tom = 'neutral', children }) {
  return <span className={`st st-${tom}`}>{children}</span>
}

// Caixa de status de atividade (vazia, concluída, não concluída).
export function Caixa({ tom }) {
  if (tom === 'ok') return <span className="box ok"><Icone nome="check" grosso /></span>
  if (tom === 'crit') return <span className="box crit"><Icone nome="x" grosso /></span>
  return <span className="box" />
}

export function Barra({ pct, marco = null, tom = '' }) {
  return (
    <div className={`barra ${tom}`} aria-hidden="true">
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      {marco !== null && <span className="marco" style={{ left: `${Math.max(0, Math.min(100, marco))}%` }} />}
    </div>
  )
}

// ── Estados de tela ──────────────────────────────────────────────────────
export function Vazio({ icone = 'arquivo', rotulo, titulo, texto, acao }) {
  return (
    <div className="vazio">
      <div className="vazio-icone"><Icone nome={icone} /></div>
      {rotulo && <div className="lab">{rotulo}</div>}
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {acao && <button className="btn btn-fill btn-lg" onClick={acao.fn}><Icone nome="mais_um" />{acao.texto}</button>}
    </div>
  )
}

export function Carregando() {
  return <div className="carregando lab" role="status">Carregando…</div>
}

export function ErroCaixa({ erro, tentarDeNovo }) {
  return (
    <div className="erro-caixa" role="alert">
      <div style={{ flex: 1 }}><b>Não foi possível carregar.</b><div className="muted">{erro}</div></div>
      {tentarDeNovo && <button className="btn" onClick={tentarDeNovo}>Tentar de novo</button>}
    </div>
  )
}

// Carrega dados da camada (lib/dados.js) e devolve os três estados.
export function useCarga(carregar, deps = []) {
  const [estado, setEstado] = useState({ data: null, erro: null, carregando: true })
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, carregando: true }))
    carregar().then((r) => { if (vivo) setEstado({ data: r.data, erro: r.erro, carregando: false }) })
    return () => { vivo = false }
  }, [...deps, versao])
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { ...estado, recarregar }
}

// ── Folha (janela por cima da tela; no celular sobe de baixo) ────────────
export function Folha({ aberta, fechar, children, rotulo }) {
  const caixa = useRef(null)
  useEffect(() => {
    if (!aberta) return
    const tecla = (e) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberta, fechar])
  // Ao abrir, o cursor vai para dentro da janela; ao fechar, volta para onde estava.
  useEffect(() => {
    if (!aberta) return
    const antes = document.activeElement
    const primeiro = caixa.current?.querySelector('input, select, textarea, button')
    ;(primeiro || caixa.current)?.focus()
    return () => { if (antes && document.contains(antes)) antes.focus() }
  }, [aberta])
  if (!aberta) return null
  return (
    <div className="fundo" onClick={(e) => { if (e.target === e.currentTarget) fechar() }}>
      <div className="folha" role="dialog" aria-modal="true" aria-label={rotulo} ref={caixa} tabIndex={-1}>{children}</div>
    </div>
  )
}

// ── Aviso rápido no rodapé ───────────────────────────────────────────────
const AvisoCtx = createContext(() => {})

export function AvisoProvider({ children }) {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <AvisoCtx.Provider value={setMsg}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </AvisoCtx.Provider>
  )
}

export const useAviso = () => useContext(AvisoCtx)

// ── Curva S (previsto x realizado; realizado só até hoje) ────────────────
export function CurvaS({ pontos, altura = 150 }) {
  const W = 560
  const H = altura
  const pad = 4
  if (!pontos?.length) return null
  const x = (i) => pad + (i * (W - 2 * pad)) / Math.max(1, pontos.length - 1)
  const y = (v) => H - pad - (v * (H - 2 * pad)) / 100
  const caminho = (chave) => pontos
    .map((p, i) => (p[chave] === null ? null : `${x(i).toFixed(1)},${y(p[chave]).toFixed(1)}`))
    .filter(Boolean)
    .map((xy, i) => `${i ? 'L' : 'M'}${xy}`)
    .join(' ')
  const ultimo = pontos.reduce((u, p, i) => (p.realizado !== null ? i : u), 0)
  const fim = pontos[ultimo]
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label={`Curva S: previsto ${fim.previsto.toFixed(1)}% e realizado ${fim.realizado?.toFixed(1)}% hoje`}
        style={{ display: 'block', marginTop: 14, border: '1px solid var(--line)', background: '#fff' }}>
        {[25, 50, 75].map((v) => <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="#E1E8EF" />)}
        <line x1={x(ultimo)} x2={x(ultimo)} y1={pad} y2={H - pad} stroke="#132B40" strokeDasharray="3 4" />
        <path d={caminho('previsto')} fill="none" stroke="#8FA4B9" strokeWidth="2" strokeDasharray="6 4" />
        <path d={caminho('realizado')} fill="none" stroke="#1F4E79" strokeWidth="3" />
        {fim.realizado !== null && <rect x={x(ultimo) - 5} y={y(fim.realizado) - 5} width="10" height="10" fill="#1F4E79" />}
      </svg>
      <div className="legenda lab">
        <span><i style={{ background: '#1F4E79' }} />Realizado</span>
        <span><i style={{ background: 'repeating-linear-gradient(90deg,#8FA4B9 0 6px,transparent 6px 10px)' }} />Previsto (linha de base)</span>
        <span><i style={{ background: '#132B40', height: 1 }} />Hoje</span>
      </div>
    </>
  )
}

export function Abas({ abas, atual, trocar }) {
  return (
    <div className="abas" role="tablist">
      {abas.map((a) => (
        <button key={a.id} role="tab" aria-selected={atual === a.id} onClick={() => trocar(a.id)}>{a.texto}</button>
      ))}
    </div>
  )
}
