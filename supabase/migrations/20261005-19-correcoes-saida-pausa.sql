-- Correções da revisão antes do envio (06/10/2026).
-- 1. Editar o pacote não tira quem saiu (o garantido dele não pode sumir nem ir para quem ficou).
-- 2. Pausar com data no passado desliga as baixas do dia da pausa em diante (iam para o proporcional e o pct_saida);
--    retomar liga de volta as atividades sem pacote.
-- 3. saiu_em / pct_saida só pela função remanejar_colaboradores (antes o insert direto aceitava as colunas).

create or replace function public.salvar_pacote(p_obra bigint, p_id bigint, p_pacote jsonb, p_servicos jsonb, p_colaboradores jsonb)
returns bigint language plpgsql security invoker set search_path = public as $$
declare
  pid bigint := p_id;
  anterior bigint := (p_pacote->>'renovado_de_id')::bigint;
begin
  if not (p_obra in (select minhas_obras()) and papel_em(array['Engenheiro', 'Coordenador'])) then
    raise exception 'Seu perfil não salva pacote.';
  end if;
  if coalesce(jsonb_array_length(p_servicos), 0) = 0 then raise exception 'Inclua pelo menos um serviço no pacote.'; end if;
  if pid is null then
    insert into pacotes (obra_id, nome, local, data_inicio, data_fechamento, status, pct_pago, renovado_de_id)
    values (p_obra, p_pacote->>'nome', p_pacote->>'local', (p_pacote->>'data_inicio')::date, (p_pacote->>'data_fechamento')::date,
            p_pacote->>'status', (p_pacote->>'pct_pago')::numeric, anterior)
    returning id into pid;
    if anterior is not null then perform marcar_renovacao(anterior, true); end if;
  else
    update pacotes set nome = p_pacote->>'nome', local = p_pacote->>'local', data_inicio = (p_pacote->>'data_inicio')::date,
           data_fechamento = (p_pacote->>'data_fechamento')::date, pct_pago = (p_pacote->>'pct_pago')::numeric,
           status = case when status = 'Pausado' then status else p_pacote->>'status' end
     where id = pid and obra_id = p_obra and fechado_em is null;
    if not found then raise exception 'Pacote fechado na folha não pode ser editado.'; end if;
  end if;

  if exists (select 1 from pacote_servicos where pacote_id = pid and quantidade_executada > 0
               and servico_id not in (select (x->>'servico_id')::bigint from jsonb_array_elements(p_servicos) x)) then
    raise exception 'Um serviço com produção lançada não pode sair do pacote.';
  end if;
  delete from pacote_servicos
   where pacote_id = pid and servico_id not in (select (x->>'servico_id')::bigint from jsonb_array_elements(p_servicos) x);
  insert into pacote_servicos as ps (obra_id, pacote_id, servico_id, quantidade_meta, meta_cronograma, mo_profissional, mo_ajudante)
  select p_obra, pid, s.servico_id, s.quantidade_meta, s.meta_cronograma, s.mo_profissional, s.mo_ajudante
    from jsonb_to_recordset(p_servicos) as s(servico_id bigint, quantidade_meta numeric, meta_cronograma numeric, mo_profissional numeric, mo_ajudante numeric)
  on conflict (pacote_id, servico_id) do update
    set quantidade_meta = excluded.quantidade_meta, meta_cronograma = excluded.meta_cronograma,
        mo_profissional = excluded.mo_profissional, mo_ajudante = excluded.mo_ajudante;

  delete from pacote_colaboradores
   where pacote_id = pid and saiu_em is null
     and funcionario_id not in (select (x->>'funcionario_id')::bigint from jsonb_array_elements(coalesce(p_colaboradores, '[]')) x);
  insert into pacote_colaboradores as pc (obra_id, pacote_id, funcionario_id, entrou_em)
  select p_obra, pid, c.funcionario_id, c.entrou_em
    from jsonb_to_recordset(coalesce(p_colaboradores, '[]')) as c(funcionario_id bigint, entrou_em date)
  on conflict (pacote_id, funcionario_id) do update set entrou_em = excluded.entrou_em;

  perform ligar_baixas_ao_pacote(pid);
  return pid;
end;
$$;

create or replace function public.pausar_pacote(p_pacote bigint, p_motivo text, p_data date,
  p_destino bigint default null, p_funcionarios bigint[] default null, p_entrada date default null)
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
  perform ligar_baixas_ao_pacote(p.id); -- antes de calcular o % de quem sai
  if p_destino is not null then perform remanejar_colaboradores(p_destino, p_funcionarios, p_entrada, p.id); end if;
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
  perform ligar_baixas_ao_pacote(p.id);
end;
$$;

revoke insert on public.pacote_colaboradores from anon, authenticated;
grant insert (obra_id, pacote_id, funcionario_id, entrou_em) on public.pacote_colaboradores to authenticated;
