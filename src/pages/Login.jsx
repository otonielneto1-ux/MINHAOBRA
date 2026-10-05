import { useState } from 'react'
import * as dados from '../lib/dados.js'

// Entrar com e-mail e senha, ou criar conta (a conta nova fica "aguardando liberação").
export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', repetir: '' })
  const [erro, setErro] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const campo = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErro(null) }
  const criando = modo === 'criar'

  async function enviar(e) {
    e.preventDefault()
    if (criando) {
      if (!form.nome.trim()) return setErro('Informe seu nome.')
      if (form.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
      if (form.senha !== form.repetir) return setErro('As duas senhas não são iguais.')
    }
    setEnviando(true)
    const r = criando
      ? await dados.criarConta(form.nome.trim(), form.email.trim(), form.senha)
      : await dados.entrar(form.email.trim(), form.senha)
    setEnviando(false)
    if (r.erro) {
      setErro(criando ? 'Não foi possível criar a conta. Esse e-mail já pode estar cadastrado.' : 'E-mail ou senha incorretos.')
      return
    }
    if (criando && !r.data.session) {
      setAviso('Conta criada. Abra o e-mail que enviamos para confirmar e depois entre aqui.')
      setModo('entrar')
    }
  }

  return (
    <div className="entrada">
      <div className="entrada-caixa">
        <div className="entrada-topo">
          <div className="lab">Gestão de canteiro</div>
          <h1>Minha Obra</h1>
        </div>
        <form className="entrada-corpo" style={{ paddingTop: 20 }} onSubmit={enviar} noValidate>
          {aviso && <p className="aviso" style={{ marginTop: 0, marginBottom: 16 }}>{aviso}</p>}
          {criando && (
            <div className="campo">
              <label className="lab" htmlFor="nome">Nome</label>
              <input id="nome" className="ipt" autoComplete="name" value={form.nome} onChange={campo('nome')} />
            </div>
          )}
          <div className="campo">
            <label className="lab" htmlFor="email">E-mail</label>
            <input id="email" className="ipt" type="email" autoComplete="email" value={form.email} onChange={campo('email')} />
          </div>
          <div className="campo">
            <label className="lab" htmlFor="senha">Senha</label>
            <input id="senha" className="ipt" type="password" autoComplete={criando ? 'new-password' : 'current-password'} value={form.senha} onChange={campo('senha')} />
          </div>
          {criando && (
            <div className="campo">
              <label className="lab" htmlFor="repetir">Repetir senha</label>
              <input id="repetir" className="ipt" type="password" autoComplete="new-password" value={form.repetir} onChange={campo('repetir')} />
            </div>
          )}
          {erro && <p className="erro-campo" role="alert" style={{ marginBottom: 12 }}>{erro}</p>}
          <button type="submit" className="btn btn-fill btn-lg btn-bloco" disabled={enviando}>
            {enviando ? 'Aguarde…' : criando ? 'Criar conta' : 'Entrar'}
          </button>
          <button type="button" className="btn btn-quiet btn-bloco" style={{ marginTop: 10 }}
            onClick={() => { setModo(criando ? 'entrar' : 'criar'); setErro(null); setAviso(null) }}>
            {criando ? 'Já tenho conta' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
