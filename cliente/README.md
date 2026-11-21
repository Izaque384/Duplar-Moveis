# Duplar Móveis — Área do Cliente (primeira versão)

## Escopo implementado
Acesse `/cliente/` a partir do menu ou rodapé do site Duplar.

Esta entrega contém **somente o front-end navegável**, com visual inspirado no site institucional:
- Entrada do portal com aviso de que o acesso individual ainda não está disponível.
- Demonstração opcional (`/cliente/?demo=1`) de Visão geral, Meu projeto, Documentos, Financeiro, Atendimento e Minha conta.
- Etapas ilustrativas, descrições de tipos de arquivo, condições comerciais protegidas e canais oficiais de contato.
- Navegação responsiva, menu lateral móvel, painéis acessíveis, seções por URL e detalhes expansíveis dos documentos.

## Limites importantes
**O site atual é estático. Não há autenticação, banco de dados, API privada, documentos nem cliente real cadastrado.**

Todo material da demonstração é público e ilustrativo: nunca inserir nomes, documentos, preços, cronogramas, senhas, dados de clientes ou informações privadas diretamente no HTML/JS/CSS ou no repositório GitHub. O modo `?demo=1` NÃO concede acesso real e não representa uma sessão autenticada. Não usar `localStorage`/querystrings como mecanismo de autorização.

Os botões de suporte abrem o WhatsApp `+55 (88) 8173-4015` e o Instagram `@duplar_moveis` informados pelo responsável. O número deve ser confirmado como conta de WhatsApp ativa antes do lançamento definitivo.

A tag `noindex, nofollow` restringe indexação voluntária, **não é controle de acesso**.

## Para tornar a área do cliente operacional
1. Definir uma solução de autenticação de clientes (convites, verificação de e-mail, recuperação e encerramento de sessão).
2. Criar backend e banco de dados para clientes, projetos, etapas, documentos, pagamentos e comunicações, com permissões por cliente e por integrante da equipe.
3. Armazenar arquivos privados em serviço apropriado; downloads devem exigir autorização servidor-side, nunca apenas esconder botões.
4. Conectar painel interno da Duplar para atualizar status, definir prazos reais e anexar documentos. Registrar histórico/auditoria das alterações.
5. Implementar proteção de dados pessoais, retenção e controles adequados à LGPD.
6. Revisar regras de negócio e texto dos estágios com a equipe da Duplar. Os exemplos não devem ser interpretados como promessa de prazo ou garantia comercial.
7. Cobrir login, acesso indevido a projeto de terceiros, links expirados e dispositivos móveis com testes antes de liberar clientes reais.

## Testes
O workflow `client-portal-review.yml` verifica as principais rotas e interações em diferentes larguras de tela, publicando capturas no artefato `duplar-client-portal-preview`.

Fluxo do projeto:
- `develop` = testes e preview `https://develop--duplarmoveis.netlify.app/cliente/`
- `main` = produção; não publicar sem autorização.
