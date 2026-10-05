-- Ajustes da revisão de código antes do primeiro envio do banco, 05/10/2026.

-- 1. Efetivo: o funcionário tem de ser da mesma obra (senão o lançamento de uma obra trava o
--    dia do funcionário em outra, pela chave única funcionario_id + data), e a correção confere
--    de novo a janela do Mestre — antes, a checagem do update só olhava lancado_por, e dava para
--    mover um lançamento de hoje para um dia antigo ou para outra obra.
drop policy presencas_criar on public.presencas;
create policy presencas_criar on public.presencas for insert
  with check (obra_id in (select minhas_obras()) and lancado_por = (select meu_perfil())
    and exists (select 1 from funcionarios f where f.id = funcionario_id and f.obra_id = presencas.obra_id)
    and ((select papel_em(array['Engenheiro', 'Coordenador']))
      or ((select papel_em(array['Mestre'])) and data >= (select hoje_local()) - 1)));

drop policy presencas_editar on public.presencas;
create policy presencas_editar on public.presencas for update
  using (obra_id in (select minhas_obras()) and (
    (select papel_em(array['Engenheiro', 'Coordenador']))
    or ((select papel_em(array['Mestre'])) and data >= (select hoje_local()) - 1)))
  with check (obra_id in (select minhas_obras()) and lancado_por = (select meu_perfil())
    and exists (select 1 from funcionarios f where f.id = funcionario_id and f.obra_id = presencas.obra_id)
    and ((select papel_em(array['Engenheiro', 'Coordenador']))
      or ((select papel_em(array['Mestre'])) and data >= (select hoje_local()) - 1)));

-- 2. Pacotes: sem WITH CHECK, o Postgres reaproveita o USING ("fechado_em is null") e o próprio
--    fechamento (que grava fechado_em) seria recusado. Pacote fechado continua travado pelo USING.
drop policy pacotes_editar on public.pacotes;
create policy pacotes_editar on public.pacotes for update
  using (obra_id in (select minhas_obras()) and fechado_em is null and (select papel_em(array['Engenheiro', 'Coordenador'])))
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
