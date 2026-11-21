# Ativar a área do cliente — Duplar Móveis

## O que foi preparado

- **cliente.html**: acesso por WhatsApp e código temporário de 6 dígitos, com validade de 5 minutos.
- Quatro áreas: **Contratos**, **Notas fiscais**, **Meu projeto** (orçamento e serviços) e **Atendimento**.
- **equipe.html**: painel da equipe para cadastrar clientes, projetos e disponibilizar contratos e notas fiscais em PDF.
- **API privada** em netlify/functions/duplar-portal.mjs. Cookies de sessão HttpOnly, SameSite=Strict e Secure em HTTPS; validade de 3 dias; limite de tentativas; códigos armazenados como hash.
- **Netlify Database (Postgres)** para cadastros e sessões; **Netlify Blobs** para os PDFs. A API verifica o cliente no servidor antes de permitir download.

## 1. Ativar o banco na Netlify

1. Abra https://app.netlify.com/projects/duplarmoveis.
2. Verifique se o seu plano aceita Netlify Database e **quais custos de compute, armazenamento e transferência** poderão ser cobrados.
3. Em **Data & Storage > Database**, habilite o banco, caso seja necessário. A dependência @netlify/database e a migração de tabelas já foram adicionadas ao projeto, portanto o banco pode ser provisionado automaticamente em um deploy compatível.
4. Em um ambiente local, use **npm install** e **netlify database init**, se precisar completar a configuração; em seguida, **npm run dev**.
5. As tabelas são criadas pela migração netlify/database/migrations/20261121180000_duplar_portal.sql, aplicada no deploy. Não copie dados reais de clientes para código público.
6. Deploy Previews podem conter cópias de dados de produção. Não compartilhe prévias que exponham dados pessoais sem controle de acesso.

## 2. Criar a integração diretamente com a Meta

1. Garanta acesso de administrador ao **Portfólio Empresarial** da Duplar em https://business.facebook.com/settings.
2. Em https://developers.facebook.com/apps, crie um aplicativo de negócios e adicione o produto WhatsApp / WhatsApp Business Platform.
3. Associe uma **WhatsApp Business Account (WABA)** e registre um número emissor em **WhatsApp > API Setup** (a nomenclatura do painel pode mudar). Anote o **Phone Number ID**.
4. **Atenção ao número:** se for o mesmo WhatsApp usado para atendimento no aplicativo, confirme antes com a Meta se está elegível à coexistência ou se uma migração interromperia o aplicativo atual. Não desconecte o número em uso sem verificar.
5. Em **WhatsApp Manager > Modelos de mensagem**, crie um modelo:
   - Nome: **duplar_codigo_acesso**
   - Categoria: **Autenticação (AUTHENTICATION)**
   - Idioma: **Português (Brasil), pt_BR**
   - Botão OTP: **Copiar código (Copy code)**
   - Validade: **5 minutos**
   - Recomendado: aviso para não compartilhar o código
   - Envie à Meta e aguarde aprovação. O texto é definido pela Meta para essa categoria.
6. Em **Business Settings > Users > System Users**, crie ou selecione um usuário do sistema associado à WABA, com acesso apropriado, e gere um token para produção. Para envio de mensagens, a permissão principal é **whatsapp_business_messaging**; a criação/gestão de modelos pela API também pode requerer **whatsapp_business_management**.
7. Cadastre a forma de pagamento exigida pela Meta e consulte as tarifas de mensagens de autenticação. Os envios não são ilimitados gratuitamente.
8. Faça um teste de envio com seu próprio número e com o modelo aprovado.

Documentação oficial: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/
Referência da Meta: https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/message_templates/

## 3. Configurar as variáveis de ambiente na Netlify

Abra **Project configuration > Environment variables** do projeto duplarmoveis. Todas devem estar disponíveis para **Functions**. Marque os segredos como secretos/restritos sempre que possível.

| Variável | Valor esperado |
|---|---|
| META_WHATSAPP_TOKEN | Token permanente/adequado do usuário do sistema da Meta. **Não enviar por mensagem ou colocar no GitHub.** |
| META_PHONE_NUMBER_ID | ID técnico do número remetente na Cloud API. **Não é o telefone completo.** |
| META_GRAPH_VERSION | v27.0 (ou a versão estável aplicável ao app no momento da ativação) |
| META_AUTH_TEMPLATE | duplar_codigo_acesso |
| PORTAL_OTP_SECRET | Segredo aleatório com **no mínimo 32 caracteres**, exclusivo do portal, gerado em um gerenciador de senhas. |
| PORTAL_ADMIN_PHONES | WhatsApp(s) autorizados da equipe, com DDI 55 e DDD. Separe vários por vírgula: 55DD9XXXXXXXX |
| PORTAL_SUPPORT_WHATSAPP | WhatsApp público de atendimento com DDI 55 e DDD. |

**Sem token da Meta, Phone Number ID e segredo OTP configurados, o login retorna serviço indisponível.** Não há código fixo nem modo alternativo inseguro. Após mudar variáveis, é necessário realizar novo deploy.

## 4. Testar e liberar

1. Revise o PR em **feature/area-cliente-whatsapp**. Não publique a mudança antes de confirmar banco, custos e envio real.
2. Faça login em cliente.html com um número presente em PORTAL_ADMIN_PHONES. Digite o código recebido no WhatsApp.
3. A equipe será encaminhada a **equipe.html**. Cadastre um cliente de teste, seu projeto e orçamento, os serviços a executar, um contrato em PDF fictício e uma nota fiscal em PDF fictícia.
4. Saia e faça login como esse cliente de teste, usando seu WhatsApp. Verifique contratos, notas fiscais, detalhes e atendimento.
5. Confirme que outro cliente não consegue obter documentos que não lhe pertencem. Limites básicos: no máximo **3 solicitações por número e 12 por IP a cada 15 minutos; 5 tentativas de código por solicitação**.
6. Depois do teste, publique a atualização em produção e confira desktop e celular.

## Limite de tamanho dos arquivos

Por segurança e compatibilidade com os limites de payload da Netlify Functions, a primeira versão aceita PDFs de **até 4 MB**. Contratos ou notas fiscais acima desse limite exigem um fluxo de upload direto para armazenamento privado, a implementar separadamente.

## Limitações desta primeira versão

- A equipe consegue **cadastrar** clientes/projetos e **anexar** PDFs. A edição, exclusão, revogação, histórico de alterações e múltiplas funções de atendente ainda não têm interface.
- Os documentos são disponibilizados manualmente; o sistema não assina contratos eletronicamente nem emite NF-e/NFS-e.
- O orçamento é informativo, sem pagamentos ou checkout.
- Atendimento abre o **WhatsApp externo**, sem chat interno.
- Antes de usar dados reais, a empresa deve definir retenção, privacidade, acesso interno, procedimentos para solicitações dos titulares e boas práticas da **LGPD**.
- É recomendável adicionar auditoria, gestão de atendentes e monitoramento de entrega das mensagens antes de aumentar a escala.
