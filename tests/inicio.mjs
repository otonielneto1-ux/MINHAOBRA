// Regras do Início: PPC da semana e do mês, ocorrências do cliente em destaque.
import { ppcAte, ppcDoMes, tomPpc } from '../src/lib/pcp.js'
import { nomeMes, inicioDoMesAnterior } from '../src/lib/datas.js'
import { ocorrenciasDoCliente, montarAlertas, contarCriticos } from '../src/lib/alertas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const at = (data, status, semana) => ({ data_prevista: data, status, semana_inicio: semana })
const HOJE = '2026-10-07'

// ── PPC até hoje ──
const semana = [
  at('2026-10-05', 'Concluída'), at('2026-10-06', 'Não concluída'),
  at('2026-10-06', 'Planejada'), // ontem sem baixa: conta como não concluída
  at('2026-10-07', 'Concluída'), at('2026-10-07', 'Planejada'), // hoje: só a que teve baixa
  at('2026-10-08', 'Planejada'), // futuro: não conta
]
conferir('ontem sem baixa conta contra; hoje só com baixa; futuro fora', ppcAte(semana, HOJE), { concluidas: 2, base: 4, pct: 50 })
conferir('sem nada para contar: vazio, não zero', ppcAte([at('2026-10-09', 'Planejada')], HOJE).pct, null)

// ── PPC do mês ──
const historico = [
  at('2026-09-28', 'Concluída', '2026-09-28'), at('2026-09-30', 'Não concluída', '2026-09-28'),
  at('2026-10-01', 'Concluída', '2026-09-28'), at('2026-10-02', 'Concluída', '2026-09-28'), at('2026-10-03', 'Não concluída', '2026-09-28'),
  at('2026-10-05', 'Concluída', '2026-10-05'), at('2026-10-06', 'Concluída', '2026-10-05'), at('2026-10-09', 'Planejada', '2026-10-05'),
]
const mes = ppcDoMes(historico, HOJE)
conferir('mês atual só com atividades do mês', mes.atual, { concluidas: 4, base: 5, pct: 80 })
conferir('mês anterior para comparar', mes.anterior, { concluidas: 1, base: 2, pct: 50 })
conferir('variação contra o mês anterior, em pontos', mes.variacao, 30)
conferir('na meta: zero pontos abaixo', mes.abaixoDaMeta, 0)
conferir('semana que começou no mês anterior aparece inteira (bate com a tela Semana)', mes.semanas[0], { semana_inicio: '2026-09-28', concluidas: 3, base: 5, pct: 60 })
conferir('semana atual', mes.semanas[1], { semana_inicio: '2026-10-05', concluidas: 2, base: 2, pct: 100 })
conferir('abaixo da meta: quantos pontos faltam', ppcDoMes([at('2026-10-01', 'Concluída', '2026-09-28'), at('2026-10-02', 'Não concluída', '2026-09-28')], HOJE).abaixoDaMeta, 30)
conferir('sem mês anterior: sem variação', ppcDoMes([at('2026-10-01', 'Concluída', '2026-09-28')], HOJE).variacao, null)
conferir('mês anterior de outubro', inicioDoMesAnterior('2026-10-07'), '2026-09-01')
conferir('mês anterior na virada do ano', inicioDoMesAnterior('2026-01-15'), '2025-12-01')
conferir('nome do mês a partir de AAAA-MM', nomeMes('2026-09'), 'setembro')
conferir('virada de ano: mês anterior de janeiro é dezembro', ppcDoMes([at('2025-12-30', 'Concluída', '2025-12-29')], '2026-01-05').anterior.pct, 100)

conferir('PPC na meta é ok', tomPpc(80), 'ok')
conferir('PPC até 20 pontos abaixo é atenção', tomPpc(60), 'warn')
conferir('PPC muito abaixo é crítico', tomPpc(59), 'crit')
conferir('sem PPC é neutro', tomPpc(null), 'neutral')
conferir('nome do mês', nomeMes('2026-10-07'), 'outubro')

// ── Ocorrências do cliente ──
const pessoas = [{ id: 1, role: 'Engenheiro' }, { id: 4, role: 'Cliente' }]
const oc = (id, status, aberta_em, aberta_por = 4, prazo = null) => ({ id, numero: id, titulo: `O${id}`, status, aberta_em, aberta_por, prazo })
const ocorrencias = [
  oc(1, 'Aberta', '2026-10-01'), // sem resposta há 6 dias
  oc(2, 'Em análise', '2026-09-28', 4, '2026-10-10'),
  oc(3, 'Em tratamento', '2026-09-24', 4, '2026-10-05'), // prazo vencido
  oc(4, 'Resolvida', '2026-09-15'), // fechada: fora
  oc(5, 'Aberta', '2026-10-06', 1), // aberta pelo engenheiro: fora do destaque
  oc(6, 'Aberta', '2026-10-06'), // recente, ainda no prazo de resposta
]
const destaque = ocorrenciasDoCliente(ocorrencias, pessoas, HOJE)
conferir('só as do cliente que ainda estão abertas', destaque.map((o) => o.id).sort(), [1, 2, 3, 6])
conferir('urgentes primeiro (sem resposta ou prazo vencido)', destaque.slice(0, 2).map((o) => o.id), [3, 1])
conferir('sem resposta acima de 48 h é marcada', destaque.find((o) => o.id === 1).semResposta, true)
conferir('aberta há 1 dia ainda não é urgente', destaque.find((o) => o.id === 6).urgente, false)
conferir('prazo vencido é marcado', destaque.find((o) => o.id === 3).prazoVencido, true)

const alertas = montarAlertas({ servicos: [], pacotes: [], restricoes: [], ocorrencias, pessoas, efetivoLancado: true, hoje: HOJE })
conferir('ocorrência do cliente não se repete na lista geral', alertas.some((a) => a.titulo.includes('O1')), false)
conferir('ocorrência aberta pelo engenheiro continua na lista geral quando atrasa',
  montarAlertas({ servicos: [], pacotes: [], restricoes: [], ocorrencias: [oc(7, 'Aberta', '2026-10-01', 1)], pessoas, efetivoLancado: true, hoje: HOJE }).length, 1)
conferir('críticos = vermelhos da lista + ocorrências do cliente urgentes', contarCriticos([{ nivel: 'crit' }, { nivel: 'warn' }], destaque), 3)

console.log(`${ok}/${tot} — início`)
process.exit(ok === tot ? 0 : 1)
