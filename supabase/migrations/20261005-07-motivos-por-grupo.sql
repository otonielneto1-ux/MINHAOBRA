-- Motivos de não conclusão em 7 grupos macro (pedido do Otoniel, 05/10/2026). Os grupos ficam em
-- src/lib/vocabulario.js (GRUPOS_MOTIVO); aqui fica a lista fechada das causas, com o texto idêntico.
-- "Projeto" vira "Dúvida ou erro de projeto" e "Equipamento" vira "Equipamento (falta ou quebra)".

alter table public.pcp_atividades drop constraint pcp_atividades_motivo_nao_conclusao_check;
alter table public.pacotes drop constraint pacotes_motivo_nao_conclusao_check;

update public.pcp_atividades set motivo_nao_conclusao = case motivo_nao_conclusao
    when 'Projeto' then 'Dúvida ou erro de projeto' else 'Equipamento (falta ou quebra)' end
 where motivo_nao_conclusao in ('Projeto', 'Equipamento');
update public.pacotes set motivo_nao_conclusao = case motivo_nao_conclusao
    when 'Projeto' then 'Dúvida ou erro de projeto' else 'Equipamento (falta ou quebra)' end
 where motivo_nao_conclusao in ('Projeto', 'Equipamento');

alter table public.pcp_atividades add constraint pcp_atividades_motivo_nao_conclusao_check check (motivo_nao_conclusao in (
  'Chuva', 'Solo encharcado', 'Vento ou calor excessivo',
  'Falta de equipe', 'Baixa produtividade', 'Retrabalho',
  'Frente não liberada', 'Meta acima da capacidade', 'Interferência de outra equipe', 'Mudança de prioridade',
  'Falta de projeto', 'Dúvida ou erro de projeto',
  'Falta de material', 'Atraso na entrega de material', 'Equipamento (falta ou quebra)',
  'Acidente ou incidente', 'Paralisação por segurança', 'Falta de EPI',
  'Outro'));
alter table public.pacotes add constraint pacotes_motivo_nao_conclusao_check check (motivo_nao_conclusao in (
  'Chuva', 'Solo encharcado', 'Vento ou calor excessivo',
  'Falta de equipe', 'Baixa produtividade', 'Retrabalho',
  'Frente não liberada', 'Meta acima da capacidade', 'Interferência de outra equipe', 'Mudança de prioridade',
  'Falta de projeto', 'Dúvida ou erro de projeto',
  'Falta de material', 'Atraso na entrega de material', 'Equipamento (falta ou quebra)',
  'Acidente ou incidente', 'Paralisação por segurança', 'Falta de EPI',
  'Outro'));
