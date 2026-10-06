-- Correções da revisão da saída do pacote pausado (06/10/2026).
-- 1. O garantido de quem saiu não muda se a meta do pacote for editada depois: a meta de cada serviço na hora da
--    saída fica guardada (metas_saida) e o pct_saida é recalculado contra ela. Só a produção de antes da saída
--    (baixa atrasada ou corrigida) mexe no %. Trocar % por quantidade converte também essas metas.
-- 2. Ajuste de produção nunca entra em pacote (o app já não manda pacote_id; a API direta mandava, e um ajuste
--    negativo no pacote derrubava o % de quem saiu abaixo de zero e travava a baixa).
-- 3. Pacote pausado antes da 20261005-19 ainda tinha as baixas do dia da pausa em diante: desliga como o
--    pausar_pacote de hoje faz (o gatilho recalcula o executado e o % de quem saiu).

-- 1. Meta da saída.
alter table public.pacote_colaboradores add column metas_saida jsonb;
update public.pacote_colaboradores pc
   set metas_saida = coalesce((select jsonb_object_agg(ps.servico_id::text, ps.quantidade_meta) from public.pacote_servicos ps
                                where ps.pacote_id = pc.pacote_id), '{}')
 where pc.saiu_em is not null;
alter table public.pacote_colaboradores
  add constraint pacote_colaboradores_metas_saida_check check ((saiu_em is null) = (metas_saida is null));

-- % da meta atingida com a produção antes de p_data, contra as metas guardadas na saída ({servico_id: meta}).
-- Mesma conta de pct_atingido: média dos serviços, cada um até 100%, 2 casas.
drop function public.pct_atingido_antes(bigint, date);
create function public.pct_atingido_antes(p_pacote bigint, p_data date, p_metas jsonb)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(least(coalesce((select sum(pr.quantidade) from producoes pr
           where pr.pacote_id = p_pacote and pr.servico_id = m.key::bigint and pr.data < p_data), 0)
         / m.value::numeric, 1)) * 100, 2), 0)
    from jsonb_each_text(p_metas) m
$$;
revoke execute on function public.pct_atingido_antes(bigint, date, jsonb) from public, anon, authenticated;

create or replace function public.recalcular_saidas(p_pacote bigint)
returns void language sql security definer set search_path = public as $$
  update pacote_colaboradores pc set pct_saida = pct_atingido_antes(p_pacote, pc.saiu_em, pc.metas_saida)
   where pc.pacote_id = p_pacote and pc.saiu_em is not null
     and pc.pct_saida is distinct from pct_atingido_antes(p_pacote, pc.saiu_em, pc.metas_saida)
     and exists (select 1 from pacotes p where p.id = p_pacote and p.fechado_em is null)
$$;

create or replace function public.remanejar_colaboradores(p_destino bigint, p_funcionarios bigint[], p_data date, p_origem bigint default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  o pacotes;
  metas jsonb;
  n int;
begin
  select * into p from pacotes where id = p_destino;
  if p.id is null or p.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não troca colaborador de pacote.';
  end if;
  if p.fechado_em is not null or p.status = 'Pausado' then raise exception 'Escolha um pacote aberto e não pausado.'; end if;
  if p_data is null or p_data > p.data_fechamento then raise exception 'A entrada tem de ser até o fechamento do pacote de destino.'; end if;
  if coalesce(array_length(p_funcionarios, 1), 0) = 0 then raise exception 'Escolha quem vai para o outro pacote.'; end if;
  if exists (select 1 from unnest(p_funcionarios) x left join funcionarios f on f.id = x
              where f.id is null or f.obra_id <> p.obra_id or f.tipo_mao_obra = 'Terceirizada') then
    raise exception 'Só funcionário próprio desta obra entra em pacote.';
  end if;
  if p_origem is not null then
    select * into o from pacotes where id = p_origem;
    if o.id is null or o.obra_id <> p.obra_id or o.fechado_em is not null or o.status <> 'Pausado' then
      raise exception 'Só se leva a equipe de um pacote pausado.';
    end if;
    if p_data < o.pausa_desde then raise exception 'A equipe só sai do pacote pausado a partir do dia da pausa.'; end if;
    metas := coalesce((select jsonb_object_agg(servico_id::text, quantidade_meta) from pacote_servicos where pacote_id = p_origem), '{}');
    update pacote_colaboradores set saiu_em = p_data, metas_saida = metas, pct_saida = pct_atingido_antes(p_origem, p_data, metas)
     where pacote_id = p_origem and funcionario_id = any (p_funcionarios) and saiu_em is null;
  end if;
  insert into pacote_colaboradores (obra_id, pacote_id, funcionario_id, entrou_em)
  select p.obra_id, p.id, x, case when p_data > p.data_inicio then p_data end from unnest(p_funcionarios) x
  on conflict (pacote_id, funcionario_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.trocar_unidade(p_servico bigint, p_unidade text, p_quantidade numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  s servicos;
  f numeric;
begin
  select * into s from servicos where id = p_servico;
  if s.id is null or s.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não troca a unidade.';
  end if;
  if s.unidade <> '%' then raise exception 'Este serviço já está medido em quantidade.'; end if;
  if p_unidade is null or p_unidade = '%' or p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Escolha a unidade e informe a quantidade prevista.';
  end if;
  f := p_quantidade / s.quantidade_prevista;
  update servicos set unidade = p_unidade, quantidade_prevista = p_quantidade, unidade_alterada_em = now(),
         quantidade_executada = quantidade_executada * f
   where id = s.id;
  update pcp_atividades set quantidade_planejada = quantidade_planejada * f, quantidade_executada = quantidade_executada * f
   where servico_id = s.id;
  -- Pacote fechado também converte; os prêmios (R$) não mudam.
  update pacote_servicos set quantidade_meta = quantidade_meta * f, quantidade_executada = quantidade_executada * f
   where servico_id = s.id;
  -- Antes das produções: o gatilho recalcula o % de quem saiu já com a meta convertida.
  update pacote_colaboradores
     set metas_saida = jsonb_set(metas_saida, array[s.id::text], to_jsonb((metas_saida ->> s.id::text)::numeric * f))
   where metas_saida ? s.id::text;
  update producoes set quantidade = quantidade * f where servico_id = s.id;
end;
$$;

-- 2. Ajuste fora do pacote (lançar e editar).
drop policy producoes_ajuste on public.producoes;
create policy producoes_ajuste on public.producoes for insert
  with check (obra_id in (select minhas_obras()) and origem = 'Ajuste' and lancado_por = (select meu_perfil())
    and pacote_id is null and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = producoes.obra_id));
drop policy producoes_editar on public.producoes;
create policy producoes_editar on public.producoes for update
  using (obra_id in (select minhas_obras()) and origem = 'Ajuste' and (select papel_em(array['Engenheiro'])))
  with check (obra_id in (select minhas_obras()) and origem = 'Ajuste' and pacote_id is null and (select papel_em(array['Engenheiro']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = producoes.obra_id));

-- 3. Pausados antigos: baixas do dia da pausa em diante saem do pacote (vão para o pacote possível, se houver).
update public.pcp_atividades a set pacote_id = public.pacote_para(a.obra_id, a.servico_id, a.data_prevista, null)
  from public.pacotes p
 where p.id = a.pacote_id and p.status = 'Pausado' and p.fechado_em is null and a.data_prevista >= p.pausa_desde;
update public.producoes pr set pacote_id = a.pacote_id
  from public.pcp_atividades a
 where a.id = pr.pcp_atividade_id and pr.pacote_id is distinct from a.pacote_id
   and pr.pacote_id in (select id from public.pacotes where status = 'Pausado' and fechado_em is null);
