// Planejamento — três abas: Semana (PCP), 3 meses e Cronograma.

import { pode } from '../lib/permissoes.js'
import { Abas, Cabecalho } from '../components/index.jsx'
import Semana from './semana.jsx'
import TresMeses from './tresMeses.jsx'
import Cronograma from './cronograma.jsx'

const TITULOS = { semana: 'Planejamento da semana', tresMeses: 'Próximos 3 meses', cronograma: 'Cronograma' }

export default function Planejamento({ goto, params, usuario }) {
  const abas = [
    { id: 'semana', texto: 'Semana' },
    { id: 'tresMeses', texto: '3 meses' },
    ...(pode(usuario.role, 'verCronograma') ? [{ id: 'cronograma', texto: 'Cronograma' }] : []),
  ]
  const aba = abas.some((a) => a.id === params.aba) ? params.aba : 'semana'

  return (
    <>
      <Cabecalho rotulo="Planejamento" titulo={TITULOS[aba]} />
      <Abas abas={abas} atual={aba} trocar={(id) => goto('planejamento', { aba: id })} />
      {aba === 'semana' && <Semana goto={goto} usuario={usuario} />}
      {aba === 'tresMeses' && <TresMeses goto={goto} usuario={usuario} />}
      {aba === 'cronograma' && <Cronograma goto={goto} usuario={usuario} soSemCusto={!!params.semCusto} />}
    </>
  )
}
