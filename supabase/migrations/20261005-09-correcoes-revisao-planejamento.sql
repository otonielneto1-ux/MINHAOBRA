-- Correções da revisão do módulo Planejamento, 05/10/2026.

-- 1. A baixa não apaga mais a equipe planejada: a equipe que fez vai para uma coluna própria.
alter table public.pcp_atividades add column equipe_executou text;
-- Nas baixas que já existem, a equipe gravada é a que executou (a baixa escrevia por cima).
update public.pcp_atividades set equipe_executou = equipe where status <> 'Planejada';

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
         equipe_executou = trim(p_equipe), baixa_por = meu_perfil(), baixa_em = now()
   where id = a.id returning * into a;
  if p_executada > 0 then
    insert into producoes (obra_id, data, servico_id, quantidade, origem, pcp_atividade_id, pacote_id, lancado_por)
    values (a.obra_id, a.data_prevista, a.servico_id, p_executada, 'PCP', a.id, a.pacote_id, meu_perfil());
  end if;
  return a;
end;
$$;

create or replace function public.desfazer_baixa(p_atividade bigint)
returns public.pcp_atividades language plpgsql security definer set search_path = public as $$
declare a pcp_atividades;
begin
  select * into a from pcp_atividades where id = p_atividade;
  if a.id is null or a.obra_id not in (select minhas_obras()) then raise exception 'Atividade não encontrada.'; end if;
  if not (papel_em(array['Engenheiro', 'Coordenador']) or (papel_em(array['Mestre']) and hoje_local() - a.data_prevista <= 1)) then
    raise exception 'Baixa travada — fale com o engenheiro.';
  end if;
  delete from producoes where pcp_atividade_id = a.id;
  update pcp_atividades set status = 'Planejada', quantidade_executada = null, motivo_nao_conclusao = null,
         equipe_executou = null, baixa_por = null, baixa_em = null
   where id = a.id returning * into a;
  return a;
end;
$$;

-- 2. Planejar é de hoje em diante (mesma regra de validarAtividade em src/lib/pcp.js).
--    Editar só enquanto Planejada: antes, só o app conferia.
drop policy pcp_criar on public.pcp_atividades;
create policy pcp_criar on public.pcp_atividades for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and data_prevista >= (select hoje_local()) and status = 'Planejada'
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = pcp_atividades.obra_id)
    and (pacote_id is null or exists (select 1 from pacotes p where p.id = pacote_id and p.obra_id = pcp_atividades.obra_id)));

drop policy pcp_editar on public.pcp_atividades;
create policy pcp_editar on public.pcp_atividades for update
  using (obra_id in (select minhas_obras()) and status = 'Planejada' and (select papel_em(array['Engenheiro', 'Coordenador'])))
  with check (obra_id in (select minhas_obras()) and status = 'Planejada' and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = pcp_atividades.obra_id)
    and (pacote_id is null or exists (select 1 from pacotes p where p.id = pacote_id and p.obra_id = pcp_atividades.obra_id)));
