-- Prêmio em partes iguais entre os colaboradores escolhidos (pedido do Otoniel, 05/10/2026: "se o valor é
-- R$ 3000 para profissional e tem 2 pedreiros será 1500 para cada"). Antes era pelos dias de presença.
-- Mesma regra de src/lib/premio.js (premioDoPacote / dividirIgual): cada parte paga (MO orçada × pct_pago) é
-- dividida igualmente entre os colaboradores daquela parte (servente = ajudante; terceirizado nunca); os centavos
-- que sobram vão um para cada, a partir do menor id. premios.dias continua gravando os dias de presença no
-- pacote no período, só como informação.

create or replace function public.fechar_pacotes(p_obra bigint, p_data date, p_motivos jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  r record;
  m text;
  parte text;
  v_valor numeric;
  tot_cent bigint;
  qtd int;
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
      foreach parte in array array['profissional', 'ajudante'] loop
        select coalesce(sum(case when parte = 'ajudante' then mo_ajudante else mo_profissional end), 0) * p.pct_pago / 100 into v_valor
          from pacote_servicos where pacote_id = p.id;
        tot_cent := round(v_valor * 100)::bigint;
        continue when tot_cent = 0;
        select count(*) into qtd
          from pacote_colaboradores pc join funcionarios f on f.id = pc.funcionario_id
         where pc.pacote_id = p.id and f.tipo_mao_obra <> 'Terceirizada' and ((f.funcao = 'Servente') = (parte = 'ajudante'));
        if qtd = 0 then
          raise exception 'Pacote %: a MO % não tem nenhum colaborador % escolhido.', p.nome, parte,
            case when parte = 'ajudante' then 'servente' else 'profissional' end;
        end if;
        cada := tot_cent / qtd;
        sobra := tot_cent - cada * qtd;
        for r in
          select pc.funcionario_id, row_number() over (order by pc.funcionario_id) ordem,
                 (select count(*) from presencas pr
                   where pr.pacote_id = p.id and pr.funcionario_id = pc.funcionario_id and pr.situacao = 'Presente'
                     and pr.data between p.data_inicio and p.data_fechamento)::int dias_no_pacote
            from pacote_colaboradores pc join funcionarios f on f.id = pc.funcionario_id
           where pc.pacote_id = p.id and f.tipo_mao_obra <> 'Terceirizada' and ((f.funcao = 'Servente') = (parte = 'ajudante'))
           order by pc.funcionario_id
        loop
          insert into premios (pacote_id, funcionario_id, dias, valor)
          values (p.id, r.funcionario_id, r.dias_no_pacote, (cada + case when r.ordem <= sobra then 1 else 0 end) / 100.0);
        end loop;
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
  return json_build_object('fechados', fechados, 'total', round(total, 2));
end;
$$;
