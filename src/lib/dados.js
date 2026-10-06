// CAMADA DE DADOS — a única porta do banco (Supabase).
// Nenhuma tela chama o Supabase direto: tudo passa por aqui.
// Toda função devolve { data, erro }. A obra atual é injetada aqui dentro:
// as telas nunca passam nem filtram obra_id.
// Dinheiro: Engenheiro e Coordenador leem as tabelas; Mestre, Cliente e Técnico leem
// pelas funções do banco que não devolvem custo nem prêmio (supabase/migrations/…-02-acesso.sql).

import { supabase } from './supabase.js'
import { paraIso, mesesEntre } from './datas.js'
import { pode } from './permissoes.js'
import { resultadoBaixa } from './pcp.js'
import { calcularCronograma } from './cronograma.js'
import { premioReal, valoresDoPacote } from './premio.js'
import { resumoAvanco, curvaS } from './avanco.js'
import { servicosAtrasados } from './alertas.js'
import { tipoDeImagemValido } from './imagem.js'
import { ORIGEM_PRODUCAO, PACOTE, STATUS_PCP } from './vocabulario.js'

let obraAtualId = null
let usuarioAtual = null

export function definirObraAtual(id) { obraAtualId = id }
export function definirUsuario(profile) { usuarioAtual = profile }

export const hoje = () => paraIso(new Date())
export const agora = () => new Date().toISOString()
export const horaAgora = () => new Date().getHours()

const role = () => usuarioAtual?.role
const gestao = () => pode(role(), 'verCusto')
const falha = (erro) => ({ data: null, erro })

// Mensagem que a pessoa entende. As exceções das funções do banco já vêm em português.
async function q(consulta) {
  const { data, error } = await consulta
  if (!error) return { data, erro: null }
  if (error.code === 'P0001') return falha(error.message)
  if (error.code === '42501') return falha('Seu perfil não pode fazer isso.')
  if (error.code === '23503') return falha('Isso está ligado a outros registros e não pode ser excluído.')
  return falha('Não foi possível concluir. Verifique a conexão e tente de novo.')
}

// ── Login ────────────────────────────────────────────────────────────────
export const entrar = (email, senha) => q(supabase.auth.signInWithPassword({ email, password: senha }))
export const criarConta = (nome, email, senha) => q(supabase.auth.signUp({ email, password: senha, options: { data: { nome } } }))
export const sair = () => q(supabase.auth.signOut())
export const sessaoAtual = () => supabase.auth.getSession().then(({ data }) => data.session)
export const aoMudarSessao = (fn) => supabase.auth.onAuthStateChange((_evento, sessao) => fn(sessao)).data.subscription

export async function buscarMeuPerfil(authUid) {
  return q(supabase.from('profiles').select('*').eq('auth_uid', authUid).single())
}

// ── Obra e capa ──────────────────────────────────────────────────────────
export const listarMinhasObras = () => q(supabase.from('obras').select('*').order('nome'))

export async function buscarCapa() {
  const [o, c] = await Promise.all([
    q(supabase.from('obras').select('*').eq('id', obraAtualId).single()),
    q(supabase.from('config').select('*').eq('id', 1).single()),
  ])
  if (o.erro || c.erro) return falha(o.erro || c.erro)
  return {
    data: {
      obra: o.data.nome, local: `${o.data.cidade}/${o.data.uf}`, cliente: o.data.cliente,
      foto_obra: o.data.foto_obra, logo_cliente: o.data.logo_cliente,
      construtora: c.data.nome_construtora, logo_construtora: c.data.logo_construtora,
    },
    erro: null,
  }
}

// tipo: foto_obra | logo_cliente | logo_construtora. imagem: data URL já comprimida, ou null para remover.
export async function salvarImagem(tipo, imagem) {
  if (!pode(role(), 'gerirCadastros')) return falha('Seu perfil não troca as imagens.')
  if (!tipoDeImagemValido(tipo)) return falha('Imagem desconhecida.')
  let url = null
  if (imagem) {
    const blob = await (await fetch(imagem)).blob()
    const extensao = blob.type === 'image/png' ? 'png' : 'jpg'
    const pasta = tipo === 'logo_construtora' ? 'config' : `obras/${obraAtualId}`
    // Nome novo a cada envio: o navegador não fica mostrando a imagem antiga guardada.
    const caminho = `${pasta}/${tipo}-${Date.now()}.${extensao}`
    const envio = await q(supabase.storage.from('capa').upload(caminho, blob, { contentType: blob.type }))
    if (envio.erro) return falha('Não foi possível enviar a imagem. Tente de novo.')
    url = supabase.storage.from('capa').getPublicUrl(caminho).data.publicUrl
  }
  // ponytail: a imagem antiga fica no Storage ao trocar/remover; limpar quando o espaço pesar.
  return tipo === 'logo_construtora'
    ? q(supabase.from('config').update({ logo_construtora: url }).eq('id', 1))
    : q(supabase.from('obras').update({ [tipo]: url }).eq('id', obraAtualId))
}

export async function salvarNomeConstrutora(nome) {
  if (!pode(role(), 'gerirCadastros')) return falha('Seu perfil não altera a construtora.')
  if (!nome?.trim()) return falha('Informe o nome da construtora.')
  return q(supabase.from('config').update({ nome_construtora: nome.trim() }).eq('id', 1))
}

export const listarEtapas = () =>
  q(supabase.from('etapas_entrega').select('*').eq('obra_id', obraAtualId).order('ordem'))

// ── Cronograma ───────────────────────────────────────────────────────────
const porEap = (a, b) => a.codigo_eap.localeCompare(b.codigo_eap, 'pt-BR', { numeric: true })

export async function listarServicos({ incluirCancelados = false } = {}) {
  const r = gestao()
    ? await q(supabase.from('servicos').select('*').eq('obra_id', obraAtualId))
    : await q(supabase.rpc('servicos_sem_custo', { p_obra: obraAtualId }))
  if (r.erro) return r
  const lista = r.data.filter((s) => incluirCancelados || !s.cancelado).sort(porEap)
  // Quem não vê custo recebe só o peso relativo; ele não sai daqui para as telas.
  return { data: lista.map(({ peso: _p, ...s }) => s), erro: null }
}

export async function buscarServico(id) {
  const r = await listarServicos({ incluirCancelados: true })
  if (r.erro) return r
  const s = r.data.find((x) => x.id === id)
  return s ? { data: s, erro: null } : falha('Serviço não encontrado.')
}

export async function listarDependencias() {
  const [s, d] = await Promise.all([listarServicos({ incluirCancelados: true }), q(supabase.from('servico_dependencias').select('*'))])
  if (s.erro || d.erro) return falha(s.erro || d.erro)
  const ids = new Set(s.data.map((x) => x.id))
  return { data: d.data.filter((x) => ids.has(x.servico_id)), erro: null }
}

export function listarProducoes({ servicoId } = {}) {
  let c = supabase.from('producoes').select('*').eq('obra_id', obraAtualId)
  if (servicoId) c = c.eq('servico_id', servicoId)
  return q(c.order('data', { ascending: false }))
}

export const listarRestricoes = () => q(supabase.from('restricoes').select('*').eq('obra_id', obraAtualId))

// ── Cronograma: edição (Engenheiro e Coordenador) ────────────────────────
const recusa = (acao, msg) => (pode(role(), acao) ? null : Promise.resolve(falha(msg)))

// carga: montarCarga() de lib/importacao.js. Grava tudo de uma vez (função importar_cronograma).
export const importarCronograma = (carga) => recusa('importarCronograma', 'Seu perfil não importa cronograma.')
  ?? q(supabase.rpc('importar_cronograma', { p_obra: obraAtualId, p_tarefas: carga.tarefas, p_ligacoes: carga.ligacoes }))

// Recalcula caminho crítico, folga e atrasos (lib/cronograma.js) e grava.
// Com problema (ciclo, serviço sem data), nada é gravado: devolve { problemas } para a tela listar.
export async function recalcularCronograma() {
  if (!pode(role(), 'editarCronograma')) return falha('Seu perfil não recalcula o cronograma.')
  const [s, d] = await Promise.all([listarServicos(), listarDependencias()])
  if (s.erro || d.erro) return falha(s.erro || d.erro)
  const r = calcularCronograma(s.data, d.data, hoje())
  if (r.problemas) return { data: r, erro: null }
  const g = await q(supabase.rpc('gravar_calculo', { p_obra: obraAtualId, p_linhas: r.linhas }))
  return g.erro ? g : { data: r, erro: null }
}

// linhas: custosAlterados() de lib/cronograma.js.
export const salvarCustos = (linhas) => recusa('editarCronograma', 'Seu perfil não edita custos.')
  ?? q(supabase.rpc('salvar_custos', { p_obra: obraAtualId, p_linhas: linhas }))

// Custo orçado e/ou local, no detalhe do serviço (campo ausente não muda).
export function editarServico(id, { custo_orcado, local }) {
  if (!pode(role(), 'editarCronograma')) return Promise.resolve(falha('Seu perfil não edita serviços.'))
  const campos = {}
  if (custo_orcado !== undefined) campos.custo_orcado = custo_orcado
  if (local !== undefined) campos.local = local.trim() || null
  return q(supabase.from('servicos').update(campos).eq('id', id).eq('obra_id', obraAtualId))
}

// registro: validarAjuste() de lib/cronograma.js.
export const lancarAjuste = (registro) => recusa('lancarAjuste', 'Seu perfil não lança ajuste.')
  ?? q(supabase.from('producoes').insert({ ...registro, obra_id: obraAtualId, origem: ORIGEM_PRODUCAO.AJUSTE, lancado_por: usuarioAtual.id }))

export const trocarUnidade = (servicoId, unidade, quantidade) => recusa('editarCronograma', 'Seu perfil não troca a unidade.')
  ?? q(supabase.rpc('trocar_unidade', { p_servico: servicoId, p_unidade: unidade, p_quantidade: quantidade }))

// ── Restrições (plano de 3 meses) ────────────────────────────────────────
// registro: validarRestricao() / validarRemocao() de lib/pcp.js.
export const criarRestricao = (servicoId, registro) => recusa('editarPlanejamento', 'Seu perfil não cria restrição.')
  ?? q(supabase.from('restricoes').insert({ ...registro, obra_id: obraAtualId, servico_id: servicoId }))

export const editarRestricao = (id, registro) => recusa('editarPlanejamento', 'Seu perfil não edita restrição.')
  ?? q(supabase.from('restricoes').update(registro).eq('id', id).eq('obra_id', obraAtualId))

// Avanço da obra só em percentuais (tela do Cliente). Quem não vê custo pondera pelo peso
// relativo que o banco calcula; Engenheiro e Coordenador, pelo custo.
export async function avancoDaObra() {
  const [o, e, s, p] = await Promise.all([
    q(supabase.from('obras').select('data_inicio, data_fim_contrato').eq('id', obraAtualId).single()),
    listarEtapas(),
    gestao()
      ? q(supabase.from('servicos').select('*').eq('obra_id', obraAtualId))
      : q(supabase.rpc('servicos_sem_custo', { p_obra: obraAtualId })),
    q(supabase.rpc('producoes_resumo', { p_obra: obraAtualId })),
  ])
  const erro = [o, e, s, p].find((x) => x.erro)?.erro
  if (erro) return falha(erro)
  const servicos = s.data.filter((x) => !x.cancelado).map((x) => ('peso' in x ? { ...x, custo_orcado: x.peso } : x))
  const dia = hoje()
  return {
    data: {
      temCronograma: servicos.some((x) => !x.e_resumo),
      geral: resumoAvanco(servicos, dia),
      etapas: e.data.map((et) => ({ id: et.id, nome: et.nome, data_entrega_contratual: et.data_entrega_contratual, ...resumoAvanco(servicos, dia, et.id) })),
      curva: curvaS(servicos, p.data, mesesEntre(o.data.data_inicio, o.data.data_fim_contrato), dia),
      atrasados: servicosAtrasados(servicos, dia),
    },
    erro: null,
  }
}

// ── PCP ──────────────────────────────────────────────────────────────────
export function listarAtividades({ de, ate } = {}) {
  let c = supabase.from('pcp_atividades').select('*').eq('obra_id', obraAtualId)
  if (de) c = c.gte('data_prevista', de)
  if (ate) c = c.lte('data_prevista', ate)
  return q(c.order('data_prevista').order('id'))
}

// A regra da baixa roda aqui (mensagem rápida) e de novo no banco (dar_baixa), que grava a produção.
export async function darBaixa(atividadeId, { executada, motivo, equipe }) {
  if (!pode(role(), 'darBaixa')) return falha('Seu perfil não dá baixa.')
  const { data: a } = await q(supabase.from('pcp_atividades').select('quantidade_planejada').eq('id', atividadeId).single())
  if (a) {
    const r = resultadoBaixa(a.quantidade_planejada, executada, motivo, equipe)
    if (r.erro) return falha(r.erro)
  }
  return q(supabase.rpc('dar_baixa', { p_atividade: atividadeId, p_executada: Number(executada), p_motivo: motivo || null, p_equipe: equipe?.trim() || null }))
}

export const desfazerBaixa = (atividadeId) => q(supabase.rpc('desfazer_baixa', { p_atividade: atividadeId }))

// Montar a semana (Engenheiro e Coordenador). registros: validarAtividade(), distribuirNaSemana()
// ou copiarPendentes() de lib/pcp.js.
export const criarAtividades = (registros) => recusa('editarPlanejamento', 'Seu perfil não planeja a semana.')
  ?? q(supabase.from('pcp_atividades').insert(registros.map((r) => ({ ...r, obra_id: obraAtualId }))))

// Editar e excluir só enquanto Planejada; sem linha alterada = já recebeu baixa.
export async function editarAtividade(id, registro) {
  if (!pode(role(), 'editarPlanejamento')) return falha('Seu perfil não planeja a semana.')
  const r = await q(supabase.from('pcp_atividades').update(registro).eq('id', id).eq('obra_id', obraAtualId).eq('status', STATUS_PCP.PLANEJADA).select('id'))
  return r.erro || r.data.length ? r : falha('Essa atividade já recebeu baixa e não pode ser editada.')
}

export async function excluirAtividade(id) {
  if (!pode(role(), 'editarPlanejamento')) return falha('Seu perfil não planeja a semana.')
  const r = await q(supabase.from('pcp_atividades').delete().eq('id', id).eq('obra_id', obraAtualId).eq('status', STATUS_PCP.PLANEJADA).select('id'))
  return r.erro || r.data.length ? r : falha('Essa atividade já recebeu baixa e não pode ser excluída.')
}

// ── Pacotes ──────────────────────────────────────────────────────────────
// Cada pacote vem com os seus serviços (meta e executado; MO, valor_orcado e valor_premio — o que será pago,
// MO orçada × % — só para quem vê dinheiro)
// e os ids dos colaboradores (entradas: { id: data } de quem entrou depois do início). O Mestre lê pelas funções do
// banco que não devolvem MO.
export async function listarPacotes() {
  const [p, s, c] = await Promise.all([
    gestao() ? q(supabase.from('pacotes').select('*').eq('obra_id', obraAtualId)) : q(supabase.rpc('pacotes_sem_premio', { p_obra: obraAtualId })),
    gestao() ? q(supabase.from('pacote_servicos').select('*').eq('obra_id', obraAtualId)) : q(supabase.rpc('pacote_servicos_sem_mo', { p_obra: obraAtualId })),
    q(supabase.from('pacote_colaboradores').select('pacote_id, funcionario_id, entrou_em, saiu_em, pct_saida').eq('obra_id', obraAtualId)),
  ])
  const erro = [p, s, c].find((x) => x.erro)?.erro
  if (erro) return falha(erro)
  return {
    data: p.data.map((x) => {
      const servicos = s.data.filter((y) => y.pacote_id === x.id)
      const colab = c.data.filter((y) => y.pacote_id === x.id)
      return {
        ...x, servicos, colaboradores: colab.map((y) => y.funcionario_id),
        entradas: Object.fromEntries(colab.filter((y) => y.entrou_em).map((y) => [y.funcionario_id, y.entrou_em])),
        saidas: Object.fromEntries(colab.filter((y) => y.saiu_em).map((y) => [y.funcionario_id, { saiu_em: y.saiu_em, pct_saida: Number(y.pct_saida) }])),
        ...(gestao() ? { valor_orcado: valoresDoPacote({ servicos }).total, valor_premio: premioReal({ ...x, servicos }).total } : {}),
      }
    }),
    erro: null,
  }
}

// Novo ou editado, com serviços e colaboradores, numa transação (função salvar_pacote). id null = novo.
// v: o que validarPacote() de lib/premio.js devolve. Devolve { data: id do pacote }.
export const salvarPacote = (id, v) => recusa('gerirPacotes', 'Seu perfil não salva pacote.')
  ?? q(supabase.rpc('salvar_pacote', { p_obra: obraAtualId, p_id: id ?? null, p_pacote: v.registro, p_servicos: v.itens, p_colaboradores: v.colaboradores }))

// Pergunta do dia 21: o pacote continua no período seguinte? "Sim" é a renovação (salvarPacote com
// renovado_de_id marca sozinho); aqui fica o "Não".
export const marcarRenovacao = (id, continua) => recusa('gerirPacotes', 'Seu perfil não decide a renovação.')
  ?? q(supabase.rpc('marcar_renovacao', { p_pacote: id, p_continua: continua }))

// Pausar o pacote inteiro com o problema (motivo) e a data; retomar; levar colaboradores para outro pacote a partir
// de uma data (quem entra depois do início recebe proporcional aos dias). Só Engenheiro e Coordenador.
// troca: validarRemanejo() de lib/premio.js ou null — vai na mesma transação da pausa.
export const pausarPacote = (id, motivo, data, troca = null) => recusa('pausarPacote', 'Seu perfil não pausa pacote.')
  ?? q(supabase.rpc('pausar_pacote', {
    p_pacote: id, p_motivo: motivo, p_data: data,
    p_destino: troca?.destino ?? null, p_funcionarios: troca?.colaboradores ?? null, p_entrada: troca?.data ?? null,
  }))
export const retomarPacote = (id) => recusa('pausarPacote', 'Seu perfil não retoma pacote.')
  ?? q(supabase.rpc('retomar_pacote', { p_pacote: id }))
// origemId: o pacote pausado de onde a equipe sai (quem sai leva o % da meta atingida).
export const remanejarColaboradores = (destinoId, funcionarios, data, origemId) => recusa('pausarPacote', 'Seu perfil não troca colaborador de pacote.')
  ?? q(supabase.rpc('remanejar_colaboradores', { p_destino: destinoId, p_funcionarios: funcionarios, p_data: data, p_origem: origemId }))

// Só o status (Mudar status); excluir só o Engenheiro e só Planejado.
export async function editarPacote(id, campos) {
  if (!pode(role(), 'gerirPacotes')) return falha('Seu perfil não edita pacote.')
  const r = await q(supabase.from('pacotes').update(campos).eq('id', id).eq('obra_id', obraAtualId).is('fechado_em', null).select('id'))
  return r.erro || r.data.length ? r : falha('Pacote fechado na folha não pode ser editado.')
}

export async function excluirPacote(id) {
  if (!pode(role(), 'apagar')) return falha('Só o engenheiro exclui pacote.')
  const r = await q(supabase.from('pacotes').delete().eq('id', id).eq('obra_id', obraAtualId).eq('status', PACOTE.PLANEJADO).select('id'))
  return r.erro || r.data.length ? r : falha('Só dá para excluir pacote Planejado.')
}

// Fechamento da folha: o banco refaz a conta do prêmio e grava tudo de uma vez (função fechar_pacotes).
// motivos: { [id do pacote]: causa } para os que não bateram a meta.
export const fecharPacotes = (data, motivos) => recusa('fecharFolha', 'Seu perfil não fecha pacotes.')
  ?? q(supabase.rpc('fechar_pacotes', { p_obra: obraAtualId, p_data: data, p_motivos: motivos }))

// Ajuste do prêmio por funcionário e data da folha (só Engenheiro e Coordenador). registro: validarAjustePremio().
export const listarAjustesPremio = () => (pode(role(), 'verPremio')
  ? q(supabase.from('premio_ajustes').select('*').eq('obra_id', obraAtualId).order('created_at'))
  : Promise.resolve({ data: [], erro: null }))
export const criarAjustePremio = (registro) => recusa('gerirPacotes', 'Seu perfil não lança ajuste de prêmio.')
  ?? q(supabase.from('premio_ajustes').insert({ ...registro, obra_id: obraAtualId, criado_por: usuarioAtual.id }))
export const excluirAjustePremio = (id) => recusa('gerirPacotes', 'Seu perfil não exclui ajuste de prêmio.')
  ?? q(supabase.from('premio_ajustes').delete().eq('id', id).eq('obra_id', obraAtualId))

export async function listarPremios({ pacoteId } = {}) {
  if (!pode(role(), 'verPremio')) return { data: [], erro: null }
  const p = await listarPacotes()
  if (p.erro) return p
  const ids = p.data.map((x) => x.id).filter((id) => !pacoteId || id === pacoteId)
  return q(supabase.from('premios').select('*').in('pacote_id', ids))
}

// ── Equipe e efetivo ─────────────────────────────────────────────────────
export function listarFuncionarios({ soAtivos = false } = {}) {
  let c = supabase.from('funcionarios').select('*').eq('obra_id', obraAtualId)
  if (soAtivos) c = c.eq('ativo', true)
  return q(c.order('nome'))
}

export function listarPresencas({ data, de, ate, pacoteId } = {}) {
  let c = supabase.from('presencas').select('*').eq('obra_id', obraAtualId)
  if (data) c = c.eq('data', data)
  if (de) c = c.gte('data', de)
  if (ate) c = c.lte('data', ate)
  if (pacoteId) c = c.eq('pacote_id', pacoteId)
  return q(c)
}

// Grava o efetivo de um dia inteiro: uma linha por funcionário (atualiza se já existir).
export function salvarEfetivo(data, linhas) {
  if (!pode(role(), 'lancarEfetivo')) return Promise.resolve(falha('Seu perfil não lança efetivo.'))
  const registros = linhas.map((l) => ({
    obra_id: obraAtualId, data, funcionario_id: l.funcionario_id, situacao: l.situacao,
    pacote_id: l.situacao === 'Presente' ? l.pacote_id || null : null, lancado_por: usuarioAtual.id,
  }))
  return q(supabase.from('presencas').upsert(registros, { onConflict: 'funcionario_id,data' }))
}

// ── Ocorrências ──────────────────────────────────────────────────────────
export async function listarOcorrencias() {
  const r = await q(supabase.from('ocorrencias').select('*').eq('obra_id', obraAtualId).order('aberta_em', { ascending: false }))
  if (r.erro || role() !== 'Cliente') return r
  // O cliente acompanha status, prazo e resposta; não vê o responsável interno.
  return { data: r.data.map(({ responsavel_id: _r, ...o }) => o), erro: null }
}

export async function buscarOcorrencia(id) {
  const r = await listarOcorrencias()
  if (r.erro) return r
  const o = r.data.find((x) => x.id === id)
  return o ? { data: o, erro: null } : falha('Ocorrência não encontrada.')
}

export function criarOcorrencia({ titulo, local, etapa_entrega_id, descricao }) {
  if (!pode(role(), 'abrirOcorrencia')) return Promise.resolve(falha('Seu perfil não abre ocorrência.'))
  if (!titulo?.trim() || !local?.trim() || !descricao?.trim()) return Promise.resolve(falha('Preencha título, local e descrição.'))
  return q(supabase.from('ocorrencias').insert({
    obra_id: obraAtualId, titulo: titulo.trim(), local: local.trim(), etapa_entrega_id: etapa_entrega_id || null,
    descricao: descricao.trim(), aberta_por: usuarioAtual.id,
  }).select().single())
}

// ── Pessoas e usuários ───────────────────────────────────────────────────
export const listarPessoas = () => q(supabase.rpc('pessoas_da_obra', { p_obra: obraAtualId }))

export async function listarUsuarios() {
  if (!pode(role(), 'gerirUsuarios')) return { data: [], erro: null }
  const [p, ou] = await Promise.all([q(supabase.from('profiles').select('*').order('nome')), q(supabase.from('obra_usuarios').select('*'))])
  if (p.erro || ou.erro) return falha(p.erro || ou.erro)
  return { data: p.data.map((x) => ({ ...x, obras: ou.data.filter((v) => v.profile_id === x.id).map((v) => v.obra_id) })), erro: null }
}

// Libera uma conta: escolhe o perfil e dá acesso à obra atual (só o Engenheiro).
export const liberarUsuario = (profileId, papel) =>
  q(supabase.rpc('liberar_usuario', { p_profile: profileId, p_role: papel, p_obra: obraAtualId }))
