# Duplar Móveis — fontes do vídeo cinematográfico do hero

Revisão: 20/11/2026.

## Objetivo e uso
- Filme decorativo, ilustrativo, sem áudio e sem mensagens no próprio vídeo.
- Os materiais deste filme **não são projetos executados pela Duplar**. A seção de portfólio deve continuar apresentando apenas projetos efetivamente realizados pela empresa.
- Nunca implicar endosso de proprietários, marcas ou titulares de direitos visíveis nos vídeos.
- Licença geral dos clipes no momento da seleção: https://www.pexels.com/license/ — uso gratuito, comercial e edição permitidos; atribuição não obrigatória.

## Fontes
1. Alef Morais, cozinha moderna de luxo (Pexels, ID 40807466):
   https://www.pexels.com/video/luxury-modern-kitchen-interior-design-40807466/
2. Owen Mathias, cozinha e sala integradas (Pexels, ID 34955012):
   https://www.pexels.com/video/modern-kitchen-and-living-area-with-elegant-decor-34955012/
3. Taryn Elliott, sala de estar (Pexels, ID 3770054):
   https://www.pexels.com/video/living-room-decorations-and-arrangements-3770054/
4. Alef Morais, quarto com iluminação suave (Pexels, ID 39024330):
   https://www.pexels.com/video/minimalist-luxury-bedroom-with-soft-lighting-39024330/

## Montagem web
- Arquivos: `assets/video/hero-duplar-wide.mp4`, `hero-duplar-mobile.mp4` e `hero-duplar-poster.jpg`.
- Vídeo desktop: 1600×900, H.264, 24 fps, sem áudio, ~14 s.
- Vídeo mobile: 540×960, H.264, 24 fps, sem áudio, ~14 s.
- Ordem dos clipes: cozinha, ambiente integrado, sala, quarto.
- Seleção de entrada aproximada: 3.0, 4.0, 1.5, 1.5 s, cada trecho com ~3.75 s; dissolvências de 0.35 s.
- Edição de cor leve para manter madeira e luzes quentes, sem falsas alegações.
- A emenda do fim para o início é por corte; avaliar visualmente antes de uma publicação definitiva.
- A montagem editável original também está disponível no Descript:
  https://web.descript.com/29e216d1-5c1e-4b47-9c80-6c6a5d2fe78e/d99ef

## Versão V2 — master remasterizado em 20/11/2026
- **Em uso na branch develop:** `assets/video/hero-duplar-wide-v2.mp4`, `hero-duplar-mobile-v2.mp4`, `hero-duplar-poster-v2.jpg`.
- Compilação direta dos arquivos originais 4K baixados do Pexels, sem encodes intermediários.
- Cenas em ordem: (1) cozinha, (2) ambiente integrado e (3) quarto; a sala de estar mais genérica foi retirada.
- Cortes: cozinha 2,3–7,1 s; integrado 3,6–8,4 s; quarto 0,9–5,7 s; dissolvências de 0,35 s; duração final aprox. 13,71 s.
- Desktop: 1920×1080, H.264 high, 24 fps, CRF 18, preset slow, sem áudio, ~9,85 MB.
- Mobile: 720×1280, H.264 high, 24 fps, CRF 19, preset slow, sem áudio, ~3,97 MB; recorte lateral pensado para formato vertical.
- Contraste ajustado levemente, sem desaturação que prejudique madeira e iluminação. O overlay do hero foi suavizado.
- Renderização reproduzível: `.github/workflows/hero-video-render.yml`.
- Limite de conteúdo: os originais têm pouca movimentação e não correspondem a projetos da Duplar. A melhora de codificação não substitui a necessidade de filmagens arquitetônicas próprias no futuro.
- **V1 foi preservada como backup**, não utilizada no hero em develop.

## Cuidados de publicação
- Não substituir vídeos por versões originais 4K pesadas sem teste de desempenho.
- Exigir foto de fallback, `muted`, `playsinline`, respeitar preferência por movimento reduzido e economia de dados.
- Fazer testes em Safari/iPhone e Android em dispositivos reais antes de colocar em produção.
- Manter os arquivos e a informação sobre licenciamento rastreáveis.
