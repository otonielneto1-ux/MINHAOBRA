-- Trocar % por quantidade: a meta guardada na saída arredonda em 3 casas, como quantidade_meta (numeric 3 casas),
-- para o % de quem saiu dar o mesmo que daria com a meta do pacote.
create or replace function public.trocar_unidade(p_servico bigint, p_unidade text, p_quantidade numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  s servicos;
  f numeric;
begin
  select * into s from servicos where id = p_servico;
  if s.id is null or s.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não troca a unidade.';
  end if;
  if s.unidade <> '%' then raise exception 'Este serviço já está medido em quantidade.'; end if;
  if p_unidade is null or p_unidade = '%' or p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Escolha a unidade e informe a quantidade prevista.';
  end if;
  f := p_quantidade / s.quantidade_prevista;
  update servicos set unidade = p_unidade, quantidade_prevista = p_quantidade, unidade_alterada_em = now(),
         quantidade_executada = quantidade_executada * f
   where id = s.id;
  update pcp_atividades set quantidade_planejada = quantidade_planejada * f, quantidade_executada = quantidade_executada * f
   where servico_id = s.id;
  -- Pacote fechado também converte; os prêmios (R$) não mudam.
  update pacote_servicos set quantidade_meta = quantidade_meta * f, quantidade_executada = quantidade_executada * f
   where servico_id = s.id;
  -- Antes das produções: o gatilho recalcula o % de quem saiu já com a meta convertida.
  update pacote_colaboradores
     set metas_saida = jsonb_set(metas_saida, array[s.id::text], to_jsonb(round((metas_saida ->> s.id::text)::numeric * f, 3)))
   where metas_saida ? s.id::text;
  update producoes set quantidade = quantidade * f where servico_id = s.id;
end;
$$;
