// Semana como cronograma: linhas, distribuir na semana, ritmo irreal, antecipar e conferência de início.
import { acumuladosDaSemana, ritmoDaSemana, linhasDaSemana, linhasTresMeses, melhorRitmo, ritmoPlanejado, distribuirNaSemana, podeAntecipar, precisaConferencia, conferenciaOk, CONFERENCIA_INICIO } from '../src/lib/pcp.js'
import { diasUteisEntre } from '../src/lib/datas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const seg = '2026-10-05'
const hoje = '2026-10-07' // quarta
const srv = (id, eap, ini, fim, extra = {}) => ({
  id, codigo_eap: eap, nome: `S${id}`, e_resumo: false, cancelado: false, unidade: 'm', quantidade_prevista: 100, quantidade_executada: 0,
  inicio_previsto: ini, fim_previsto: fim, inicio_base: ini, fim_base: fim, inicio_real: null, fim_real: null, local: 'Rua 1', ...extra,
})

conferir('dias de trabalho de segunda a domingo = 6', diasUteisEntre('2026-10-05', '2026-10-11'), 6)
conferir('dias de trabalho com fim antes do início = 0', diasUteisEntre('2026-10-10', '2026-10-05'), 0)

// ── Linhas da semana ──
const servicos = [
  srv(1, '2.1', '2026-09-01', '2026-11-30', { quantidade_executada: 30, inicio_real: '2026-09-01' }),
  srv(2, '2.3', '2026-07-01', '2026-09-25', { quantidade_executada: 80, inicio_real: '2026-07-01' }), // atrasado 12 dias
  srv(3, '2.5', '2026-11-01', '2026-12-31'),                                                          // ainda não chegou
  srv(4, '1.1', '2026-03-02', '2026-03-31', { quantidade_executada: 100, fim_real: '2026-04-03' }),  // terminado
  srv(5, '2', '2026-01-01', '2027-01-01', { e_resumo: true }),
  srv(6, '2.2', '2026-08-03', '2026-11-30', { quantidade_executada: 10, inicio_real: '2026-08-03' }),
]
const linhas = linhasDaSemana(servicos, [], seg, hoje)
conferir('atrasado no topo, depois por EAP; futuro, terminado e resumo ficam fora', linhas.map((l) => l.servico.id), [2, 1, 6])
conferir('dias de atraso do atrasado', linhas[0].atraso, 12)
const comAtividade = [{ id: 9, semana_inicio: '2026-09-21', servico_id: 4, data_prevista: '2026-09-22' }]
conferir('semana passada: só o que teve atividade', linhasDaSemana(servicos, comAtividade, '2026-09-21', hoje).map((l) => l.servico.id), [4])

// ── 3 meses ──
const semanas = [seg, '2026-10-12', '2026-10-19']
const tres = linhasTresMeses(servicos, semanas, hoje)
conferir('3 meses: atrasado no topo; terminado e resumo fora; futuro além da janela fora', tres.map((l) => l.servico.id), [2, 1, 6])
conferir('3 meses: atrasado aparece só na semana atual', tres[0].ativas, [seg])
conferir('3 meses: em andamento ativo nas três semanas', tres[1].ativas, semanas)
conferir('3 meses: começa no meio da janela', linhasTresMeses([srv(9, '4', '2026-10-14', '2026-10-15')], semanas, hoje)[0].ativas, ['2026-10-12'])

// ── Acumulados (última coluna) ──
const prods = [
  { servico_id: 22, data: '2026-09-30', quantidade: 100.1 }, { servico_id: 22, data: '2026-10-04', quantidade: 50.2 }, // antes da semana (domingo conta)
  { servico_id: 22, data: '2026-10-06', quantidade: 60 }, { servico_id: 22, data: '2026-10-10', quantidade: -4 },     // na semana (ajuste negativo também)
  { servico_id: 22, data: '2026-10-12', quantidade: 70 }, { servico_id: 23, data: '2026-10-06', quantidade: 999 },    // depois / outro serviço
]
conferir('total, acumulado anterior e acumulado até o fim da semana',
  acumuladosDaSemana({ id: 22, quantidade_prevista: 3200 }, prods, seg), { total: 3200, anterior: 150.3, executado: 206.3 })

// ── Ritmo ──
const producoes = [
  { servico_id: 22, data: '2026-09-29', quantidade: 62 }, { servico_id: 22, data: '2026-10-02', quantidade: 60 },
  { servico_id: 22, data: '2026-09-22', quantidade: 60 }, { servico_id: 22, data: '2026-10-06', quantidade: 500 }, // semana atual não conta
  { servico_id: 23, data: '2026-09-30', quantidade: 999 },
]
conferir('melhor ritmo = melhor média por dia trabalhado nas 4 semanas anteriores', melhorRitmo(producoes, 22, hoje), 61)
conferir('sem produção: null', melhorRitmo(producoes, 99, hoje), null)
conferir('ritmo planejado = prevista ÷ dias de trabalho da linha de base', ritmoPlanejado(srv(7, '1', '2026-10-05', '2026-10-10', { quantidade_prevista: 60 })), 10)

// ── Distribuir ──
const galeria = srv(22, '2.2', '2026-08-03', '2026-11-30', { quantidade_prevista: 3200, quantidade_executada: 1534, local: 'Ruas 1 a 4' })
const d = distribuirNaSemana(galeria, { segunda: seg, hoje, producoes })
conferir('distribui de hoje a sábado', d.dias, ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'])
conferir('por dia = 1.666 m ÷ 47 dias de trabalho até 30/11', d.porDia, 35.45)
conferir('ritmo possível: sem alerta, base no histórico', [d.irreal, d.base, d.referencia], [false, 'histórico', 61])
conferir('registro de cada dia', d.registros[0], { semana_inicio: seg, data_prevista: '2026-10-07', servico_id: 22, local: 'Ruas 1 a 4', quantidade_planejada: 35.45, equipe: null, pacote_id: null })
conferir('dia que já tem atividade fica de fora', distribuirNaSemana(galeria, { segunda: seg, hoje, producoes, ocupados: ['2026-10-08'] }).dias.length, 3)
const apertado = distribuirNaSemana({ ...galeria, fim_previsto: '2026-10-10' }, { segunda: seg, hoje, producoes })
conferir('fim no sábado: 416,5 m/dia é irreal (> 1,5 × 61)', [apertado.porDia, apertado.irreal], [416.5, true])
const vencido = distribuirNaSemana({ ...galeria, fim_previsto: '2026-09-30' }, { segunda: seg, hoje, producoes })
conferir('prazo vencido: o que falta cabe nesta semana', [vencido.prazoVencido, vencido.dias.length, vencido.porDia], [true, 4, 416.5])
const semHistorico = distribuirNaSemana({ ...galeria, id: 77 }, { segunda: seg, hoje, producoes })
conferir('sem histórico: compara com o ritmo planejado', semHistorico.base, 'planejado')
conferir('começa na quinta: só a partir do início previsto', distribuirNaSemana(srv(8, '3', '2026-10-08', '2026-10-20'), { segunda: seg, hoje, producoes }).dias[0], '2026-10-08')
conferir('antecipar: começa já, mesmo previsto para depois', distribuirNaSemana(srv(8, '3', '2026-10-20', '2026-10-31'), { segunda: seg, hoje, producoes, antecipar: true }).dias[0], hoje)
conferir('nada a fazer: null', distribuirNaSemana({ ...galeria, quantidade_executada: 3200 }, { segunda: seg, hoje, producoes }), null)
conferir('semana passada: null', distribuirNaSemana(galeria, { segunda: '2026-09-28', hoje, producoes }), null)

// ── Ritmo da semana (colunas Cronograma / Precisa) ──
const rg = ritmoDaSemana(galeria, { segunda: seg, hoje, producoes })
conferir('cronograma: 3.200 m ÷ 103 dias de trabalho da linha de base', Math.round(rg.planejado * 100) / 100, 31.07)
conferir('precisa: 1.666 m ÷ 47 dias de hoje até 30/11', Math.round(rg.necessario * 100) / 100, 35.45)
conferir('precisa mesmo com a semana toda planejada (não depende de dia livre)', rg.irreal, false)
conferir('terminado: precisa zero', ritmoDaSemana({ ...galeria, quantidade_executada: 3300 }, { segunda: seg, hoje, producoes }).necessario, 0)

// ── Antecipar ──
const futuros = [
  srv(31, '3.1', '2026-10-20', '2026-11-20'),                                   // livre
  srv(32, '3.2', '2026-10-20', '2026-11-20'),                                   // predecessora TI não terminou
  srv(33, '3.3', '2026-10-20', '2026-11-20'),                                   // restrição pendente
  srv(34, '3.4', '2026-12-01', '2026-12-20'),                                   // longe demais
  srv(35, '3.5', '2026-10-20', '2026-11-20', { quantidade_executada: 5 }),      // já começou
  srv(36, '3.6', '2026-10-20', '2026-11-20'),                                   // II com predecessora começada
  srv(40, '2.9', '2026-09-01', '2026-11-30', { quantidade_executada: 10, inicio_real: '2026-09-01' }),
]
const deps = [{ servico_id: 32, predecessora_id: 40, tipo: 'TI' }, { servico_id: 36, predecessora_id: 40, tipo: 'II' }]
const restricoes = [{ servico_id: 33, status: 'Pendente' }, { servico_id: 31, status: 'Removida' }]
conferir('pode antecipar: livre e o de início-início', podeAntecipar(futuros, deps, restricoes, seg).map((s) => s.id), [31, 36])

// ── Conferência de início ──
conferir('serviço que não começou e sem atividade pede conferência', precisaConferencia(srv(31, '3.1', '2026-10-20', '2026-11-20'), []), true)
conferir('já tem atividade: não pede', precisaConferencia(srv(31, '3.1', '2026-10-20', '2026-11-20'), [{ servico_id: 31 }]), false)
conferir('já começou: não pede', precisaConferencia(galeria, []), false)
conferir('quatro perguntas', CONFERENCIA_INICIO.length, 4)
conferir('só libera com as quatro "sim"', [conferenciaOk([true, true, true, true]), conferenciaOk([true, true, false, true]), conferenciaOk([true, true, true])], [true, false, false])

console.log(`${ok}/${tot} — semana`)
if (ok !== tot) process.exit(1)
