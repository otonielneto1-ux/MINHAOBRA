// Cronograma: caminho crítico, custos digitados, ajuste, troca de unidade e importação do Project.
import { calcularCronograma, custosAlterados, validarAjuste, previaTrocaUnidade } from '../src/lib/cronograma.js'
import { lerXmlDoProject, casarEtapas, compararImportacao, montarCarga } from '../src/lib/importacao.js'
import { lerNumero } from '../src/lib/formato.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const s = (id, ini, fim, extra = {}) => ({ id, nome: `S${id}`, e_resumo: false, cancelado: false, inicio_previsto: ini, fim_previsto: fim, inicio_base: ini, fim_base: fim, quantidade_prevista: 100, quantidade_executada: 0, ...extra })
const dep = (servico_id, predecessora_id, tipo, defasagem_dias = 0) => ({ servico_id, predecessora_id, tipo, defasagem_dias })

// A (5 d) → B (5 d) em término-início; C solto (3 d); D começa 2 dias depois do início de A.
const rede = [s(1, '2026-01-01', '2026-01-05'), s(2, '2026-01-06', '2026-01-10'), s(3, '2026-01-01', '2026-01-03'), s(4, '2026-01-03', '2026-01-04')]
const ligs = [dep(2, 1, 'TI'), dep(4, 1, 'II', 2)]
const r = calcularCronograma(rede, ligs, '2025-12-01')
const linha = (id) => r.linhas.find((l) => l.id === id)
conferir('A e B no caminho crítico', [linha(1).critico, linha(2).critico], [true, true])
conferir('C tem 7 dias de folga', linha(3).folga_dias, 7)
conferir('D tem 6 dias de folga', linha(4).folga_dias, 6)
conferir('D: início mais cedo e fim mais tarde', [linha(4).inicio_cedo, linha(4).fim_tarde], ['2026-01-03', '2026-01-10'])
conferir('conta críticos', r.criticos, 2)

// Predecessora atrasada empurra a sucessora (TI com defasagem de 3 dias).
const empurra = calcularCronograma([s(1, '2026-01-01', '2026-01-10'), s(2, '2026-01-05', '2026-01-06')], [dep(2, 1, 'TI', 3)], '2025-12-01')
conferir('TI + 3 dias empurra o início', empurra.linhas.find((l) => l.id === 2).inicio_cedo, '2026-01-14')

// Término-término: E precisa terminar junto com B, então fica crítico.
const tt = calcularCronograma([...rede, s(5, '2026-01-01', '2026-01-02')], [...ligs, dep(5, 2, 'TT')], '2025-12-01')
conferir('TT: E termina com B e fica crítico', [tt.linhas.find((l) => l.id === 5).inicio_cedo, tt.linhas.find((l) => l.id === 5).critico], ['2026-01-09', true])

// Início-término: F termina no máximo quando A começa + 10 dias.
const it = calcularCronograma([s(1, '2026-01-01', '2026-01-05'), s(6, '2026-01-01', '2026-01-02')], [dep(6, 1, 'IT', 10)], '2025-12-01')
conferir('IT: F termina 10 dias depois do início de A', it.linhas.find((l) => l.id === 6).inicio_cedo, '2026-01-09')

conferir('dependência circular: lista os dois e não calcula',
  calcularCronograma([s(1, '2026-01-01', '2026-01-02'), s(2, '2026-01-03', '2026-01-04')], [dep(2, 1, 'TI'), dep(1, 2, 'TI')], '2026-01-01'),
  { problemas: [{ id: 1, nome: 'S1', motivo: 'dependência circular' }, { id: 2, nome: 'S2', motivo: 'dependência circular' }] })
conferir('serviço com fim antes do início: problema', calcularCronograma([s(1, '2026-01-05', '2026-01-01')], [], '2026-01-01').problemas[0].motivo, 'sem datas válidas')
conferir('resumo e cancelado ficam fora', calcularCronograma([s(1, '2026-01-01', '2026-01-02'), s(2, null, null, { e_resumo: true }), s(3, null, null, { cancelado: true })], [], '2026-01-01').linhas.length, 1)
conferir('atraso contra a linha de base', calcularCronograma([s(1, '2026-01-01', '2026-01-10')], [], '2026-01-15').linhas[0].dias_atraso, 5)
conferir('ligação com serviço fora da conta é ignorada', calcularCronograma([s(1, '2026-01-01', '2026-01-02')], [dep(1, 99, 'TI')], '2026-01-01').linhas.length, 1)

// Números digitados
conferir('lê 85.000,50', lerNumero('85.000,50'), 85000.5)
conferir('lê R$ 1.234', lerNumero('R$ 1.234'), 1234)
conferir('lê 12.5 com ponto decimal', lerNumero('12.5'), 12.5)
conferir('lê −3 com sinal tipográfico', lerNumero('−3'), -3)
conferir('vazio é null', lerNumero('  '), null)
conferir('texto é NaN', Number.isNaN(lerNumero('abc')), true)

// Custos em modo planilha
const servs = [{ id: 1, nome: 'Canteiro', custo_orcado: 85000 }, { id: 2, nome: 'Galeria', custo_orcado: null }]
conferir('só o que mudou vai para o banco', custosAlterados(servs, { 1: '85.000,00', 2: '1.480.000' }), { linhas: [{ id: 2, custo: 1480000 }] })
conferir('apagar o custo grava null', custosAlterados(servs, { 1: '' }), { linhas: [{ id: 1, custo: null }] })
conferir('custo inválido avisa o serviço', custosAlterados(servs, { 2: 'mil' }), { erro: 'Custo inválido em "Galeria".' })
conferir('custo negativo é inválido', custosAlterados(servs, { 2: '-5' }).erro, 'Custo inválido em "Galeria".')

// Ajuste de produção
const galeria = { id: 22, quantidade_executada: 100 }
conferir('ajuste válido', validarAjuste({ quantidade: '-20', data: '2026-10-05', motivo: ' medição ' }, galeria, '2026-10-05'),
  { registro: { servico_id: 22, data: '2026-10-05', quantidade: -20, motivo_ajuste: 'medição' } })
conferir('ajuste zero recusa', validarAjuste({ quantidade: '0', data: '2026-10-05', motivo: 'x' }, galeria, '2026-10-05').erro, 'Informe a quantidade do ajuste (use − para tirar).')
conferir('ajuste sem motivo recusa', validarAjuste({ quantidade: '5', data: '2026-10-05', motivo: ' ' }, galeria, '2026-10-05').erro, 'Explique o motivo do ajuste.')
conferir('ajuste com data futura recusa', validarAjuste({ quantidade: '5', data: '2026-10-06', motivo: 'x' }, galeria, '2026-10-05').erro, 'O ajuste não pode ter data futura.')
conferir('ajuste não deixa executado negativo', validarAjuste({ quantidade: '-101', data: '2026-10-05', motivo: 'x' }, galeria, '2026-10-05').erro, 'O ajuste deixaria o executado abaixo de zero.')

// Troca de % por quantidade (exemplo do PRD: 44% de 3.200 m → 1.408 m)
const emPct = { unidade: '%', quantidade_prevista: 100, quantidade_executada: 44 }
conferir('44% de 3.200 m vira 1.408 m', previaTrocaUnidade(emPct, 'm', '3.200'), { fator: 32, executada: 1408, prevista: 3200 })
conferir('já em metros recusa', previaTrocaUnidade({ ...emPct, unidade: 'm' }, 'm', '10').erro, 'Este serviço já está medido em quantidade.')
conferir('sem unidade recusa', previaTrocaUnidade(emPct, '%', '10').erro, 'Escolha a unidade nova.')
conferir('sem quantidade recusa', previaTrocaUnidade(emPct, 'm', '').erro, 'Informe a quantidade prevista.')

// Importação do MS Project
const xml = `<?xml version="1.0"?><Project xmlns="http://schemas.microsoft.com/project"><Name>Costamare</Name><Tasks>
<Task><UID>0</UID><Name>Costamare</Name><OutlineLevel>0</OutlineLevel><Summary>1</Summary><Start>2026-03-02T08:00:00</Start><Finish>2027-12-31T17:00:00</Finish></Task>
<Task><UID>1</UID><Name>FASE 01 – Infra</Name><WBS>2</WBS><OutlineLevel>1</OutlineLevel><Summary>1</Summary><Start>2026-04-06T08:00:00</Start><Finish>2027-03-31T17:00:00</Finish></Task>
<Task><UID>7</UID><Name>Terraplenagem &amp; limpeza</Name><WBS>2.1</WBS><OutlineLevel>2</OutlineLevel><Summary>0</Summary><Start>2026-04-06T08:00:00</Start><Finish>2026-07-31T17:00:00</Finish>
  <Baseline><Number>0</Number><Start>2026-04-01T08:00:00</Start><Finish>2026-07-20T17:00:00</Finish></Baseline></Task>
<Task><UID>8</UID><Name>Galerias</Name><WBS>2.2</WBS><OutlineLevel>2</OutlineLevel><Summary>0</Summary><Start>2026-08-03T08:00:00</Start><Finish>2026-11-30T17:00:00</Finish>
  <PredecessorLink><PredecessorUID>7</PredecessorUID><Type>1</Type><LinkLag>9600</LinkLag><LagFormat>7</LagFormat></PredecessorLink>
  <PredecessorLink><PredecessorUID>99</PredecessorUID><Type>1</Type><LinkLag>0</LinkLag><LagFormat>7</LagFormat></PredecessorLink></Task>
<Task><UID>9</UID><Name>Esgoto</Name><WBS>2.3</WBS><OutlineLevel>2</OutlineLevel><Summary>0</Summary><Start>2026-09-15T08:00:00</Start><Finish>2026-12-15T17:00:00</Finish>
  <PredecessorLink><PredecessorUID>8</PredecessorUID><Type>3</Type><LinkLag>201600</LinkLag><LagFormat>8</LagFormat></PredecessorLink></Task>
<Task><UID>10</UID><IsNull>1</IsNull><OutlineLevel>2</OutlineLevel></Task>
</Tasks></Project>`
const lido = lerXmlDoProject(xml)
conferir('lê 4 tarefas (pula a obra e a linha vazia)', lido.tarefas.map((t) => t.uid), [1, 7, 8, 9])
conferir('decodifica &amp; no nome', lido.tarefas[1].nome, 'Terraplenagem & limpeza')
conferir('tarefa completa', lido.tarefas[1], { uid: 7, nome: 'Terraplenagem & limpeza', nivel: 2, inicio: '2026-04-06', fim: '2026-07-31', eap: '2.1', resumo: false, inicio_base: '2026-04-01', fim_base: '2026-07-20', pai_uid: 1, topo_uid: 1 })
conferir('ligações: TI com 2 dias; II com 14 dias decorridos; predecessora inexistente sai', lido.ligacoes,
  [{ uid: 8, pred_uid: 7, tipo: 'TI', defasagem: 2 }, { uid: 9, pred_uid: 8, tipo: 'II', defasagem: 14 }])
conferir('arquivo que não é do Project', lerXmlDoProject('<html></html>').erro, 'Esse arquivo não parece ser um XML do MS Project.')
conferir('Project sem tarefas', lerXmlDoProject('<Project><Tasks></Tasks></Project>').erro, 'O arquivo não tem tarefas. Confira se salvou o projeto inteiro como XML.')

const etapas = [{ id: 1, nome: 'Geral' }, { id: 2, nome: 'Fase 01' }, { id: 3, nome: 'Fase 02' }]
conferir('casa a etapa pelo nome, sem acento e caixa', casarEtapas(lido.tarefas, etapas), [{ uid: 1, nome: 'FASE 01 – Infra', etapa_id: 2 }])

const atuais = [
  { uid_project: 7, nome: 'Terraplenagem & limpeza', codigo_eap: '2.1', inicio_previsto: '2026-04-06', fim_previsto: '2026-07-31', cancelado: false },
  { uid_project: 8, nome: 'Galerias', codigo_eap: '2.2', inicio_previsto: '2026-08-03', fim_previsto: '2026-11-15', cancelado: false },
  { uid_project: 50, nome: 'Sumiu', codigo_eap: '9', inicio_previsto: '2026-01-01', fim_previsto: '2026-01-02', cancelado: false },
]
const cmp = compararImportacao(lido, atuais)
conferir('novos: o resumo e o esgoto', cmp.novos.map((t) => t.uid), [1, 9])
conferir('alterado: fim das galerias', cmp.alterados.map((a) => a.mudou), [[{ campo: 'fim', de: '2026-11-15', para: '2026-11-30' }]])
conferir('cancelado: o que sumiu do Project', cmp.cancelados.map((s) => s.uid_project), [50])
conferir('totais da prévia', cmp.totais, { tarefas: 4, servicos: 3, resumos: 1, ligacoes: 2 })
conferir('não é a primeira importação', cmp.primeira, false)

const carga = montarCarga(lido, { 1: 2 }, true)
conferir('carga: etapa vem do nível 1 e base do Project', [carga.tarefas[1].etapa_entrega_id, carga.tarefas[1].inicio_base, carga.tarefas[1].duracao_dias], [2, '2026-04-01', 117])
conferir('carga sem base do Project usa as datas atuais', montarCarga(lido, {}, false).tarefas[1].inicio_base, '2026-04-06')
conferir('tarefa sem base no Project usa as datas atuais', carga.tarefas[2].inicio_base, '2026-08-03')

console.log(`${ok}/${tot} — cronograma`)
if (ok !== tot) process.exit(1)
