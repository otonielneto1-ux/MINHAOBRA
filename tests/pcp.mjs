// PCP: resultado da baixa, PPC, janela do mestre, saldo, motivos.
import { grupoDoMotivo, motivosPorGrupo, resultadoBaixa, mestrePodeAlterar, saldoPendente, contarMotivos, validarAtividade, previaBaixa, equipeDaAtividade, ppcPorSemana, restricaoVencida, copiarPendentes, validarRestricao, validarRemocao, pacotesPara, ligarPacotes, opcoesDePacote, avisoPacoteDaBaixa } from '../src/lib/pcp.js'

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

conferir('prévia: atingiu o programado', previaBaixa(60, '60'), 'Concluída')
conferir('prévia: abaixo do programado', previaBaixa(60, '59,5'), 'Não concluída')
conferir('prévia: campo vazio não decide', previaBaixa(60, ''), null)
conferir('equipe: depois da baixa, a que executou', equipeDaAtividade({ equipe: 'Eq. A', equipe_executou: 'Eq. B' }), 'Eq. B')
conferir('equipe: antes da baixa, a planejada', equipeDaAtividade({ equipe: 'Eq. A', equipe_executou: null }), 'Eq. A')
conferir('restrição pendente com prazo passado: vencida', restricaoVencida({ status: 'Pendente', data_limite: '2026-10-02' }, '2026-10-05'), true)
conferir('restrição removida não vence', restricaoVencida({ status: 'Removida', data_limite: '2026-10-02' }, '2026-10-05'), false)
conferir('restrição sem prazo não vence', restricaoVencida({ status: 'Pendente', data_limite: null }, '2026-10-05'), false)
const historico = [
  { semana_inicio: '2026-09-21', data_prevista: '2026-09-22', status: 'Concluída' }, { semana_inicio: '2026-09-21', data_prevista: '2026-09-23', status: 'Não concluída' },
  { semana_inicio: '2026-09-28', data_prevista: '2026-09-29', status: 'Concluída' },
]
conferir('PPC das últimas semanas, a mais antiga primeiro', ppcPorSemana(historico, '2026-10-05', '2026-10-07', 3).map((x) => [x.semana_inicio, x.pct]),
  [['2026-09-21', 50], ['2026-09-28', 100], ['2026-10-05', null]])

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
const pac = (id, servicos, extra = {}) => ({ id, nome: `P${id}`, status: 'Em execução', fechado_em: null, data_inicio: '2026-09-21', data_fechamento: '2026-10-20', servicos: servicos.map((servico_id) => ({ servico_id })), ...extra })
const recusaPacote = 'Esse pacote não tem este serviço neste dia, está pausado ou já foi fechado.'
conferir('pacote de outro serviço recusa', validarAtividade(campos, { servico: galeria, segunda: seg, pacote: pac(6, [25]) }).erro, recusaPacote)
conferir('atividade nova num dia que já passou: recusa', validarAtividade({ ...campos, data_prevista: '2026-10-06' }, { servico: galeria, segunda: seg, hoje: '2026-10-07', nova: true }).erro, 'Não dá para planejar um dia que já passou.')
conferir('editar atividade de um dia que já passou: pode', validarAtividade({ ...campos, data_prevista: '2026-10-06' }, { servico: galeria, segunda: seg, hoje: '2026-10-07', nova: false }).erro, undefined)
conferir('pacote com o serviço entre outros: aceita', validarAtividade(campos, { servico: galeria, segunda: seg, pacote: pac(3, [27, 22]) }).registro.pacote_id, 3)
conferir('pacote fechado recusa', validarAtividade(campos, { servico: galeria, segunda: seg, pacote: pac(3, [22], { fechado_em: '2026-09-20' }) }).erro, recusaPacote)
conferir('pacote pausado recusa', validarAtividade(campos, { servico: galeria, segunda: seg, pacote: pac(3, [22], { status: 'Pausado' }) }).erro, recusaPacote)
conferir('dia fora do período do pacote recusa', validarAtividade(campos, { servico: galeria, segunda: seg, pacote: pac(3, [22], { data_fechamento: '2026-10-06' }) }).erro, recusaPacote)

// ── Pacote ligado sozinho ──
const varios = [pac(3, [22]), pac(4, [22], { status: 'Pausado' }), pac(5, [22], { data_inicio: '2026-10-08' }), pac(6, [25]), pac(7, [22], { fechado_em: '2026-09-20' })]
conferir('pacotes possíveis: aberto, não pausado, com o serviço e o dia no período', pacotesPara(varios, 22, '2026-10-07').map((p) => p.id), [3])
conferir('dia 08: dois pacotes possíveis', pacotesPara(varios, 22, '2026-10-08').map((p) => p.id), [3, 5])
conferir('sem pacote escolhido: entra sozinho no único possível', validarAtividade(campos, { servico: galeria, segunda: seg, pacotes: varios }).registro.pacote_id, 3)
conferir('dois possíveis e nenhum escolhido: pede para escolher', validarAtividade({ ...campos, data_prevista: '2026-10-08' }, { servico: galeria, segunda: seg, pacotes: varios }).erro,
  'Este serviço está em mais de um pacote neste dia: escolha o pacote.')
conferir('dois possíveis e um escolhido: fica no escolhido', validarAtividade({ ...campos, data_prevista: '2026-10-08' }, { servico: galeria, segunda: seg, pacotes: varios, pacote: varios[2] }).registro.pacote_id, 5)
conferir('nenhum pacote com o serviço: sem pacote', validarAtividade(campos, { servico: { ...galeria, id: 99 }, segunda: seg, pacotes: varios }).registro.pacote_id, null)
const reg = (servico_id, data_prevista, pacote_id = null) => ({ servico_id, data_prevista, pacote_id })
conferir('ligar vários: único, ambíguo e escolhido', ligarPacotes([reg(22, '2026-10-07'), reg(22, '2026-10-08'), reg(25, '2026-10-08')], varios),
  { registros: [reg(22, '2026-10-07', 3), reg(22, '2026-10-08'), reg(25, '2026-10-08', 6)], ambiguos: [22] })
conferir('ligar vários com escolha resolve o ambíguo', ligarPacotes([reg(22, '2026-10-08')], varios, { 22: '5' }).registros[0].pacote_id, 5)
const pausadoDia7 = [pac(9, [26], { status: 'Pausado', pausa_desde: '2026-10-07' })]
conferir('pacote pausado recebe só os dias antes da pausa (correção da revisão)', [pacotesPara(pausadoDia7, 26, '2026-10-06').length, pacotesPara(pausadoDia7, 26, '2026-10-07').length], [1, 0])
conferir('campo Pacote: um possível vem escolhido', opcoesDePacote(varios, 22, '2026-10-07', '').pacoteId, 3)
conferir('campo Pacote: dois possíveis e nada escolhido fica vazio', opcoesDePacote(varios, 22, '2026-10-08', '').pacoteId, '')
conferir('campo Pacote: escolhido que não serve mais no dia é trocado', opcoesDePacote(varios, 22, '2026-10-07', '5').pacoteId, 3)
conferir('campo Pacote: sem serviço, nada', opcoesDePacote(varios, undefined, '2026-10-07', '').possiveis, [])
conferir('baixa de atividade sem pacote com dois possíveis: avisa', !!avisoPacoteDaBaixa({ pacote_id: null, servico_id: 22, data_prevista: '2026-10-08' }, varios), true)
conferir('baixa com pacote ou com um possível: sem aviso', [avisoPacoteDaBaixa({ pacote_id: 3, servico_id: 22, data_prevista: '2026-10-08' }, varios), avisoPacoteDaBaixa({ pacote_id: null, servico_id: 22, data_prevista: '2026-10-07' }, varios)], [null, null])
conferir('escolha que não serve naquele dia é ignorada', ligarPacotes([reg(22, '2026-10-07')], varios, { 22: 5 }).registros[0].pacote_id, 3)

const semana = [
  { id: 1, semana_inicio: seg, data_prevista: '2026-10-06', servico_id: 22, local: 'Rua 2', quantidade_planejada: 60, quantidade_executada: 35, status: 'Não concluída', equipe: 'Eq. Raimundo', pacote_id: 3 },
  { id: 2, semana_inicio: seg, data_prevista: '2026-10-07', servico_id: 24, local: 'Rua 3', quantidade_planejada: 80, quantidade_executada: 80, status: 'Concluída', pacote_id: null },
  { id: 3, semana_inicio: seg, data_prevista: '2026-10-08', servico_id: 24, local: 'Rua 3', quantidade_planejada: 80, quantidade_executada: 0, status: 'Não concluída', pacote_id: 5 },
]
const pacotesAbertos = [pac(3, [22]), pac(5, [24], { fechado_em: '2026-10-08' })]
const copias = copiarPendentes(semana, pacotesAbertos, seg, '2026-10-07')
conferir('copia as duas não concluídas', copias.map((c) => c.copiada_de_id), [1, 3])
conferir('cópia: mesmo dia da semana seguinte, com o saldo', copias[0], { semana_inicio: '2026-10-12', data_prevista: '2026-10-13', servico_id: 22, local: 'Rua 2', quantidade_planejada: 25, equipe: 'Eq. Raimundo', pacote_id: 3, copiada_de_id: 1 })
conferir('cópia: pacote fechado fica de fora', copias[1].pacote_id, null)
conferir('cópia: entra no pacote possível do novo dia', copiarPendentes(semana, [...pacotesAbertos, pac(8, [24])], seg, '2026-10-07')[1].pacote_id, 8)
conferir('cópia: pacote que fecha antes do novo dia sai', copiarPendentes(semana, [pac(3, [22], { data_fechamento: '2026-10-10' })], seg, '2026-10-07')[0].pacote_id, null)
conferir('cópia que cairia num dia passado não é criada', copiarPendentes(semana, pacotesAbertos, seg, '2026-10-14').map((c) => c.copiada_de_id), [3])
conferir('não copia duas vezes', copiarPendentes([...semana, { id: 9, copiada_de_id: 1 }], pacotesAbertos, seg, '2026-10-07').map((c) => c.copiada_de_id), [3])

// ── Restrições ──
conferir('restrição válida', validarRestricao({ tipo: 'Material', descricao: ' Tubos ', responsavel: '', data_limite: '' }),
  { registro: { tipo: 'Material', descricao: 'Tubos', responsavel: null, data_limite: null } })
conferir('restrição sem tipo', validarRestricao({ descricao: 'x' }).erro, 'Escolha o tipo da restrição.')
conferir('restrição sem descrição', validarRestricao({ tipo: 'Outro', descricao: '' }).erro, 'Descreva a restrição.')
conferir('remover com data', validarRemocao('2026-10-05', '2026-10-05'), { registro: { status: 'Removida', removida_em: '2026-10-05' } })
conferir('remover sem data', validarRemocao('', '2026-10-05').erro, 'Informe a data em que a restrição foi removida.')
conferir('remover com data futura', validarRemocao('2026-10-06', '2026-10-05').erro, 'A data não pode ser futura.')

// ── Grupos macro dos motivos ──
import { GRUPOS_MOTIVO } from '../src/lib/vocabulario.js'
const MOTIVOS_NAO_CONCLUSAO = Object.values(GRUPOS_MOTIVO).flat()
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
