// Avanço físico: peso por custo x duração, previsto linear, atraso contra a linha de base.
import { avancoServico, regraDePeso, previstoServico, resumoAvanco, diasAtraso, executadoAte } from '../src/lib/avanco.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const r1 = (v) => Math.round(v * 10) / 10

const a = { id: 1, quantidade_prevista: 100, quantidade_executada: 50, custo_orcado: 300, duracao_dias: 10, inicio_base: '2026-01-01', fim_base: '2026-01-11', etapa_entrega_id: 1 }
const b = { id: 2, quantidade_prevista: 4000, quantidade_executada: 4000, custo_orcado: 100, duracao_dias: 30, inicio_base: '2026-01-01', fim_base: '2026-01-31', etapa_entrega_id: 2 }
const resumoObra = { id: 9, e_resumo: true, quantidade_prevista: 100, quantidade_executada: 0, custo_orcado: null, duracao_dias: 365 }

conferir('avanço do serviço é executado ÷ previsto', avancoServico(a), 50)
conferir('avanço nunca passa de 100%', avancoServico({ quantidade_prevista: 10, quantidade_executada: 12 }), 100)

conferir('todos com custo: peso por custo', regraDePeso([a, b]).tipo, 'custo')
conferir('tarefa-resumo não conta para a regra de peso', regraDePeso([a, b, resumoObra]).tipo, 'custo')
conferir('um sem custo: todos passam a pesar por duração', regraDePeso([a, { ...b, custo_orcado: null }]).tipo, 'duracao')
conferir('conta quantos estão sem custo', regraDePeso([a, { ...b, custo_orcado: 0 }]).semCusto, 1)

// por custo: (300×50 + 100×100) / 400 = 62,5
conferir('média ponderada pelo custo', r1(resumoAvanco([a, b], '2026-02-01').realizado), 62.5)
// por duração: (10×50 + 30×100) / 40 = 87,5
conferir('média ponderada pela duração quando falta custo', r1(resumoAvanco([a, { ...b, custo_orcado: null }], '2026-02-01').realizado), 87.5)
conferir('avanço por etapa só soma os serviços da etapa', r1(resumoAvanco([a, b], '2026-02-01', 1).realizado), 50)

conferir('previsto antes do início é 0', previstoServico(a, '2025-12-31'), 0)
conferir('previsto no meio é linear', previstoServico(a, '2026-01-06'), 50)
conferir('previsto depois do fim é 100', previstoServico(a, '2026-02-01'), 100)

const prod = [{ servico_id: 1, data: '2026-01-03', quantidade: 20 }, { servico_id: 1, data: '2026-01-08', quantidade: 30 }]
conferir('executado até uma data só soma o que veio antes', executadoAte(a, prod, '2026-01-05'), 20)

conferir('terminou depois da base: atraso = fim real − fim base', diasAtraso({ ...a, fim_real: '2026-01-14' }, '2026-03-01'), 3)
conferir('terminou antes da base: atraso zero', diasAtraso({ ...a, fim_real: '2026-01-09' }, '2026-03-01'), 0)
conferir('passou do fim e não terminou: hoje − fim base', diasAtraso({ ...a, inicio_real: '2026-01-01' }, '2026-01-20'), 9)
conferir('devia ter começado e não tem produção: atraso de início', diasAtraso(a, '2026-01-04'), 3)
conferir('em andamento dentro do prazo: sem atraso', diasAtraso({ ...a, inicio_real: '2026-01-01' }, '2026-01-05'), 0)

console.log(`${ok}/${tot} — avanço`)
process.exit(ok === tot ? 0 : 1)
