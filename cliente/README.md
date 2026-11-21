# Portal Duplar — 4 áreas

A área do cliente contém exclusivamente: Contratos, Notas fiscais, Meu projeto e Atendimento. A navegação demonstração (`?demo=1`) mantém estas quatro seções, com aviso de dados ilustrativos e sem documentos fictícios para download.

O acesso real usa código temporário da Meta pelo WhatsApp e dados privados do banco Neon. Endpoints em Netlify Functions. Sem as credenciais Meta e a variável DATABASE_URL configuradas, o login fica indisponível.

A equipe acessa `/equipe.html` depois de autenticação por WhatsApp com número listado em `PORTAL_ADMIN_PHONES`.
