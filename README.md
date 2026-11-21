# Duplar Móveis

Site institucional da Duplar Móveis (HTML, CSS e JavaScript) e área privada do cliente.

O site público fica em index.html; a área do cliente em cliente.html; e a área autorizada da equipe em equipe.html. A pasta netlify/functions contém a API de autenticação pelo WhatsApp (Meta Cloud API diretamente), cadastros e acesso seguro a PDFs. O banco relacional é Netlify Database (Postgres), e os arquivos ficam em Netlify Blobs.

**Importante:** os códigos só serão enviados após a ativação da Meta. Não há login de demonstração nem dados reais de cliente no repositório. A interface não substitui a autenticação no servidor.

Veja [instruções de ativação](docs/ATIVAR-PORTAL-DUPLAR.md) para configurar a Netlify e a Meta e para testar o portal.

Para desenvolver: Node >=20.12.2, npm install e npm run dev. A versão pública é construída em dist/ por npm run build, para impedir que arquivos do servidor sejam publicados como estáticos. O deploy final deve ocorrer apenas após o teste do fluxo e das variáveis de ambiente.

> A seção pública de contato ainda contém informações provisórias indicadas no briefing original. Não substituir por dados inventados.
