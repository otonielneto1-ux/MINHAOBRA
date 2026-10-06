-- Correção da revisão de código (06/10/2026): o % de quem saiu conta a produção de antes da PAUSA, não de antes da
-- saída. saiu_em é a entrada no outro pacote e pode ser dias depois da pausa; se o pacote fosse retomado nesse meio,
-- a produção de quem ficou (e as baixas religadas pelo Retomar) entrava no garantido de quem saiu. O dia da pausa na
-- hora da saída fica guardado (pausa_na_saida), porque o Retomar apaga pausa_desde.
-- pct_atingido_antes e pct_atingido (fechamento pausado) são a mesma conta: mudou uma, mude a outra.
-- A desligada de baixas do pacote 5 (20261006-02, item 3) foi aprovada pelo Otoniel em 06/10/2026.

alter table public.pacote_colaboradores add column pausa_na_saida date;
update public.pacote_colaboradores pc
   set pausa_na_saida = least(coalesce(p.pausa_desde, pc.saiu_em), pc.saiu_em)
  from public.pacotes p
 where p.id = pc.pacote_id and pc.saiu_em is not null;
alter table public.pacote_colaboradores
  add constraint pacote_colaboradores_pausa_na_saida_check
  check ((saiu_em is null) = (pausa_na_saida is null) and pausa_na_saida <= saiu_em);

create or replace function public.recalcular_saidas(p_pacote bigint)
returns void language sql security definer set search_path = public as $$
  update pacote_colaboradores pc set pct_saida = pct_atingido_antes(p_pacote, pc.pausa_na_saida, pc.metas_saida)
   where pc.pacote_id = p_pacote and pc.saiu_em is not null
     and pc.pct_saida is distinct from pct_atingido_antes(p_pacote, pc.pausa_na_saida, pc.metas_saida)
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
    update pacote_colaboradores
       set saiu_em = p_data, pausa_na_saida = o.pausa_desde, metas_saida = metas,
           pct_saida = pct_atingido_antes(p_origem, o.pausa_desde, metas)
     where pacote_id = p_origem and funcionario_id = any (p_funcionarios) and saiu_em is null;
  end if;
  insert into pacote_colaboradores (obra_id, pacote_id, funcionario_id, entrou_em)
  select p.obra_id, p.id, x, case when p_data > p.data_inicio then p_data end from unnest(p_funcionarios) x
  on conflict (pacote_id, funcionario_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
