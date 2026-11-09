---
title: "astro:page-load fires again after every View Transitions navigation"
description: ""
date: 2026-11-06
type: note
tags: [astro]
aiDraft: true
---

With `<ClientRouter />` on, bundled scripts run **once**. To re-bind events on the new page, listen for `astro:page-load`: it fires on the first load and after every navigation.

```js
document.addEventListener('astro:page-load', () => {
  // re-bind buttons, restart effects...
});
```
