// Vocabulário único do sistema. Estes textos são EXATAMENTE os do CHECK no banco
// (PRD-BACKEND.md, "Listas fechadas"). Se um divergir, o salvamento falha calado.
// Nenhuma tela escreve estes textos de cabeça: importa daqui.

export const PERFIS = {
  AGUARDANDO: 'Aguardando',
  ENGENHEIRO: 'Engenheiro',
  COORDENADOR: 'Coordenador',
  MESTRE: 'Mestre',
  CLIENTE: 'Cliente',
  SEGURANCA: 'Técnico de Segurança',
  AUX_ADM: 'Auxiliar Administrativo',
}

export const UNIDADES = ['%', 'm', 'm²', 'm³', 'kg', 't', 'un']

export const TIPOS_DEPENDENCIA = ['TI', 'II', 'TT', 'IT']

export const MOTIVOS_NAO_CONCLUSAO = [
  'Chuva', 'Falta de material', 'Falta de equipe', 'Projeto', 'Equipamento', 'Frente não liberada', 'Outro',
]

export const STATUS_PCP = { PLANEJADA: 'Planejada', CONCLUIDA: 'Concluída', NAO_CONCLUIDA: 'Não concluída' }

export const STATUS_PACOTE = ['Planejado', 'Liberado', 'Em execução', 'Concluído', 'Não concluído']

export const TIPOS_RESTRICAO = ['Material', 'Projeto', 'Equipe', 'Equipamento', 'Liberação de área', 'Segurança', 'Outro']

export const STATUS_RESTRICAO = { PENDENTE: 'Pendente', REMOVIDA: 'Removida' }

export const FUNCOES = [
  'Servente', 'Pedreiro', 'Carpinteiro', 'Armador', 'Encanador', 'Eletricista',
  'Operador de máquina', 'Motorista', 'Encarregado', 'Apontador', 'Almoxarife', 'Técnico', 'Outro',
]

export const TIPOS_MAO_OBRA = ['Direta', 'Indireta', 'Terceirizada']

export const SITUACOES = ['Presente', 'Falta', 'Atestado', 'Afastado']

export const STATUS_OCORRENCIA = ['Aberta', 'Em análise', 'Em tratamento', 'Resolvida', 'Recusada']

export const STATUS_OCORRENCIA_ABERTOS = ['Aberta', 'Em análise', 'Em tratamento']

export const STATUS_OBRA = ['Em andamento', 'Paralisada', 'Concluída']
