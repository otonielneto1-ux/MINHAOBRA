// Prêmio de produção: proporcional aos dias, só mão de obra própria, centavo sobrando para quem tem mais dias.
import { premioReal, metaDoCronograma, metaEditada, diasUteisAteFechamento, renovacoesPendentes, camposDaRenovacao, dividirIgual, colaboradoresPorParte, pacoteBateuMeta, validarPacote, proximoFechamento, previaFechamento, fechamentosAnteriores, planilhaPremios, linhasDosPremios, pctPacote, pctServicoDoPacote, diasPorFuncionario, valoresDoPacote, premioDoPacote, ehAjudante, dividirParte, fatorDoPremio, entrouEm, validarPausa, destinosPossiveis, validarRemanejo, ritmoDaMeta, pctPrevisto, elegiveisAoPacote, metaAoMudarData, fechamentoDoMes, resumoDaFolha, validarAjustePremio, linhasDosAjustes, ajustesDaFolha } from '../src/lib/premio.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const dias = (id, tipo, n) => Array.from({ length: n }, () => ({ funcionario_id: id, tipo_mao_obra: tipo }))

conferir('R$ 3.000 para 2 pedreiros = R$ 1.500 cada', dividirIgual(3000, [7, 3]), [{ funcionario_id: 3, valor: 1500 }, { funcionario_id: 7, valor: 1500 }])
conferir('R$ 100 para 3: centavo que sobra vai para o primeiro', dividirIgual(100, [3, 1, 2]).map((l) => l.valor), [33.34, 33.33, 33.33])
conferir('R$ 0,05 para 3: um centavo a mais para cada um dos primeiros', dividirIgual(0.05, [1, 2, 3]).map((l) => l.valor), [0.02, 0.02, 0.01])
conferir('ninguém escolhido: ninguém recebe', dividirIgual(500, []), [])

// ── Cadastro do pacote (vários serviços, MO profissional/ajudante, colaboradores) ──
const servicos = [
  { id: 22, nome: 'Galeria', e_resumo: false, cancelado: false },
  { id: 27, nome: 'Poço de visita', e_resumo: false, cancelado: false },
  { id: 2, nome: 'Fase 01', e_resumo: true, cancelado: false },
]
const campos = {
  nome: ' Galeria Rua 3 ', local: ' Rua 3 ', data_inicio: '2026-10-05', data_fechamento: '2026-10-20', status: 'Liberado', pct_pago: '30',
  itens: [
    { servico_id: '22', quantidade_meta: '400', meta_cronograma: 380.5, mo_profissional: '1.200,00', mo_ajudante: '600' },
    { servico_id: '27', quantidade_meta: '20', mo_profissional: '300', mo_ajudante: '' },
  ],
  colaboradores: ['101', 105, 105],
}
conferir('pacote válido: serviços, MO (vazio = 0) e colaboradores sem repetir', validarPacote(campos, { servicos }), {
  registro: { nome: 'Galeria Rua 3', local: 'Rua 3', data_inicio: '2026-10-05', data_fechamento: '2026-10-20', status: 'Liberado', pct_pago: 30, renovado_de_id: null },
  itens: [
    { servico_id: 22, quantidade_meta: 400, meta_cronograma: 380.5, mo_profissional: 1200, mo_ajudante: 600 },
    { servico_id: 27, quantidade_meta: 20, meta_cronograma: null, mo_profissional: 300, mo_ajudante: 0 },
  ],
  colaboradores: [{ funcionario_id: 101, entrou_em: null }, { funcionario_id: 105, entrou_em: null }],
})
const editando = { status: 'Em execução', servicos: [], colaboradores: [101, 107], entradas: { 107: '2026-10-07' } }
conferir('editar pacote já começado: novo colaborador entra hoje; quem estava mantém a data', validarPacote({ ...campos, colaboradores: [101, 105, 107] }, { servicos, atual: editando, hoje: '2026-10-08' }).colaboradores,
  [{ funcionario_id: 101, entrou_em: null }, { funcionario_id: 105, entrou_em: '2026-10-08' }, { funcionario_id: 107, entrou_em: '2026-10-07' }])
conferir('pacote que ainda não começou: novo colaborador desde o início', validarPacote({ ...campos, data_inicio: '2026-10-12', colaboradores: [105] }, { servicos, atual: editando, hoje: '2026-10-08' }).colaboradores,
  [{ funcionario_id: 105, entrou_em: null }])
conferir('pacote pausado continua pausado ao editar', validarPacote({ ...campos, status: 'Pausado' }, { servicos, atual: { ...editando, status: 'Pausado' } }).registro.status, 'Pausado')
conferir('pausar não é pela edição', validarPacote({ ...campos, status: 'Pausado' }, { servicos, atual: editando }).erro, 'Escolha o status (Planejado, Liberado ou Em execução).')
conferir('sem nome', validarPacote({ ...campos, nome: '' }, { servicos }).erro, 'Dê um nome ao pacote.')
conferir('sem serviço', validarPacote({ ...campos, itens: [] }, { servicos }).erro, 'Inclua pelo menos um serviço no pacote.')
conferir('serviço resumo', validarPacote({ ...campos, itens: [{ servico_id: 2, quantidade_meta: '1' }] }, { servicos }).erro, '"Fase 01" não recebe produção.')
conferir('serviço repetido', validarPacote({ ...campos, itens: [campos.itens[0], campos.itens[0]] }, { servicos }).erro, '"Galeria" está duas vezes no pacote.')
conferir('meta zero', validarPacote({ ...campos, itens: [{ ...campos.itens[0], quantidade_meta: '0' }] }, { servicos }).erro, 'Informe a quantidade-meta de "Galeria".')
conferir('MO inválida', validarPacote({ ...campos, itens: [{ ...campos.itens[0], mo_ajudante: '-1' }] }, { servicos }).erro, 'Valor de MO inválido em "Galeria".')
conferir('sem MO nenhuma', validarPacote({ ...campos, itens: [{ servico_id: 22, quantidade_meta: '1', mo_profissional: '', mo_ajudante: '0' }] }, { servicos }).erro, 'Informe a MO orçada de pelo menos um serviço.')
conferir('sem % pago', validarPacote({ ...campos, pct_pago: '' }, { servicos }).erro, 'Informe o % pago sobre o orçamento (de 1 a 100).')
conferir('% pago acima de 100', validarPacote({ ...campos, pct_pago: '120' }, { servicos }).erro, 'Informe o % pago sobre o orçamento (de 1 a 100).')
conferir('fechamento antes do início', validarPacote({ ...campos, data_fechamento: '2026-10-01' }, { servicos }).erro, 'O fechamento não pode ser antes do início.')
conferir('status Concluído só pelo fechamento', validarPacote({ ...campos, status: 'Concluído' }, { servicos }).erro, 'Escolha o status (Planejado, Liberado ou Em execução).')
conferir('pacote fechado não edita', validarPacote(campos, { servicos, atual: { fechado_em: '2026-09-20' } }).erro, 'Pacote fechado na folha não pode ser editado.')
conferir('serviço com produção não sai', validarPacote({ ...campos, itens: [campos.itens[1]] }, { servicos, atual: { servicos: [{ servico_id: 22, quantidade_executada: 10 }] } }).erro,
  'Um serviço com produção lançada não pode sair do pacote.')

conferir('próximo fechamento: ainda neste mês', proximoFechamento('2026-10-05', 20), '2026-10-20')
conferir('próximo fechamento: já passou, vai para o mês seguinte', proximoFechamento('2026-10-21', 20), '2026-11-20')
conferir('próximo fechamento: dia 31 em novembro vira 30', proximoFechamento('2026-11-01', 31), '2026-11-30')
conferir('fechamento do mês: dia 31 em novembro vira 30 (correção da revisão)', fechamentoDoMes('2026-11-05', 31), '2026-11-30')
conferir('fechamento do mês: dia 20', fechamentoDoMes('2026-10-25', 20), '2026-10-20')
conferir('próximo fechamento: virada do ano', proximoFechamento('2026-12-25', 20), '2027-01-20')

// ── Meta e % com vários serviços ──
const ps = (servico_id, meta, exec, prof = 0, ajud = 0) => ({ servico_id, quantidade_meta: meta, quantidade_executada: exec, mo_profissional: prof, mo_ajudante: ajud })
conferir('bateu a meta só com todos os serviços em 100%', [
  pacoteBateuMeta({ servicos: [ps(22, 400, 400), ps(27, 20, 20)] }), pacoteBateuMeta({ servicos: [ps(22, 400, 500), ps(27, 20, 19)] }), pacoteBateuMeta({ servicos: [] }),
], [true, false, false])
conferir('% do pacote: média dos serviços, cada um até 100', pctPacote({ servicos: [ps(22, 400, 260), ps(27, 20, 40)] }), 82.5)
conferir('% de um serviço do pacote', pctServicoDoPacote(ps(22, 400, 260)), 65)
conferir('valores do pacote: soma das MO', valoresDoPacote({ servicos: [ps(22, 1, 0, 1200, 600), ps(27, 1, 0, 300, 0)] }), { profissional: 1500, ajudante: 600, total: 2100 })

// ── Prêmio: profissional e ajudante separados, só colaboradores ──
const funcionarios = [
  { id: 1, nome: 'Raimundo Sousa', matricula: '1021', funcao: 'Encarregado', tipo_mao_obra: 'Direta' },
  { id: 2, nome: 'Ana; Moura', matricula: '1060', funcao: 'Pedreiro', tipo_mao_obra: 'Direta' },
  { id: 3, nome: 'Paulo', matricula: null, funcao: 'Servente', tipo_mao_obra: 'Direta' },
  { id: 4, nome: 'Gilvan', matricula: '1043', funcao: 'Servente', tipo_mao_obra: 'Direta' },
  { id: 5, nome: 'Fora', matricula: '9', funcao: 'Pedreiro', tipo_mao_obra: 'Direta' },
]
conferir('servente é ajudante', [ehAjudante(funcionarios[2]), ehAjudante(funcionarios[1])], [true, false])
const pres = (f, data, pacote_id, situacao = 'Presente') => ({ funcionario_id: f, data, pacote_id, situacao })
const pacote = (id, nome, servs, colaboradores, extra = {}) => ({ id, nome, servicos: servs, colaboradores, pct_pago: 100, data_inicio: '2026-10-01', data_fechamento: '2026-10-20', fechado_em: null, ...extra })
const galeriaPac = pacote(10, 'Galeria', [ps(22, 100, 100, 1000, 300)], [1, 2, 3, 4])
const presencas = [
  pres(1, '2026-10-02', 10), pres(1, '2026-10-03', 10), pres(2, '2026-10-02', 10),   // profissionais: 2 + 1 dias
  pres(3, '2026-10-02', 10), pres(4, '2026-10-02', 10), pres(4, '2026-10-03', 10),   // serventes: 1 + 2 dias
  pres(5, '2026-10-02', 10),                                                         // não é colaborador: não recebe
  pres(1, '2026-09-30', 10), pres(2, '2026-10-04', 10, 'Falta'),                     // fora do período / falta
]
conferir('prêmio em partes iguais por parte; dias só como informação', premioDoPacote(galeriaPac, presencas, funcionarios), {
  linhas: [
    { funcionario_id: 1, dias: 2, valor: 500, parte: 'profissional' }, { funcionario_id: 2, dias: 1, valor: 500, parte: 'profissional' },
    { funcionario_id: 3, dias: 1, valor: 150, parte: 'ajudante' }, { funcionario_id: 4, dias: 2, valor: 150, parte: 'ajudante' },
  ],
  avisos: [],
})
conferir('colaborador escolhido sem presença também recebe a parte igual', premioDoPacote(pacote(16, 'Sem efetivo', [ps(22, 1, 1, 3000, 0)], [2, 5]), [], funcionarios).linhas.map((l) => [l.funcionario_id, l.valor, l.dias]),
  [[2, 1500, 0], [5, 1500, 0]])
conferir('quem recebe cada parte', Object.values(colaboradoresPorParte({ colaboradores: [1, 3, 99] }, funcionarios)).map((l) => l.map((f) => f.id)), [[1], [3]])
conferir('MO ajudante sem servente escolhido: aviso', premioDoPacote(pacote(11, 'Meio-fio', [ps(25, 1, 1, 100, 50)], [1]), [pres(1, '2026-10-02', 11)], funcionarios).avisos,
  ['Pacote Meio-fio: a MO ajudante não tem nenhum colaborador servente escolhido.'])
conferir('MO ajudante zero não pede servente', premioDoPacote(pacote(12, 'Só prof', [ps(25, 1, 1, 100, 0)], [1]), [pres(1, '2026-10-02', 12)], funcionarios),
  { linhas: [{ funcionario_id: 1, dias: 1, valor: 100, parte: 'profissional' }], avisos: [] })

// ── Quem entra no meio do período: proporcional aos dias úteis ──
// Pacote de 01/10 a 20/10 = 14 dias úteis (seg–sex). Pedreiro 5 entra em 12/10: 7 dias úteis.
const comEntrada = pacote(17, 'Entrada', [ps(22, 1, 1, 3000, 0)], [1, 2, 5], { entradas: { 5: '2026-10-12' } })
conferir('quem entrou: parte igual × 7/14; o resto fica com quem estava desde o início', premioDoPacote(comEntrada, [], funcionarios).linhas.map((l) => [l.funcionario_id, l.valor]),
  [[1, 1250], [2, 1250], [5, 500]])
conferir('entrada no dia do início conta como desde o início', entrouEm({ data_inicio: '2026-10-01', entradas: { 5: '2026-10-01' } }, 5), null)
conferir('todos entraram depois: o resto vai para todos', dividirParte(100, 100, [{ funcionario_id: 2, cheio: false, du: 7 }, { funcionario_id: 1, cheio: false, du: 7 }], 14),
  [{ funcionario_id: 1, valor: 50 }, { funcionario_id: 2, valor: 50 }])
conferir('centavo: quem entrou arredonda, o resto fecha a conta', dividirParte(100, 100, [{ funcionario_id: 1, cheio: true }, { funcionario_id: 2, cheio: true }, { funcionario_id: 3, cheio: false, du: 1 }], 14),
  [{ funcionario_id: 1, valor: 48.81 }, { funcionario_id: 2, valor: 48.81 }, { funcionario_id: 3, valor: 2.38 }])
conferir('entrou depois do fechamento: não recebe', dividirParte(100, 100, [{ funcionario_id: 1, cheio: true }, { funcionario_id: 3, cheio: false, du: 0 }], 14),
  [{ funcionario_id: 1, valor: 100 }])

// ── Quem saiu do pacote pausado: parte cheia × % da meta na saída, garantido; o resto fica com quem ficou ──
const comSaida = (status, execs) => pacote(22, 'Origem', [ps(22, 100, execs, 1000, 0)], [1, 2], { status, pausa_desde: '2026-10-08', pausa_motivo: 'Chuva', saidas: { 2: { saiu_em: '2026-10-08', pct_saida: 60 } } })
conferir('retomado e bateu a meta: quem saiu leva 60% da parte; quem ficou, o resto', premioDoPacote(comSaida('Em execução', 100), [], funcionarios, 100).linhas.map((l) => [l.funcionario_id, l.valor]), [[1, 700], [2, 300]])
conferir('retomado e não bateu: quem saiu recebe igual (garantido); quem ficou, nada', premioDoPacote(comSaida('Em execução', 70), [], funcionarios, 0).linhas.map((l) => [l.funcionario_id, l.valor]), [[2, 300]])
conferir('fechou pausado a 60%: quem saiu 300, quem ficou o resto', premioDoPacote(comSaida('Pausado', 60), [], funcionarios, 60).linhas.map((l) => [l.funcionario_id, l.valor]), [[1, 300], [2, 300]])
conferir('todos saíram: o resto (se houver) vai para quem saiu', dividirParte(100, 100, [{ funcionario_id: 1, cheio: true, du: 14, saiu: true, pctSaida: 50 }, { funcionario_id: 2, cheio: true, du: 14, saiu: true, pctSaida: 50 }], 14),
  [{ funcionario_id: 1, valor: 50 }, { funcionario_id: 2, valor: 50 }])
conferir('prévia do fechamento: pacote que não paga ainda gera a linha de quem saiu', previaFechamento({ pacotes: [{ ...comSaida('Em execução', 70), data_fechamento: '2026-10-20' }], presencas: [], funcionarios, data: '2026-10-20' }).total, 300)

conferir('entrou depois e saiu: parte cheia × dias dele × % da saída', dividirParte(100, 100, [{ funcionario_id: 1, cheio: true, du: 14 }, { funcionario_id: 2, cheio: false, du: 7, saiu: true, pctSaida: 50 }], 14),
  [{ funcionario_id: 1, valor: 87.5 }, { funcionario_id: 2, valor: 12.5 }])
conferir('pacote sem dia útil: quem entrou conta como período inteiro', dividirParte(100, 100, [{ funcionario_id: 1, cheio: true, du: 0 }, { funcionario_id: 2, cheio: false, du: 0 }], 0),
  [{ funcionario_id: 1, valor: 50 }, { funcionario_id: 2, valor: 50 }])
conferir('editar o pacote não tira quem saiu (garantido)', validarPacote({ ...campos, colaboradores: [101] }, { servicos, atual: { ...editando, colaboradores: [101, 107], saidas: { 107: { saiu_em: '2026-10-08', pct_saida: 60 } } } }).colaboradores.map((c) => c.funcionario_id),
  [101, 107])
conferir('renovação não leva quem saiu', camposDaRenovacao({ ...comSaida('Pausado', 60), data_fechamento: '2026-10-20', servicos: [] }, [], 20).colaboradores, [1])
conferir('ajustes da folha: o mês da data da folha', ajustesDaFolha([{ data_folha: '2026-10-20' }, { data_folha: '2026-10-15' }, { data_folha: '2026-11-20' }], '2026-10-20').length, 2)

// ── Resumo da folha e ajuste ──
const pacotesFolha = [comSaida('Pausado', 60), pacote(23, 'Destino', [ps(23, 10, 0, 500, 0)], [2, 5], { entradas: { 2: '2026-10-12' } }),
  pacote(24, 'Outra folha', [ps(24, 1, 0, 100, 0)], [1], { data_inicio: '2026-10-21', data_fechamento: '2026-11-20' })]
const ajustes = [{ id: 1, funcionario_id: 2, data_folha: '2026-10-20', valor: '-50.00', motivo: 'Falta' }, { id: 2, funcionario_id: 1, data_folha: '2026-11-20', valor: '10', motivo: 'x' }]
const rs = resumoDaFolha({ pacotes: pacotesFolha, funcionarios, premios: [], ajustes, dataFolha: '2026-10-20' })
conferir('resumo: funcionários da folha, mais pacotes primeiro', rs.map((l) => [l.funcionario.id, l.itens.map((i) => i.pacote.id)]), [[2, [22, 23]], [5, [23]], [1, [22]]]) // empate: por nome (Fora antes de Raimundo)
conferir('resumo: quem saiu soma o garantido do pausado, o do pacote novo e o ajuste', [rs[0].itens.map((i) => [i.valor, i.situacao]), rs[0].total],
  [[[300, 'saiu com 60% da meta (garantido)'], [125, 'se bater a meta']], 375]) // 500 ÷ 2 × 7/14 dias; 300 + 125 − 50
conferir('ajuste: valor e motivo', validarAjustePremio({ funcionario_id: '2', valor: '-50,5', motivo: ' Falta ', data_folha: '2026-10-20' }),
  { registro: { funcionario_id: 2, valor: -50.5, motivo: 'Falta', data_folha: '2026-10-20' } })
conferir('ajuste zero recusa', validarAjustePremio({ funcionario_id: 2, valor: '0', motivo: 'x', data_folha: '2026-10-20' }).erro, 'Informe o valor do ajuste (negativo para desconto).')
conferir('ajuste sem motivo recusa', validarAjustePremio({ funcionario_id: 2, valor: '10', motivo: ' ', data_folha: '2026-10-20' }).erro, 'Informe o motivo do ajuste.')
conferir('ajuste vira linha da planilha', linhasDosAjustes([ajustes[0]]), [{ funcionario_id: 2, dias: 0, valor: -50, pacote: 'Ajuste: Falta' }])

// ── Pausa: pacote que fecha pausado paga proporcional ──
const pausado = pacote(18, 'Pausado', [ps(22, 100, 60, 1000, 0), ps(27, 10, 12, 0, 0)], [1, 2], { status: 'Pausado', pausa_motivo: 'Falta de material', pausa_desde: '2026-10-08' })
conferir('pausado: paga o % executado (média, cada serviço até 100%)', fatorDoPremio(pausado), 80)
conferir('bateu a meta: 100; não bateu e não pausado: 0', [fatorDoPremio(galeriaPac), fatorDoPremio({ ...pausado, status: 'Em execução' })], [100, 0])
conferir('prêmio do pausado: R$ 1.000 × 80% em partes iguais', premioDoPacote(pausado, [], funcionarios, 80).linhas.map((l) => [l.funcionario_id, l.valor]), [[1, 400], [2, 400]])
conferir('centavo igual ao banco (correção da revisão): 1.045,60 × 15% × 12,5% = 19,61', premioReal({ pct_pago: 15, servicos: [ps(22, 1, 0, 1045.6, 0)] }, 12.5).profissional, 19.61)
conferir('% executado na meia-casa arredonda para cima, como o banco', fatorDoPremio({ status: 'Pausado', servicos: [ps(22, 100, 24.69), ps(27, 100, 0)] }), 12.35)
conferir('prévia: pausado mostra o que pagaria; aberto, se bater a meta', [pctPrevisto(pausado), pctPrevisto({ ...pausado, status: 'Em execução' })], [80, 100])
conferir('elegíveis: ativos e mão de obra própria', elegiveisAoPacote([{ id: 1, ativo: true, tipo_mao_obra: 'Direta' }, { id: 2, ativo: false, tipo_mao_obra: 'Direta' }, { id: 3, ativo: true, tipo_mao_obra: 'Terceirizada' }]).map((f) => f.id), [1])
conferir('mudar a data: meta não editada acompanha o cronograma', metaAoMudarData({ quantidade_meta: '100', meta_cronograma: 100 }, 120), { quantidade_meta: 120, meta_cronograma: 120 })
conferir('mudar a data: meta editada fica', metaAoMudarData({ quantidade_meta: '90', meta_cronograma: 100 }, 120), { quantidade_meta: '90', meta_cronograma: 120 })
conferir('levar equipe sem destino quando é obrigatório: recusa', validarRemanejo({ destino: '', colaboradores: [1], data: '2026-10-08' }, [], pausado, true).erro, 'Escolha o pacote de destino.')
conferir('% do pausado arredonda centavos como o banco', premioReal({ pct_pago: 40, servicos: [ps(22, 1, 0, 1234.56, 0)] }, 63.33).profissional, 312.74)
conferir('pausar pede o problema', validarPausa({ motivo: null, data: '2026-10-08' }, pausado, '2026-10-08').erro, 'Escolha o problema que parou o pacote.')
conferir('pausar com data futura recusa', validarPausa({ motivo: 'Chuva', data: '2026-10-09' }, pausado, '2026-10-08').erro, 'A data da pausa vai do início do pacote até hoje.')
conferir('pausar antes do início recusa', validarPausa({ motivo: 'Chuva', data: '2026-09-30' }, pausado, '2026-10-08').erro, 'A data da pausa vai do início do pacote até hoje.')
conferir('pausa válida', validarPausa({ motivo: 'Chuva', data: '2026-10-08' }, pausado, '2026-10-08'), { motivo: 'Chuva', data: '2026-10-08' })
const destinos = [pausado, galeriaPac, pacote(19, 'Fechado', [], [], { fechado_em: '2026-10-01' }), pacote(20, 'Outro pausado', [], [], { status: 'Pausado' }), pacote(21, 'Curto', [], [], { data_fechamento: '2026-10-05' })]
conferir('destinos: abertos, não pausados, outro pacote, fechando depois da entrada', destinosPossiveis(destinos, pausado, '2026-10-08').map((p) => p.id), [10])
conferir('levar equipe: sem destino não troca', validarRemanejo({ destino: '', colaboradores: [1], data: '2026-10-08' }, destinos, pausado), null)
conferir('levar equipe: destino pausado recusa', validarRemanejo({ destino: '20', colaboradores: [1], data: '2026-10-08' }, destinos, pausado).erro, 'Escolha um pacote aberto e não pausado.')
conferir('levar equipe: ninguém escolhido recusa', validarRemanejo({ destino: '10', colaboradores: [], data: '2026-10-08' }, destinos, pausado).erro, 'Escolha quem vai para o outro pacote.')
conferir('levar equipe válido', validarRemanejo({ destino: '10', colaboradores: [1, 2], data: '2026-10-08' }, destinos, pausado), { destino: 10, colaboradores: [1, 2], data: '2026-10-08' })

// ── % pago sobre o orçamento ──
conferir('prêmio real = MO orçada × %', premioReal({ pct_pago: 30, servicos: [ps(22, 1, 0, 1200, 600)] }), { profissional: 360, ajudante: 180, total: 540 })
conferir('prêmio real arredonda centavos por parte', premioReal({ pct_pago: 33.33, servicos: [ps(22, 1, 0, 1234.56, 0)] }).profissional, 411.48)
conferir('prêmio pago dividido com o %', premioDoPacote({ ...galeriaPac, pct_pago: 30 }, presencas, funcionarios).linhas.map((l) => [l.funcionario_id, l.valor]),
  [[1, 150], [2, 150], [3, 45], [4, 45]])

// ── Meta sugerida pelo cronograma (segunda a sexta) ──
const galeriaCron = { inicio_previsto: '2026-10-05', fim_previsto: '2026-10-30', quantidade_prevista: 200, unidade: 'm' } // 20 dias seg–sex
conferir('meta do período: 10 dias de 20 = metade', metaDoCronograma(galeriaCron, '2026-10-05', '2026-10-16'), 100)
conferir('período passa do fim do serviço: só até o fim', metaDoCronograma(galeriaCron, '2026-10-26', '2026-11-20'), 50)
conferir('serviço fora do período: zero', metaDoCronograma(galeriaCron, '2026-11-02', '2026-11-20'), 0)
conferir('ritmo: meta ÷ dias úteis do serviço no período', ritmoDaMeta(galeriaCron, '2026-10-05', '2026-10-16', 100), { dias: 10, porDia: 10 })
conferir('ritmo com meta editada', ritmoDaMeta(galeriaCron, '2026-10-01', '2026-10-20', 125), { dias: 12, porDia: 10.42 })
conferir('ritmo sem dias previstos no período', ritmoDaMeta(galeriaCron, '2026-11-02', '2026-11-20', 10), { dias: 0, porDia: null })
conferir('sábado não conta', metaDoCronograma(galeriaCron, '2026-10-10', '2026-10-11'), 0)
conferir('meta igual à sugerida: sem destaque', metaEditada({ quantidade_meta: 100, meta_cronograma: 100 }), false)
conferir('meta mudada: destaque', metaEditada({ quantidade_meta: 120, meta_cronograma: 100 }), true)
conferir('sem sugestão: sem destaque', metaEditada({ quantidade_meta: 120, meta_cronograma: null }), false)

// ── Alertas e renovação (dia 21) ──
conferir('dias úteis até o fechamento (seg–sex, a partir de amanhã)', diasUteisAteFechamento({ data_fechamento: '2026-10-20' }, '2026-10-09'), 7)
conferir('pergunta do dia 21: fechamento passou e sem resposta', renovacoesPendentes([
  { id: 1, data_fechamento: '2026-10-20', continua: null }, { id: 2, data_fechamento: '2026-10-20', continua: true },
  { id: 3, data_fechamento: '2026-10-20', continua: false }, { id: 4, data_fechamento: '2026-11-20', continua: null },
], '2026-10-21').map((p) => p.id), [1])
const cronRen = [
  { id: 22, inicio_previsto: '2026-08-03', fim_previsto: '2026-11-30', quantidade_prevista: 3200, quantidade_executada: 1600, unidade: 'm', fim_real: null, cancelado: false },
  { id: 23, inicio_previsto: '2026-07-01', fim_previsto: '2026-09-25', quantidade_prevista: 100, quantidade_executada: 100, unidade: 'm', fim_real: '2026-10-10', cancelado: false },
]
const ren = camposDaRenovacao({ id: 3, nome: 'Galeria', local: 'Rua 2', data_fechamento: '2026-10-20', pct_pago: 40, colaboradores: [101, 105],
  servicos: [{ servico_id: 22, mo_profissional: 1200, mo_ajudante: 600 }, { servico_id: 23, mo_profissional: 500, mo_ajudante: 0 }] }, cronRen, 20)
conferir('renovação: próximo período 21/10 a 20/11', [ren.data_inicio, ren.data_fechamento, ren.renovado_de_id, ren.status], ['2026-10-21', '2026-11-20', 3, 'Liberado'])
conferir('renovação: serviço terminado sai; meta nova do cronograma; mesmas MO, colaboradores e %', [ren.itens.map((i) => [i.servico_id, i.quantidade_meta, i.meta_cronograma, i.mo_profissional]), ren.colaboradores, ren.pct_pago],
  [[[22, 855.81, 855.81, 1200]], [101, 105], 40]) // 3.200 m × 23 dias seg–sex do período ÷ 86 do serviço

// ── Prévia do fechamento ──
const pacotes = [
  galeriaPac,
  pacote(13, 'Esgoto', [ps(24, 100, 60, 500, 0)], [1]),
  pacote(14, 'Depois', [ps(24, 10, 10, 300, 0)], [1], { data_fechamento: '2026-11-20' }),
  pacote(15, 'Já fechado', [ps(24, 10, 10, 300, 0)], [1], { data_inicio: '2026-09-01', data_fechamento: '2026-09-20', fechado_em: '2026-09-20T17:00:00' }),
]
const pvPausa = previaFechamento({ pacotes: [pausado], presencas: [], funcionarios, data: '2026-10-20' })
conferir('prévia: pausado não pede motivo e paga proporcional', [pvPausa.pacotes.map((x) => [x.bate, x.pausado, x.pct, x.pedeMotivo]), pvPausa.total], [[[false, true, 80, false]], 800])
const pv = previaFechamento({ pacotes, presencas, funcionarios, data: '2026-10-20' })
conferir('fecham os abertos com fechamento até a data', pv.pacotes.map((x) => [x.pacote.id, x.bate]), [[10, true], [13, false]])
conferir('linhas da prévia levam o nome do pacote', pv.linhas.map((l) => [l.funcionario_id, l.valor, l.pacote]), [[1, 500, 'Galeria'], [2, 500, 'Galeria'], [3, 150, 'Galeria'], [4, 150, 'Galeria']])
conferir('total da prévia', pv.total, 1300)
conferir('prévia: não bateu e não pausado pede motivo', pv.pacotes.map((x) => x.pedeMotivo), [false, true])

conferir('fechamentos anteriores agrupados por data', fechamentosAnteriores(pacotes).map((g) => [g.data, g.pacotes.map((p) => p.id)]), [['2026-09-20', [15]]])
conferir('prêmios gravados viram linhas da planilha', linhasDosPremios([{ pacote_id: 15, funcionario_id: 1, dias: 3, valor: '300.00' }], pacotes),
  [{ funcionario_id: 1, dias: 3, valor: 300, pacote: 'Já fechado' }])

const planilha = planilhaPremios([...pv.linhas, { funcionario_id: 1, dias: 1, valor: 50.5, pacote: 'Outro' }], funcionarios).split('\r\n')
conferir('planilha: cabeçalho', planilha[0], 'Funcionário;Matrícula;Função;Pacote;Dias;Valor (R$)')
conferir('planilha: texto com ";" vai entre aspas e vírgula decimal', planilha[1], '"Ana; Moura";1060;Pedreiro;Galeria;1;500,00')
conferir('planilha: total geral', planilha[planilha.length - 1], 'Total geral;;;;;1350,50')

conferir('dias por funcionário, só presença, mais dias primeiro', diasPorFuncionario([pres(2, '2026-10-01', 1), pres(1, '2026-10-01', 1), pres(1, '2026-10-02', 1), pres(3, '2026-10-02', 1, 'Falta')]),
  [{ funcionario_id: 1, dias: 2 }, { funcionario_id: 2, dias: 1 }])

console.log(`${ok}/${tot} — prêmio`)
process.exit(ok === tot ? 0 : 1)
