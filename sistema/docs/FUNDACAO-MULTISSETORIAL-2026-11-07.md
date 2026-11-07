# Fundação multissetorial — 07/11/2026

## Implementado

- Cadastro de empresa com ramo, descrição de Outro ramo e porte informado.
- Núcleo comum de clientes, equipe, caixa, estoque e conteúdo, usando o isolamento de dados existente por empresa.
- Agenda habilitada para barbearia, beleza e prestação de serviços. Outros ramos começam pelo núcleo comum.
- Empresas fora de barbearia não recebem o catálogo de cortes nem planos de clube. Produtos, preços e serviços precisam ser cadastrados pela empresa; não são inventados.
- O servidor verifica os módulos permitidos para o ramo. Ocultar um botão não é o controle de acesso.
- A marca e as credenciais continuam isoladas. Empresas antigas sem ramo registrado seguem como barbearia para preservar a operação.
- A interface comercial informa limites do piloto e os módulos especializados em desenvolvimento.

## Limites reais

Continua sendo um piloto de até 20 empresas, uma empresa por conta. O porte é metadado para planejamento; não habilita múltiplas unidades ou recursos corporativos. Não há alegação de teste de escala empresarial.

Mesas/cozinha, quartos/reservas, gestão escolar e projetos/tarefas específicos ainda não estão implementados. A empresa desses setores pode utilizar o núcleo comum; a interface não anuncia os módulos ausentes como disponíveis.

Não foram criados valores comerciais, assinaturas ou dados operacionais. O cadastro de avaliação não cobra automaticamente. A configuração de cobrança existente foi preservada.

## Próximas entregas

Organização e unidades com autorização no backend; pilotos de setores com dados de teste; capacidade e carga; evolução de cada módulo especializado em pequenas alterações com validação. A operação da Barbearia do João continua prioritária.
