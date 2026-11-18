# Duplar Móveis — Briefing técnico do site

> Documento de passagem de contexto. Leia antes de sugerir qualquer alteração.
> Última atualização: 03/09/2026

---

## 1. O projeto

Site institucional de **página única** para a **Duplar Móveis**, marcenaria de móveis planejados sob medida no Ceará.

- **Objetivo único da página:** gerar contato via WhatsApp para orçamento.
- **Público:** quem está construindo ou reformando e considera móvel planejado em vez de móvel de loja.
- **Argumento central:** "o móvel certo não se compra pronto, se projeta".
- **Status:** estrutura, design e galeria de fotos prontos. Falta conteúdo real do cliente (ver seção 7).

## 2. Marca

- **Nome:** Duplar Móveis. Descritivo da logo: "MÓVEIS PROJETADOS".
- **Logo:** monograma serifado "DM" com letras sobrepostas, traço fino, em branco. Original em PNG com fundo transparente.
- Derivados já gerados (ver seção 5): monograma isolado, lockup completo, versões escuras e favicon.
- **Não existe versão vetorial (SVG)** da logo. Vale pedir ao cliente — em tamanhos pequenos os traços finos perdem definição.

## 3. Stack

HTML + CSS + JavaScript puros, três arquivos, sem build, sem framework, sem dependência externa além do Google Fonts.

```
/
├── index.html
├── styles.css
├── script.js
└── assets/img/        (31 arquivos, 2,5 MB)
```

Hospedagem prevista: qualquer host estático (Netlify, Vercel, hospedagem compartilhada). É só subir a pasta.

## 4. Sistema de design

Todos os valores vivem em `:root` no topo do `styles.css`. **Nunca escrever cor ou fonte fora desses tokens.**

**Cores**

| Token | Hex | Uso |
|---|---|---|
| `--wood-dark` | `#241811` | fundo das seções escuras (hero, processo, CTA) |
| `--wood-mid` | `#6B4226` | texto de apoio sobre fundo claro |
| `--wood-mid-light` | `#8B5E3C` | traços, divisórias |
| `--linen` | `#EFE8DA` | fundo claro principal |
| `--linen-warm` | `#E5DBC7` | fundo claro alternado |
| `--brass` | `#A9824C` | botão primário, bordas de destaque |
| `--brass-light` | `#C9A46A` | eyebrows, links em hover, numeração |
| `--charcoal` | `#1C1712` | texto principal, rodapé |
| `--cream-text` | `#F5EFE4` | texto sobre fundo escuro |

**Tipografia**

- `--font-display`: **Fraunces** (serifada) — h1, h2, h3, citações. Peso 450–500.
- `--font-body`: **Work Sans** — parágrafos.
- `--font-mono`: **JetBrains Mono** — eyebrows, botões, legendas, numeração. Sempre caixa alta com `letter-spacing` largo.

**Ritmo de fundo:** as seções alternam claro e escuro na ordem hero (escuro) → sobre (linen) → diferenciais (linen-warm) → processo (escuro) → ambientes (linen) → depoimentos (linen-warm) → CTA (escuro) → rodapé (charcoal). Manter essa alternância ao inserir seções novas.

**Assinatura visual:** anéis concêntricos em SVG que remetem aos anéis de crescimento da madeira, com animação lenta de respiração. Aparecem no hero e no CTA final. É o único elemento decorativo do site — não adicionar outros.

## 5. Imagens

Todas as fotos foram otimizadas de 3–4 MB para 22–200 KB, em **WebP com fallback JPG** via `<picture>`. Duas resoluções por foto: `nome.jpg` (900px, usada no card) e `nome-full.jpg` (1700px, usada no lightbox).

| Arquivo | Conteúdo |
|---|---|
| `hero.jpg/.webp` | cozinha em fendi com ripado iluminado — fundo do hero |
| `cozinha-planejada.*` | mesma cozinha, card da galeria (única foto em paisagem) |
| `cozinha-gourmet.*` | ilha em mármore, marcenaria amadeirada — usada na seção Sobre e na galeria |
| `sala-integrada.*` | painel ripado verde separando estar e cozinha |
| `sala-jantar.*` | painel ripado com iluminação linear e nicho em cimento queimado |
| `cozinha-bancada.*` | bancada com frente ripada retroiluminada |
| `projeto-06.*` | **ambiente não identificado** — legenda e `alt` ainda entre colchetes |
| `logo-marca.png` | monograma DM branco (header, CTA) |
| `logo-duplar.png` | lockup completo branco (rodapé) |
| `logo-marca-escura.png` / `logo-duplar-escura.png` | versões em `--wood-dark` para fundo claro |
| `favicon.png` / `favicon-32.png` | monograma sobre quadrado escuro |

Ao adicionar fotos novas: gerar WebP + JPG nas duas resoluções, informar `width`/`height` no HTML, usar `loading="lazy"` fora do hero e escrever `alt` descritivo em português.

## 6. Seções e comportamento

1. **Header** — fixo, transparente sobre o hero, ganha fundo `rgba(36,24,17,.92)` com blur após 40px de scroll. Menu lateral deslizante abaixo de 860px. Abaixo de 520px o wordmark textual some e fica só o monograma.
2. **Hero** — 100svh, foto de fundo com véu em gradiente duplo e zoom lento de 26s, anéis de madeira por cima, título, subtítulo e dois botões.
3. **Sobre** — grid de duas colunas: foto em retrato 3:4 com moldura de latão deslocada + texto. Vira uma coluna abaixo de 860px.
4. **Diferenciais** — 4 cards com ícones SVG desenhados à mão (traço 1.5, sem preenchimento).
5. **Processo** — 4 etapas numeradas em fundo escuro, ligadas por uma linha tracejada horizontal. A numeração 01–04 se justifica porque é uma sequência real de trabalho.
6. **Ambientes** — galeria de 6 fotos, grid 3 → 2 → 1 colunas, proporção 4:5 (4:3 no celular). Hover dá zoom de 6% e revela o rótulo "Ampliar". Em telas de toque o rótulo fica sempre visível.
7. **Lightbox** — abre no clique do card, carrega a versão `-full`, navega por botões, setas do teclado e swipe, fecha no Esc ou no clique do fundo, trava o scroll do body e devolve o foco ao card de origem.
8. **Depoimentos** — dois blocos de citação.
9. **CTA final** — monograma discreto, título, WhatsApp e e-mail.
10. **Rodapé** — lockup da logo, tagline, contato e redes.

**Acessibilidade e movimento:** `prefers-reduced-motion` desliga todas as animações; `:focus-visible` com contorno em latão; cards da galeria são `<button>` de verdade; o lightbox tem `role="dialog"` e `aria-modal`. Revelação ao scroll via `IntersectionObserver` com threshold 0.15.

**Verificado:** 1440px, 900px e 390px sem overflow horizontal, sem imagem quebrada, lightbox funcional em todas.

## 7. Pendências

Tudo que falta está marcado **entre colchetes** no HTML — basta buscar `[` para encontrar.

**Depende do cliente:**
- Texto institucional da seção Sobre (história, tempo de atuação, valores)
- Dois depoimentos reais com nome do cliente
- Número do WhatsApp — hoje o link é `https://wa.me/55`, incompleto
- E-mail real — hoje `contato@duplarmoveis.com.br`, presumido
- Cidade e @ do Instagram
- Identificação do ambiente da foto `projeto-06`
- Fotos de quarto, home office e closet para completar a galeria
- Logo em SVG, se existir

**Decisões abertas:**
- Formulário de orçamento na seção de contato, ou manter só WhatsApp e e-mail?
- Domínio e hospedagem definitivos

## 8. Como conduzir daqui

- O site é de uma marcenaria: as fotos dos projetos são o argumento de venda. Toda decisão deve favorecer a foto, não a decoração da página.
- Manter a paleta e as três fontes. Se algo pedir uma cor nova, provavelmente o problema é de hierarquia, não de cor.
- Entregar **arquivos completos prontos para substituir** na pasta do projeto, não trechos de código soltos no chat.
- O responsável pelo projeto não programa — explicar o que mudou em linguagem simples e dizer exatamente qual arquivo substituir.
- Antes de sugerir seção nova, checar se o conteúdo para preenchê-la já existe. O site já tem placeholder demais.
