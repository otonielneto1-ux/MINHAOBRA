// O app nasce pronto para mais de uma obra, e cada perfil vê só o que pode.
// A segunda obra existe só aqui no teste — no app, só a Conviver Costamare.
import { daObra } from '../src/lib/obra.js'
import { pode, menuDoPerfil, telaInicial, divisaoCelular, perfilLiberado } from '../src/lib/permissoes.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return }
  console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const registros = [{ id: 1, obra_id: 1 }, { id: 2, obra_id: 2 }, { id: 3, obra_id: 1 }]
conferir('filtro por obra não deixa vazar a outra', daObra(registros, 1).map((r) => r.id), [1, 3])
conferir('obra sem registros devolve lista vazia', daObra(registros, 3), [])

conferir('mestre não vê custo', pode('Mestre', 'verCusto'), false)
conferir('mestre não vê prêmio', pode('Mestre', 'verPremio'), false)
conferir('mestre dá baixa', pode('Mestre', 'darBaixa'), true)
conferir('mestre não edita o cronograma (custo, unidade, recálculo)', pode('Mestre', 'editarCronograma'), false)
conferir('técnico de segurança não lê a produção (igual à RLS de producoes)', pode('Técnico de Segurança', 'verProducao'), false)
conferir('cliente não vê custo', pode('Cliente', 'verCusto'), false)
conferir('cliente abre ocorrência', pode('Cliente', 'abrirOcorrencia'), true)
conferir('técnico de segurança não dá baixa', pode('Técnico de Segurança', 'darBaixa'), false)
conferir('coordenador não apaga', pode('Coordenador', 'apagar'), false)
conferir('coordenador não gerencia usuários', pode('Coordenador', 'gerirUsuarios'), false)
conferir('engenheiro apaga', pode('Engenheiro', 'apagar'), true)
conferir('perfil desconhecido não pode nada', pode('Visitante', 'verPainel'), false)

conferir('aguardando não entra', perfilLiberado('Aguardando'), false)
conferir('auxiliar administrativo só entra na Versão 2', perfilLiberado('Auxiliar Administrativo'), false)

conferir('mestre abre em Hoje', telaInicial('Mestre'), 'hoje')
conferir('cliente abre em Avanço', telaInicial('Cliente'), 'avanco')
conferir('cliente não tem planejamento no menu', menuDoPerfil('Cliente').includes('planejamento'), false)
conferir('barra do celular do engenheiro tem 4 itens + Mais', divisaoCelular('Engenheiro'), { barra: ['inicio', 'planejamento', 'efetivo', 'ocorrencias'], mais: ['pacotes', 'cadastros'] })

console.log(`${ok}/${tot} — obra e permissões`)
process.exit(ok === tot ? 0 : 1)
