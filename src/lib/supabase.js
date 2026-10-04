import { createClient } from '@supabase/supabase-js'

// A conexão com o banco. As chaves entram no .env.local na etapa do Supabase.
// Sem chaves (modo de exemplo), fica null e ninguém usa — a camada de dados lê o mock.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
