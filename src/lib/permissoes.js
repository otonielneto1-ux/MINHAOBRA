// Quem vê e faz o quê (PLANO-DO-PROJETO.md, "Matriz de permissões").
// A tela pergunta aqui; nunca decide sozinha. No banco, a mesma regra vira RLS.

import { PERFIS } from './vocabulario.js'

const { ENGENHEIRO, COORDENADOR, MESTRE, CLIENTE, SEGURANCA } = PERFIS
const GESTAO = [ENGENHEIRO, COORDENADOR]

const MATRIZ = {
  verPainel: GESTAO,
  verCusto: GESTAO,
  verPremio: GESTAO,
  verPlanejamento: [...GESTAO, MESTRE, SEGURANCA],
  verCronograma: [...GESTAO, MESTRE],
  editarPlanejamento: GESTAO,
  importarCronograma: GESTAO,
  lancarAjuste: GESTAO,
  darBaixa: [...GESTAO, MESTRE],
  verPacotes: [...GESTAO, MESTRE],
  gerirPacotes: GESTAO,
  fecharFolha: GESTAO,
  lancarEfetivo: [...GESTAO, MESTRE],
  verOcorrencias: [...GESTAO, CLIENTE],
  abrirOcorrencia: [...GESTAO, CLIENTE],
  responderOcorrencia: GESTAO,
  gerirCadastros: GESTAO,
  gerirUsuarios: [ENGENHEIRO],
  apagar: [ENGENHEIRO],
}

export function pode(role, acao) {
  return (MATRIZ[acao] || []).includes(role)
}

// Perfis que entram no sistema na Versão 1. Os demais veem "aguardando liberação".
export function perfilLiberado(role) {
  return [ENGENHEIRO, COORDENADOR, MESTRE, CLIENTE, SEGURANCA].includes(role)
}

// Menu de cada perfil, na ordem em que aparece. `celular` = vai na barra inferior;
// o que não couber (máximo 5 com o "Mais") fica dentro de "Mais".
const MENUS = {
  [ENGENHEIRO]: ['inicio', 'planejamento', 'pacotes', 'efetivo', 'ocorrencias', 'cadastros'],
  [COORDENADOR]: ['inicio', 'planejamento', 'pacotes', 'efetivo', 'ocorrencias', 'cadastros'],
  [MESTRE]: ['hoje', 'planejamento', 'efetivo', 'pacotes'],
  [CLIENTE]: ['avanco', 'ocorrencias'],
  [SEGURANCA]: ['planejamento'],
}

export function menuDoPerfil(role) {
  return MENUS[role] || []
}

// Tela de abertura de cada perfil.
export function telaInicial(role) {
  return menuDoPerfil(role)[0] || 'perfil'
}

// Barra inferior do celular: até 4 itens + "Mais" quando o menu é maior que 5.
export function divisaoCelular(role) {
  const menu = menuDoPerfil(role)
  if (menu.length <= 5) return { barra: menu, mais: [] }
  const naBarra = ['inicio', 'planejamento', 'efetivo', 'ocorrencias'].filter((m) => menu.includes(m))
  return { barra: naBarra, mais: menu.filter((m) => !naBarra.includes(m)) }
}
