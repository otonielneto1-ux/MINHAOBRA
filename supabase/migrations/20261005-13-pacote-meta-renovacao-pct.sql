-- Pacote: meta sugerida pelo cronograma (guardada para destacar quando é editada), renovação no dia 21 e
-- % pago sobre a MO orçada (pedido do Otoniel, 05/10/2026). Decisões:
--   * a MO profissional/ajudante em R$ é de ORÇAMENTO; prêmio pago = MO orçada × pct_pago (um % por pacote);
--   * meta sugerida = previsto no cronograma atual entre o início do pacote e o dia 20, repartido pelos dias
--     de segunda a sexta (calculada em src/lib/premio.js); meta_cronograma guarda a sugestão;
--   * no dia 21 o app pergunta se cada pacote continua no período seguinte: continua = true (renovado,
--     o novo aponta para ele em renovado_de_id) ou false (encerrado); null = ainda sem resposta.

alter table public.pacotes
  add column pct_pago numeric(5,2) not null default 100 check (pct_pago > 0 and pct_pago <= 100),
  add column continua boolean,
  add column renovado_de_id bigint references public.pacotes (id);
alter table public.pacote_servicos add column meta_cronograma numeric(14,3);
grant update (meta_cronograma) on public.pacote_servicos to authenticated;

-- Responder a pergunta do dia 21 (o pacote pode já estar fechado: por isso é função, com a regra aqui dentro).
create function public.marcar_renovacao(p_pacote bigint, p_continua boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pacotes where id = p_pacote and obra_id in (select minhas_obras()))
     or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não decide a renovação do pacote.';
  end if;
  update pacotes set continua = p_continua where id = p_pacote;
end;
$$;

-- salvar_pacote: % pago, meta do cronograma e, na renovação, a ligação com o pacote anterior (que fica
-- marcado como "continua"), tudo na mesma transação.
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
           data_fechamento = (p_pacote->>'data_fechamento')::date, status = p_pacote->>'status', pct_pago = (p_pacote->>'pct_pago')::numeric
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
   where pacote_id = pid and funcionario_id not in (select x::bigint from jsonb_array_elements_text(coalesce(p_colaboradores, '[]')) x);
  insert into pacote_colaboradores (obra_id, pacote_id, funcionario_id)
  select p_obra, pid, x::bigint from jsonb_array_elements_text(coalesce(p_colaboradores, '[]')) x
  on conflict (pacote_id, funcionario_id) do nothing;
  return pid;
end;
$$;

-- Fechamento: cada parte paga = MO orçada da parte × pct_pago do pacote (mesma conta de premioDoPacote).
create or replace function public.fechar_pacotes(p_obra bigint, p_data date, p_motivos jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  r record;
  m text;
  parte text;
  v_valor numeric;
  tot_dias int;
  tot_cent bigint;
  distribuido bigint;
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
      foreach parte in array array['profissional', 'ajudante'] loop
        select coalesce(sum(case when parte = 'ajudante' then mo_ajudante else mo_profissional end), 0) * p.pct_pago / 100 into v_valor
          from pacote_servicos where pacote_id = p.id;
        tot_cent := round(v_valor * 100)::bigint;
        continue when tot_cent = 0;
        select count(*) into tot_dias
          from presencas pr
          join funcionarios f on f.id = pr.funcionario_id
          join pacote_colaboradores pc on pc.pacote_id = p.id and pc.funcionario_id = pr.funcionario_id
         where pr.pacote_id = p.id and pr.situacao = 'Presente' and pr.data between p.data_inicio and p.data_fechamento
           and f.tipo_mao_obra <> 'Terceirizada' and ((f.funcao = 'Servente') = (parte = 'ajudante'));
        if tot_dias = 0 then
          raise exception 'Pacote %: a MO % não tem nenhum colaborador % com presença registrada.', p.nome, parte,
            case when parte = 'ajudante' then 'servente' else 'profissional' end;
        end if;
        distribuido := 0;
        for r in
          select pr.funcionario_id, count(*)::int dias
            from presencas pr
            join funcionarios f on f.id = pr.funcionario_id
            join pacote_colaboradores pc on pc.pacote_id = p.id and pc.funcionario_id = pr.funcionario_id
           where pr.pacote_id = p.id and pr.situacao = 'Presente' and pr.data between p.data_inicio and p.data_fechamento
             and f.tipo_mao_obra <> 'Terceirizada' and ((f.funcao = 'Servente') = (parte = 'ajudante'))
           group by pr.funcionario_id
           order by count(*) desc, pr.funcionario_id
        loop
          insert into premios (pacote_id, funcionario_id, dias, valor)
          values (p.id, r.funcionario_id, r.dias, (tot_cent * r.dias / tot_dias) / 100.0);
          distribuido := distribuido + tot_cent * r.dias / tot_dias;
        end loop;
        update premios set valor = valor + (tot_cent - distribuido) / 100.0
         where id = (select pm.id from premios pm join funcionarios f on f.id = pm.funcionario_id
                      where pm.pacote_id = p.id and ((f.funcao = 'Servente') = (parte = 'ajudante'))
                      order by pm.dias desc, pm.funcionario_id limit 1);
        total := total + tot_cent / 100.0;
      end loop;
      update pacotes set status = 'Concluído', motivo_nao_conclusao = null, fechado_em = now() where id = p.id;
    else
      m := p_motivos ->> p.id::text;
      if m is null then raise exception 'Escolha o motivo de não concluir o pacote %.', p.nome; end if;
      update pacotes set status = 'Não concluído', motivo_nao_conclusao = m, fechado_em = now() where id = p.id;
    end if;
    fechados := fechados + 1;
  end loop;
  if fechados = 0 then raise exception 'Nenhum pacote para fechar até esta data.'; end if;
  return json_build_object('fechados', fechados, 'total', total);
end;
$$;

revoke execute on function public.marcar_renovacao(bigint, boolean) from public, anon;
grant execute on function public.marcar_renovacao(bigint, boolean) to authenticated;
