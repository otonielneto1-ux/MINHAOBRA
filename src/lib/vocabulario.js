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

// Motivo de não atingir a meta do dia, em 7 grupos macro. O CHECK do banco tem as causas (os valores),
// com o texto idêntico (supabase/migrations/20261005-07-motivos-por-grupo.sql).
export const GRUPOS_MOTIVO = {
  'Condição climática': ['Chuva', 'Solo encharcado', 'Vento ou calor excessivo'],
  'Execução': ['Falta de equipe', 'Baixa produtividade', 'Retrabalho'],
  'Planejamento': ['Frente não liberada', 'Meta acima da capacidade', 'Interferência de outra equipe', 'Mudança de prioridade'],
  'Projetos': ['Falta de projeto', 'Dúvida ou erro de projeto'],
  'Suprimentos': ['Falta de material', 'Atraso na entrega de material', 'Equipamento (falta ou quebra)'],
  'Segurança': ['Acidente ou incidente', 'Paralisação por segurança', 'Falta de EPI'],
  'Outros': ['Outro'],
}


export const STATUS_PCP = { PLANEJADA: 'Planejada', CONCLUIDA: 'Concluída', NAO_CONCLUIDA: 'Não concluída' }

export const ORIGEM_PRODUCAO = { PCP: 'PCP', AJUSTE: 'Ajuste' }

export const STATUS_PACOTE = ['Planejado', 'Liberado', 'Em execução', 'Concluído', 'Não concluído']

export const TIPOS_RESTRICAO = ['Material', 'Projeto', 'Equipe', 'Equipamento', 'Liberação de área', 'Segurança', 'Outro']

export const STATUS_RESTRICAO = { PENDENTE: 'Pendente', REMOVIDA: 'Removida' }

export const FUNCOES = [
  'Servente', 'Pedreiro', 'Carpinteiro', 'Armador', 'Encanador', 'Eletricista',
  'Operador de máquina', 'Motorista', 'Encarregado', 'Apontador', 'Almoxarife', 'Técnico', 'Outro',
]

export const TIPOS_MAO_OBRA = ['Direta', 'Indireta', 'Terceirizada']

export const SITUACOES = ['Presente', 'Falta', 'Atestado', 'Afastado']

export const OCORRENCIA_ABERTA = 'Aberta'

export const STATUS_OCORRENCIA = [OCORRENCIA_ABERTA, 'Em análise', 'Em tratamento', 'Resolvida', 'Recusada']

export const STATUS_OCORRENCIA_ABERTOS = [OCORRENCIA_ABERTA, 'Em análise', 'Em tratamento']

export const STATUS_OBRA = ['Em andamento', 'Paralisada', 'Concluída']
