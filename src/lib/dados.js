// CAMADA DE DADOS — a única porta de entrada dos dados.
// Nenhuma tela lê o mock nem chama o Supabase direto: tudo passa por aqui.
// Toda função devolve { data, erro }. A obra atual é injetada aqui dentro:
// as telas nunca passam nem filtram obra_id.
//
// Hoje (USAR_MOCK = true) o miolo lê src/lib/mockData.js. Na etapa do banco,
// só o miolo destas funções muda; nenhuma tela muda.

import { USAR_MOCK, HOJE_MOCK } from './config.js'
import { paraIso, mesesEntre } from './datas.js'
import { daObra } from './obra.js'
import { resumoAvanco, curvaS } from './avanco.js'
import { servicosAtrasados } from './alertas.js'
import { pode } from './permissoes.js'
import { OCORRENCIA_ABERTA } from './vocabulario.js'
import { resultadoBaixa } from './pcp.js'
import * as mock from './mockData.js'

let obraAtualId = null
let usuarioAtual = null

export function definirObraAtual(id) { obraAtualId = id }
export function definirUsuario(profile) { usuarioAtual = profile }

export function hoje() {
  return USAR_MOCK ? HOJE_MOCK : paraIso(new Date())
}

// Hora do aparelho (a saudação usa a hora real mesmo no modo exemplo).
export function horaAgora() {
  return new Date().getHours()
}

const ok = (data) => Promise.resolve({ data: structuredClone(data), erro: null })
const falha = (erro) => Promise.resolve({ data: null, erro })
const role = () => usuarioAtual?.role

// O que um perfil não pode ver não sai da camada (no banco, isso vira visão sem a coluna).
function semCusto(lista) {
  return pode(role(), 'verCusto') ? lista : lista.map(({ custo_orcado: _c, ...resto }) => resto)
}
function semPremio(lista) {
  return pode(role(), 'verPremio') ? lista : lista.map(({ valor_premio: _v, ...resto }) => resto)
}

// ── Login (modo exemplo) ─────────────────────────────────────────────────
export const listarUsuariosDeExemplo = () => ok(mock.profiles)

// ── Obra ─────────────────────────────────────────────────────────────────
export function listarMinhasObras() {
  const u = usuarioAtual
  if (!u) return ok([])
  if (u.role === 'Engenheiro') return ok(mock.obras)
  const ids = mock.obra_usuarios.filter((x) => x.profile_id === u.id).map((x) => x.obra_id)
  return ok(mock.obras.filter((o) => ids.includes(o.id)))
}

// ── Capa: foto da obra e logos (todos os perfis veem) ───────────────────
// No modo exemplo as imagens ficam também no navegador (localStorage), para
// sobreviver ao recarregar. A chave leva o id da obra. No banco, vão para o Storage.
const CHAVE = { foto_obra: (id) => `minhaobra:obra:${id}:foto_obra`, logo_cliente: (id) => `minhaobra:obra:${id}:logo_cliente`, logo_construtora: () => 'minhaobra:config:logo_construtora' }
const CHAVE_NOME_CONSTRUTORA = 'minhaobra:config:nome_construtora'

// globalThis (e não window): o teste em Node troca o localStorage por um falso.
function lerGuardado(chave) {
  try { return globalThis.localStorage?.getItem(chave) ?? null } catch { return null }
}
function guardar(chave, valor) {
  try {
    if (valor === null) globalThis.localStorage.removeItem(chave)
    else globalThis.localStorage.setItem(chave, valor)
    return null
  } catch {
    return 'Não coube no navegador.'
  }
}

if (USAR_MOCK) {
  for (const o of mock.obras) {
    o.foto_obra = lerGuardado(CHAVE.foto_obra(o.id)) || o.foto_obra
    o.logo_cliente = lerGuardado(CHAVE.logo_cliente(o.id)) || o.logo_cliente
  }
  mock.config.logo_construtora = lerGuardado(CHAVE.logo_construtora()) || mock.config.logo_construtora
  mock.config.nome_construtora = lerGuardado(CHAVE_NOME_CONSTRUTORA) || mock.config.nome_construtora
}

export function buscarCapa() {
  const o = mock.obras.find((x) => x.id === obraAtualId)
  if (!o) return falha('Obra não encontrada.')
  return ok({
    obra: o.nome, local: `${o.cidade}/${o.uf}`, cliente: o.cliente, foto_obra: o.foto_obra, logo_cliente: o.logo_cliente,
    construtora: mock.config.nome_construtora, logo_construtora: mock.config.logo_construtora,
  })
}

// tipo: foto_obra | logo_cliente | logo_construtora. valor: imagem já comprimida, ou null para remover.
export function salvarImagem(tipo, valor) {
  if (!pode(role(), 'gerirCadastros')) return falha('Seu perfil não troca as imagens.')
  if (!Object.hasOwn(CHAVE, tipo)) return falha('Imagem desconhecida.')
  const erro = guardar(CHAVE[tipo](obraAtualId), valor)
  if (erro) return falha(`${erro} Tente uma imagem menor.`)
  if (tipo === 'logo_construtora') mock.config.logo_construtora = valor
  else mock.obras.find((x) => x.id === obraAtualId)[tipo] = valor
  return ok(true)
}

export function salvarNomeConstrutora(nome) {
  if (!pode(role(), 'gerirCadastros')) return falha('Seu perfil não altera a construtora.')
  if (!nome?.trim()) return falha('Informe o nome da construtora.')
  const erro = guardar(CHAVE_NOME_CONSTRUTORA, nome.trim())
  if (erro) return falha(erro)
  mock.config.nome_construtora = nome.trim()
  return ok(true)
}

export const listarEtapas = () =>
  ok(daObra(mock.etapas_entrega, obraAtualId).sort((a, b) => a.ordem - b.ordem))

// ── Cronograma ───────────────────────────────────────────────────────────
export function listarServicos({ incluirCancelados = false } = {}) {
  let lista = daObra(mock.servicos, obraAtualId)
  if (!incluirCancelados) lista = lista.filter((s) => !s.cancelado)
  lista.sort((a, b) => a.codigo_eap.localeCompare(b.codigo_eap, 'pt-BR', { numeric: true }))
  return ok(semCusto(lista))
}

// Avanço da obra só em percentuais — é o que o Cliente recebe (no banco, uma função
// que pondera pelo custo por dentro e não devolve custo nenhum).
export function avancoDaObra() {
  const obra = mock.obras.find((o) => o.id === obraAtualId)
  if (!obra) return falha('Obra não encontrada.')
  const servicos = daObra(mock.servicos, obraAtualId).filter((s) => !s.cancelado)
  const producoes = daObra(mock.producoes, obraAtualId)
  const etapas = daObra(mock.etapas_entrega, obraAtualId).sort((a, b) => a.ordem - b.ordem)
  const dia = hoje()
  const temCronograma = servicos.some((s) => !s.e_resumo)
  return ok({
    temCronograma,
    geral: resumoAvanco(servicos, dia),
    etapas: etapas.map((e) => ({ id: e.id, nome: e.nome, data_entrega_contratual: e.data_entrega_contratual, ...resumoAvanco(servicos, dia, e.id) })),
    curva: temCronograma ? curvaS(servicos, producoes, mesesEntre(obra.data_inicio, obra.data_fim_contrato), dia) : [],
    atrasados: servicosAtrasados(servicos, dia),
  })
}

export function buscarServico(id) {
  const s = daObra(mock.servicos, obraAtualId).find((x) => x.id === id)
  return s ? ok(semCusto([s])[0]) : falha('Serviço não encontrado.')
}

export function listarDependencias() {
  const ids = new Set(daObra(mock.servicos, obraAtualId).map((s) => s.id))
  return ok(mock.servico_dependencias.filter((d) => ids.has(d.servico_id)))
}

export function listarProducoes({ servicoId } = {}) {
  let lista = daObra(mock.producoes, obraAtualId)
  if (servicoId) lista = lista.filter((p) => p.servico_id === servicoId)
  return ok(lista.sort((a, b) => b.data.localeCompare(a.data)))
}

export const listarRestricoes = () => ok(daObra(mock.restricoes, obraAtualId))

// ── PCP ──────────────────────────────────────────────────────────────────
export function listarAtividades({ de, ate } = {}) {
  let lista = daObra(mock.pcp_atividades, obraAtualId)
  if (de) lista = lista.filter((a) => a.data_prevista >= de)
  if (ate) lista = lista.filter((a) => a.data_prevista <= ate)
  return ok(lista.sort((a, b) => a.data_prevista.localeCompare(b.data_prevista) || a.id - b.id))
}

// Baixa: decide o status pela regra (lib/pcp.js), grava a produção e soma no serviço e no pacote.
export function darBaixa(atividadeId, { executada, motivo }) {
  if (!pode(role(), 'darBaixa')) return falha('Seu perfil não dá baixa.')
  const a = daObra(mock.pcp_atividades, obraAtualId).find((x) => x.id === atividadeId)
  if (!a) return falha('Atividade não encontrada.')
  const r = resultadoBaixa(a.quantidade_planejada, executada, motivo)
  if (r.erro) return falha(r.erro)
  desfazerProducao(a)
  Object.assign(a, {
    status: r.status, quantidade_executada: Number(executada), motivo_nao_conclusao: r.motivo,
    baixa_por: usuarioAtual.id, baixa_em: new Date().toISOString(),
  })
  if (Number(executada) > 0) {
    mock.producoes.push({
      id: Math.max(0, ...mock.producoes.map((p) => p.id)) + 1, obra_id: a.obra_id, data: a.data_prevista,
      servico_id: a.servico_id, quantidade: Number(executada), origem: 'PCP', pcp_atividade_id: a.id,
      pacote_id: a.pacote_id, motivo_ajuste: null, lancado_por: usuarioAtual.id,
    })
    somar(a, Number(executada))
  }
  return ok(a)
}

export function desfazerBaixa(atividadeId) {
  const a = daObra(mock.pcp_atividades, obraAtualId).find((x) => x.id === atividadeId)
  if (!a) return falha('Atividade não encontrada.')
  desfazerProducao(a)
  Object.assign(a, { status: 'Planejada', quantidade_executada: null, motivo_nao_conclusao: null, baixa_por: null, baixa_em: null })
  return ok(a)
}

function desfazerProducao(a) {
  const i = mock.producoes.findIndex((p) => p.pcp_atividade_id === a.id)
  if (i < 0) return
  somar(a, -mock.producoes[i].quantidade)
  mock.producoes.splice(i, 1)
}

function somar(a, q) {
  const s = mock.servicos.find((x) => x.id === a.servico_id)
  if (s) s.quantidade_executada = Math.round((s.quantidade_executada + q) * 1000) / 1000
  const p = a.pacote_id && mock.pacotes.find((x) => x.id === a.pacote_id)
  if (p) p.quantidade_executada = Math.round((p.quantidade_executada + q) * 1000) / 1000
}

// ── Pacotes ──────────────────────────────────────────────────────────────
export const listarPacotes = () => ok(semPremio(daObra(mock.pacotes, obraAtualId)))

export function buscarPacote(id) {
  const p = daObra(mock.pacotes, obraAtualId).find((x) => x.id === id)
  return p ? ok(semPremio([p])[0]) : falha('Pacote não encontrado.')
}

export function listarPremios({ pacoteId } = {}) {
  if (!pode(role(), 'verPremio')) return ok([])
  const ids = new Set(daObra(mock.pacotes, obraAtualId).map((p) => p.id))
  let lista = mock.premios.filter((p) => ids.has(p.pacote_id))
  if (pacoteId) lista = lista.filter((p) => p.pacote_id === pacoteId)
  return ok(lista)
}

// ── Equipe e efetivo ─────────────────────────────────────────────────────
export function listarFuncionarios({ soAtivos = false } = {}) {
  let lista = daObra(mock.funcionarios, obraAtualId)
  if (soAtivos) lista = lista.filter((f) => f.ativo)
  return ok(lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
}

export function listarPresencas({ data, de, ate, pacoteId } = {}) {
  let lista = daObra(mock.presencas, obraAtualId)
  if (data) lista = lista.filter((p) => p.data === data)
  if (de) lista = lista.filter((p) => p.data >= de)
  if (ate) lista = lista.filter((p) => p.data <= ate)
  if (pacoteId) lista = lista.filter((p) => p.pacote_id === pacoteId)
  return ok(lista)
}

// Grava o efetivo de um dia inteiro: uma linha por funcionário.
export function salvarEfetivo(data, linhas) {
  if (!pode(role(), 'lancarEfetivo')) return falha('Seu perfil não lança efetivo.')
  for (const l of linhas) {
    const existente = mock.presencas.find((p) => p.obra_id === obraAtualId && p.data === data && p.funcionario_id === l.funcionario_id)
    const pacote_id = l.situacao === 'Presente' ? l.pacote_id || null : null
    if (existente) Object.assign(existente, { situacao: l.situacao, pacote_id, lancado_por: usuarioAtual.id })
    else mock.presencas.push({ id: Math.max(0, ...mock.presencas.map((p) => p.id)) + 1, obra_id: obraAtualId, data, funcionario_id: l.funcionario_id, situacao: l.situacao, pacote_id, lancado_por: usuarioAtual.id })
  }
  return ok(linhas.length)
}

// ── Ocorrências ──────────────────────────────────────────────────────────
export function listarOcorrencias() {
  let lista = daObra(mock.ocorrencias, obraAtualId).sort((a, b) => b.aberta_em.localeCompare(a.aberta_em))
  // O cliente acompanha status, prazo e resposta; não vê o responsável interno.
  if (role() === 'Cliente') lista = lista.map(({ responsavel_id: _r, ...o }) => o)
  return ok(lista)
}

export function buscarOcorrencia(id) {
  return listarOcorrencias().then(({ data }) => {
    const o = data.find((x) => x.id === id)
    return o ? { data: o, erro: null } : { data: null, erro: 'Ocorrência não encontrada.' }
  })
}

export function criarOcorrencia({ titulo, local, etapa_entrega_id, descricao }) {
  if (!pode(role(), 'abrirOcorrencia')) return falha('Seu perfil não abre ocorrência.')
  if (!titulo?.trim() || !local?.trim() || !descricao?.trim()) return falha('Preencha título, local e descrição.')
  const daObraAtual = daObra(mock.ocorrencias, obraAtualId)
  const nova = {
    id: Math.max(0, ...mock.ocorrencias.map((o) => o.id)) + 1, obra_id: obraAtualId,
    numero: Math.max(0, ...daObraAtual.map((o) => o.numero)) + 1, titulo: titulo.trim(), local: local.trim(),
    etapa_entrega_id: etapa_entrega_id || null, descricao: descricao.trim(), status: OCORRENCIA_ABERTA, aberta_por: usuarioAtual.id,
    responsavel_id: null, prazo: null, resposta: null, aberta_em: hoje(), respondida_em: null, fechada_em: null,
  }
  mock.ocorrencias.push(nova)
  return ok(nova)
}

export const listarPessoas = () => ok(mock.profiles.map(({ id, nome, role: r }) => ({ id, nome, role: r })))

export function listarUsuarios() {
  if (!pode(role(), 'gerirUsuarios')) return ok([])
  return ok(mock.profiles.map((p) => ({ ...p, obras: mock.obra_usuarios.filter((x) => x.profile_id === p.id).map((x) => x.obra_id) })))
}
