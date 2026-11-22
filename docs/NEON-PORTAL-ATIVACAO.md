# Duplar — Quatro áreas / Neon

## O que foi corrigido
A prévia anterior em develop tinha seis telas e dados ilustrativos: Visão geral, Meu projeto, Documentos, Financeiro, Atendimento, Minha conta. Esta implementação mantém exclusivamente:
1. Contratos
2. Notas fiscais
3. Meu projeto (orçamento e serviços)
4. Atendimento WhatsApp

Em \`/cliente/?demo=1\` é possível visualizar as quatro telas sem login. O modo demonstração não revela nenhum dado real e não autoriza downloads.

## Banco Neon
Projeto criado exclusivamente na conta JI Sites: **Duplar Móveis** (\`royal-art-34897271\`), região \`aws-sa-east-1\`. Banco \`duplar\`, branch de desenvolvimento \`develop\` (\`br-holy-forest-b6szf287\`) com as tabelas do portal criadas. **Branch de produção ainda não migrada**, sem dados de clientes.

Esquema versionado em \`database/migrations/20261121180000_duplar_portal.sql\`. No deploy definitivo, aplicar o esquema testado à branch de produção com processo de migração controlado.

### Configurar conexão Netlify
A tentativa de gravar uma variável automaticamente retornou 403. Entre no projeto Netlify \`duplarmoveis\` > Project configuration > Environment variables:
- \`DATABASE_URL\`: URL **pooled** da Neon, adquirida em https://console.neon.tech no projeto Duplar, selecionando a branch adequada (branch \`develop\` para homologação; \`production\` para produção).
- Salve a URL somente como variável secreta do servidor, com escopo **Functions**. Nunca usar \`NEXT_PUBLIC_\`, \`VITE_\` ou publicar no GitHub.
- Configure os contextos \`branch-deploy\` e \`production\` **separadamente**. Não conectar a prévia à base produtiva.

O backend usa \`pg\` no Netlify Functions, com \`Pool\` e a conexão \`DATABASE_URL\`.

### Armazenamento de arquivos
PDFs são armazenados em **Netlify Blobs privado**, não no PostgreSQL e não na pasta estática. A API exige sessão válida e verifica o cliente/projeto antes do download. O armazenamento de prévia fica isolado do de produção. O primeiro upload está limitado a 4 MB.

## Administração com e-mail e senha

A área administrativa usa autenticação própria, separada do WhatsApp dos clientes.

O responsável principal inicia o sistema definindo sua conta em /equipe.html. Para ativar:
1. Configure DATABASE_URL do banco Neon (branch develop) no escopo Functions da Netlify.
2. Configure PORTAL_ADMIN_SETUP_TOKEN no escopo Functions, com segredo aleatório de pelo menos 32 caracteres.
3. Depois do deploy e da migração SQL 20261122090000_admin_credentials.sql, acesse /equipe.html.
4. Informe nome, e-mail, senha com 12 a 128 caracteres e a chave do primeiro acesso.
5. Após criar a conta, remova PORTAL_ADMIN_SETUP_TOKEN do painel da Netlify e publique novamente.

Somente quando não existe administrador é possível usar a chave inicial. Não há cadastro público. O primeiro usuário recebe o papel de responsável principal e pode convidar administradores por links privados, de uso único, com validade de 24 horas. Cada administrador escolhe sua senha.

A senha é protegida por scrypt, com salt individual e N=131072, r=8, p=1. As sessões duram até 12 horas. O sistema limita tentativas, permite alterar a senha pessoal e desativar acessos.

A recuperação de senha do responsável principal não possui fluxo automático nesta versão. Não criar senha padrão. Recomendamos adotar MFA (TOTP ou passkeys) antes do uso real, já que os administradores podem acessar documentos pessoais. O segundo fator ainda não está implementado.

## Autenticação com API oficial da Meta
1. Criar app no Meta Developers, configurar WhatsApp Business Platform e identificar Phone Number ID.
2. Registrar o número remetente, cuidando da coexistência/migração caso já seja usado no WhatsApp Business.
3. Criar e aprovar template de **autenticação** \`duplar_codigo_acesso\` com idioma \`pt_BR\` e botão para **copiar código**.
4. Criar token apropriado de usuário do sistema com \`whatsapp_business_messaging\`.
5. Na Netlify, cadastrar segredos para Functions:
   - \`META_WHATSAPP_TOKEN\`
   - \`META_PHONE_NUMBER_ID\`
   - \`META_GRAPH_VERSION\` (versão compatível)
   - \`META_AUTH_TEMPLATE=duplar_codigo_acesso\`
   - \`PORTAL_OTP_SECRET\` (aleatório, pelo menos 32 caracteres)
   - \`PORTAL_SUPPORT_WHATSAPP\` (WhatsApp da Duplar com DDI 55)
6. Executar um novo deploy após cadastrar variáveis e testar OTP por WhatsApp, autorização cruzada entre clientes e downloads.

**Sem as variáveis e template aprovado, o serviço de códigos ainda não está ativo.** Não usar número de telefone ou código falsos para simular autenticação.

## Ambiente e publicação
- Branch de código: \`feature/neon-portal-4-areas\` (partindo de \`develop\`, para preservar o design mais novo).
- Somente os arquivos de \`dist/\` devem ser servidos como estáticos; \`npm run build\` os copia de forma controlada.
- Não mesclar automaticamente com \`main\` antes dos testes de segurança, revisão do modelo de mensagem e política de proteção de dados (LGPD).
