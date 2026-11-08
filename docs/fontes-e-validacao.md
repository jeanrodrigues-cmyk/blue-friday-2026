# Fontes, importacao e validacao | Blue Friday 2026

## Estado atual
- Repositorio, autenticacao e painel inicial disponiveis.
- BO e Dados: fonte candidata `hive_metastore.querobolsa_silver.bo_operations`. Confirmar se `new`, `inProgress` e `screening` sao pendentes e como calcular backlog > 7 dias.
- Reembolso: fontes candidatas `refund_operations` e `refund_requests`. Confirmar valor reembolsado, conversoes e denominador antes de calcular elegibilidade.
- Recorrencia: fonte parcial `subscriptions_qb`. Conciliar valores com area.
- Chargeback, Resolucoes, Quero Pago e Marcas: acesso/relatorio oficial pendente.
- Reclame Aqui: validar integracao aprovada via Rugby.
- Midias e Procon: fonte externa ou CSV validado.
- Nenhuma fonte pendente deve gerar pontuacao, ranking ou premio automaticamente.

## Modelo de CSV de metricas diarias
Cabecalho: `area_name,member_name,metric_key,reference_date,metric_value,unit,source_name`
Datas ISO `YYYY-MM-DD`; decimais com ponto; `unit` em `count|BRL|percent|minutes|hours`.
Nao incluir CPF, e-mail de alunos, telefone ou outras informacoes pessoais.
Cada importacao deve ter data de referencia, nome da fonte, responsavel e status de validacao.
O arquivo `docs/modelo-metricas.csv` tem somente o cabecalho.

## Passo de banco (ainda requer execucao)
Executar `supabase/migrations/20261108_daily_metrics.sql` no SQL Editor do projeto correto, apos revisar politicas RLS.
Depois testar como administrador e usuario sem perfil. Nao conceder acesso anonimo.
A migracao cria tabelas e politicas, mas nao cria uma interface de upload e nao importa dados.

## Regra de premio
Slides oficiais sao a fonte das metas, travas, valores, excecoes e desempates.
Guardar versao da regra, vigencia, aprovador e trilha de auditoria antes de automatizar premios.
Sem fonte validada ou trava cumprida: premiacao pendente, nunca presumida.
