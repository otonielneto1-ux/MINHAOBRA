-- ============================================================
-- Minha Obra — quem vê e faz o quê (RLS). Fonte: PRD-BACKEND.md, "Permissões".
-- Regra de ouro: toda linha passa por "a pessoa tem acesso a esta obra".
-- Dinheiro (custo_orcado, valor_premio) nunca sai para Mestre, Cliente e Técnico:
-- esses perfis leem por funções que não devolvem essas colunas.
-- ============================================================

-- ── Quem sou eu ──────────────────────────────────────────────
create or replace function public.meu_perfil() returns bigint
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_uid = (select auth.uid()) and ativo
$$;

create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where auth_uid = (select auth.uid()) and ativo
$$;

create or replace function public.papel_em(papeis text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select meu_papel()) = any (papeis), false)
$$;

-- Engenheiro vê todas as obras; os demais perfis liberados, só as suas.
create or replace function public.minhas_obras() returns setof bigint
language sql stable security definer set search_path = public as $$
  select o.id from obras o where (select meu_papel()) = 'Engenheiro'
  union
  select ou.obra_id from obra_usuarios ou
   where ou.profile_id = (select meu_perfil())
     and (select meu_papel()) in ('Coordenador', 'Mestre', 'Cliente', 'Técnico de Segurança')
$$;

-- "Hoje" no fuso da obra (o servidor roda em UTC).
create or replace function public.hoje_local() returns date
language sql stable as $$ select (now() at time zone 'America/Fortaleza')::date $$;

-- ── Liga a RLS em todas as tabelas ───────────────────────────
alter table public.profiles enable row level security;
alter table public.config enable row level security;
alter table public.obras enable row level security;
alter table public.obra_usuarios enable row level security;
alter table public.etapas_entrega enable row level security;
alter table public.servicos enable row level security;
alter table public.servico_dependencias enable row level security;
alter table public.restricoes enable row level security;
alter table public.funcionarios enable row level security;
alter table public.presencas enable row level security;
alter table public.pacotes enable row level security;
alter table public.premios enable row level security;
alter table public.pcp_atividades enable row level security;
alter table public.producoes enable row level security;
alter table public.ocorrencias enable row level security;
alter table public.ocorrencia_fotos enable row level security;

-- ── profiles ─────────────────────────────────────────────────
-- Cada um vê o próprio; Engenheiro e Coordenador veem todos. Pelo navegador só se
-- muda o próprio NOME: papel e acesso mudam pela função liberar_usuario (só Engenheiro).
create policy profiles_ver on public.profiles for select
  using (auth_uid = (select auth.uid()) or (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy profiles_editar_nome on public.profiles for update
  using (auth_uid = (select auth.uid())) with check (auth_uid = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (nome) on public.profiles to authenticated;

-- ── config ───────────────────────────────────────────────────
create policy config_ver on public.config for select
  using ((select papel_em(array['Engenheiro', 'Coordenador', 'Mestre', 'Cliente', 'Técnico de Segurança'])));
create policy config_editar on public.config for update
  using ((select papel_em(array['Engenheiro', 'Coordenador'])));

-- ── obras / etapas / acesso ──────────────────────────────────
create policy obras_ver on public.obras for select using (id in (select minhas_obras()));
create policy obras_criar on public.obras for insert with check ((select papel_em(array['Engenheiro'])));
create policy obras_editar on public.obras for update
  using (id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy obras_apagar on public.obras for delete using ((select papel_em(array['Engenheiro'])));

create policy obra_usuarios_ver on public.obra_usuarios for select
  using ((select papel_em(array['Engenheiro'])) or profile_id = (select meu_perfil()));
create policy obra_usuarios_gerir on public.obra_usuarios for all
  using ((select papel_em(array['Engenheiro']))) with check ((select papel_em(array['Engenheiro'])));

create policy etapas_ver on public.etapas_entrega for select using (obra_id in (select minhas_obras()));
create policy etapas_criar on public.etapas_entrega for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy etapas_editar on public.etapas_entrega for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy etapas_apagar on public.etapas_entrega for delete
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro'])));

-- ── cronograma ───────────────────────────────────────────────
-- A tabela inteira (com custo) só para Engenheiro e Coordenador; os demais usam servicos_sem_custo().
create policy servicos_ver on public.servicos for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy servicos_criar on public.servicos for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy servicos_editar on public.servicos for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy servicos_apagar on public.servicos for delete
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro'])));

create policy dependencias_ver on public.servico_dependencias for select
  using ((select papel_em(array['Engenheiro', 'Coordenador', 'Mestre', 'Técnico de Segurança']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id in (select minhas_obras())));
create policy dependencias_gerir on public.servico_dependencias for all
  using ((select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id in (select minhas_obras())))
  with check ((select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id in (select minhas_obras())));

create policy restricoes_ver on public.restricoes for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre', 'Técnico de Segurança'])));
create policy restricoes_criar on public.restricoes for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy restricoes_editar on public.restricoes for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy restricoes_apagar on public.restricoes for delete
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro'])));

-- ── equipe e efetivo ─────────────────────────────────────────
create policy funcionarios_ver on public.funcionarios for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre'])));
create policy funcionarios_criar on public.funcionarios for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy funcionarios_editar on public.funcionarios for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy funcionarios_apagar on public.funcionarios for delete
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro'])));

-- Mestre lança e corrige o efetivo só de hoje e de ontem.
create policy presencas_ver on public.presencas for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre'])));
create policy presencas_criar on public.presencas for insert
  with check (obra_id in (select minhas_obras()) and lancado_por = (select meu_perfil()) and (
    (select papel_em(array['Engenheiro', 'Coordenador']))
    or ((select papel_em(array['Mestre'])) and data >= (select hoje_local()) - 1)));
create policy presencas_editar on public.presencas for update
  using (obra_id in (select minhas_obras()) and (
    (select papel_em(array['Engenheiro', 'Coordenador']))
    or ((select papel_em(array['Mestre'])) and data >= (select hoje_local()) - 1)))
  with check (lancado_por = (select meu_perfil()));
create policy presencas_apagar on public.presencas for delete
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro'])));

-- ── pacotes e prêmios (dinheiro: só Engenheiro e Coordenador) ─
create policy pacotes_ver on public.pacotes for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy pacotes_criar on public.pacotes for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy pacotes_editar on public.pacotes for update
  using (obra_id in (select minhas_obras()) and fechado_em is null and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy pacotes_apagar on public.pacotes for delete
  using (obra_id in (select minhas_obras()) and status = 'Planejado' and (select papel_em(array['Engenheiro'])));

create policy premios_ver on public.premios for select
  using ((select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from pacotes p where p.id = pacote_id and p.obra_id in (select minhas_obras())));

-- ── PCP e produção ───────────────────────────────────────────
-- A baixa (do Mestre também) passa pela função dar_baixa, que confere a regra e grava a produção.
create policy pcp_ver on public.pcp_atividades for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre', 'Técnico de Segurança'])));
create policy pcp_criar on public.pcp_atividades for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy pcp_editar on public.pcp_atividades for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy pcp_apagar on public.pcp_atividades for delete
  using (obra_id in (select minhas_obras()) and status = 'Planejada' and (select papel_em(array['Engenheiro', 'Coordenador'])));

create policy producoes_ver on public.producoes for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre'])));
create policy producoes_ajuste on public.producoes for insert
  with check (obra_id in (select minhas_obras()) and origem = 'Ajuste' and lancado_por = (select meu_perfil())
    and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy producoes_editar on public.producoes for update
  using (obra_id in (select minhas_obras()) and origem = 'Ajuste' and (select papel_em(array['Engenheiro'])));
create policy producoes_apagar on public.producoes for delete
  using (obra_id in (select minhas_obras()) and origem = 'Ajuste' and (select papel_em(array['Engenheiro'])));

-- ── ocorrências ──────────────────────────────────────────────
create policy ocorrencias_ver on public.ocorrencias for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador', 'Cliente'])));
create policy ocorrencias_abrir on public.ocorrencias for insert
  with check (obra_id in (select minhas_obras()) and aberta_por = (select meu_perfil()) and status = 'Aberta'
    and (select papel_em(array['Engenheiro', 'Coordenador', 'Cliente'])));
create policy ocorrencias_responder on public.ocorrencias for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy ocorrencias_apagar on public.ocorrencias for delete
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro'])));

create policy fotos_ver on public.ocorrencia_fotos for select
  using (exists (select 1 from ocorrencias o where o.id = ocorrencia_id and o.obra_id in (select minhas_obras()))
    and (select papel_em(array['Engenheiro', 'Coordenador', 'Cliente'])));
create policy fotos_enviar on public.ocorrencia_fotos for insert
  with check (enviada_por = (select meu_perfil())
    and exists (select 1 from ocorrencias o where o.id = ocorrencia_id and o.obra_id in (select minhas_obras()))
    and (select papel_em(array['Engenheiro', 'Coordenador', 'Cliente'])));
create policy fotos_apagar on public.ocorrencia_fotos for delete using ((select papel_em(array['Engenheiro'])));

-- ============================================================
-- Leituras sem dinheiro e ações com regra (security definer, conferem obra e papel)
-- ============================================================

-- Serviços sem custo_orcado, com o PESO relativo de cada um no avanço (0 a 1):
-- custo, se todos os serviços têm custo; senão, duração. A soma dos pesos é 1.
create or replace function public.servicos_sem_custo(p_obra bigint)
returns table (
  id bigint, obra_id bigint, uid_project int, pai_id bigint, etapa_entrega_id bigint, codigo_eap text, nome text,
  nivel smallint, e_resumo boolean, local text, unidade text, quantidade_prevista numeric, unidade_alterada_em timestamptz,
  inicio_previsto date, fim_previsto date, duracao_dias int, inicio_base date, fim_base date, folga_dias int,
  critico boolean, quantidade_executada numeric, inicio_real date, fim_real date, dias_atraso int, cancelado boolean, peso numeric
) language sql stable security definer set search_path = public as $$
  with base as (
    select * from servicos s
     where s.obra_id = p_obra and p_obra in (select minhas_obras())
       and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre', 'Cliente', 'Técnico de Segurança']))
  ),
  medidos as (select * from base where not e_resumo and not cancelado),
  regra as (select coalesce(bool_and(coalesce(custo_orcado, 0) > 0), false) todos from medidos),
  pesos as (
    select m.id, case when (select todos from regra) then m.custo_orcado else greatest(1, m.duracao_dias) end::numeric p
      from medidos m
  )
  select b.id, b.obra_id, b.uid_project, b.pai_id, b.etapa_entrega_id, b.codigo_eap, b.nome, b.nivel, b.e_resumo, b.local,
         b.unidade, b.quantidade_prevista, b.unidade_alterada_em, b.inicio_previsto, b.fim_previsto, b.duracao_dias,
         b.inicio_base, b.fim_base, b.folga_dias, b.critico, b.quantidade_executada, b.inicio_real, b.fim_real,
         b.dias_atraso, b.cancelado,
         coalesce(p.p / nullif(sum(p.p) over (), 0), 0)
    from base b left join pesos p on p.id = b.id
$$;

-- Pacotes sem valor_premio (para o Mestre).
create or replace function public.pacotes_sem_premio(p_obra bigint)
returns table (
  id bigint, obra_id bigint, servico_id bigint, nome text, local text, quantidade_meta numeric, quantidade_executada numeric,
  data_inicio date, data_fechamento date, status text, motivo_nao_conclusao text, fechado_em timestamptz
) language sql stable security definer set search_path = public as $$
  select id, obra_id, servico_id, nome, local, quantidade_meta, quantidade_executada, data_inicio, data_fechamento,
         status, motivo_nao_conclusao, fechado_em
    from pacotes
   where obra_id = p_obra and p_obra in (select minhas_obras())
     and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre']))
$$;

-- Produção resumida (para a curva S do Cliente): só datas e quantidades.
create or replace function public.producoes_resumo(p_obra bigint)
returns table (servico_id bigint, data date, quantidade numeric)
language sql stable security definer set search_path = public as $$
  select servico_id, data, quantidade from producoes
   where obra_id = p_obra and p_obra in (select minhas_obras())
     and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre', 'Cliente', 'Técnico de Segurança']))
$$;

-- Nome e papel das pessoas da obra (para mostrar quem abriu, quem lançou).
create or replace function public.pessoas_da_obra(p_obra bigint)
returns table (id bigint, nome text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.role from profiles p
   where p_obra in (select minhas_obras())
     and (p.role = 'Engenheiro' or p.id in (select profile_id from obra_usuarios where obra_id = p_obra))
$$;

-- Baixa de atividade do PCP: mesma regra de src/lib/pcp.js (resultadoBaixa), conferida aqui no banco.
create or replace function public.dar_baixa(p_atividade bigint, p_executada numeric, p_motivo text)
returns public.pcp_atividades language plpgsql security definer set search_path = public as $$
declare
  a pcp_atividades;
  novo text;
begin
  select * into a from pcp_atividades where id = p_atividade;
  if a.id is null or a.obra_id not in (select minhas_obras()) then raise exception 'Atividade não encontrada.'; end if;
  if not (papel_em(array['Engenheiro', 'Coordenador']) or (papel_em(array['Mestre']) and hoje_local() - a.data_prevista <= 1)) then
    raise exception 'Baixa travada — fale com o engenheiro.';
  end if;
  if p_executada is null or p_executada < 0 then raise exception 'Informe quanto foi executado.'; end if;
  if p_executada >= a.quantidade_planejada then novo := 'Concluída'; p_motivo := null;
  elsif p_motivo is null then raise exception 'Escolha o motivo de não concluir.';
  else novo := 'Não concluída';
  end if;
  delete from producoes where pcp_atividade_id = a.id;
  update pcp_atividades set status = novo, quantidade_executada = p_executada, motivo_nao_conclusao = p_motivo,
         baixa_por = meu_perfil(), baixa_em = now()
   where id = a.id returning * into a;
  if p_executada > 0 then
    insert into producoes (obra_id, data, servico_id, quantidade, origem, pcp_atividade_id, pacote_id, lancado_por)
    values (a.obra_id, a.data_prevista, a.servico_id, p_executada, 'PCP', a.id, a.pacote_id, meu_perfil());
  end if;
  return a;
end;
$$;

create or replace function public.desfazer_baixa(p_atividade bigint)
returns public.pcp_atividades language plpgsql security definer set search_path = public as $$
declare a pcp_atividades;
begin
  select * into a from pcp_atividades where id = p_atividade;
  if a.id is null or a.obra_id not in (select minhas_obras()) then raise exception 'Atividade não encontrada.'; end if;
  if not (papel_em(array['Engenheiro', 'Coordenador']) or (papel_em(array['Mestre']) and hoje_local() - a.data_prevista <= 1)) then
    raise exception 'Baixa travada — fale com o engenheiro.';
  end if;
  delete from producoes where pcp_atividade_id = a.id;
  update pcp_atividades set status = 'Planejada', quantidade_executada = null, motivo_nao_conclusao = null,
         baixa_por = null, baixa_em = null
   where id = a.id returning * into a;
  return a;
end;
$$;

-- Liberar conta: só o Engenheiro escolhe o papel e a obra de alguém.
create or replace function public.liberar_usuario(p_profile bigint, p_role text, p_obra bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not papel_em(array['Engenheiro']) then raise exception 'Só o engenheiro libera contas.'; end if;
  update profiles set role = p_role where id = p_profile;
  if p_obra is not null and p_role <> 'Engenheiro' then
    insert into obra_usuarios (obra_id, profile_id) values (p_obra, p_profile) on conflict do nothing;
  end if;
end;
$$;

-- ── Quem pode chamar as funções ──────────────────────────────
revoke execute on all functions in schema public from public, anon;
grant execute on function public.meu_perfil(), public.meu_papel(), public.papel_em(text[]), public.minhas_obras(),
  public.hoje_local(), public.servicos_sem_custo(bigint), public.pacotes_sem_premio(bigint),
  public.producoes_resumo(bigint), public.pessoas_da_obra(bigint), public.dar_baixa(bigint, numeric, text),
  public.desfazer_baixa(bigint), public.liberar_usuario(bigint, text, bigint) to authenticated;
revoke execute on function public.handle_new_user(), public.recalcular_executado(), public.numerar_ocorrencia() from authenticated;

-- ── Fotos da capa (Storage) ──────────────────────────────────
-- Bucket público para leitura (são fotos da obra e logos); só Engenheiro e Coordenador gravam.
insert into storage.buckets (id, name, public) values ('capa', 'capa', true) on conflict do nothing;
create policy capa_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'capa' and (select public.papel_em(array['Engenheiro', 'Coordenador'])));
create policy capa_trocar on storage.objects for update to authenticated
  using (bucket_id = 'capa' and (select public.papel_em(array['Engenheiro', 'Coordenador'])));
create policy capa_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'capa' and (select public.papel_em(array['Engenheiro', 'Coordenador'])));
