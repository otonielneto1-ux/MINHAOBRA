// Gera supabase-seed.sql a partir de scripts/dadosExemplo.js (os mesmos dados de exemplo do app).
// Rodar: node scripts/gerar-seed.mjs
import { writeFileSync } from 'node:fs'
import * as m from './dadosExemplo.js'

const v = (x) => (x === null || x === undefined ? 'null' : typeof x === 'number' || typeof x === 'boolean' ? String(x) : `'${String(x).replace(/'/g, "''")}'`)

function inserir(tabela, linhas, colunas) {
  if (!linhas.length) return ''
  const cols = colunas || Object.keys(linhas[0])
  const tuplas = linhas.map((l) => `(${cols.map((c) => v(l[c])).join(',')})`).join(',\n')
  return `insert into public.${tabela} (${cols.join(',')}) values\n${tuplas};\n\n`
}

// Efetivo das 3 últimas semanas (setembro já está fechado nos prêmios), gerado no banco:
// todos os ativos presentes de segunda a sábado, com as mesmas exceções e pacotes do mock.
const excecoes = m.presencas.filter((p) => p.data >= '2026-09-21' && p.situacao !== 'Presente')
const presencasSql = `insert into public.presencas (obra_id, data, funcionario_id, situacao, pacote_id, lancado_por)
select 1, d::date, f.id, coalesce(e.sit, 'Presente'),
       case when e.sit is null then case when f.id in (101, 105, 107) then 3 when f.id in (108, 109) then 4 end end, 3
  from generate_series('2026-09-21'::date, '2026-10-07'::date, '1 day') d
  cross join public.funcionarios f
  left join (values ${excecoes.map((e) => `('${e.data}'::date, ${e.funcionario_id}, '${e.situacao}')`).join(', ')}) e(dia, fid, sit)
    on e.dia = d::date and e.fid = f.id
 where extract(isodow from d) <> 7 and f.ativo;\n\n`

const tabelas = [
  ['profiles', m.profiles],
  ['config', [m.config]],
  ['obras', m.obras],
  ['obra_usuarios', m.obra_usuarios],
  ['etapas_entrega', m.etapas_entrega],
  ['servicos', m.servicos],
  ['servico_dependencias', m.servico_dependencias],
  ['restricoes', m.restricoes],
  ['funcionarios', m.funcionarios],
  ['pacotes', m.pacotes],
  ['premios', m.premios],
  ['pcp_atividades', m.pcp_atividades],
  ['producoes', m.producoes],
  ['ocorrencias', m.ocorrencias],
]

let sql = '-- Carga inicial (dados de exemplo da Conviver Costamare). Gerado por scripts/gerar-seed.mjs.\n\n'
for (const [t, linhas] of tabelas) sql += inserir(t, linhas)
sql += presencasSql
// As tabelas recebem ids escolhidos aqui; o contador de cada uma continua do maior id.
for (const [t] of tabelas) {
  if (t === 'config') continue
  sql += `select setval(pg_get_serial_sequence('public.${t}', 'id'), (select max(id) from public.${t}));\n`
}
writeFileSync(new URL('../supabase-seed.sql', import.meta.url), sql)
console.log(`supabase-seed.sql: ${sql.length} caracteres, ${excecoes.length} exceções de efetivo, ${m.producoes.length} produções`)
