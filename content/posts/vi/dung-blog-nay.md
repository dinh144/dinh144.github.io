---
title: Mình đã dựng blog này như thế nào
description: "Astro, Sveltia CMS, Claude Design và một nút dịch: toàn bộ quy trình từ thư mục trống đến dinh144.github.io, chi phí 0 đồng."
date: 2026-11-09
type: article
tags: [astro, i18n, thiết-kế]
---

> **Tóm tắt.** Blog chạy bằng Astro trên GitHub Pages, viết bài trong Sveltia CMS, mỗi bài có bản tiếng Việt và tiếng Anh. Không máy chủ, không phí hằng tháng.

## Vì sao tự dựng

Mình muốn một chỗ viết lâu dài: bài dài về những dự án đang làm, ghi chú ngắn mỗi khi học được điều gì đó, và vài đường link đáng đọc. Các nền tảng có sẵn hoặc giữ nội dung của mình, hoặc khó viết song ngữ, hoặc không cho chỉnh giao diện tới từng khoảng cách chữ.

## Astro và hai ngôn ngữ

Astro hợp với blog vì mỗi trang sinh ra là HTML tĩnh. Tiếng Việt nằm ở gốc, tiếng Anh nằm dưới `/en/`. Bài viết là file Markdown trong hai thư mục song song:

```text
content/posts/
├── vi/dung-blog-nay.md
└── en/dung-blog-nay.md
```

Cùng một tên file nghĩa là cùng một bài. Nếu bản tiếng Anh chưa có, trang `/en/` hiện bản tiếng Việt kèm một dòng thông báo, nên link chia sẻ không bao giờ hỏng.

```ts
// Chọn bản dịch, không có thì quay về tiếng Việt
const entry = slot[locale] ?? slot['vi'];
const fallback = !slot[locale];
```

## Viết bài bằng Sveltia CMS

Sveltia chạy ngay tại trang `/admin`, đăng nhập bằng token GitHub và lưu bài thành file Markdown trong repo. Viết xong bản tiếng Việt, mình bấm **Dịch** để Gemini soạn bản nháp tiếng Anh, rồi sửa lại cho tự nhiên trước khi đăng. Bản nào chưa sửa thì gắn cờ `aiDraft`, trang sẽ ghi rõ là bản dịch máy.

## Thiết kế với Claude Design

Trước khi viết dòng CSS nào, mình dựng các hướng thiết kế trên một canvas, rồi xây bốn bản blog hoàn chỉnh cùng chạy trên một kho nội dung. Hướng nào thắng sẽ thành giao diện chính thức. Chuỗi bài [Phòng thí nghiệm thiết kế](../../series/design-lab/) kể chi tiết phần này.

## Chi phí: 0 đồng

| Phần | Dùng gì | Giá |
| --- | --- | --- |
| Hosting | GitHub Pages | 0 đ |
| Nội dung | Markdown trong git | 0 đ |
| Quản trị | Sveltia CMS | 0 đ |
| Dịch | Gemini (gói miễn phí) | 0 đ |
| Bình luận | Giscus (GitHub Discussions) | 0 đ |
