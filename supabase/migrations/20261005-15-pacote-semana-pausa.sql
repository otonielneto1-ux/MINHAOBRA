-- Pacote ligado à semana, pausa e troca de pacote no meio do mês (pedido do Otoniel, 05/10/2026). Decisões:
--   * a atividade da semana entra sozinha no pacote aberto (não pausado) que tem o serviço naquele dia; com dois
--     pacotes possíveis, a pessoa escolhe. A baixa de uma atividade sem pacote liga na hora (pacote_unico), e
--     salvar um pacote puxa as baixas do período que ainda não tinham pacote. Mesma regra de src/lib/pcp.js
--     (pacotesPara / ligarPacotes): mudou uma, mude a outra;
--   * pausar é o pacote inteiro, com o problema (mesma lista de motivos) e a data; quem pausa, retoma e leva a equipe
--     para outro pacote: ver a migration 16 (só Engenheiro e Coordenador);
--   * pacote que fecha pausado paga proporcional: prêmio × % executado da meta (média dos serviços, cada um até 100%);
--   * quem entra num pacote depois do início (entrou_em) recebe a parte igual × dias úteis (seg–sex) em que esteve
--     ÷ dias úteis do pacote; o resto fica com quem estava desde o início. Mesma conta de premioDoPacote.

-- 1. Pausa.
alter table public.pacotes drop constraint pacotes_status_check;
alter table public.pacotes add constraint pacotes_status_check
  check (status in ('Planejado', 'Liberado', 'Em execução', 'Pausado', 'Concluído', 'Não concluído'));
alter table public.pacotes
  add column pausa_motivo text check (pausa_motivo in (
    'Chuva', 'Solo encharcado', 'Vento ou calor excessivo',
    'Falta de equipe', 'Baixa produtividade', 'Retrabalho',
    'Frente não liberada', 'Meta acima da capacidade', 'Interferência de outra equipe', 'Mudança de prioridade',
    'Falta de projeto', 'Dúvida ou erro de projeto',
    'Falta de material', 'Atraso na entrega de material', 'Equipamento (falta ou quebra)',
    'Acidente ou incidente', 'Paralisação por segurança', 'Falta de EPI',
    'Outro')),
  add column pausa_desde date,
  add column pausado_por bigint references public.profiles (id),
  add constraint pacotes_pausa_check check (status <> 'Pausado' or (pausa_motivo is not null and pausa_desde is not null));

-- Pela tela de edição, um pacote pausado continua pausado (salvar_pacote mantém o status); pausar e retomar
-- só pelas funções abaixo, que gravam o problema.
drop policy pacotes_editar on public.pacotes;
create policy pacotes_editar on public.pacotes for update
  using (obra_id in (select minhas_obras()) and fechado_em is null and (select papel_em(array['Engenheiro', 'Coordenador'])))
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and status in ('Planejado', 'Liberado', 'Em execução', 'Pausado') and fechado_em is null);

-- 2. Entrada no meio do período (null = desde o início).
alter table public.pacote_colaboradores add column entrou_em date;

-- 3. O pacote único que recebe a produção de um serviço num dia (null se nenhum ou mais de um).
create function public.pacote_unico(p_obra bigint, p_servico bigint, p_data date)
returns bigint language sql stable security definer set search_path = public as $$
  select case when count(*) = 1 then min(p.id) end
    from pacotes p join pacote_servicos ps on ps.pacote_id = p.id
   where p.obra_id = p_obra and ps.servico_id = p_servico and p.fechado_em is null and p.status <> 'Pausado'
     and p_data between p.data_inicio and p.data_fechamento
$$;
revoke execute on function public.pacote_unico(bigint, bigint, date) from public, anon, authenticated;

-- 4. Baixa: atividade sem pacote liga no pacote único do serviço naquele dia.
create or replace function public.dar_baixa(p_atividade bigint, p_executada numeric, p_motivo text, p_equipe text)
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
  if nullif(trim(p_equipe), '') is null then raise exception 'Informe a equipe que fez a atividade.'; end if;
  if p_executada >= a.quantidade_planejada then novo := 'Concluída'; p_motivo := null;
  elsif p_motivo is null then raise exception 'Escolha o motivo de não concluir.';
  else novo := 'Não concluída';
  end if;
  delete from producoes where pcp_atividade_id = a.id;
  update pcp_atividades set status = novo, quantidade_executada = p_executada, motivo_nao_conclusao = p_motivo,
         equipe_executou = trim(p_equipe), baixa_por = meu_perfil(), baixa_em = now(),
         pacote_id = coalesce(pacote_id, pacote_unico(obra_id, servico_id, data_prevista))
   where id = a.id returning * into a;
  if p_executada > 0 then
    insert into producoes (obra_id, data, servico_id, quantidade, origem, pcp_atividade_id, pacote_id, lancado_por)
    values (a.obra_id, a.data_prevista, a.servico_id, p_executada, 'PCP', a.id, a.pacote_id, meu_perfil());
  end if;
  return a;
end;
$$;

-- 5. Salvar pacote: colaboradores com a data de entrada ([{ funcionario_id, entrou_em }]); pausado continua
--    pausado; e as baixas do período que estavam sem pacote passam a contar nele (se ele for o único possível).
drop function public.salvar_pacote(bigint, bigint, jsonb, jsonb, jsonb);
create function public.salvar_pacote(p_obra bigint, p_id bigint, p_pacote jsonb, p_servicos jsonb, p_colaboradores jsonb)
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
   where pacote_id = pid and funcionario_id not in (select (x->>'funcionario_id')::bigint from jsonb_array_elements(coalesce(p_colaboradores, '[]')) x);
  insert into pacote_colaboradores as pc (obra_id, pacote_id, funcionario_id, entrou_em)
  select p_obra, pid, c.funcionario_id, c.entrou_em
    from jsonb_to_recordset(coalesce(p_colaboradores, '[]')) as c(funcionario_id bigint, entrou_em date)
  on conflict (pacote_id, funcionario_id) do update set entrou_em = excluded.entrou_em;

  perform ligar_baixas_ao_pacote(pid);
  return pid;
end;
$$;

-- Atividades da semana (planejadas ou já baixadas) ainda sem pacote, de serviço e dia em que este pacote é o
-- único possível, passam para ele; a produção das baixas vai junto (o gatilho refaz o executado).
-- security definer: atividade baixada não se edita pela RLS.
create function public.ligar_baixas_ao_pacote(p_pacote bigint)
returns void language plpgsql security definer set search_path = public as $$
declare o bigint := (select obra_id from pacotes where id = p_pacote);
begin
  if o is null or o not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não salva pacote.';
  end if;
  update pcp_atividades a set pacote_id = p_pacote
   where a.obra_id = o and a.pacote_id is null and pacote_unico(o, a.servico_id, a.data_prevista) = p_pacote;
  update producoes pr set pacote_id = p_pacote
    from pcp_atividades a
   where a.id = pr.pcp_atividade_id and a.pacote_id = p_pacote and pr.pacote_id is null and pr.obra_id = o;
end;
$$;
revoke execute on function public.ligar_baixas_ao_pacote(bigint) from public, anon;
grant execute on function public.ligar_baixas_ao_pacote(bigint) to authenticated;
revoke execute on function public.salvar_pacote(bigint, bigint, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.salvar_pacote(bigint, bigint, jsonb, jsonb, jsonb) to authenticated;

-- 6. Pausar, retomar e levar a equipe para outro pacote (Engenheiro, Coordenador e Mestre).
create function public.pausar_pacote(p_pacote bigint, p_motivo text, p_data date)
returns void language plpgsql security definer set search_path = public as $$
declare p pacotes;
begin
  select * into p from pacotes where id = p_pacote for update;
  if p.id is null or p.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador', 'Mestre']) then
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

create function public.retomar_pacote(p_pacote bigint)
returns void language plpgsql security definer set search_path = public as $$
declare p pacotes;
begin
  select * into p from pacotes where id = p_pacote for update;
  if p.id is null or p.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador', 'Mestre']) then
    raise exception 'Seu perfil não retoma pacote.';
  end if;
  if p.fechado_em is not null or p.status <> 'Pausado' then raise exception 'Este pacote não está pausado.'; end if;
  update pacotes set status = 'Em execução', pausa_motivo = null, pausa_desde = null, pausado_por = null where id = p.id;
end;
$$;

-- Quem já é colaborador do destino continua como está; os novos entram na data (antes do início = desde o início).
create function public.remanejar_colaboradores(p_destino bigint, p_funcionarios bigint[], p_data date)
returns int language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  n int;
begin
  select * into p from pacotes where id = p_destino;
  if p.id is null or p.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador', 'Mestre']) then
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

revoke execute on function public.pausar_pacote(bigint, text, date), public.retomar_pacote(bigint),
  public.remanejar_colaboradores(bigint, bigint[], date) from public, anon;
grant execute on function public.pausar_pacote(bigint, text, date), public.retomar_pacote(bigint),
  public.remanejar_colaboradores(bigint, bigint[], date) to authenticated;

-- 7. O Mestre lê a pausa (sem dinheiro).
drop function public.pacotes_sem_premio(bigint);
create function public.pacotes_sem_premio(p_obra bigint)
returns table (id bigint, obra_id bigint, nome text, local text, data_inicio date, data_fechamento date, status text,
               motivo_nao_conclusao text, fechado_em timestamptz, pausa_motivo text, pausa_desde date)
language sql stable security definer set search_path = public as $$
  select id, obra_id, nome, local, data_inicio, data_fechamento, status, motivo_nao_conclusao, fechado_em, pausa_motivo, pausa_desde
    from pacotes
   where obra_id = p_obra and p_obra in (select minhas_obras())
     and (select papel_em(array['Engenheiro', 'Coordenador', 'Mestre']))
$$;
revoke execute on function public.pacotes_sem_premio(bigint) from public, anon;
grant execute on function public.pacotes_sem_premio(bigint) to authenticated;

-- 8. Fechamento. Mesma conta de src/lib/premio.js (fatorDoPremio, premioDoPacote, dividirComEntradas):
--    bateu a meta → Concluído e paga 100%; pausado → Não concluído com o problema da pausa e paga o % executado
--    (com 2 casas); senão → Não concluído com o motivo informado, sem prêmio.
--    Cada parte (centavos) = round(MO orçada × pct_pago × % ÷ 100). Quem entrou depois do início recebe
--    round(parte × dias úteis dele ÷ (dias úteis do pacote × n)); o resto vai em partes iguais para quem está desde
--    o início (centavo a mais para os menores ids); se todos entraram depois, o resto vai para todos.
create function public.dias_uteis(p_de date, p_ate date)
returns int language sql immutable set search_path = public as $$
  select count(*)::int from generate_series(p_de, p_ate, interval '1 day') d where extract(isodow from d) < 6
$$;

-- Colaboradores de uma parte do pacote: desde o início (cheio) ou não, dias úteis no pacote e presenças (informação).
create function public.membros_da_parte(p_pacote bigint, p_parte text)
returns table (funcionario_id bigint, cheio boolean, du int, dias int)
language sql stable security definer set search_path = public as $$
  select pc.funcionario_id, pc.entrou_em is null or pc.entrou_em <= p.data_inicio,
         dias_uteis(greatest(pc.entrou_em, p.data_inicio), p.data_fechamento),
         (select count(*) from presencas pr
           where pr.pacote_id = p.id and pr.funcionario_id = pc.funcionario_id and pr.situacao = 'Presente'
             and pr.data between p.data_inicio and p.data_fechamento)::int
    from pacote_colaboradores pc
    join pacotes p on p.id = pc.pacote_id
    join funcionarios f on f.id = pc.funcionario_id
   where pc.pacote_id = p_pacote and f.tipo_mao_obra <> 'Terceirizada' and ((f.funcao = 'Servente') = (p_parte = 'ajudante'))
$$;
revoke execute on function public.dias_uteis(date, date), public.membros_da_parte(bigint, text) from public, anon, authenticated;

create or replace function public.fechar_pacotes(p_obra bigint, p_data date, p_motivos jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  r record;
  m text;
  parte text;
  v_pct numeric;
  v_mo numeric;
  tot_cent bigint;
  dias_pac int;
  qtd int;
  qtd_cheio int;
  entrantes bigint;
  cada bigint;
  sobra bigint;
  fechados int := 0;
  total numeric := 0;
begin
  if not (p_obra in (select minhas_obras()) and papel_em(array['Engenheiro', 'Coordenador'])) then
    raise exception 'Seu perfil não fecha pacotes.';
  end if;
  for p in select * from pacotes where obra_id = p_obra and fechado_em is null and data_fechamento <= p_data order by id for update loop
    if not exists (select 1 from pacote_servicos where pacote_id = p.id) then
      raise exception 'Pacote % não tem nenhum serviço.', p.nome;
    end if;
    if not exists (select 1 from pacote_servicos where pacote_id = p.id and quantidade_executada < quantidade_meta) then
      v_pct := 100;
      m := null;
    elsif p.status = 'Pausado' then
      select round(avg(least(quantidade_executada / quantidade_meta, 1)) * 100, 2) into v_pct from pacote_servicos where pacote_id = p.id;
      m := p.pausa_motivo;
    else
      v_pct := 0;
      m := p_motivos ->> p.id::text;
      if m is null then raise exception 'Escolha o motivo de não concluir o pacote %.', p.nome; end if;
    end if;

    dias_pac := dias_uteis(p.data_inicio, p.data_fechamento);
    foreach parte in array array['profissional', 'ajudante'] loop
      exit when v_pct = 0;
      select coalesce(sum(case when parte = 'ajudante' then mo_ajudante else mo_profissional end), 0) into v_mo
        from pacote_servicos where pacote_id = p.id;
      tot_cent := round(v_mo * p.pct_pago * v_pct / 100)::bigint;
      continue when tot_cent = 0;
      select count(*), count(*) filter (where cheio) into qtd, qtd_cheio from membros_da_parte(p.id, parte);
      if qtd = 0 then
        raise exception 'Pacote %: a MO % não tem nenhum colaborador % escolhido.', p.nome, parte,
          case when parte = 'ajudante' then 'servente' else 'profissional' end;
      end if;
      -- Parte de quem entrou depois do início; o resto fica com quem está desde o início (ou com todos).
      select coalesce(sum(case when dias_pac = 0 then round(tot_cent::numeric / qtd) else round(tot_cent::numeric * du / (dias_pac * qtd)) end), 0)
        into entrantes from membros_da_parte(p.id, parte) where not cheio;
      if qtd_cheio = 0 then qtd_cheio := qtd; end if;
      cada := (tot_cent - entrantes) / qtd_cheio;
      sobra := (tot_cent - entrantes) - cada * qtd_cheio;
      for r in
        select mb.*, row_number() over (partition by mb.cheio or qtd_cheio = qtd order by mb.funcionario_id) ordem
          from membros_da_parte(p.id, parte) mb
      loop
        insert into premios (pacote_id, funcionario_id, dias, valor)
        select p.id, r.funcionario_id, r.dias, x.cent / 100.0
          from (select
                  case when r.cheio then 0 when dias_pac = 0 then round(tot_cent::numeric / qtd) else round(tot_cent::numeric * r.du / (dias_pac * qtd)) end
                  + case when r.cheio or qtd_cheio = qtd then cada + case when r.ordem <= sobra then 1 else 0 end else 0 end as cent) x
         where x.cent > 0;
      end loop;
      total := total + tot_cent / 100.0;
    end loop;

    update pacotes set status = case when m is null then 'Concluído' else 'Não concluído' end,
           motivo_nao_conclusao = m, fechado_em = now() where id = p.id;
    fechados := fechados + 1;
  end loop;
  if fechados = 0 then raise exception 'Nenhum pacote para fechar até esta data.'; end if;
  return json_build_object('fechados', fechados, 'total', round(total, 2));
end;
$$;
