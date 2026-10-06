// Motivo de não atingir a meta em dois passos: primeiro o grupo macro, depois a causa.
// Usado na baixa do PCP e no fechamento dos pacotes. Remonte com key ao trocar de item.

import { useState } from 'react'
import { grupoDoMotivo } from '../lib/pcp.js'
import { GRUPOS_MOTIVO } from '../lib/vocabulario.js'

export function EscolherMotivo({ motivo, mudar, rotulo = 'Por que não atingiu? Escolha o grupo' }) {
  const [grupo, setGrupo] = useState(motivo ? grupoDoMotivo(motivo) : null)
  return (
    <>
      <span className="lab">{rotulo}</span>
      <div className="opcoes grupos">
        {Object.keys(GRUPOS_MOTIVO).map((g) => (
          <button key={g} type="button" aria-pressed={grupo === g}
            onClick={() => { setGrupo(g); mudar(GRUPOS_MOTIVO[g].length === 1 ? GRUPOS_MOTIVO[g][0] : null) }}>{g}</button>
        ))}
      </div>
      {grupo && GRUPOS_MOTIVO[grupo].length > 1 && (
        <>
          <span className="lab" style={{ marginTop: 8 }}>Qual a causa?</span>
          <div className="opcoes">
            {GRUPOS_MOTIVO[grupo].map((m) => (
              <button key={m} type="button" aria-pressed={motivo === m} onClick={() => mudar(m)}>{m}</button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
