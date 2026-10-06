-- Quem sai do pacote pausado e ajuste manual do prêmio (decidido pelo Otoniel em 06/10/2026).
--   * Quem é levado do pacote pausado para outro guarda, na saída, o % da meta atingida (saiu_em, pct_saida): recebe
--     a parte igual (valor cheio) × esse %, aconteça o que acontecer depois com o pacote, e soma com o que ganhar no
--     pacote novo. O resto da parte fica com quem ficou. Mesma conta de dividirParte (src/lib/premio.js).
--   * Ajuste do prêmio: acréscimo ou desconto em R$ por funcionário e data da folha, com motivo; só Engenheiro e
--     Coordenador; entra na planilha da folha (aba Resumo do módulo Pacotes).

-- 1. Saída do pacote.
alter table public.pacote_colaboradores
  add column saiu_em date,
  add column pct_saida numeric(5,2) check (pct_saida between 0 and 100),
  add constraint pacote_colaboradores_saida_check check ((saiu_em is null) = (pct_saida is null));

-- % da meta atingida do pacote agora (média dos serviços, cada um até 100%, 2 casas) — o mesmo do fechamento pausado.
create function public.pct_atingido(p_pacote bigint)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(least(quantidade_executada / quantidade_meta, 1)) * 100, 2), 0) from pacote_servicos where pacote_id = p_pacote
$$;
revoke execute on function public.pct_atingido(bigint) from public, anon, authenticated;

-- Levar a equipe: com p_origem, quem vai sai do pacote de origem na data, levando o % atingido.
drop function public.remanejar_colaboradores(bigint, bigint[], date);
create function public.remanejar_colaboradores(p_destino bigint, p_funcionarios bigint[], p_data date, p_origem bigint default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  n int;
begin
  select * into p from pacotes where id = p_destino;
  if p.id is null or p.obra_id not in (select minhas_obras()) or not papel_em(array['Engenheiro', 'Coordenador']) then
    raise exception 'Seu perfil não troca colaborador de pacote.';
  end if;
  if p.fechado_em is not null or p.status = 'Pausado' then raise exception 'Escolha um pacote aberto e não pausado.'; end if;
  if p_data is null or p_data > p.data_fechamento then raise exception 'A entrada tem de ser até o fechamento do pacote de destino.'; end if;
  if coalesce(array_length(p_funcionarios, 1), 0) = 0 then raise exception 'Escolha quem vai para o outro pacote.'; end if;
  if exists (select 1 from unnest(p_funcionarios) x left join funcionarios f on f.id = x
              where f.id is null or f.obra_id <> p.obra_id or f.tipo_mao_obra = 'Terceirizada') then
    raise exception 'Só funcionário próprio desta obra entra em pacote.';
  end if;
  if p_origem is not null then
    if not exists (select 1 from pacotes o where o.id = p_origem and o.obra_id = p.obra_id and o.fechado_em is null and o.status = 'Pausado') then
      raise exception 'Só se leva a equipe de um pacote pausado.';
    end if;
    update pacote_colaboradores set saiu_em = p_data, pct_saida = pct_atingido(p_origem)
     where pacote_id = p_origem and funcionario_id = any (p_funcionarios) and saiu_em is null;
  end if;
  insert into pacote_colaboradores (obra_id, pacote_id, funcionario_id, entrou_em)
  select p.obra_id, p.id, x, case when p_data > p.data_inicio then p_data end from unnest(p_funcionarios) x
  on conflict (pacote_id, funcionario_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.remanejar_colaboradores(bigint, bigint[], date, bigint) from public, anon;
grant execute on function public.remanejar_colaboradores(bigint, bigint[], date, bigint) to authenticated;

create or replace function public.pausar_pacote(p_pacote bigint, p_motivo text, p_data date,
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
  if p_destino is not null then perform remanejar_colaboradores(p_destino, p_funcionarios, p_entrada, p.id); end if;
end;
$$;

-- 2. Fechamento com quem saiu.
drop function public.membros_da_parte(bigint, text);
create function public.membros_da_parte(p_pacote bigint, p_parte text)
returns table (funcionario_id bigint, cheio boolean, du int, dias int, saiu boolean, pct_saida numeric)
language sql stable security definer set search_path = public as $$
  select pc.funcionario_id, pc.entrou_em is null or pc.entrou_em <= p.data_inicio,
         dias_uteis(greatest(pc.entrou_em, p.data_inicio), p.data_fechamento),
         (select count(*) from presencas pr
           where pr.pacote_id = p.id and pr.funcionario_id = pc.funcionario_id and pr.situacao = 'Presente'
             and pr.data between p.data_inicio and p.data_fechamento)::int,
         pc.saiu_em is not null, pc.pct_saida
    from pacote_colaboradores pc
    join pacotes p on p.id = pc.pacote_id
    join funcionarios f on f.id = pc.funcionario_id
   where pc.pacote_id = p_pacote and f.tipo_mao_obra <> 'Terceirizada' and ((f.funcao = 'Servente') = (p_parte = 'ajudante'))
$$;
revoke execute on function public.membros_da_parte(bigint, text) from public, anon, authenticated;

-- Cada parte: cheio = round(MO × pct_pago) centavos (100%); pago = round(MO × pct_pago × pct ÷ 100).
--   quem saiu:   round(cheio × du × pct_saida ÷ (D × n × 100))      (du = D para quem estava desde o início)
--   quem entrou: round(pago × du ÷ (D × n))
--   resto = pago − os dois (mínimo 0), em partes iguais para quem está desde o início e ficou; se não há, para
--   quem ficou; se ninguém ficou, para quem saiu. Centavo a mais para os menores ids.
create or replace function public.fechar_pacotes(p_obra bigint, p_data date, p_motivos jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  p pacotes;
  r record;
  m text;
  parte text;
  v_pct numeric;
  v_mo numeric;
  cheio_cent bigint;
  tot_cent bigint;
  dias_pac int;
  qtd int;
  qtd_rec int;
  grupo int;
  fixos bigint;
  resto bigint;
  cada bigint;
  sobra bigint;
  pago bigint;
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
      v_pct := 100;
      m := null;
    elsif p.status = 'Pausado' then
      v_pct := pct_atingido(p.id);
      m := p.pausa_motivo;
    else
      v_pct := 0;
      m := p_motivos ->> p.id::text;
      if m is null then raise exception 'Escolha o motivo de não concluir o pacote %.', p.nome; end if;
    end if;

    dias_pac := dias_uteis(p.data_inicio, p.data_fechamento);
    foreach parte in array array['profissional', 'ajudante'] loop
      select coalesce(sum(case when parte = 'ajudante' then mo_ajudante else mo_profissional end), 0) into v_mo
        from pacote_servicos where pacote_id = p.id;
      cheio_cent := round(v_mo * p.pct_pago)::bigint;
      tot_cent := round(v_mo * p.pct_pago * v_pct / 100)::bigint;
      continue when cheio_cent = 0;
      select count(*) into qtd from membros_da_parte(p.id, parte);
      if qtd = 0 then
        continue when tot_cent = 0;
        raise exception 'Pacote %: a MO % não tem nenhum colaborador % escolhido.', p.nome, parte,
          case when parte = 'ajudante' then 'servente' else 'profissional' end;
      end if;
      -- Grupo que recebe o resto: 1 = desde o início e ficou; 2 = ficou; 3 = saiu (o primeiro que existir).
      select min(case when cheio and not saiu then 1 when not saiu then 2 else 3 end) into grupo from membros_da_parte(p.id, parte);
      select coalesce(sum(case
               when saiu then round(cheio_cent::numeric * (case when dias_pac = 0 then 1 else du end) * pct_saida / ((case when dias_pac = 0 then 1 else dias_pac end) * qtd * 100))
               when not cheio then round(tot_cent::numeric * (case when dias_pac = 0 then 1 else du end) / ((case when dias_pac = 0 then 1 else dias_pac end) * qtd))
               else 0 end), 0)
        into fixos from membros_da_parte(p.id, parte);
      resto := greatest(tot_cent - fixos, 0);
      select count(*) into qtd_rec from membros_da_parte(p.id, parte)
       where (case when cheio and not saiu then 1 when not saiu then 2 else 3 end) = grupo;
      cada := resto / qtd_rec;
      sobra := resto - cada * qtd_rec;
      for r in
        select mb.*, (case when mb.cheio and not mb.saiu then 1 when not mb.saiu then 2 else 3 end) = grupo recebe,
               row_number() over (partition by (case when mb.cheio and not mb.saiu then 1 when not mb.saiu then 2 else 3 end) = grupo order by mb.funcionario_id) ordem
          from membros_da_parte(p.id, parte) mb
      loop
        pago := case
                  when r.saiu then round(cheio_cent::numeric * (case when dias_pac = 0 then 1 else r.du end) * r.pct_saida / ((case when dias_pac = 0 then 1 else dias_pac end) * qtd * 100))
                  when not r.cheio then round(tot_cent::numeric * (case when dias_pac = 0 then 1 else r.du end) / ((case when dias_pac = 0 then 1 else dias_pac end) * qtd))
                  else 0 end
                + case when r.recebe then cada + case when r.ordem <= sobra then 1 else 0 end else 0 end;
        if pago > 0 then
          insert into premios (pacote_id, funcionario_id, dias, valor) values (p.id, r.funcionario_id, r.dias, pago / 100.0);
          total := total + pago / 100.0;
        end if;
      end loop;
    end loop;

    update pacotes set status = case when m is null then 'Concluído' else 'Não concluído' end,
           motivo_nao_conclusao = m, fechado_em = now() where id = p.id;
    fechados := fechados + 1;
  end loop;
  if fechados = 0 then raise exception 'Nenhum pacote para fechar até esta data.'; end if;
  return json_build_object('fechados', fechados, 'total', round(total, 2));
end;
$$;

-- 3. Ajuste do prêmio (dinheiro: só Engenheiro e Coordenador).
create table public.premio_ajustes (
  id bigint generated by default as identity primary key,
  obra_id bigint not null references public.obras (id) on delete cascade,
  funcionario_id bigint not null references public.funcionarios (id),
  data_folha date not null,
  valor numeric(14,2) not null check (valor <> 0),
  motivo text not null check (length(trim(motivo)) > 0),
  criado_por bigint references public.profiles (id),
  created_at timestamptz not null default now()
);
create index premio_ajustes_obra_data_idx on public.premio_ajustes (obra_id, data_folha);
alter table public.premio_ajustes enable row level security;
create policy premio_ajustes_ver on public.premio_ajustes for select
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
create policy premio_ajustes_criar on public.premio_ajustes for insert
  with check (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador']))
    and criado_por = (select meu_perfil())
    and exists (select 1 from funcionarios f where f.id = funcionario_id and f.obra_id = premio_ajustes.obra_id));
create policy premio_ajustes_apagar on public.premio_ajustes for delete
  using (obra_id in (select minhas_obras()) and (select papel_em(array['Engenheiro', 'Coordenador'])));
revoke update on public.premio_ajustes from anon, authenticated;
