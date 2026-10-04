// PCP: resultado da baixa, PPC, janela do mestre, saldo, motivos.
import { resultadoBaixa, ppc, mestrePodeAlterar, saldoPendente, contarMotivos, servicosNoPeriodo } from '../src/lib/pcp.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('executou o planejado: concluída', resultadoBaixa(60, 60, null), { status: 'Concluída', motivo: null })
conferir('executou mais que o planejado: concluída', resultadoBaixa(60, 64, null), { status: 'Concluída', motivo: null })
conferir('concluída ignora motivo informado', resultadoBaixa(60, 60, 'Chuva'), { status: 'Concluída', motivo: null })
conferir('executou menos sem motivo: recusa', resultadoBaixa(70, 40, null), { erro: 'Escolha o motivo de não concluir.' })
conferir('executou menos com motivo: não concluída', resultadoBaixa(70, 40, 'Falta de material'), { status: 'Não concluída', motivo: 'Falta de material' })
conferir('executou zero com motivo: não concluída', resultadoBaixa(1, 0, 'Frente não liberada').status, 'Não concluída')
conferir('campo vazio: recusa', resultadoBaixa(60, '', null).erro, 'Informe quanto foi executado.')
conferir('número negativo: recusa', resultadoBaixa(60, -5, null).erro, 'Informe quanto foi executado.')
conferir('aceita texto numérico do campo', resultadoBaixa(3, '3.2', null).status, 'Concluída')

const semana = [{ status: 'Concluída' }, { status: 'Concluída' }, { status: 'Não concluída' }, { status: 'Planejada' }]
conferir('PPC no meio da semana: só o que teve baixa', ppc(semana), { concluidas: 2, base: 3, pct: 67 })
conferir('PPC de semana encerrada: o que ficou sem baixa conta contra', ppc(semana, true), { concluidas: 2, base: 4, pct: 50 })
conferir('PPC sem nenhuma baixa: vazio, não zero', ppc([{ status: 'Planejada' }]).pct, null)

conferir('mestre altera no mesmo dia', mestrePodeAlterar('2026-10-07', '2026-10-07'), true)
conferir('mestre altera no dia seguinte', mestrePodeAlterar('2026-10-06', '2026-10-07'), true)
conferir('mestre não altera dois dias depois', mestrePodeAlterar('2026-10-05', '2026-10-07'), false)

conferir('saldo de não concluída', saldoPendente({ quantidade_planejada: 70, quantidade_executada: 40 }), 30)
conferir('saldo nunca negativo', saldoPendente({ quantidade_planejada: 60, quantidade_executada: 64 }), 0)

conferir('motivos contados e ordenados', contarMotivos([
  { status: 'Não concluída', motivo_nao_conclusao: 'Chuva' }, { status: 'Não concluída', motivo_nao_conclusao: 'Projeto' },
  { status: 'Não concluída', motivo_nao_conclusao: 'Chuva' }, { status: 'Concluída', motivo_nao_conclusao: null },
]), [{ motivo: 'Chuva', total: 2 }, { motivo: 'Projeto', total: 1 }])

const servicos = [
  { id: 1, inicio_previsto: '2026-10-01', fim_previsto: '2026-10-20' },
  { id: 2, inicio_previsto: '2026-11-01', fim_previsto: '2026-11-30' },
  { id: 3, inicio_previsto: '2026-09-01', fim_previsto: '2026-12-01', fim_real: '2026-10-02' },
  { id: 4, inicio_previsto: '2026-10-01', fim_previsto: '2026-10-20', e_resumo: true },
]
conferir('plano de 3 meses: só o que cruza a semana e não terminou', servicosNoPeriodo(servicos, '2026-10-12', '2026-10-17').map((s) => s.id), [1])

console.log(`${ok}/${tot} — pcp`)
process.exit(ok === tot ? 0 : 1)
