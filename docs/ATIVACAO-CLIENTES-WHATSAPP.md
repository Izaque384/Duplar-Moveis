# Ativação do acesso de clientes — Duplar Móveis

## Situação em 25/11/2026

O portal utiliza um código de seis dígitos enviado por **WhatsApp Cloud API oficial da Meta**. A versão em desenvolvimento já dispõe de tabelas no Neon para clientes, projetos, sessões, códigos temporários e controle de tentativas. Login por WhatsApp ainda **não foi confirmado em operação**: faltam as credenciais do provedor de mensagens. A tentativa de configurar variáveis pelo conector Netlify devolveu **403 (sem permissão de escrita)**. Nenhuma credencial da Meta foi inventada.

Todas as instruções abaixo são para a **branch `develop`**. Não altere a configuração da `main`/produção nem a Neon `production` antes de fazer testes e homologação.

## 1. Preparação da conta Meta

No painel Meta for Developers (https://developers.facebook.com/apps/), configure um aplicativo com WhatsApp Business Platform, uma conta do WhatsApp Business e um número remetente habilitado para Cloud API. Confirme os limites e a situação desse número, especialmente se ele já é utilizado em algum WhatsApp Business existente. Tenha em mãos:

- **Phone Number ID** do número remetente (não é o telefone com DDI).
- **Token permanente ou de longa duração de um usuário do sistema**, com as permissões necessárias ao envio via Cloud API. Não use token temporário em produção.
- Conta WhatsApp Business com um **modelo de autenticação aprovado**: idioma `pt_BR`, nome `duplar_codigo_acesso`, botão de OTP tipo **copiar código**. Na criação do modelo, informe categoria `AUTHENTICATION` e `otp_type=COPY_CODE`; a aprovação é controlada pela Meta.

Referências: https://www.postman.com/meta/whatsapp-business-platform/request/6vkv46u/create-authentication-template-w-otp-copy-code-button e https://developers.facebook.com/docs/graph-api/reference/whats-app-business-hsm

**Não compartilhe tokens, senhas, URLs de conexão ou códigos secretos no chat ou em commits.**

## 2. Variáveis do ambiente Netlify

Abra o projeto Duplar Móveis na Netlify e acesse **Environment variables**. Configure cada segredo como variável protegida, com escopo **Functions** e contexto **Branch deploys**, para homologação na `develop` (e não em Production).

| Chave | Valor esperado |
|---|---|
| `PORTAL_OTP_SECRET` | Segredo criptograficamente aleatório, **mínimo 32 caracteres**, exclusivo da `develop` |
| `META_WHATSAPP_TOKEN` | Token protegido da Cloud API associado ao número remetente |
| `META_PHONE_NUMBER_ID` | Phone Number ID numérico do remetente |
| `META_AUTH_TEMPLATE` | `duplar_codigo_acesso` (opcional, já é o padrão no código) |
| `META_GRAPH_VERSION` | Versão Graph compatível com sua conta; o padrão atual do código é `v27.0` |
| `PORTAL_SUPPORT_WHATSAPP` | WhatsApp de atendimento da Duplar, com DDI 55 e DDD, **sem pontuação** |
| `DATABASE_URL` | String **pooled** da Neon `develop`, protegida e vinculada apenas ao contexto correto |

**Importante:** `DATABASE_URL` já consta como variável cadastrada no projeto Netlify, mas a distinção de contexto deve ser conferida antes de qualquer publicação definitiva. Se ainda faltar `PORTAL_OTP_SECRET`, crie-o via gerador de segredos seguro no seu dispositivo; não reaproveite senhas humanas nem use a mesma chave em produção.

Após salvar, publique um novo deploy da `develop`. Os valores das variáveis nunca devem ser colocados no HTML, JavaScript público ou GitHub.

## 3. Painel de configuração e teste real

1. Entre no painel privado **`/admin`** com a conta de **Responsável principal**.
2. Em **Equipe e acesso → Acesso pelo WhatsApp**, clique em **Verificar novamente**.
3. O painel mostra somente **Configurado/Pendente**, sem exibir o token nem a chave. Isso verifica a presença das credenciais, **não** confirma a aprovação do modelo ou a entrega de mensagens.
4. No painel administrativo, confirme que o **cliente de teste** está ativo e que o telefone corresponde ao número do WhatsApp em formato brasileiro com DDD.
5. Em **`/cliente/`**, informe o número cadastrado e solicite o código. Ele deve chegar no WhatsApp de teste. Confirme o código **dentro de 5 minutos**. O sistema impõe limite de tentativas e o código não pode ser reutilizado.
6. Com a sessão aberta, valide as quatro áreas e um documento de teste vinculado ao projeto. Verifique que um cliente não consegue ler PDFs de outro cliente. Teste expiração de código, número não cadastrado e saída da conta.

Use apenas números de teste autorizados e **documentos sem dados pessoais reais** na primeira homologação.

## 4. Critérios para considerar ativado

- Credenciais Meta presentes no servidor e **modelo aprovado** na conta WhatsApp Business.
- Mensagem real recebida no aparelho de teste; código correto cria sessão, código inválido/expirado não cria.
- Tela de contratos/notas não expõe dados de outros clientes.
- Logs do servidor sem tokens, OTP ou dados pessoais sensíveis.
- Dois celulares e ao menos um navegador desktop testados.

Sem as credenciais e o teste de entrega, **não marque o acesso como ativo para clientes reais**.

## Próxima etapa

Caso o conector Netlify continue devolvendo **403**, o responsável pela conta precisa configurar as variáveis no próprio painel Netlify ou conceder autorização de edição apropriada ao conector. A configuração da conta Meta e a aprovação do modelo exigem acesso à conta comercial da Duplar, que não foi fornecido para esta execução.
