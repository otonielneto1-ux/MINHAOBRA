-- Planejamento: importação do Project, gravação do recálculo, custos em lote e troca de unidade.
-- Cada função grava tudo numa transação: nada fica pela metade.
-- As três primeiras rodam com os direitos de quem chama (a RLS continua valendo) e conferem
-- obra e papel na entrada, para não "passar" em silêncio com zero linhas.

-- Importação do MS Project (PRD-BACKEND, "Importação do MS Project").
-- Casa pelo uid_project; custo, unidade, quantidade e produção nunca são tocados.
-- Linha de base: só grava onde ainda não existe (primeira importação e serviço novo).
create or replace function public.importar_cronograma(p_obra bigint, p_tarefas jsonb, p_ligacoes jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not (p_obra in (select minhas_obras()) and papel_em(array['Engenheiro', 'Coordenador'])) then
    raise exception 'Seu perfil não importa cronograma.';
  end if;
  if coalesce(jsonb_array_length(p_tarefas), 0) = 0 then raise exception 'Arquivo sem tarefas.'; end if;

  insert into servicos as s (obra_id, uid_project, etapa_entrega_id, codigo_eap, nome, nivel, e_resumo,
                             inicio_previsto, fim_previsto, duracao_dias, inicio_base, fim_base)
  select p_obra, t.uid, t.etapa_entrega_id, t.codigo_eap, t.nome, t.nivel, t.e_resumo,
         t.inicio_previsto, t.fim_previsto, t.duracao_dias, t.inicio_base, t.fim_base
    from jsonb_to_recordset(p_tarefas) as t(uid int, etapa_entrega_id bigint, codigo_eap text, nome text, nivel smallint,
         e_resumo boolean, inicio_previsto date, fim_previsto date, duracao_dias int, inicio_base date, fim_base date)
  on conflict (obra_id, uid_project) do update set
    etapa_entrega_id = excluded.etapa_entrega_id, codigo_eap = excluded.codigo_eap, nome = excluded.nome,
    nivel = excluded.nivel, e_resumo = excluded.e_resumo, inicio_previsto = excluded.inicio_previsto,
    fim_previsto = excluded.fim_previsto, duracao_dias = excluded.duracao_dias,
    inicio_base = coalesce(s.inicio_base, excluded.inicio_base), fim_base = coalesce(s.fim_base, excluded.fim_base),
    cancelado = false;

  update servicos s set pai_id = p.id
    from jsonb_to_recordset(p_tarefas) as t(uid int, pai_uid int)
    left join servicos p on p.obra_id = p_obra and p.uid_project = t.pai_uid
   where s.obra_id = p_obra and s.uid_project = t.uid;

  -- Sumiu do Project: fica cancelado, nunca apagado (pode ter produção).
  update servicos set cancelado = true
   where obra_id = p_obra and not cancelado
     and uid_project not in (select (x->>'uid')::int from jsonb_array_elements(p_tarefas) x);

  delete from servico_dependencias where servico_id in (select id from servicos where obra_id = p_obra);
  insert into servico_dependencias (servico_id, predecessora_id, tipo, defasagem_dias)
  select s.id, p.id, l.tipo, l.defasagem
    from jsonb_to_recordset(p_ligacoes) as l(uid int, pred_uid int, tipo text, defasagem int)
    join servicos s on s.obra_id = p_obra and s.uid_project = l.uid
    join servicos p on p.obra_id = p_obra and p.uid_project = l.pred_uid
   where s.id <> p.id
  on conflict do nothing;
end;
$$;

-- Resultado do recálculo (feito em src/lib/cronograma.js, com teste) gravado de uma vez.
create or replace function public.gravar_calculo(p_obra bigint, p_linhas jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not (p_obra in (select minhas_obras()) and papel_em(array['Engenheiro', 'Coordenador'])) then
    raise exception 'Seu perfil não recalcula o cronograma.';
  end if;
  update servicos s set inicio_cedo = l.inicio_cedo, fim_tarde = l.fim_tarde, folga_dias = l.folga_dias,
         critico = l.critico, dias_atraso = l.dias_atraso
    from jsonb_to_recordset(p_linhas) as l(id bigint, inicio_cedo date, fim_tarde date, folga_dias int, critico boolean, dias_atraso int)
   where s.id = l.id and s.obra_id = p_obra;
  update obras set ultimo_calculo_em = now() where id = p_obra;
end;
$$;

-- "Editar custos" do Cronograma: todos os custos digitados de uma vez (null = sem custo).
create or replace function public.salvar_custos(p_obra bigint, p_linhas jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not (p_obra in (select minhas_obras()) and papel_em(array['Engenheiro', 'Coordenador'])) then
    raise exception 'Seu perfil não edita custos.';
  end if;
  update servicos s set custo_orcado = l.custo
    from jsonb_to_recordset(p_linhas) as l(id bigint, custo numeric)
   where s.id = l.id and s.obra_id = p_obra;
end;
$$;

-- Trocar % por quantidade (PRD-BACKEND, "Trocar % por quantidade"). Precisa de security definer:
-- converte também produções da baixa (origem PCP) e pacotes fechados, que a RLS trava de propósito.
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
  update pacotes set quantidade_meta = quantidade_meta * f, quantidade_executada = quantidade_executada * f
   where servico_id = s.id;
  update producoes set quantidade = quantidade * f where servico_id = s.id;
end;
$$;

revoke execute on function public.importar_cronograma(bigint, jsonb, jsonb), public.gravar_calculo(bigint, jsonb),
  public.salvar_custos(bigint, jsonb), public.trocar_unidade(bigint, text, numeric) from public, anon;
grant execute on function public.importar_cronograma(bigint, jsonb, jsonb), public.gravar_calculo(bigint, jsonb),
  public.salvar_custos(bigint, jsonb), public.trocar_unidade(bigint, text, numeric) to authenticated;
