-- Revisão antes do envio do Planejamento, 05/10/2026: atividade do PCP, ajuste de produção e
-- restrição só aceitam serviço (e pacote) DA MESMA OBRA da linha. Antes, só a obra da linha era
-- conferida: dava para gravar na obra A apontando um serviço da obra B, e o gatilho de produção
-- mexeria no executado da obra B.

drop policy pcp_criar on public.pcp_atividades;
create policy pcp_criar on public.pcp_atividades for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = pcp_atividades.obra_id)
    and (pacote_id is null or exists (select 1 from pacotes p where p.id = pacote_id and p.obra_id = pcp_atividades.obra_id)));

drop policy pcp_editar on public.pcp_atividades;
create policy pcp_editar on public.pcp_atividades for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])))
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = pcp_atividades.obra_id)
    and (pacote_id is null or exists (select 1 from pacotes p where p.id = pacote_id and p.obra_id = pcp_atividades.obra_id)));

drop policy producoes_ajuste on public.producoes;
create policy producoes_ajuste on public.producoes for insert
  with check (obra_id in (select minhas_obras()) and origem = 'Ajuste' and lancado_por = (select meu_perfil())
    and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = producoes.obra_id));

drop policy restricoes_criar on public.restricoes;
create policy restricoes_criar on public.restricoes for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = restricoes.obra_id));

drop policy restricoes_editar on public.restricoes;
create policy restricoes_editar on public.restricoes for update
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])))
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id = restricoes.obra_id));
