---
title: "astro:page-load chạy lại sau mỗi lần chuyển trang bằng View Transitions"
description: ""
date: 2026-11-06
type: note
tags: [astro]
---

Khi bật `<ClientRouter />`, script được bundle chỉ chạy **một lần**. Muốn gắn lại sự kiện cho trang mới thì nghe `astro:page-load`: sự kiện này chạy ở lần tải đầu và sau mỗi lần chuyển trang.

```js
document.addEventListener('astro:page-load', () => {
  // gắn lại nút, khởi động lại hiệu ứng...
});
```
