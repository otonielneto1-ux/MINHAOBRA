-- Quem sai do pacote pausado (decidido pelo Otoniel em 06/10/2026).
-- 1. A saída é a partir do dia da pausa: remanejar_colaboradores recusa data antes de pausa_desde da origem.
--    Mesma regra de validarRemanejo (src/lib/premio.js).
-- 2. pct_saida = % da meta atingida contando só a produção do pacote com data ANTES da saída. Baixa atrasada de dia
--    anterior à pausa (o Mestre dá até o dia seguinte) entra no pacote pausado e sobe o % de quem saiu; baixa
--    corrigida para menos desce. Produção de depois da saída (ex.: pacote retomado) nunca entra. Recalculado pelo
--    gatilho de produções, que também pega o que ligar_baixas_ao_pacote move de pacote. Pacote fechado não muda.

-- % da meta atingida com a produção antes de p_data (mesma conta de pct_atingido: média dos serviços, cada um até
-- 100%, 2 casas). Com o pacote pausado e p_data >= pausa_desde, dá o mesmo que pct_atingido.
create function public.pct_atingido_antes(p_pacote bigint, p_data date)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(least(coalesce((select sum(pr.quantidade) from producoes pr
           where pr.pacote_id = ps.pacote_id and pr.servico_id = ps.servico_id and pr.data < p_data), 0)
         / ps.quantidade_meta, 1)) * 100, 2), 0)
    from pacote_servicos ps where ps.pacote_id = p_pacote
$$;
revoke execute on function public.pct_atingido_antes(bigint, date) from public, anon, authenticated;

create function public.recalcular_saidas(p_pacote bigint)
returns void language sql security definer set search_path = public as $$
  update pacote_colaboradores pc set pct_saida = pct_atingido_antes(p_pacote, pc.saiu_em)
   where pc.pacote_id = p_pacote and pc.saiu_em is not null
     and pc.pct_saida is distinct from pct_atingido_antes(p_pacote, pc.saiu_em)
     and exists (select 1 from pacotes p where p.id = p_pacote and p.fechado_em is null)
$$;
revoke execute on function public.recalcular_saidas(bigint) from public, anon, authenticated;

create or replace function public.recalcular_executado()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sid bigint := coalesce(new.servico_id, old.servico_id);
  pids bigint[] := array_remove(array[new.pacote_id, old.pacote_id], null);
  pid bigint;
begin
  update servicos s set
    quantidade_executada = coalesce(t.soma, 0),
    inicio_real = t.primeira,
    fim_real = case when coalesce(t.soma, 0) >= s.quantidade_prevista then coalesce(s.fim_real, t.ultima) end
  from (select sum(quantidade) soma, min(data) filter (where quantidade > 0) primeira, max(data) ultima
        from producoes where servico_id = sid) t
  where s.id = sid;
  update pacote_servicos ps set quantidade_executada = coalesce((select sum(pr.quantidade) from producoes pr
         where pr.pacote_id = ps.pacote_id and pr.servico_id = ps.servico_id), 0)
   where ps.pacote_id = any (pids)
     and exists (select 1 from pacotes p where p.id = ps.pacote_id and p.fechado_em is null);
  foreach pid in array pids loop
    perform recalcular_saidas(pid);
  end loop;
  return null;
end;
$$;

create or replace function public.remanejar_colaboradores(p_destino bigint, p_funcionarios bigint[], p_data date, p_origem bigint default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  o pacotes;
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
    update pacote_colaboradores set saiu_em = p_data, pct_saida = pct_atingido_antes(p_origem, p_data)
     where pacote_id = p_origem and funcionario_id = any (p_funcionarios) and saiu_em is null;
  end if;
  insert into pacote_colaboradores (obra_id, pacote_id, funcionario_id, entrou_em)
  select p.obra_id, p.id, x, case when p_data > p.data_inicio then p_data end from unnest(p_funcionarios) x
  on conflict (pacote_id, funcionario_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
