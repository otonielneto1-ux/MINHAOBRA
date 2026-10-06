-- Correções da revisão do módulo Pacotes (06/10/2026).

-- 1. Editar pacote com colaboradores dava erro de RLS: salvar_pacote regrava entrou_em (on conflict do update) e
--    pacote_colaboradores não tinha política de update. Só a data de entrada muda, só Eng/Coord, só pacote aberto.
create policy pacote_colaboradores_editar on public.pacote_colaboradores for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from pacotes p where p.id = pacote_id and p.fechado_em is null))
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
revoke update on public.pacote_colaboradores from anon, authenticated;
grant update (entrou_em) on public.pacote_colaboradores to authenticated;

-- 2. Pacote da produção: o que a atividade já tem só vale se ainda for possível naquele dia; senão, o único
--    possível. Possível = aberto, com o serviço, dia no período e, se pausado, dia ANTES da pausa (o que foi feito
--    antes de parar continua contando para o proporcional). Mesma regra de pacotesPara / ligarPacotes
--    (src/lib/pcp.js). Antes, a baixa mantinha o pacote antigo mesmo pausado e somava produção nele.
create or replace function public.pacote_unico(p_obra bigint, p_servico bigint, p_data date)
returns bigint language sql stable security definer set search_path = public as $$
  select case when count(*) = 1 then min(p.id) end
    from pacotes p join pacote_servicos ps on ps.pacote_id = p.id
   where p.obra_id = p_obra and ps.servico_id = p_servico and p.fechado_em is null
     and (p.status <> 'Pausado' or p_data < p.pausa_desde)
     and p_data between p.data_inicio and p.data_fechamento
$$;

create function public.pacote_para(p_obra bigint, p_servico bigint, p_data date, p_pref bigint)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.id from pacotes p join pacote_servicos ps on ps.pacote_id = p.id
      where p.id = p_pref and p.obra_id = p_obra and ps.servico_id = p_servico and p.fechado_em is null
        and (p.status <> 'Pausado' or p_data < p.pausa_desde) and p_data between p.data_inicio and p.data_fechamento),
    pacote_unico(p_obra, p_servico, p_data))
$$;
revoke execute on function public.pacote_para(bigint, bigint, date, bigint) from public, anon, authenticated;

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
         pacote_id = pacote_para(obra_id, servico_id, data_prevista, pacote_id)
   where id = a.id returning * into a;
  if p_executada > 0 then
    insert into producoes (obra_id, data, servico_id, quantidade, origem, pcp_atividade_id, pacote_id, lancado_por)
    values (a.obra_id, a.data_prevista, a.servico_id, p_executada, 'PCP', a.id, a.pacote_id, meu_perfil());
  end if;
  return a;
end;
$$;

-- 3. Salvar o pacote também desliga o que ficou fora do novo período (ou de serviço que saiu) e manda para o
--    pacote possível daquele dia; depois liga o que estava sem pacote.
create or replace function public.ligar_baixas_ao_pacote(p_pacote bigint)
returns void language plpgsql security definer set search_path = public as $$
declare o bigint := (select obra_id from pacotes where id = p_pacote);
begin
  if o is null or o not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não salva pacote.';
  end if;
  update pcp_atividades a set pacote_id = pacote_para(o, a.servico_id, a.data_prevista, null)
   where a.obra_id = o and a.pacote_id = p_pacote and pacote_para(o, a.servico_id, a.data_prevista, p_pacote) is distinct from p_pacote;
  update pcp_atividades a set pacote_id = p_pacote
   where a.obra_id = o and a.pacote_id is null and pacote_unico(o, a.servico_id, a.data_prevista) = p_pacote;
  update producoes pr set pacote_id = a.pacote_id
    from pcp_atividades a
   where a.id = pr.pcp_atividade_id and pr.obra_id = o and pr.pacote_id is distinct from a.pacote_id
     and (a.pacote_id = p_pacote or pr.pacote_id = p_pacote);
end;
$$;

-- 4. Pausado e pausa andam juntos: sair de Pausado só pelo Retomar (que limpa a pausa) ou pelo fechamento
--    (que guarda o problema). Antes dava para trocar o status direto e ficar com a pausa velha.
alter table public.pacotes drop constraint pacotes_pausa_check;
alter table public.pacotes add constraint pacotes_pausa_check
  check (fechado_em is not null or (status = 'Pausado') = (pausa_motivo is not null and pausa_desde is not null));

-- 5. Pausar e levar a equipe numa transação só (antes eram duas chamadas e podia ficar pela metade).
drop function public.pausar_pacote(bigint, text, date);
create function public.pausar_pacote(p_pacote bigint, p_motivo text, p_data date,
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
  if p_destino is not null then perform remanejar_colaboradores(p_destino, p_funcionarios, p_entrada); end if;
end;
$$;
revoke execute on function public.pausar_pacote(bigint, text, date, bigint, bigint[], date) from public, anon;
grant execute on function public.pausar_pacote(bigint, text, date, bigint, bigint[], date) to authenticated;
