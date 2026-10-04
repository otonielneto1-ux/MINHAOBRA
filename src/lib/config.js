// Chave única que decide de onde vêm os dados.
// true  = dados de exemplo embutidos (src/lib/mockData.js), nada vai para a internet.
// false = Supabase (a partir da etapa do banco).
export const USAR_MOCK = true

// No modo de exemplo o "hoje" é fixo, para a semana do PCP sempre aparecer com
// baixas feitas. Com o banco ligado, hoje é a data real do aparelho.
export const HOJE_MOCK = '2026-10-07'
