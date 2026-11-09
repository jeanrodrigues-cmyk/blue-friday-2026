# Blue Friday 2026 | Validação da etapa de 08/11

Status: **PARCIAL — não homologado**. Este documento é um roteiro de verificação; não representa execução de SQL, testes de RLS ou aprovação da gestão.

## Entregas verificadas no repositório
- Aplicação React/Vite/TypeScript e autenticação Supabase.
- Perfis definidos no frontend: `admin`, `management`, `collaborator`.
- Leitura de `bf_profiles`, `bf_daily_metrics`, `bf_media_procon_daily`.
- Importação de CSV agregada para BO e Dados, com validação de colunas e números.
- Visão geral com nove áreas, mas sem cálculo consolidado para áreas sem dados.
- Mídias e Procon: exceção de Procon em 04, 05 e 06/11; registrar resultados apenas mediante ação administrativa.
- Build TypeScript/Vite validado localmente pelo usuário em 09/11.

## Validações ainda necessárias (não executar sem conferência)
### 1. Regras de premiação
Para cada área, registrar: responsável que aprova, meta e unidade, fonte oficial, período, prazo de atualização, critérios de sucesso, exceções, prêmio e homologação. **Não inferir meta ou prêmio de outras áreas.** O ranking geral não deve comparar volumes de indicadores distintos.

| Área | Regra aprovada? | Fonte validada? | Apuração homologada? |
| --- | --- | --- | --- |
| BO e Dados | Pendente | Pendente | Pendente |
| Reembolso | Pendente | Pendente | Pendente |
| Mídias e Procon | Parcial: 1ª semana Procon dispensado | Pendente | Pendente |
| Recorrência | Pendente | Pendente | Pendente |
| Chargeback | Pendente | Pendente | Pendente |
| Resoluções | Pendente | Pendente | Pendente |
| Quero Pago | Pendente | Pendente | Pendente |
| Marcas | Pendente | Pendente | Pendente |
| Reclame Aqui | Pendente | Pendente | Pendente |

### 2. Testes de permissões (contas reais de teste, sem dados sensíveis)
- Admin ativo: acesso a leitura e operações de edição autorizadas.
- Gestão ativa: leitura e relatórios; tentativa de escrita deve ser bloqueada quando não autorizada.
- Colaborador ativo: apenas dados e operações autorizados à própria área; não depender só de menus ocultos.
- Usuário autenticado sem perfil ou com `active=false`: acesso negado.
- Usuário anônimo: nenhuma leitura de tabelas internas.
- Verificar políticas RLS e privilégios de tabelas, funções SECURITY DEFINER e storage no Supabase.
- Conferir rede/erros no navegador e logs de auditoria. **Ainda não testado.**

### 3. Migrações SQL
1. Identificar o arquivo SQL exato e sua versão no repositório.
2. Ler todo o SQL e confirmar dependências, nomes de tabelas, índices, políticas RLS e possíveis alterações destrutivas.
3. Fazer backup/planejar rollback; executar primeiro em projeto de teste.
4. Validar permissões e importações, só então solicitar aprovação para produção.
**Nenhuma migration foi executada por este documento.**

### 4. Fontes oficiais
- BO e Dados: confirmar definição de BO aberto, resolvido e backlog acima de 7 dias, fuso e defasagem D-1.
- Reembolso: confirmar fonte, dinheiro/voucher, conversão, atribuição e PEF.
- Mídias e Procon: confirmar fila, comentários e SLA 24h; evidência da exceção da semana 1.
- Chargeback, Resoluções, Reclame Aqui e demais áreas: solicitar fonte autorizada, periodicidade e pessoa responsável.
- Registrar última ingestão, origem, data de referência, responsável e validação de cada importação.

## Critério para marcar o cartão de 08/11 como concluído
Regras assinadas pela gestão + fontes confirmadas + migrações revisadas/aplicadas em ambiente aprovado + RLS testado com todos os perfis + evidências registradas. Até lá, manter como **parcial**.
