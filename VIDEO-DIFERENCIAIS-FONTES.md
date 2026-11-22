# Duplar Móveis — fontes e montagem do filme da seção 03

Data da seleção: 21/11/2026.

## Finalidade
Vídeo silencioso e ilustrativo para a seção **03 / NOSSO JEITO DE PROJETAR**. A montagem apresenta quatro momentos com continuidade editorial: ambiente projetado → madeira trabalhada → acabamento artesanal → ambiente concluído.

**As cenas não retratam a equipe, os projetos, a oficina ou serviços executados pela Duplar.** O aviso na própria seção informa que o vídeo é ilustrativo. Não atribuir aos profissionais da Duplar as atividades retratadas nos clipes externos.

## Fontes Pexels e licença
Licença geral consultada: https://www.pexels.com/license/
A licença permite usar, recortar e editar vídeos para websites e promover negócios, sem exigir crédito, mas proíbe sugerir endosso por pessoas ou marcas retratadas.

1. **Projeto personalizado** — Owen Mathias, *Modern Kitchen with Dark Cabinets and Wood Countertops*, ID **34955032**.
   - Página: https://www.pexels.com/video/modern-kitchen-with-dark-cabinets-and-wood-countertops-34955032/
   - Download 4K do Pexels: https://videos.pexels.com/video-files/34955032/14807020_3840_2160_25fps.mp4
   - Conteúdo: cozinha contemporânea com armários escuros e bancadas de madeira.

2. **Madeira selecionada** — Yusif Jalil, *Mastering Woodwork: A Carpenter’s Craft*, ID **18366463**.
   - Página: https://www.pexels.com/video/mastering-woodwork-a-carpenter-s-craft-18366463/
   - Download 4K do Pexels: https://videos.pexels.com/video-files/18366463/18366463-uhd_3840_2160_30fps.mp4
   - Conteúdo: detalhe de lixamento de madeira.

3. **Acabamento sob medida** — Ono Kosuki, *Close up Shot of a Carpenter Using a Hammer and Chisel*, ID **5973229**.
   - Página: https://www.pexels.com/video/close-up-shot-of-a-carpenter-using-a-hammer-and-chisel-5973229/
   - Download 4K do Pexels: https://videos.pexels.com/video-files/5973229/5973229-uhd_3840_2160_25fps.mp4
   - Conteúdo: cuidado manual no trabalho de marcenaria.

4. **Do projeto à instalação** — Alef Morais, *Modern Luxury Interior with Open Design*, ID **38675643**.
   - Página: https://www.pexels.com/video/modern-luxury-interior-with-open-design-38675643/
   - Download 4K do Pexels: https://videos.pexels.com/video-files/38675643/16428573_3840_2160_30fps.mp4
   - Conteúdo: revelação de um interior contemporâneo concluído; não é uma filmagem de instalação.

## Montagem e sincronização
- Fonte: arquivos originais, renderização web de 24 fps.
- Quatro trechos com **5,5 segundos**, transições por dissolvência de **0,5 segundo**, resultando em ~**20,5 segundos**.
- Dissolvências começam em **5,0**, **10,0** e **15,0 segundos**.
- As legendas mudam levemente depois do início da transição, em **5,25**, **10,25** e **15,25 segundos**.
- Desktop: H.264 MP4, 1920×1080; mobile: H.264 MP4, 720×1280, recorte refeito para a vertical.
- Sem áudio, com `moov` no início para streaming.
- Render reproduzível: `.github/workflows/diferenciais-video-render.yml`.
- Artefatos: `assets/video/duplar-detalhes-wide.mp4`, `duplar-detalhes-mobile.mp4`, `duplar-detalhes-poster.jpg`.

## Comportamento no site
- O arquivo só começa a carregar quando o visitante se aproxima da seção.
- Reprodução muda conforme visibilidade, aba ativa, controle de pausa e interações.
- Os indicadores e botões permitem selecionar qualquer um dos quatro momentos.
- `prefers-reduced-motion`, conexão em modo economia de dados ou falha de mídia ativam fotografias estáticas do portfólio, com navegação manual.
- Testar em Safari/iPhone e Android reais antes de publicar na branch principal.

**O site institucional usa vídeos de Pexels apenas como material ilustrativo. O portfólio de imagens reais permanece separado.**
