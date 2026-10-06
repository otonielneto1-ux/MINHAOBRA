-- Correção de 20261005-11: dentro de fechar_pacotes a variável "valor" tinha o mesmo nome da coluna
-- premios.valor e o banco recusava ("column reference valor is ambiguous"). Achado no teste do fechamento.

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
        select coalesce(sum(case when parte = 'ajudante' then mo_ajudante else mo_profissional end), 0) into v_valor
          from pacote_servicos where pacote_id = p.id;
        continue when v_valor = 0;
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
        tot_cent := round(v_valor * 100)::bigint;
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
        total := total + v_valor;
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
