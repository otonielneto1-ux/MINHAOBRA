-- Ajustes pedidos pelos alertas do Supabase (get_advisors), 05/10/2026.

-- 1. Função sem search_path fixo.
create or replace function public.hoje_local() returns date
language sql stable set search_path = public as $$ select (now() at time zone 'America/Fortaleza')::date $$;

-- 2. Políticas "for all" que também valiam para leitura, sobrepostas à de ver: separadas por ação.
drop policy obra_usuarios_gerir on public.obra_usuarios;
create policy obra_usuarios_criar on public.obra_usuarios for insert with check ((select papel_em(array['Engenheiro'])));
create policy obra_usuarios_editar on public.obra_usuarios for update using ((select papel_em(array['Engenheiro'])));
create policy obra_usuarios_apagar on public.obra_usuarios for delete using ((select papel_em(array['Engenheiro'])));

drop policy dependencias_gerir on public.servico_dependencias;
create policy dependencias_criar on public.servico_dependencias for insert
  with check ((select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id in (select minhas_obras())));
create policy dependencias_editar on public.servico_dependencias for update
  using ((select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id in (select minhas_obras())));
create policy dependencias_apagar on public.servico_dependencias for delete
  using ((select papel_em(array['Engenheiro', 'Coordenador']))
    and exists (select 1 from servicos s where s.id = servico_id and s.obra_id in (select minhas_obras())));

-- Os demais avisos são intencionais:
-- - funções security definer chamáveis por quem está logado (dar_baixa, servicos_sem_custo, ...):
--   são as portas de propósito; cada uma confere obra e papel por dentro.
-- - chaves estrangeiras sem índice: volume de uma obra; reavaliar quando houver muitas.
