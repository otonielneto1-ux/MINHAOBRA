// Dados de exemplo (PRD-FRONTEND.md, "Dados de exemplo"), com os mesmos nomes de
// campo das tabelas do PRD-BACKEND.md. Na etapa do banco, isto vira a carga inicial.
// "Hoje" no modo exemplo = quarta, 07/10/2026 (src/lib/config.js).

import { diasEntre, somarDias, diasDaSemana } from './datas.js'
import { dividirPremio } from './premio.js'

const OBRA = 1

export const obras = [
  {
    id: OBRA, nome: 'Conviver Costamare', cidade: 'Parnaíba', uf: 'PI', cliente: 'Conviver Urbanismo',
    data_inicio: '2026-03-02', data_fim_contrato: '2027-12-31', dia_fechamento_folha: 20,
    status: 'Em andamento', ultimo_calculo_em: '2026-10-07T07:30:00',
  },
]

export const etapas_entrega = [
  { id: 1, obra_id: OBRA, nome: 'Geral', ordem: 1, data_entrega_contratual: '2027-06-30' },
  { id: 2, obra_id: OBRA, nome: 'Fase 01', ordem: 2, data_entrega_contratual: '2027-03-31' },
  { id: 3, obra_id: OBRA, nome: 'Fase 02', ordem: 3, data_entrega_contratual: '2027-12-31' },
]

export const profiles = [
  { id: 1, nome: 'Otoniel Neto', email: 'otoniel@exemplo.com', role: 'Engenheiro', ativo: true },
  { id: 2, nome: 'Larissa Mendes', email: 'larissa@exemplo.com', role: 'Coordenador', ativo: true },
  { id: 3, nome: 'Valdir Araújo', email: 'valdir@exemplo.com', role: 'Mestre', ativo: true },
  { id: 4, nome: 'Breno Cavalcante', email: 'breno@exemplo.com', role: 'Cliente', ativo: true },
  { id: 5, nome: 'Juliana Rocha', email: 'juliana@exemplo.com', role: 'Técnico de Segurança', ativo: true },
  { id: 6, nome: 'Camila Sá', email: 'camila@exemplo.com', role: 'Auxiliar Administrativo', ativo: true },
  { id: 7, nome: 'Pedro Henrique Lopes', email: 'pedro@exemplo.com', role: 'Aguardando', ativo: true },
]

export const obra_usuarios = [2, 3, 4, 5, 6].map((pid, i) => ({ id: i + 1, obra_id: OBRA, profile_id: pid }))

// ── Cronograma ────────────────────────────────────────────────────────────
function srv(id, eap, nome, etapa, pai, unidade, prevista, custo, ini, fim, extra = {}) {
  return {
    id, obra_id: OBRA, uid_project: id, pai_id: pai, etapa_entrega_id: etapa, codigo_eap: eap, nome,
    nivel: pai ? 2 : 1, e_resumo: false, local: extra.local || null, unidade, quantidade_prevista: prevista,
    custo_orcado: custo, unidade_alterada_em: extra.unidade_alterada_em || null,
    inicio_previsto: ini, fim_previsto: fim, duracao_dias: diasEntre(ini, fim) + 1,
    inicio_base: ini, fim_base: fim, folga_dias: extra.folga ?? 20, critico: !!extra.critico,
    quantidade_executada: 0, inicio_real: extra.inicio_real || null, fim_real: extra.fim_real || null,
    cancelado: false,
  }
}

function resumo(id, eap, nome, etapa, ini, fim) {
  return { ...srv(id, eap, nome, etapa, null, '%', 100, null, ini, fim), e_resumo: true, nivel: 1 }
}

export const servicos = [
  resumo(1, '1', 'Geral', 1, '2026-03-02', '2027-06-30'),
  resumo(2, '2', 'Fase 01', 2, '2026-04-06', '2027-03-31'),
  resumo(3, '3', 'Fase 02', 3, '2026-09-01', '2027-06-30'),
  srv(11, '1.1', 'Instalação do canteiro', 1, 1, '%', 100, 85000, '2026-03-02', '2026-03-31', { local: 'Canteiro central', inicio_real: '2026-03-02', fim_real: '2026-04-03', folga: 0 }),
  srv(12, '1.2', 'Locação topográfica', 1, 1, '%', 100, 38000, '2026-03-09', '2026-04-30', { local: 'Toda a gleba', inicio_real: '2026-03-09', fim_real: '2026-04-30', folga: 0 }),
  srv(13, '1.3', 'Adutora de água – trecho externo', 1, 1, '%', 100, 620000, '2026-06-01', '2026-11-30', { local: 'Acesso PI-116', inicio_real: '2026-06-01', critico: true, folga: 0 }),
  srv(21, '2.1', 'Limpeza e terraplenagem – Fase 01', 2, 2, '%', 100, 1150000, '2026-04-06', '2026-07-31', { local: 'Quadras A a H', inicio_real: '2026-04-06', fim_real: '2026-08-14', folga: 0 }),
  srv(22, '2.2', 'Drenagem pluvial – galerias Fase 01', 2, 2, 'm', 3200, 1480000, '2026-08-03', '2026-11-30', { local: 'Ruas 1 a 4', inicio_real: '2026-08-03', critico: true, folga: 0, unidade_alterada_em: '2026-09-15T10:00:00' }),
  srv(23, '2.3', 'Rede de água – Fase 01', 2, 2, 'm', 5100, 690000, '2026-07-01', '2026-09-25', { local: 'Quadras A a F', inicio_real: '2026-07-01', folga: 12, unidade_alterada_em: '2026-08-01T10:00:00' }),
  srv(24, '2.4', 'Rede de esgoto – Fase 01', 2, 2, 'm', 4900, 980000, '2026-09-15', '2026-12-15', { local: 'Ruas 3 a 5', inicio_real: '2026-09-15', critico: true, folga: 0, unidade_alterada_em: '2026-09-20T10:00:00' }),
  srv(25, '2.5', 'Meio-fio e sarjeta – Fase 01', 2, 2, '%', 100, 540000, '2026-09-28', '2026-12-31', { local: 'Ruas 1 a 5', folga: 8 }),
  srv(26, '2.6', 'Pavimentação intertravada – Fase 01', 2, 2, '%', 100, null, '2026-12-01', '2027-03-31', { local: 'Ruas 1 a 5', critico: true, folga: 0 }),
  srv(31, '3.1', 'Limpeza e terraplenagem – Fase 02', 3, 3, '%', 100, 1240000, '2026-09-01', '2026-12-31', { local: 'Quadras I a P', inicio_real: '2026-09-01', folga: 15 }),
  srv(32, '3.2', 'Drenagem pluvial – Fase 02', 3, 3, '%', 100, null, '2027-01-04', '2027-04-30', { local: 'Ruas 6 a 9', critico: true, folga: 0 }),
  srv(33, '3.3', 'Rede elétrica e iluminação – Fase 02', 3, 3, '%', 100, 870000, '2027-03-01', '2027-06-30', { local: 'Ruas 6 a 9', folga: 30 }),
]

export const servico_dependencias = [
  [22, 21, 'TI', 0], [24, 22, 'II', 14], [25, 24, 'II', 10], [26, 22, 'TI', 0],
  [26, 25, 'TT', 0], [32, 31, 'TI', 0], [33, 32, 'TI', 0], [21, 12, 'TI', 0],
].map(([servico_id, predecessora_id, tipo, defasagem_dias], i) => ({ id: i + 1, servico_id, predecessora_id, tipo, defasagem_dias }))

// ── Restrições ────────────────────────────────────────────────────────────
export const restricoes = [
  { id: 1, obra_id: OBRA, servico_id: 25, tipo: 'Liberação de área', descricao: 'Liberação da Rua 5 pela topografia', responsavel: 'Topografia', data_limite: '2026-10-02', status: 'Pendente', removida_em: null },
  { id: 2, obra_id: OBRA, servico_id: 24, tipo: 'Material', descricao: 'Tubos PVC 200 mm — pedido Sienge 4512', responsavel: 'Compras', data_limite: '2026-10-09', status: 'Pendente', removida_em: null },
  { id: 3, obra_id: OBRA, servico_id: 26, tipo: 'Projeto', descricao: 'Projeto de paginação aprovado', responsavel: 'Projetos', data_limite: '2026-09-30', status: 'Removida', removida_em: '2026-09-25' },
  { id: 4, obra_id: OBRA, servico_id: 32, tipo: 'Equipamento', descricao: 'Retroescavadeira extra para a drenagem da Fase 02', responsavel: 'Otoniel', data_limite: '2026-12-15', status: 'Pendente', removida_em: null },
]

// ── Equipe ────────────────────────────────────────────────────────────────
function func(id, nome, funcao, tipo, extra = {}) {
  return { id, obra_id: OBRA, nome, funcao, tipo_mao_obra: tipo, empresa: extra.empresa || null, matricula: extra.mat || null, ativo: extra.ativo ?? true }
}

export const funcionarios = [
  func(101, 'Raimundo Sousa', 'Encarregado', 'Direta', { mat: '1021' }),
  func(102, 'Francisco Lima', 'Pedreiro', 'Direta', { mat: '1034' }),
  func(103, 'Damião Carvalho', 'Pedreiro', 'Direta', { mat: '1036' }),
  func(104, 'José Carlos Alves', 'Pedreiro', 'Direta', { mat: '1035' }),
  func(105, 'Antônio Pereira', 'Servente', 'Direta', { mat: '1040' }),
  func(106, 'Luiz Ferreira', 'Servente', 'Direta', { mat: '1041' }),
  func(107, 'Gilvan Santos', 'Servente', 'Direta', { mat: '1043' }),
  func(108, 'Josué Ribeiro', 'Servente', 'Direta', { mat: '1044' }),
  func(109, 'Marcos Oliveira', 'Encanador', 'Direta', { mat: '1050' }),
  func(110, 'Ana Beatriz Moura', 'Apontador', 'Indireta', { mat: '1060' }),
  func(111, 'Carlos Eduardo Nunes', 'Almoxarife', 'Indireta', { mat: '1061' }),
  func(112, 'Paulo Henrique Costa', 'Operador de máquina', 'Terceirizada', { empresa: 'Terraplan Delta Ltda' }),
  func(113, 'Wellington Araújo', 'Operador de máquina', 'Terceirizada', { empresa: 'Terraplan Delta Ltda' }),
  func(114, 'Edson Rocha', 'Motorista', 'Terceirizada', { empresa: 'Terraplan Delta Ltda' }),
  func(115, 'Sérgio Batista', 'Servente', 'Direta', { mat: '1042', ativo: false }),
  func(116, 'Cícero Nascimento', 'Eletricista', 'Terceirizada', { empresa: 'Eletro Barra Instalações Ltda' }),
  func(117, 'Fábio Teixeira', 'Eletricista', 'Terceirizada', { empresa: 'Eletro Barra Instalações Ltda' }),
]

// ── Pacotes ───────────────────────────────────────────────────────────────
// quantidade_executada aqui = situação em 04/10; as baixas desta semana somam por cima.
export const pacotes = [
  { id: 1, obra_id: OBRA, servico_id: 23, nome: 'Rede de água Fase 01 – Quadras A a D', local: 'Quadras A a D', quantidade_meta: 1200, quantidade_executada: 1200, valor_premio: 2400, data_inicio: '2026-09-01', data_fechamento: '2026-09-20', status: 'Concluído', motivo_nao_conclusao: null, fechado_em: '2026-09-20T17:00:00' },
  { id: 2, obra_id: OBRA, servico_id: 22, nome: 'Galeria Rua 1', local: 'Rua 1', quantidade_meta: 300, quantidade_executada: 210, valor_premio: 1300, data_inicio: '2026-09-01', data_fechamento: '2026-09-20', status: 'Não concluído', motivo_nao_conclusao: 'Chuva', fechado_em: '2026-09-20T17:00:00' },
  { id: 3, obra_id: OBRA, servico_id: 22, nome: 'Galeria Rua 2 – trecho 1', local: 'Rua 2, Quadra B', quantidade_meta: 400, quantidade_executada: 136, valor_premio: 1800, data_inicio: '2026-09-21', data_fechamento: '2026-10-20', status: 'Em execução', motivo_nao_conclusao: null, fechado_em: null },
  { id: 4, obra_id: OBRA, servico_id: 23, nome: 'Rede de água Fase 01 – Quadras E e F', local: 'Quadras E e F', quantidade_meta: 800, quantidade_executada: 640, valor_premio: 1600, data_inicio: '2026-09-21', data_fechamento: '2026-10-20', status: 'Em execução', motivo_nao_conclusao: null, fechado_em: null },
  { id: 5, obra_id: OBRA, servico_id: 24, nome: 'Esgoto Rua 5 – lado ímpar', local: 'Rua 5', quantidade_meta: 350, quantidade_executada: 0, valor_premio: 1500, data_inicio: '2026-10-05', data_fechamento: '2026-10-20', status: 'Liberado', motivo_nao_conclusao: null, fechado_em: null },
  { id: 6, obra_id: OBRA, servico_id: 25, nome: 'Meio-fio Rua 1', local: 'Rua 1', quantidade_meta: 8, quantidade_executada: 0, valor_premio: 1200, data_inicio: '2026-10-12', data_fechamento: '2026-11-20', status: 'Planejado', motivo_nao_conclusao: null, fechado_em: null },
]

// ── PCP ───────────────────────────────────────────────────────────────────
// [data, serviço, pacote, local, planejada, equipe, status, executada, motivo]
const C = 'Concluída'
const N = 'Não concluída'
const P = 'Planejada'
const linhasPcp = [
  // semanas antigas — histórico de PPC e de motivos
  ['2026-08-10', 21, null, 'Quadra H', 4, 'Terraplan Delta', C, 4], ['2026-08-11', 23, null, 'Quadra A', 80, 'Eq. Marcos', C, 85], ['2026-08-12', 22, null, 'Rua 1', 50, 'Eq. Raimundo', N, 20, 'Chuva'], ['2026-08-13', 23, null, 'Quadra A', 80, 'Eq. Marcos', C, 80], ['2026-08-14', 22, null, 'Rua 1', 50, 'Eq. Raimundo', C, 52],
  ['2026-08-17', 23, null, 'Quadra B', 80, 'Eq. Marcos', C, 80], ['2026-08-18', 22, null, 'Rua 1', 50, 'Eq. Raimundo', C, 50], ['2026-08-19', 22, null, 'Rua 1', 50, 'Eq. Raimundo', N, 0, 'Chuva'], ['2026-08-20', 23, null, 'Quadra B', 80, 'Eq. Marcos', C, 82], ['2026-08-21', 22, null, 'Rua 1', 50, 'Eq. Raimundo', C, 50],
  ['2026-08-24', 23, null, 'Quadra B', 80, 'Eq. Marcos', N, 40, 'Falta de equipe'], ['2026-08-25', 22, null, 'Rua 1', 50, 'Eq. Raimundo', C, 55], ['2026-08-26', 23, null, 'Quadra C', 80, 'Eq. Marcos', C, 80], ['2026-08-27', 22, null, 'Rua 1', 50, 'Eq. Raimundo', C, 50], ['2026-08-28', 23, null, 'Quadra C', 80, 'Eq. Marcos', C, 80],
  ['2026-09-01', 31, null, 'Quadra I', 2, 'Terraplan Delta', C, 2], ['2026-09-02', 23, 1, 'Quadra C', 90, 'Eq. Marcos', C, 90], ['2026-09-03', 22, 2, 'Rua 1', 50, 'Eq. Raimundo', N, 30, 'Chuva'], ['2026-09-04', 23, 1, 'Quadra D', 90, 'Eq. Marcos', C, 95], ['2026-09-05', 22, 2, 'Rua 1', 50, 'Eq. Raimundo', N, 0, 'Projeto'],
  ['2026-09-08', 31, null, 'Quadra I', 2, 'Terraplan Delta', C, 2.5], ['2026-09-09', 23, 1, 'Quadra D', 90, 'Eq. Marcos', C, 90], ['2026-09-10', 22, 2, 'Rua 1', 50, 'Eq. Raimundo', C, 50], ['2026-09-11', 23, 1, 'Quadra D', 90, 'Eq. Marcos', C, 92], ['2026-09-12', 22, 2, 'Rua 1', 50, 'Eq. Raimundo', N, 25, 'Chuva'],
  ['2026-09-15', 24, null, 'Rua 3', 60, 'Eq. Marcos', C, 60], ['2026-09-16', 22, 2, 'Rua 1', 50, 'Eq. Raimundo', C, 50], ['2026-09-17', 31, null, 'Quadra J', 2, 'Terraplan Delta', N, 1, 'Equipamento'], ['2026-09-18', 23, 1, 'Quadra D', 90, 'Eq. Marcos', C, 90], ['2026-09-19', 25, null, 'Rua 1', 1, 'Eq. Francisco', N, 0, 'Frente não liberada'],
  ['2026-09-22', 22, 3, 'Rua 2, Quadra B', 60, 'Eq. Raimundo', C, 60], ['2026-09-23', 23, 4, 'Quadra E', 100, 'Eq. Marcos', C, 100], ['2026-09-24', 24, null, 'Rua 3', 60, 'Eq. Marcos', N, 30, 'Falta de material'], ['2026-09-25', 23, 4, 'Quadra E', 100, 'Eq. Marcos', C, 100], ['2026-09-26', 31, null, 'Quadra J', 2, 'Terraplan Delta', C, 2],
  // semana passada (28/09 a 03/10)
  ['2026-09-29', 22, 3, 'Rua 2, Quadra B', 60, 'Eq. Raimundo', C, 62], ['2026-09-30', 23, 4, 'Quadra E', 120, 'Eq. Marcos', C, 120], ['2026-10-01', 24, null, 'Rua 3', 80, 'Eq. Marcos', N, 35, 'Falta de material'], ['2026-10-01', 31, null, 'Quadra 12', 3, 'Terraplan Delta', C, 3.2], ['2026-10-02', 22, 3, 'Rua 2, Quadra B', 60, 'Eq. Raimundo', C, 60], ['2026-10-03', 25, null, 'Rua 1', 1, 'Eq. Francisco', N, 0, 'Frente não liberada'],
  // semana atual (05/10 a 10/10) — hoje é quarta 07/10
  ['2026-10-05', 22, 3, 'Rua 2, Quadra B', 60, 'Eq. Raimundo', C, 64], ['2026-10-05', 31, null, 'Quadra 13', 3, 'Terraplan Delta', C, 3.2], ['2026-10-06', 24, 5, 'Rua 5', 70, 'Eq. Marcos', N, 40, 'Falta de material'], ['2026-10-06', 22, 3, 'Rua 2, Quadra B', 60, 'Eq. Raimundo', C, 60],
  ['2026-10-07', 23, 4, 'Quadra F', 100, 'Eq. Marcos', P], ['2026-10-07', 22, 3, 'Rua 2, Quadra B', 60, 'Eq. Raimundo', P], ['2026-10-07', 25, null, 'Rua 1, lado par', 1, 'Eq. Francisco', P],
  ['2026-10-08', 24, 5, 'Rua 5', 30, 'Eq. Marcos', P], ['2026-10-08', 31, null, 'Quadra 13', 3, 'Terraplan Delta', P],
  ['2026-10-09', 22, 3, 'Rua 2, Quadra B', 60, 'Eq. Raimundo', P], ['2026-10-09', 23, 4, 'Quadra F', 100, 'Eq. Marcos', P],
  ['2026-10-10', 13, null, 'Acesso PI-116', 2, 'Eq. Damião', P],
]

export const pcp_atividades = linhasPcp.map(([data, servico_id, pacote_id, local, planejada, equipe, status, executada, motivo], i) => {
  const dow = new Date(`${data}T12:00:00`).getDay()
  return {
    id: i + 1, obra_id: OBRA, semana_inicio: somarDias(data, -(dow === 0 ? 6 : dow - 1)), data_prevista: data,
    servico_id, pacote_id, local, quantidade_planejada: planejada, equipe, status,
    quantidade_executada: status === P ? null : executada, motivo_nao_conclusao: motivo || null,
    baixa_por: status === P ? null : 3, baixa_em: status === P ? null : `${data}T17:30:00`, copiada_de_id: null,
  }
})

// ── Produções ─────────────────────────────────────────────────────────────
// Toda baixa com quantidade vira produção "PCP". O avanço anterior ao sistema entra
// como "Ajuste" de carga inicial, um por mês, para a curva S ter histórico.
// Avanço de cada serviço em 04/10 (antes das baixas desta semana):
const avancoEm0410 = { 11: 100, 12: 100, 13: 55, 21: 100, 22: 1410, 23: 4300, 24: 600, 25: 0, 26: 0, 31: 19, 32: 0, 33: 0 }

function gerarProducoes() {
  const lista = []
  let id = 1
  for (const a of pcp_atividades) {
    if (a.quantidade_executada) {
      lista.push({ id: id++, obra_id: OBRA, data: a.data_prevista, servico_id: a.servico_id, quantidade: a.quantidade_executada, origem: 'PCP', pcp_atividade_id: a.id, pacote_id: a.pacote_id, motivo_ajuste: null, lancado_por: 3 })
    }
  }
  for (const s of servicos.filter((x) => !x.e_resumo)) {
    const alvo = avancoEm0410[s.id]
    const viaPcp = lista.filter((p) => p.servico_id === s.id && p.data <= '2026-10-04').reduce((t, p) => t + p.quantidade, 0)
    const resto = alvo - viaPcp
    if (resto <= 0 || !s.inicio_real) continue
    // Datas de fim de mês entre o início real e o fim real (ou 30/09).
    const fim = s.fim_real || '2026-09-30'
    const datas = []
    let d = s.inicio_real
    while (d < fim) {
      const [a, m] = d.split('-').map(Number)
      const ultimo = new Date(a, m, 0).getDate()
      const fimMes = `${a}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`
      datas.push(fimMes < fim ? fimMes : fim)
      d = somarDias(fimMes, 1)
    }
    if (!datas.length) datas.push(fim)
    const parte = resto / datas.length
    for (const data of datas) {
      lista.push({ id: id++, obra_id: OBRA, data, servico_id: s.id, quantidade: Math.round(parte * 1000) / 1000, origem: 'Ajuste', pcp_atividade_id: null, pacote_id: null, motivo_ajuste: 'Carga inicial — avanço anterior ao sistema', lancado_por: 1 })
    }
  }
  return lista
}

export const producoes = gerarProducoes()

// Quantidade executada de cada serviço e de cada pacote = soma das produções / baixas desta semana.
for (const s of servicos) {
  s.quantidade_executada = Math.round(producoes.filter((p) => p.servico_id === s.id).reduce((t, p) => t + p.quantidade, 0) * 1000) / 1000
}
for (const p of pacotes) {
  if (p.fechado_em) continue
  p.quantidade_executada += producoes.filter((x) => x.pacote_id === p.id && x.data >= '2026-10-05').reduce((t, x) => t + x.quantidade, 0)
}

// ── Efetivo ───────────────────────────────────────────────────────────────
const excecoes = {
  '2026-09-11': { 106: 'Falta' },
  '2026-09-18': { 104: 'Atestado' },
  '2026-10-02': { 106: 'Falta' },
  '2026-10-03': { 104: 'Atestado', 114: 'Afastado' },
  '2026-10-06': { 106: 'Falta' },
  '2026-10-07': { 106: 'Falta', 104: 'Atestado', 114: 'Afastado', 117: 'Falta' },
}

function pacoteDoDia(funcId, data) {
  const antes = data < '2026-09-21'
  if ([101, 105, 107].includes(funcId)) return antes ? 2 : 3
  if ([108, 109].includes(funcId)) return antes ? 1 : 4
  return null
}

function gerarPresencas() {
  const lista = []
  let id = 1
  let segunda = '2026-08-31'
  while (segunda <= '2026-10-05') {
    for (const data of diasDaSemana(segunda)) {
      if (data < '2026-09-01' || data > '2026-10-07') continue
      for (const f of funcionarios.filter((x) => x.ativo)) {
        const situacao = excecoes[data]?.[f.id] || 'Presente'
        lista.push({ id: id++, obra_id: OBRA, data, funcionario_id: f.id, situacao, pacote_id: situacao === 'Presente' ? pacoteDoDia(f.id, data) : null, lancado_por: 3 })
      }
    }
    segunda = somarDias(segunda, 7)
  }
  return lista
}

export const presencas = gerarPresencas()

// Prêmios do fechamento de 20/09 (só o pacote que bateu a meta paga).
export const premios = (() => {
  const p = pacotes.find((x) => x.id === 1)
  const dias = presencas
    .filter((x) => x.pacote_id === 1 && x.situacao === 'Presente' && x.data >= p.data_inicio && x.data <= p.data_fechamento)
    .map((x) => ({ funcionario_id: x.funcionario_id, tipo_mao_obra: funcionarios.find((f) => f.id === x.funcionario_id).tipo_mao_obra }))
  return dividirPremio(p.valor_premio, dias).map((l, i) => ({ id: i + 1, pacote_id: 1, ...l }))
})()

// ── Ocorrências ───────────────────────────────────────────────────────────
export const ocorrencias = [
  { id: 1, obra_id: OBRA, numero: 1, titulo: "Poça d'água na Rua 2 após chuva", local: 'Rua 2, Quadra B', etapa_entrega_id: 2, descricao: 'Depois da chuva de segunda, a água ficou parada em frente aos lotes 3 a 6. Parece que a boca de lobo está entupida.', status: 'Aberta', aberta_por: 4, responsavel_id: null, prazo: null, resposta: null, aberta_em: '2026-10-01', respondida_em: null, fechada_em: null },
  { id: 2, obra_id: OBRA, numero: 2, titulo: 'Meio-fio quebrado em frente ao lote 14', local: 'Quadra C, lote 14', etapa_entrega_id: 2, descricao: 'Trecho de uns 2 metros de meio-fio quebrado, provavelmente por caminhão.', status: 'Em análise', aberta_por: 4, responsavel_id: 2, prazo: '2026-10-10', resposta: null, aberta_em: '2026-09-28', respondida_em: '2026-09-29T09:00:00', fechada_em: null },
  { id: 3, obra_id: OBRA, numero: 3, titulo: 'Entulho na área verde', local: 'Área verde 2', etapa_entrega_id: 1, descricao: 'Sobra de material da galeria deixada na área verde.', status: 'Em tratamento', aberta_por: 4, responsavel_id: 3, prazo: '2026-10-08', resposta: 'Retirada programada com o caminhão na quinta.', aberta_em: '2026-09-24', respondida_em: '2026-09-24T15:00:00', fechada_em: null },
  { id: 4, obra_id: OBRA, numero: 4, titulo: 'Caixa de passagem sem tampa', local: 'Rua 4', etapa_entrega_id: 2, descricao: 'Caixa de passagem aberta, risco para quem passa à noite.', status: 'Resolvida', aberta_por: 4, responsavel_id: 3, prazo: '2026-09-22', resposta: 'Tampa instalada em 22/09.', aberta_em: '2026-09-15', respondida_em: '2026-09-15T11:00:00', fechada_em: '2026-09-22T16:00:00' },
  { id: 5, obra_id: OBRA, numero: 5, titulo: 'Pedido de mudança no traçado da calçada', local: 'Rua 1', etapa_entrega_id: 3, descricao: 'Avaliar recuo da calçada para preservar a árvore existente.', status: 'Recusada', aberta_por: 4, responsavel_id: 1, prazo: null, resposta: 'Fora do projeto aprovado. Pode ser tratado como aditivo.', aberta_em: '2026-09-10', respondida_em: '2026-09-11T10:00:00', fechada_em: '2026-09-11T10:00:00' },
]

export const ocorrencia_fotos = []
