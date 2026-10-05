-- Baixa do PCP passa a pedir a equipe que fez a atividade (pedido do Otoniel, 05/10/2026).
-- Mesma regra de src/lib/pcp.js (resultadoBaixa): executado → equipe → motivo.

drop function public.dar_baixa(bigint, numeric, text);

create function public.dar_baixa(p_atividade bigint, p_executada numeric, p_motivo text, p_equipe text)
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
         equipe = trim(p_equipe), baixa_por = meu_perfil(), baixa_em = now()
   where id = a.id returning * into a;
  if p_executada > 0 then
    insert into producoes (obra_id, data, servico_id, quantidade, origem, pcp_atividade_id, pacote_id, lancado_por)
    values (a.obra_id, a.data_prevista, a.servico_id, p_executada, 'PCP', a.id, a.pacote_id, meu_perfil());
  end if;
  return a;
end;
$$;

revoke execute on function public.dar_baixa(bigint, numeric, text, text) from public, anon;
grant execute on function public.dar_baixa(bigint, numeric, text, text) to authenticated;
