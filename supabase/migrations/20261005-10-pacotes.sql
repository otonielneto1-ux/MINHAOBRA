-- Pacotes: criar/editar com as regras no banco e o fechamento da folha (PRD-BACKEND, "Fechamento
-- dos pacotes na folha"). 05/10/2026.

-- 1. Regras da tabela: prêmio não negativo, início antes do fechamento, um prêmio por funcionário por pacote.
alter table public.pacotes add constraint pacotes_valor_premio_check check (valor_premio >= 0);
alter table public.pacotes add constraint pacotes_datas_check check (data_inicio <= data_fechamento);
alter table public.premios add constraint premios_pacote_funcionario_key unique (pacote_id, funcionario_id);

-- 2. À mão, o pacote só fica Planejado, Liberado ou Em execução, e o serviço é da mesma obra.
--    Concluído / Não concluído e fechado_em só saem do fechamento (função fechar_pacotes).
drop policy pacotes_criar on public.pacotes;
create policy pacotes_criar on public.pacotes for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and status in ('Planejado', 'Liberado', 'Em execução') and fechado_em is null
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = pacotes.obra_id and not s.e_resumo));

drop policy pacotes_editar on public.pacotes;
create policy pacotes_editar on public.pacotes for update
  using (obra_id in (select minhas_obras()) and fechado_em is null and (select papel_em(array['Engenheiro', 'Coordenador'])))
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and status in ('Planejado', 'Liberado', 'Em execução') and fechado_em is null
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = pacotes.obra_id and not s.e_resumo));

-- 3. Fechamento da folha: tudo numa transação. Mesma regra de src/lib/premio.js (dividirPremio):
--    bateu 100% da meta → Concluído e o prêmio é dividido pelos dias de presença de cada funcionário
--    próprio (Direta/Indireta) entre o início e o fechamento do pacote; o centavo que sobra vai para
--    quem tem mais dias (empate: o de menor id). Não bateu → Não concluído com o motivo informado.
--    p_motivos: { "<id do pacote>": "<causa>" } para os que não bateram a meta.
create or replace function public.fechar_pacotes(p_obra bigint, p_data date, p_motivos jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  r record;
  m text;
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
    if p.quantidade_executada >= p.quantidade_meta then
      select count(*) into tot_dias
        from presencas pr join funcionarios f on f.id = pr.funcionario_id
       where pr.pacote_id = p.id and pr.situacao = 'Presente' and pr.data between p.data_inicio and p.data_fechamento
         and f.tipo_mao_obra in ('Direta', 'Indireta');
      if tot_dias = 0 then raise exception 'Pacote % concluído sem nenhuma presença registrada.', p.nome; end if;
      tot_cent := round(p.valor_premio * 100)::bigint;
      distribuido := 0;
      for r in
        select pr.funcionario_id, count(*)::int dias
          from presencas pr join funcionarios f on f.id = pr.funcionario_id
         where pr.pacote_id = p.id and pr.situacao = 'Presente' and pr.data between p.data_inicio and p.data_fechamento
           and f.tipo_mao_obra in ('Direta', 'Indireta')
         group by pr.funcionario_id
         order by count(*) desc, pr.funcionario_id
      loop
        insert into premios (pacote_id, funcionario_id, dias, valor)
        values (p.id, r.funcionario_id, r.dias, (tot_cent * r.dias / tot_dias) / 100.0);
        distribuido := distribuido + tot_cent * r.dias / tot_dias;
      end loop;
      update premios set valor = valor + (tot_cent - distribuido) / 100.0
       where id = (select id from premios where pacote_id = p.id order by dias desc, funcionario_id limit 1);
      update pacotes set status = 'Concluído', motivo_nao_conclusao = null, fechado_em = now() where id = p.id;
      total := total + p.valor_premio;
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

revoke execute on function public.fechar_pacotes(bigint, date, jsonb) from public, anon;
grant execute on function public.fechar_pacotes(bigint, date, jsonb) to authenticated;
