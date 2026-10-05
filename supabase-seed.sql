-- Carga inicial (dados de exemplo da Conviver Costamare). Gerado por scripts/gerar-seed.mjs.

insert into public.profiles (id,nome,email,role,ativo) values
(1,'Otoniel Neto','otoniel@exemplo.com','Engenheiro',true),
(2,'Larissa Mendes','larissa@exemplo.com','Coordenador',true),
(3,'Valdir Araújo','valdir@exemplo.com','Mestre',true),
(4,'Breno Cavalcante','breno@exemplo.com','Cliente',true),
(5,'Juliana Rocha','juliana@exemplo.com','Técnico de Segurança',true),
(6,'Camila Sá','camila@exemplo.com','Auxiliar Administrativo',true),
(7,'Pedro Henrique Lopes','pedro@exemplo.com','Aguardando',true);

insert into public.config (id,nome_construtora,logo_construtora) values
(1,'Solutio Engenharia',null);

insert into public.obras (id,nome,cidade,uf,cliente,data_inicio,data_fim_contrato,dia_fechamento_folha,status,ultimo_calculo_em,foto_obra,logo_cliente) values
(1,'Conviver Costamare','Parnaíba','PI','Conviver Urbanismo','2026-03-02','2027-12-31',20,'Em andamento','2026-10-07T07:30:00',null,null);

insert into public.obra_usuarios (id,obra_id,profile_id) values
(1,1,2),
(2,1,3),
(3,1,4),
(4,1,5),
(5,1,6);

insert into public.etapas_entrega (id,obra_id,nome,ordem,data_entrega_contratual) values
(1,1,'Geral',1,'2027-06-30'),
(2,1,'Fase 01',2,'2027-03-31'),
(3,1,'Fase 02',3,'2027-12-31');

insert into public.servicos (id,obra_id,uid_project,pai_id,etapa_entrega_id,codigo_eap,nome,nivel,e_resumo,local,unidade,quantidade_prevista,custo_orcado,unidade_alterada_em,inicio_previsto,fim_previsto,duracao_dias,inicio_base,fim_base,folga_dias,critico,quantidade_executada,inicio_real,fim_real,cancelado) values
(1,1,1,null,1,'1','Geral',1,true,null,'%',100,null,null,'2026-03-02','2027-06-30',486,'2026-03-02','2027-06-30',20,false,0,null,null,false),
(2,1,2,null,2,'2','Fase 01',1,true,null,'%',100,null,null,'2026-04-06','2027-03-31',360,'2026-04-06','2027-03-31',20,false,0,null,null,false),
(3,1,3,null,3,'3','Fase 02',1,true,null,'%',100,null,null,'2026-09-01','2027-06-30',303,'2026-09-01','2027-06-30',20,false,0,null,null,false),
(11,1,11,1,1,'1.1','Instalação do canteiro',2,false,'Canteiro central','%',100,85000,null,'2026-03-02','2026-03-31',30,'2026-03-02','2026-03-31',0,false,100,'2026-03-02','2026-04-03',false),
(12,1,12,1,1,'1.2','Locação topográfica',2,false,'Toda a gleba','%',100,38000,null,'2026-03-09','2026-04-30',53,'2026-03-09','2026-04-30',0,false,100,'2026-03-09','2026-04-30',false),
(13,1,13,1,1,'1.3','Adutora de água – trecho externo',2,false,'Acesso PI-116','%',100,620000,null,'2026-06-01','2026-11-30',183,'2026-06-01','2026-11-30',0,true,55,'2026-06-01',null,false),
(21,1,21,2,2,'2.1','Limpeza e terraplenagem – Fase 01',2,false,'Quadras A a H','%',100,1150000,null,'2026-04-06','2026-07-31',117,'2026-04-06','2026-07-31',0,false,100,'2026-04-06','2026-08-14',false),
(22,1,22,2,2,'2.2','Drenagem pluvial – galerias Fase 01',2,false,'Ruas 1 a 4','m',3200,1480000,'2026-09-15T10:00:00','2026-08-03','2026-11-30',120,'2026-08-03','2026-11-30',0,true,1534,'2026-08-03',null,false),
(23,1,23,2,2,'2.3','Rede de água – Fase 01',2,false,'Quadras A a F','m',5100,690000,'2026-08-01T10:00:00','2026-07-01','2026-09-25',87,'2026-07-01','2026-09-25',12,false,4300.001,'2026-07-01',null,false),
(24,1,24,2,2,'2.4','Rede de esgoto – Fase 01',2,false,'Ruas 3 a 5','m',4900,980000,'2026-09-20T10:00:00','2026-09-15','2026-12-15',92,'2026-09-15','2026-12-15',0,true,640,'2026-09-15',null,false),
(25,1,25,2,2,'2.5','Meio-fio e sarjeta – Fase 01',2,false,'Ruas 1 a 5','%',100,540000,null,'2026-09-28','2026-12-31',95,'2026-09-28','2026-12-31',8,false,0,null,null,false),
(26,1,26,2,2,'2.6','Pavimentação intertravada – Fase 01',2,false,'Ruas 1 a 5','%',100,null,null,'2026-12-01','2027-03-31',121,'2026-12-01','2027-03-31',0,true,0,null,null,false),
(31,1,31,3,3,'3.1','Limpeza e terraplenagem – Fase 02',2,false,'Quadras I a P','%',100,1240000,null,'2026-09-01','2026-12-31',122,'2026-09-01','2026-12-31',15,false,22.2,'2026-09-01',null,false),
(32,1,32,3,3,'3.2','Drenagem pluvial – Fase 02',2,false,'Ruas 6 a 9','%',100,null,null,'2027-01-04','2027-04-30',117,'2027-01-04','2027-04-30',0,true,0,null,null,false),
(33,1,33,3,3,'3.3','Rede elétrica e iluminação – Fase 02',2,false,'Ruas 6 a 9','%',100,870000,null,'2027-03-01','2027-06-30',122,'2027-03-01','2027-06-30',30,false,0,null,null,false);

insert into public.servico_dependencias (id,servico_id,predecessora_id,tipo,defasagem_dias) values
(1,22,21,'TI',0),
(2,24,22,'II',14),
(3,25,24,'II',10),
(4,26,22,'TI',0),
(5,26,25,'TT',0),
(6,32,31,'TI',0),
(7,33,32,'TI',0),
(8,21,12,'TI',0);

insert into public.restricoes (id,obra_id,servico_id,tipo,descricao,responsavel,data_limite,status,removida_em) values
(1,1,25,'Liberação de área','Liberação da Rua 5 pela topografia','Topografia','2026-10-02','Pendente',null),
(2,1,24,'Material','Tubos PVC 200 mm — pedido Sienge 4512','Compras','2026-10-09','Pendente',null),
(3,1,26,'Projeto','Projeto de paginação aprovado','Projetos','2026-09-30','Removida','2026-09-25'),
(4,1,32,'Equipamento','Retroescavadeira extra para a drenagem da Fase 02','Otoniel','2026-12-15','Pendente',null);

insert into public.funcionarios (id,obra_id,nome,funcao,tipo_mao_obra,empresa,matricula,ativo) values
(101,1,'Raimundo Sousa','Encarregado','Direta',null,'1021',true),
(102,1,'Francisco Lima','Pedreiro','Direta',null,'1034',true),
(103,1,'Damião Carvalho','Pedreiro','Direta',null,'1036',true),
(104,1,'José Carlos Alves','Pedreiro','Direta',null,'1035',true),
(105,1,'Antônio Pereira','Servente','Direta',null,'1040',true),
(106,1,'Luiz Ferreira','Servente','Direta',null,'1041',true),
(107,1,'Gilvan Santos','Servente','Direta',null,'1043',true),
(108,1,'Josué Ribeiro','Servente','Direta',null,'1044',true),
(109,1,'Marcos Oliveira','Encanador','Direta',null,'1050',true),
(110,1,'Ana Beatriz Moura','Apontador','Indireta',null,'1060',true),
(111,1,'Carlos Eduardo Nunes','Almoxarife','Indireta',null,'1061',true),
(112,1,'Paulo Henrique Costa','Operador de máquina','Terceirizada','Terraplan Delta Ltda',null,true),
(113,1,'Wellington Araújo','Operador de máquina','Terceirizada','Terraplan Delta Ltda',null,true),
(114,1,'Edson Rocha','Motorista','Terceirizada','Terraplan Delta Ltda',null,true),
(115,1,'Sérgio Batista','Servente','Direta',null,'1042',false),
(116,1,'Cícero Nascimento','Eletricista','Terceirizada','Eletro Barra Instalações Ltda',null,true),
(117,1,'Fábio Teixeira','Eletricista','Terceirizada','Eletro Barra Instalações Ltda',null,true);

insert into public.pacotes (id,obra_id,servico_id,nome,local,quantidade_meta,quantidade_executada,valor_premio,data_inicio,data_fechamento,status,motivo_nao_conclusao,fechado_em) values
(1,1,23,'Rede de água Fase 01 – Quadras A a D','Quadras A a D',1200,1200,2400,'2026-09-01','2026-09-20','Concluído',null,'2026-09-20T17:00:00'),
(2,1,22,'Galeria Rua 1','Rua 1',300,210,1300,'2026-09-01','2026-09-20','Não concluído','Chuva','2026-09-20T17:00:00'),
(3,1,22,'Galeria Rua 2 – trecho 1','Rua 2, Quadra B',400,260,1800,'2026-09-21','2026-10-20','Em execução',null,null),
(4,1,23,'Rede de água Fase 01 – Quadras E e F','Quadras E e F',800,640,1600,'2026-09-21','2026-10-20','Em execução',null,null),
(5,1,24,'Esgoto Rua 5 – lado ímpar','Rua 5',350,40,1500,'2026-10-05','2026-10-20','Liberado',null,null),
(6,1,25,'Meio-fio Rua 1','Rua 1',8,0,1200,'2026-10-12','2026-11-20','Planejado',null,null);

insert into public.premios (id,pacote_id,funcionario_id,dias,valor) values
(1,1,108,17,1200),
(2,1,109,17,1200);

insert into public.pcp_atividades (id,obra_id,semana_inicio,data_prevista,servico_id,pacote_id,local,quantidade_planejada,equipe,status,quantidade_executada,motivo_nao_conclusao,baixa_por,baixa_em,copiada_de_id) values
(1,1,'2026-08-10','2026-08-10',21,null,'Quadra H',4,'Terraplan Delta','Concluída',4,null,3,'2026-08-10T17:30:00',null),
(2,1,'2026-08-10','2026-08-11',23,null,'Quadra A',80,'Eq. Marcos','Concluída',85,null,3,'2026-08-11T17:30:00',null),
(3,1,'2026-08-10','2026-08-12',22,null,'Rua 1',50,'Eq. Raimundo','Não concluída',20,'Chuva',3,'2026-08-12T17:30:00',null),
(4,1,'2026-08-10','2026-08-13',23,null,'Quadra A',80,'Eq. Marcos','Concluída',80,null,3,'2026-08-13T17:30:00',null),
(5,1,'2026-08-10','2026-08-14',22,null,'Rua 1',50,'Eq. Raimundo','Concluída',52,null,3,'2026-08-14T17:30:00',null),
(6,1,'2026-08-17','2026-08-17',23,null,'Quadra B',80,'Eq. Marcos','Concluída',80,null,3,'2026-08-17T17:30:00',null),
(7,1,'2026-08-17','2026-08-18',22,null,'Rua 1',50,'Eq. Raimundo','Concluída',50,null,3,'2026-08-18T17:30:00',null),
(8,1,'2026-08-17','2026-08-19',22,null,'Rua 1',50,'Eq. Raimundo','Não concluída',0,'Chuva',3,'2026-08-19T17:30:00',null),
(9,1,'2026-08-17','2026-08-20',23,null,'Quadra B',80,'Eq. Marcos','Concluída',82,null,3,'2026-08-20T17:30:00',null),
(10,1,'2026-08-17','2026-08-21',22,null,'Rua 1',50,'Eq. Raimundo','Concluída',50,null,3,'2026-08-21T17:30:00',null),
(11,1,'2026-08-24','2026-08-24',23,null,'Quadra B',80,'Eq. Marcos','Não concluída',40,'Falta de equipe',3,'2026-08-24T17:30:00',null),
(12,1,'2026-08-24','2026-08-25',22,null,'Rua 1',50,'Eq. Raimundo','Concluída',55,null,3,'2026-08-25T17:30:00',null),
(13,1,'2026-08-24','2026-08-26',23,null,'Quadra C',80,'Eq. Marcos','Concluída',80,null,3,'2026-08-26T17:30:00',null),
(14,1,'2026-08-24','2026-08-27',22,null,'Rua 1',50,'Eq. Raimundo','Concluída',50,null,3,'2026-08-27T17:30:00',null),
(15,1,'2026-08-24','2026-08-28',23,null,'Quadra C',80,'Eq. Marcos','Concluída',80,null,3,'2026-08-28T17:30:00',null),
(16,1,'2026-08-31','2026-09-01',31,null,'Quadra I',2,'Terraplan Delta','Concluída',2,null,3,'2026-09-01T17:30:00',null),
(17,1,'2026-08-31','2026-09-02',23,1,'Quadra C',90,'Eq. Marcos','Concluída',90,null,3,'2026-09-02T17:30:00',null),
(18,1,'2026-08-31','2026-09-03',22,2,'Rua 1',50,'Eq. Raimundo','Não concluída',30,'Chuva',3,'2026-09-03T17:30:00',null),
(19,1,'2026-08-31','2026-09-04',23,1,'Quadra D',90,'Eq. Marcos','Concluída',95,null,3,'2026-09-04T17:30:00',null),
(20,1,'2026-08-31','2026-09-05',22,2,'Rua 1',50,'Eq. Raimundo','Não concluída',0,'Projeto',3,'2026-09-05T17:30:00',null),
(21,1,'2026-09-07','2026-09-08',31,null,'Quadra I',2,'Terraplan Delta','Concluída',2.5,null,3,'2026-09-08T17:30:00',null),
(22,1,'2026-09-07','2026-09-09',23,1,'Quadra D',90,'Eq. Marcos','Concluída',90,null,3,'2026-09-09T17:30:00',null),
(23,1,'2026-09-07','2026-09-10',22,2,'Rua 1',50,'Eq. Raimundo','Concluída',50,null,3,'2026-09-10T17:30:00',null),
(24,1,'2026-09-07','2026-09-11',23,1,'Quadra D',90,'Eq. Marcos','Concluída',92,null,3,'2026-09-11T17:30:00',null),
(25,1,'2026-09-07','2026-09-12',22,2,'Rua 1',50,'Eq. Raimundo','Não concluída',25,'Chuva',3,'2026-09-12T17:30:00',null),
(26,1,'2026-09-14','2026-09-15',24,null,'Rua 3',60,'Eq. Marcos','Concluída',60,null,3,'2026-09-15T17:30:00',null),
(27,1,'2026-09-14','2026-09-16',22,2,'Rua 1',50,'Eq. Raimundo','Concluída',50,null,3,'2026-09-16T17:30:00',null),
(28,1,'2026-09-14','2026-09-17',31,null,'Quadra J',2,'Terraplan Delta','Não concluída',1,'Equipamento',3,'2026-09-17T17:30:00',null),
(29,1,'2026-09-14','2026-09-18',23,1,'Quadra D',90,'Eq. Marcos','Concluída',90,null,3,'2026-09-18T17:30:00',null),
(30,1,'2026-09-14','2026-09-19',25,null,'Rua 1',1,'Eq. Francisco','Não concluída',0,'Frente não liberada',3,'2026-09-19T17:30:00',null),
(31,1,'2026-09-21','2026-09-22',22,3,'Rua 2, Quadra B',60,'Eq. Raimundo','Concluída',60,null,3,'2026-09-22T17:30:00',null),
(32,1,'2026-09-21','2026-09-23',23,4,'Quadra E',100,'Eq. Marcos','Concluída',100,null,3,'2026-09-23T17:30:00',null),
(33,1,'2026-09-21','2026-09-24',24,null,'Rua 3',60,'Eq. Marcos','Não concluída',30,'Falta de material',3,'2026-09-24T17:30:00',null),
(34,1,'2026-09-21','2026-09-25',23,4,'Quadra E',100,'Eq. Marcos','Concluída',100,null,3,'2026-09-25T17:30:00',null),
(35,1,'2026-09-21','2026-09-26',31,null,'Quadra J',2,'Terraplan Delta','Concluída',2,null,3,'2026-09-26T17:30:00',null),
(36,1,'2026-09-28','2026-09-29',22,3,'Rua 2, Quadra B',60,'Eq. Raimundo','Concluída',62,null,3,'2026-09-29T17:30:00',null),
(37,1,'2026-09-28','2026-09-30',23,4,'Quadra E',120,'Eq. Marcos','Concluída',120,null,3,'2026-09-30T17:30:00',null),
(38,1,'2026-09-28','2026-10-01',24,null,'Rua 3',80,'Eq. Marcos','Não concluída',35,'Falta de material',3,'2026-10-01T17:30:00',null),
(39,1,'2026-09-28','2026-10-01',31,null,'Quadra 12',3,'Terraplan Delta','Concluída',3.2,null,3,'2026-10-01T17:30:00',null),
(40,1,'2026-09-28','2026-10-02',22,3,'Rua 2, Quadra B',60,'Eq. Raimundo','Concluída',60,null,3,'2026-10-02T17:30:00',null),
(41,1,'2026-09-28','2026-10-03',25,null,'Rua 1',1,'Eq. Francisco','Não concluída',0,'Frente não liberada',3,'2026-10-03T17:30:00',null),
(42,1,'2026-10-05','2026-10-05',22,3,'Rua 2, Quadra B',60,'Eq. Raimundo','Concluída',64,null,3,'2026-10-05T17:30:00',null),
(43,1,'2026-10-05','2026-10-05',31,null,'Quadra 13',3,'Terraplan Delta','Concluída',3.2,null,3,'2026-10-05T17:30:00',null),
(44,1,'2026-10-05','2026-10-06',24,5,'Rua 5',70,'Eq. Marcos','Não concluída',40,'Falta de material',3,'2026-10-06T17:30:00',null),
(45,1,'2026-10-05','2026-10-06',22,3,'Rua 2, Quadra B',60,'Eq. Raimundo','Concluída',60,null,3,'2026-10-06T17:30:00',null),
(46,1,'2026-10-05','2026-10-07',23,4,'Quadra F',100,'Eq. Marcos','Planejada',null,null,null,null,null),
(47,1,'2026-10-05','2026-10-07',22,3,'Rua 2, Quadra B',60,'Eq. Raimundo','Planejada',null,null,null,null,null),
(48,1,'2026-10-05','2026-10-07',25,null,'Rua 1, lado par',1,'Eq. Francisco','Planejada',null,null,null,null,null),
(49,1,'2026-10-05','2026-10-08',24,5,'Rua 5',30,'Eq. Marcos','Planejada',null,null,null,null,null),
(50,1,'2026-10-05','2026-10-08',31,null,'Quadra 13',3,'Terraplan Delta','Planejada',null,null,null,null,null),
(51,1,'2026-10-05','2026-10-09',22,3,'Rua 2, Quadra B',60,'Eq. Raimundo','Planejada',null,null,null,null,null),
(52,1,'2026-10-05','2026-10-09',23,4,'Quadra F',100,'Eq. Marcos','Planejada',null,null,null,null,null),
(53,1,'2026-10-05','2026-10-10',13,null,'Acesso PI-116',2,'Eq. Damião','Planejada',null,null,null,null,null);

insert into public.producoes (id,obra_id,data,servico_id,quantidade,origem,pcp_atividade_id,pacote_id,motivo_ajuste,lancado_por) values
(1,1,'2026-08-10',21,4,'PCP',1,null,null,3),
(2,1,'2026-08-11',23,85,'PCP',2,null,null,3),
(3,1,'2026-08-12',22,20,'PCP',3,null,null,3),
(4,1,'2026-08-13',23,80,'PCP',4,null,null,3),
(5,1,'2026-08-14',22,52,'PCP',5,null,null,3),
(6,1,'2026-08-17',23,80,'PCP',6,null,null,3),
(7,1,'2026-08-18',22,50,'PCP',7,null,null,3),
(8,1,'2026-08-20',23,82,'PCP',9,null,null,3),
(9,1,'2026-08-21',22,50,'PCP',10,null,null,3),
(10,1,'2026-08-24',23,40,'PCP',11,null,null,3),
(11,1,'2026-08-25',22,55,'PCP',12,null,null,3),
(12,1,'2026-08-26',23,80,'PCP',13,null,null,3),
(13,1,'2026-08-27',22,50,'PCP',14,null,null,3),
(14,1,'2026-08-28',23,80,'PCP',15,null,null,3),
(15,1,'2026-09-01',31,2,'PCP',16,null,null,3),
(16,1,'2026-09-02',23,90,'PCP',17,1,null,3),
(17,1,'2026-09-03',22,30,'PCP',18,2,null,3),
(18,1,'2026-09-04',23,95,'PCP',19,1,null,3),
(19,1,'2026-09-08',31,2.5,'PCP',21,null,null,3),
(20,1,'2026-09-09',23,90,'PCP',22,1,null,3),
(21,1,'2026-09-10',22,50,'PCP',23,2,null,3),
(22,1,'2026-09-11',23,92,'PCP',24,1,null,3),
(23,1,'2026-09-12',22,25,'PCP',25,2,null,3),
(24,1,'2026-09-15',24,60,'PCP',26,null,null,3),
(25,1,'2026-09-16',22,50,'PCP',27,2,null,3),
(26,1,'2026-09-17',31,1,'PCP',28,null,null,3),
(27,1,'2026-09-18',23,90,'PCP',29,1,null,3),
(28,1,'2026-09-22',22,60,'PCP',31,3,null,3),
(29,1,'2026-09-23',23,100,'PCP',32,4,null,3),
(30,1,'2026-09-24',24,30,'PCP',33,null,null,3),
(31,1,'2026-09-25',23,100,'PCP',34,4,null,3),
(32,1,'2026-09-26',31,2,'PCP',35,null,null,3),
(33,1,'2026-09-29',22,62,'PCP',36,3,null,3),
(34,1,'2026-09-30',23,120,'PCP',37,4,null,3),
(35,1,'2026-10-01',24,35,'PCP',38,null,null,3),
(36,1,'2026-10-01',31,3.2,'PCP',39,null,null,3),
(37,1,'2026-10-02',22,60,'PCP',40,3,null,3),
(38,1,'2026-10-05',22,64,'PCP',42,3,null,3),
(39,1,'2026-10-05',31,3.2,'PCP',43,null,null,3),
(40,1,'2026-10-06',24,40,'PCP',44,5,null,3),
(41,1,'2026-10-06',22,60,'PCP',45,3,null,3),
(42,1,'2026-03-31',11,50,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(43,1,'2026-04-03',11,50,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(44,1,'2026-03-31',12,50,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(45,1,'2026-04-30',12,50,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(46,1,'2026-06-30',13,13.75,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(47,1,'2026-07-31',13,13.75,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(48,1,'2026-08-31',13,13.75,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(49,1,'2026-09-30',13,13.75,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(50,1,'2026-04-30',21,19.2,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(51,1,'2026-05-31',21,19.2,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(52,1,'2026-06-30',21,19.2,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(53,1,'2026-07-31',21,19.2,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(54,1,'2026-08-14',21,19.2,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(55,1,'2026-08-31',22,398,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(56,1,'2026-09-30',22,398,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(57,1,'2026-07-31',23,998.667,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(58,1,'2026-08-31',23,998.667,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(59,1,'2026-09-30',23,998.667,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(60,1,'2026-09-30',24,475,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1),
(61,1,'2026-09-30',31,8.3,'Ajuste',null,null,'Carga inicial — avanço anterior ao sistema',1);

insert into public.ocorrencias (id,obra_id,numero,titulo,local,etapa_entrega_id,descricao,status,aberta_por,responsavel_id,prazo,resposta,aberta_em,respondida_em,fechada_em) values
(1,1,1,'Poça d''água na Rua 2 após chuva','Rua 2, Quadra B',2,'Depois da chuva de segunda, a água ficou parada em frente aos lotes 3 a 6. Parece que a boca de lobo está entupida.','Aberta',4,null,null,null,'2026-10-01',null,null),
(2,1,2,'Meio-fio quebrado em frente ao lote 14','Quadra C, lote 14',2,'Trecho de uns 2 metros de meio-fio quebrado, provavelmente por caminhão.','Em análise',4,2,'2026-10-10',null,'2026-09-28','2026-09-29T09:00:00',null),
(3,1,3,'Entulho na área verde','Área verde 2',1,'Sobra de material da galeria deixada na área verde.','Em tratamento',4,3,'2026-10-08','Retirada programada com o caminhão na quinta.','2026-09-24','2026-09-24T15:00:00',null),
(4,1,4,'Caixa de passagem sem tampa','Rua 4',2,'Caixa de passagem aberta, risco para quem passa à noite.','Resolvida',4,3,'2026-09-22','Tampa instalada em 22/09.','2026-09-15','2026-09-15T11:00:00','2026-09-22T16:00:00'),
(5,1,5,'Pedido de mudança no traçado da calçada','Rua 1',3,'Avaliar recuo da calçada para preservar a árvore existente.','Recusada',4,1,null,'Fora do projeto aprovado. Pode ser tratado como aditivo.','2026-09-10','2026-09-11T10:00:00','2026-09-11T10:00:00');

insert into public.presencas (obra_id, data, funcionario_id, situacao, pacote_id, lancado_por)
select 1, d::date, f.id, coalesce(e.sit, 'Presente'),
       case when e.sit is null then case when f.id in (101, 105, 107) then 3 when f.id in (108, 109) then 4 end end, 3
  from generate_series('2026-09-21'::date, '2026-10-07'::date, '1 day') d
  cross join public.funcionarios f
  left join (values ('2026-10-02'::date, 106, 'Falta'), ('2026-10-03'::date, 104, 'Atestado'), ('2026-10-03'::date, 114, 'Afastado'), ('2026-10-06'::date, 106, 'Falta'), ('2026-10-07'::date, 104, 'Atestado'), ('2026-10-07'::date, 106, 'Falta'), ('2026-10-07'::date, 114, 'Afastado'), ('2026-10-07'::date, 117, 'Falta')) e(dia, fid, sit)
    on e.dia = d::date and e.fid = f.id
 where extract(isodow from d) <> 7 and f.ativo;

select setval(pg_get_serial_sequence('public.profiles', 'id'), (select max(id) from public.profiles));
select setval(pg_get_serial_sequence('public.obras', 'id'), (select max(id) from public.obras));
select setval(pg_get_serial_sequence('public.obra_usuarios', 'id'), (select max(id) from public.obra_usuarios));
select setval(pg_get_serial_sequence('public.etapas_entrega', 'id'), (select max(id) from public.etapas_entrega));
select setval(pg_get_serial_sequence('public.servicos', 'id'), (select max(id) from public.servicos));
select setval(pg_get_serial_sequence('public.servico_dependencias', 'id'), (select max(id) from public.servico_dependencias));
select setval(pg_get_serial_sequence('public.restricoes', 'id'), (select max(id) from public.restricoes));
select setval(pg_get_serial_sequence('public.funcionarios', 'id'), (select max(id) from public.funcionarios));
select setval(pg_get_serial_sequence('public.pacotes', 'id'), (select max(id) from public.pacotes));
select setval(pg_get_serial_sequence('public.premios', 'id'), (select max(id) from public.premios));
select setval(pg_get_serial_sequence('public.pcp_atividades', 'id'), (select max(id) from public.pcp_atividades));
select setval(pg_get_serial_sequence('public.producoes', 'id'), (select max(id) from public.producoes));
select setval(pg_get_serial_sequence('public.ocorrencias', 'id'), (select max(id) from public.ocorrencias));
