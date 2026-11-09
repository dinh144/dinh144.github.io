---
title: A heading font needs the vietnamese subset, or stacked tone marks break
description: ""
date: 2026-11-04
type: note
tags: [thiết-kế, typography]
aiDraft: true
---

Plenty of beautiful Google Fonts ship without the `vietnamese` subset, for example Instrument Serif, Jost or DM Serif. The browser then falls back to another font for letters like **ệ, ữ, ặ** only, so a single heading ends up mixing two typefaces. Before picking a font, check its subset list and type stacked-diacritic letters at display size.
