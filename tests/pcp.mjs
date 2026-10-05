// PCP: resultado da baixa, PPC, janela do mestre, saldo, motivos.
import { grupoDoMotivo, motivosPorGrupo, resultadoBaixa, mestrePodeAlterar, saldoPendente, contarMotivos, servicosNoPeriodo, validarAtividade, copiarPendentes, validarRestricao, validarRemocao } from '../src/lib/pcp.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('executou o planejado: concluída', resultadoBaixa(60, 60, null, 'Eq. Raimundo'), { status: 'Concluída', motivo: null })
conferir('executou mais que o planejado: concluída', resultadoBaixa(60, 64, null, 'Eq. Raimundo'), { status: 'Concluída', motivo: null })
conferir('concluída ignora motivo informado', resultadoBaixa(60, 60, 'Chuva', 'Eq. Raimundo'), { status: 'Concluída', motivo: null })
conferir('executou menos sem motivo: recusa', resultadoBaixa(70, 40, null, 'Eq. Raimundo'), { erro: 'Escolha o motivo de não concluir.' })
conferir('executou menos com motivo: não concluída', resultadoBaixa(70, 40, 'Falta de material', 'Eq. Raimundo'), { status: 'Não concluída', motivo: 'Falta de material' })
conferir('executou zero com motivo: não concluída', resultadoBaixa(1, 0, 'Frente não liberada', 'Eq. Raimundo').status, 'Não concluída')
conferir('campo vazio: recusa', resultadoBaixa(60, '', null, 'Eq. Raimundo').erro, 'Informe quanto foi executado.')
conferir('número negativo: recusa', resultadoBaixa(60, -5, null, 'Eq. Raimundo').erro, 'Informe quanto foi executado.')
conferir('sem equipe: recusa', resultadoBaixa(60, 60, null, ' ').erro, 'Informe a equipe que fez a atividade.')
conferir('aceita texto numérico do campo', resultadoBaixa(3, '3.2', null, 'Eq. Raimundo').status, 'Concluída')


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

// ── Montar a semana ──
const galeria = { id: 22, nome: 'Galeria', e_resumo: false, cancelado: false, unidade: 'm', quantidade_prevista: 3200, quantidade_executada: 1534, inicio_previsto: '2026-08-03', fim_previsto: '2026-11-30', local: 'Ruas 1 a 4' }
const seg = '2026-10-05'
const campos = { data_prevista: '2026-10-07', local: ' Rua 2 ', quantidade_planejada: '60', equipe: '' }
conferir('atividade válida', validarAtividade(campos, { servico: galeria, segunda: seg }),
  { registro: { semana_inicio: seg, data_prevista: '2026-10-07', servico_id: 22, local: 'Rua 2', quantidade_planejada: 60, equipe: null, pacote_id: null } })
conferir('sem serviço recusa', validarAtividade(campos, { segunda: seg }).erro, 'Escolha o serviço.')
conferir('serviço resumo recusa', validarAtividade(campos, { servico: { ...galeria, e_resumo: true }, segunda: seg }).erro, 'Esse serviço não recebe atividade.')
conferir('domingo fica fora da semana', validarAtividade({ ...campos, data_prevista: '2026-10-11' }, { servico: galeria, segunda: seg }).erro, 'Escolha um dia desta semana (segunda a sábado).')
conferir('sem local recusa', validarAtividade({ ...campos, local: ' ' }, { servico: galeria, segunda: seg }).erro, 'Informe o local.')
conferir('quantidade zero recusa', validarAtividade({ ...campos, quantidade_planejada: '0' }, { servico: galeria, segunda: seg }).erro, 'Informe a quantidade planejada.')
conferir('pacote de outro serviço recusa', validarAtividade(campos, { servico: galeria, segunda: seg, pacote: { id: 6, servico_id: 25 } }).erro, 'Esse pacote não é deste serviço ou já foi fechado.')
conferir('pacote fechado recusa', validarAtividade(campos, { servico: galeria, segunda: seg, pacote: { id: 3, servico_id: 22, fechado_em: '2026-09-20' } }).erro, 'Esse pacote não é deste serviço ou já foi fechado.')

const semana = [
  { id: 1, semana_inicio: seg, data_prevista: '2026-10-06', servico_id: 22, local: 'Rua 2', quantidade_planejada: 60, quantidade_executada: 35, status: 'Não concluída', equipe: 'Eq. Raimundo', pacote_id: 3 },
  { id: 2, semana_inicio: seg, data_prevista: '2026-10-07', servico_id: 24, local: 'Rua 3', quantidade_planejada: 80, quantidade_executada: 80, status: 'Concluída', pacote_id: null },
  { id: 3, semana_inicio: seg, data_prevista: '2026-10-08', servico_id: 24, local: 'Rua 3', quantidade_planejada: 80, quantidade_executada: 0, status: 'Não concluída', pacote_id: 5 },
]
const pacotesAbertos = [{ id: 3, fechado_em: null }, { id: 5, fechado_em: '2026-10-08' }]
const copias = copiarPendentes(semana, pacotesAbertos, seg)
conferir('copia as duas não concluídas', copias.map((c) => c.copiada_de_id), [1, 3])
conferir('cópia: mesmo dia da semana seguinte, com o saldo', copias[0], { semana_inicio: '2026-10-12', data_prevista: '2026-10-13', servico_id: 22, local: 'Rua 2', quantidade_planejada: 25, equipe: 'Eq. Raimundo', pacote_id: 3, copiada_de_id: 1 })
conferir('cópia: pacote fechado fica de fora', copias[1].pacote_id, null)
conferir('não copia duas vezes', copiarPendentes([...semana, { id: 9, copiada_de_id: 1 }], pacotesAbertos, seg).map((c) => c.copiada_de_id), [3])

// ── Restrições ──
conferir('restrição válida', validarRestricao({ tipo: 'Material', descricao: ' Tubos ', responsavel: '', data_limite: '' }),
  { registro: { tipo: 'Material', descricao: 'Tubos', responsavel: null, data_limite: null } })
conferir('restrição sem tipo', validarRestricao({ descricao: 'x' }).erro, 'Escolha o tipo da restrição.')
conferir('restrição sem descrição', validarRestricao({ tipo: 'Outro', descricao: '' }).erro, 'Descreva a restrição.')
conferir('remover com data', validarRemocao('2026-10-05', '2026-10-05'), { registro: { status: 'Removida', removida_em: '2026-10-05' } })
conferir('remover sem data', validarRemocao('', '2026-10-05').erro, 'Informe a data em que a restrição foi removida.')
conferir('remover com data futura', validarRemocao('2026-10-06', '2026-10-05').erro, 'A data não pode ser futura.')

// ── Grupos macro dos motivos ──
import { GRUPOS_MOTIVO, MOTIVOS_NAO_CONCLUSAO } from '../src/lib/vocabulario.js'
conferir('sete grupos', Object.keys(GRUPOS_MOTIVO), ['Condição climática', 'Execução', 'Planejamento', 'Projetos', 'Suprimentos', 'Segurança', 'Outros'])
conferir('cada causa em um grupo só', MOTIVOS_NAO_CONCLUSAO.length, new Set(MOTIVOS_NAO_CONCLUSAO).size)
conferir('chuva é condição climática', grupoDoMotivo('Chuva'), 'Condição climática')
conferir('falta de EPI é segurança', grupoDoMotivo('Falta de EPI'), 'Segurança')
conferir('causa desconhecida vai para outros', grupoDoMotivo('Projeto'), 'Outros')
const naoConc = (data, motivo) => ({ data_prevista: data, status: 'Não concluída', motivo_nao_conclusao: motivo })
const doMes = [
  naoConc('2026-10-01', 'Chuva'), naoConc('2026-10-02', 'Chuva'), naoConc('2026-10-03', 'Solo encharcado'),
  naoConc('2026-10-05', 'Falta de material'), naoConc('2026-09-30', 'Chuva'),
  { data_prevista: '2026-10-06', status: 'Concluída', motivo_nao_conclusao: null },
]
conferir('pizza do mês: grupos com causas, maior primeiro; outro mês fica fora', motivosPorGrupo(doMes, '2026-10'), [
  { grupo: 'Condição climática', total: 3, causas: [{ motivo: 'Chuva', total: 2 }, { motivo: 'Solo encharcado', total: 1 }] },
  { grupo: 'Suprimentos', total: 1, causas: [{ motivo: 'Falta de material', total: 1 }] },
])
conferir('mês sem não concluídas: vazio', motivosPorGrupo(doMes, '2026-08'), [])

console.log(`${ok}/${tot} — pcp`)
process.exit(ok === tot ? 0 : 1)
