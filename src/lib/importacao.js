// Importação do MS Project (Arquivo › Salvar como › XML). PRD-BACKEND, "Importação do MS Project".
// Leitura do arquivo e comparação com o que já está no banco. Regra pura: sem React, sem banco.
// O XML do Project é regular (um <Task> por tarefa, campos simples), então lemos com expressão
// regular: roda igual no navegador e no teste do Node.

import { diasEntre } from './datas.js'

// Tipo de ligação no Project: 0 = término-término, 1 = término-início, 2 = início-término, 3 = início-início.
const TIPO = { 0: 'TT', 1: 'TI', 2: 'IT', 3: 'II' }
// LinkLag vem em décimos de minuto. Formato "decorrido" (4, 6, 8, 10, 12) conta 24 h por dia; o resto, 8 h.
const DECORRIDO = new Set([4, 6, 8, 10, 12])

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const decodificar = (t) => t.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
  return ENTIDADES[e] ?? m
})
const blocos = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])
const campo = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? decodificar(m[1]).trim() : null
}
const data = (v) => (v ? v.slice(0, 10) : null)

// Texto do arquivo → { tarefas, ligacoes } ou { erro }.
export function lerXmlDoProject(texto) {
  if (!texto || !/<Project[\s>]/.test(texto)) return { erro: 'Esse arquivo não parece ser um XML do MS Project.' }
  const pilha = []
  const tarefas = []
  const ligacoes = []
  for (const t of blocos(texto, 'Task')) {
    const proprio = t.replace(/<(Baseline|PredecessorLink|ExtendedAttribute|TimephasedData)>[\s\S]*?<\/\1>/g, '')
    const uid = Number(campo(proprio, 'UID'))
    const nivel = Number(campo(proprio, 'OutlineLevel'))
    if (!nivel || campo(proprio, 'IsNull') === '1') continue // nível 0 = a própria obra
    const nome = campo(proprio, 'Name')
    const inicio = data(campo(proprio, 'Start'))
    const fim = data(campo(proprio, 'Finish'))
    if (!nome || !inicio || !fim) continue
    const base = blocos(t, 'Baseline').find((b) => campo(b, 'Number') === '0')
    pilha[nivel] = uid
    pilha.length = nivel + 1
    tarefas.push({
      uid, nome, nivel, inicio, fim,
      eap: campo(proprio, 'WBS') || campo(proprio, 'OutlineNumber') || String(uid),
      resumo: campo(proprio, 'Summary') === '1',
      inicio_base: base ? data(campo(base, 'Start')) : null,
      fim_base: base ? data(campo(base, 'Finish')) : null,
      pai_uid: nivel > 1 ? pilha[nivel - 1] ?? null : null,
      topo_uid: pilha[1],
    })
    for (const l of blocos(t, 'PredecessorLink')) {
      const formato = Number(campo(l, 'LagFormat'))
      // ponytail: defasagem em % da duração (formatos 19 e 20) entra como zero.
      const lag = formato === 19 || formato === 20 ? 0 : Number(campo(l, 'LinkLag')) || 0
      ligacoes.push({
        uid, pred_uid: Number(campo(l, 'PredecessorUID')),
        tipo: TIPO[Number(campo(l, 'Type') ?? 1)] || 'TI',
        defasagem: Math.round(lag / (DECORRIDO.has(formato) ? 14400 : 4800)),
      })
    }
  }
  if (tarefas.length === 0) return { erro: 'O arquivo não tem tarefas. Confira se salvou o projeto inteiro como XML.' }
  const uids = new Set(tarefas.map((t) => t.uid))
  return { tarefas, ligacoes: ligacoes.filter((l) => uids.has(l.pred_uid)) }
}

const normal = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Etapa de entrega de cada tarefa de nível 1: nome igual ao da etapa; senão, nome que contém o da etapa.
export function casarEtapas(tarefas, etapas) {
  return tarefas.filter((t) => t.nivel === 1).map((t) => {
    const n = normal(t.nome)
    const etapa = etapas.find((e) => normal(e.nome) === n) || etapas.find((e) => n.includes(normal(e.nome)))
    return { uid: t.uid, nome: t.nome, etapa_id: etapa?.id ?? null }
  })
}

// Prévia: o que é novo, o que muda (com data antiga → nova) e o que vai ficar cancelado.
export function compararImportacao(lido, atuais) {
  const porUid = new Map(atuais.map((s) => [s.uid_project, s]))
  const lidos = new Set(lido.tarefas.map((t) => t.uid))
  const novos = []
  const alterados = []
  for (const t of lido.tarefas) {
    const s = porUid.get(t.uid)
    if (!s) { novos.push(t); continue }
    const mudou = []
    if (s.nome !== t.nome) mudou.push({ campo: 'nome', de: s.nome, para: t.nome })
    if (s.codigo_eap !== t.eap) mudou.push({ campo: 'EAP', de: s.codigo_eap, para: t.eap })
    if (s.inicio_previsto !== t.inicio) mudou.push({ campo: 'início', de: s.inicio_previsto, para: t.inicio, data: true })
    if (s.fim_previsto !== t.fim) mudou.push({ campo: 'fim', de: s.fim_previsto, para: t.fim, data: true })
    if (s.cancelado) mudou.push({ campo: 'situação', de: 'cancelado', para: 'ativo' })
    if (mudou.length) alterados.push({ tarefa: t, servico: s, mudou })
  }
  const cancelados = atuais.filter((s) => !s.cancelado && !lidos.has(s.uid_project))
  return {
    primeira: atuais.length === 0,
    temBaseNoProject: lido.tarefas.some((t) => t.inicio_base),
    totais: {
      tarefas: lido.tarefas.length,
      servicos: lido.tarefas.filter((t) => !t.resumo).length,
      resumos: lido.tarefas.filter((t) => t.resumo).length,
      ligacoes: lido.ligacoes.length,
    },
    novos, alterados, cancelados,
  }
}

// O que vai para o banco (função importar_cronograma). etapaDoTopo: { uid do nível 1 → etapa_id }.
// usarBaseDoProject: na primeira importação, linha de base do Project; senão, as datas atuais.
export function montarCarga(lido, etapaDoTopo, usarBaseDoProject) {
  return {
    tarefas: lido.tarefas.map((t) => {
      const ini = usarBaseDoProject && t.inicio_base ? t.inicio_base : t.inicio
      const fim = usarBaseDoProject && t.fim_base ? t.fim_base : t.fim
      return {
        uid: t.uid, pai_uid: t.pai_uid, etapa_entrega_id: etapaDoTopo[t.topo_uid] ?? null,
        codigo_eap: t.eap, nome: t.nome, nivel: t.nivel, e_resumo: t.resumo,
        inicio_previsto: t.inicio, fim_previsto: t.fim, duracao_dias: diasEntre(t.inicio, t.fim) + 1,
        inicio_base: ini, fim_base: fim,
      }
    }),
    ligacoes: lido.ligacoes,
  }
}
