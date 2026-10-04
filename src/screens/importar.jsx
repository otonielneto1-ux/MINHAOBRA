// Importar do MS Project. A leitura do XML e a prévia chegam na próxima etapa;
// aqui fica o caminho e a explicação.

import { Cabecalho, Icone, Secao } from '../components/index.jsx'

export default function Importar({ goto }) {
  return (
    <>
      <Cabecalho voltar={{ texto: 'Cronograma', acao: () => goto('planejamento', { aba: 'cronograma' }) }}
        rotulo="Planejamento · Cronograma" titulo="Importar do MS Project" />
      <Secao rotulo="Como fazer">
        <div className="pares" style={{ marginBottom: 18 }}>
          <div><span>1. No MS Project</span><b>Arquivo › Salvar como › XML</b></div>
          <div><span>2. Aqui</span><b>Escolha o arquivo .xml</b></div>
          <div><span>3. Confira a prévia</span><b>Serviços novos, alterados e cancelados</b></div>
        </div>
        <p className="muted" style={{ marginBottom: 18 }}>
          Serviços novos entram medidos em % e sem custo. Custo e unidade são definidos depois, no Cronograma.
          Reimportar não apaga custo, unidade nem produção.
        </p>
        <label className="btn btn-lg" style={{ opacity: 0.5, cursor: 'not-allowed' }} aria-disabled="true">
          <Icone nome="arquivo" />Escolher arquivo XML
        </label>
        <p className="meta" style={{ marginTop: 12 }}>A leitura do arquivo chega na próxima etapa.</p>
      </Secao>
    </>
  )
}
