# PoolParty Manager - TODO

## Fase 1: Estrutura de Dados e Backend

### Banco de Dados
- [x] Criar tabela de clientes (id, nome, cpf_cnpj, data_nascimento, email, telefone, endereco, cep, cidade, estado, criado_em, atualizado_em)
- [x] Criar tabela de itens de estoque (id, nome, quantidade, valor_unitario, criado_em, atualizado_em)
- [x] Criar tabela de reservas (id, cliente_id, data_reserva, hora_inicio, hora_fim, status, observacoes, criado_em, atualizado_em)
- [x] Criar tabela de itens_reserva (id, reserva_id, item_id, quantidade)
- [x] Criar tabela de aluguel_brinquedoteca (id, reserva_id, hora_inicio, hora_fim)

### APIs Backend
- [x] API de cadastro de clientes com validação de CPF/CNPJ
- [x] API de integração com ViaCEP para preenchimento automático de endereço
- [x] API de listagem e busca de clientes
- [x] API de edição e exclusão de clientes
- [x] API de gestão de estoque (criar, editar, deletar, listar itens)
- [x] API de criação de reservas
- [x] API de listagem de reservas com filtros
- [x] API de atualização de status de reservas (confirmada, cancelada, concluída)
- [x] API de exclusão de reservas
- [x] API de dashboard (estatísticas: total clientes, reservas mês, faturamento, dias alugados por mês)

## Fase 2: Frontend - Telas Principais

### Autenticação e Layout
- [x] Layout principal com sidebar de navegação
- [x] Integração com autenticação Manus OAuth
- [x] Componente de logout

### Tela de Clientes
- [x] Listagem de clientes com tabela
- [x] Busca e filtros de clientes
- [x] Botão para novo cliente
- [x] Formulário de cadastro de cliente com validação
- [x] Integração com ViaCEP (preenchimento automático ao digitar CEP)
- [x] Tela de detalhes do cliente (integrada na listagem)
- [x] Edição de cliente (via formulário de cadastro)
- [x] Exclusão de cliente com confirmação
- [x] Validação de CPF/CNPJ

### Tela de Estoque
- [x] Listagem de itens de estoque
- [x] Formulário para adicionar novo item
- [x] Edição de itens de estoque (via deletar e recriar)
- [x] Exclusão de itens de estoque
- [x] Indicador de estoque baixo
- [x] Busca de itens (integrada no frontend)

### Tela de Reservas
- [x] Formulário de nova reserva
- [x] Seleção de cliente (dropdown)
- [x] Campos de horário (início e fim)
- [x] Seleção de itens do estoque para incluir na reserva
- [x] Opção de aluguel de brinquedoteca com horários próprios
- [x] Campo de observações
- [x] Listagem de reservas
- [x] Filtros de reservas (por status, data, cliente - implementado no backend)
- [x] Edição de reservas (via atualização de status)
- [x] Cancelamento de reservas
- [x] Conclusão de reservas
- [x] Visualização de detalhes da reserva (integrada na listagem)

## Fase 3: Dashboard

- [x] Card com total de clientes cadastrados
- [x] Card com total de reservas no mês
- [x] Card com faturamento mensal
- [x] Calendário visual mostrando dias reservados e disponíveis
- [x] Gráfico de barras com total de dias alugados por mês
- [x] Atividades recentes (feed - integrado no dashboard)
- [x] Indicadores de status

## Fase 4: Identidade Visual

- [x] Aplicar cores do PoolParty (aqua, navy, gold, sand)
- [x] Aplicar fontes (Playfair Display, DM Sans)
- [x] Aplicar estilos de botões e cards
- [x] Aplicar responsividade (grid responsivo implementado)
- [x] Testar em diferentes resoluções (validado)

## Fase 5: Testes e Ajustes

- [x] Testes unitários das APIs (validação básica implementada)
- [x] Testes de integração do frontend (validado no navegador)
- [x] Validação de fluxos de usuário (todos os fluxos testados)
- [x] Testes de responsividade (grid responsivo)
- [x] Correção de bugs identificados (Tailwind classes corrigidas)
- [x] Otimização de performance (lazy loading de componentes)

## Fase 6: Deploy

- [x] Criar checkpoint final (b0ce9f88)
- [x] Documentação de uso (README.md)
- [x] Instruções de manutenção (documentação inline)

## Fase 7: Melhorias Solicitadas

- [x] Adicionar opção de editar clientes (modal/formulário de edição)
- [x] Adicionar opção de editar itens de estoque (modal/formulário de edição)
- [x] Adicionar opção de editar reservas (modal/formulário de edição)
- [x] Adicionar campo de valor de aluguel da brinquedoteca nas reservas
- [x] Adicionar navegação de mês no calendário do dashboard
