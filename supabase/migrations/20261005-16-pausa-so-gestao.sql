-- Pausar, retomar e levar a equipe para outro pacote: só Engenheiro e Coordenador (decidido pelo Otoniel em
-- 06/10/2026: pacote pausado paga proporcional, então pausar mexe no prêmio). Antes o Mestre também podia.

create or replace function public.pausar_pacote(p_pacote bigint, p_motivo text, p_data date)
returns void language plpgsql security definer set search_path = public as $$
declare p pacotes;
begin
  select * into p from pacotes where id = p_pacote for update;
  if p.id is null or p.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não pausa pacote.';
  end if;
  if p.fechado_em is not null then raise exception 'Pacote fechado na folha não pode ser pausado.'; end if;
  if p.status = 'Pausado' then raise exception 'Este pacote já está pausado.'; end if;
  if p_motivo is null then raise exception 'Escolha o problema que parou o pacote.'; end if;
  if p_data is null or p_data > hoje_local() or p_data < p.data_inicio then
    raise exception 'A data da pausa vai do início do pacote até hoje.';
  end if;
  update pacotes set status = 'Pausado', pausa_motivo = p_motivo, pausa_desde = p_data, pausado_por = meu_perfil() where id = p.id;
end;
$$;

create or replace function public.retomar_pacote(p_pacote bigint)
returns void language plpgsql security definer set search_path = public as $$
declare p pacotes;
begin
  select * into p from pacotes where id = p_pacote for update;
  if p.id is null or p.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não retoma pacote.';
  end if;
  if p.fechado_em is not null or p.status <> 'Pausado' then raise exception 'Este pacote não está pausado.'; end if;
  update pacotes set status = 'Em execução', pausa_motivo = null, pausa_desde = null, pausado_por = null where id = p.id;
end;
$$;

create or replace function public.remanejar_colaboradores(p_destino bigint, p_funcionarios bigint[], p_data date)
returns int language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
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
  insert into pacote_colaboradores (obra_id, pacote_id, funcionario_id, entrou_em)
  select p.obra_id, p.id, x, case when p_data > p.data_inicio then p_data end from unnest(p_funcionarios) x
  on conflict (pacote_id, funcionario_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
