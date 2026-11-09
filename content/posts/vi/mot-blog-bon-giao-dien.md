---
title: Một blog, bốn giao diện
description: "Cách một kho nội dung nuôi bốn bản blog hoàn chỉnh cùng lúc: lõi dùng chung, hợp đồng chuyển động, và vì sao chế độ đọc là tính năng quan trọng nhất."
date: 2026-11-10
type: article
series:
  id: design-lab
  part: 2
tags: [astro, thiết-kế, kiến-trúc]
---

Ở [phần trước](../bon-huong-thiet-ke/) mình chọn bốn ý tưởng nghệ thuật. Phần này kể chuyện kỹ thuật: làm sao để bốn bản blog cùng chạy, cùng nội dung, mà không bản nào phải viết lại phần lõi.

## Một kho nội dung, bốn cách kể

Toàn bộ bài viết nằm trong một thư mục `content/`. Mỗi giao diện là một ứng dụng Astro riêng, nhưng không ứng dụng nào tự đọc file Markdown. Chúng hỏi một gói lõi chung, `@blog/core`, và gói này trả về dữ liệu đã xử lý: bài nào thuộc chuỗi nào, bài nào chưa có bản dịch, chủ đề nào dùng chung.[^lop-loi]

```text
content/          ← chỉ có nội dung
packages/core/    ← schema, i18n, đường dẫn, RSS, ảnh chia sẻ
apps/hub/         ← trang gốc + Sveltia CMS
apps/base/        ← giao diện tham chiếu, đủ mọi tính năng
apps/ink/ …       ← bốn giao diện thi đấu
```

Nhờ vậy, khi mình sửa một lỗi trong cách tính bản dịch dự phòng, cả bốn giao diện cùng được sửa trong một lần build.

## Hợp đồng chuyển động

Bốn giao diện đều có hiệu ứng nặng: WebGL, cuộn mượt, chữ chuyển động. Để chúng không giẫm lên người đọc, mọi hiệu ứng phải tuân theo một hợp đồng chung:

1. Chữ phải hiện và đọc được **trước khi** bất kỳ hiệu ứng nào tải xong.
2. Trước khi chạy, hiệu ứng hỏi `motionAllowed()`. Nếu hệ điều hành yêu cầu giảm chuyển động, hoặc người đọc bật chế độ đọc, câu trả lời là không.
3. Khi trạng thái đổi giữa chừng, hiệu ứng phải tự dọn dẹp, không để lại khung hình đứng im giữa trang.

```ts
document.addEventListener('prefs:change', () => {
  if (!motionAllowed()) field.dispose();
});
```

Trạng thái được ghi thành thuộc tính trên thẻ `<html>`: `data-motion="reduce"` hay `"full"`. Một đoạn script nhỏ chạy trước khi trang vẽ, nên không có khoảnh khắc nào hiệu ứng lóe lên rồi tắt.[^nhay]

## Âm thanh không cần file

Hai trong các trang tham khảo dùng âm thanh, nên blog cũng có, nhưng tắt mặc định. Không có file âm thanh nào: tiếng lật giấy là nhiễu trắng đi qua một bộ lọc dải thông, tiếng giọt mực là một sóng sin trượt từ 520 Hz xuống 180 Hz trong một phần tư giây.[^webaudio] Tất cả do Web Audio tạo ra ngay trong trình duyệt.

## Kiểm chứng bằng ảnh chụp

Mỗi giao diện chỉ được coi là xong khi một script chụp lại từng trang ở hai kích thước màn hình và bốn chế độ: sáng, tối, giảm chuyển động và chế độ đọc. Script cũng kiểm tra những thứ dễ quên: trang có đúng một thẻ `h1` không, có bị cuộn ngang không, nút có đủ 44 điểm ảnh để chạm không, và thuộc tính `lang` có khớp ngôn ngữ không.

| Kiểm tra | Vì sao |
| --- | --- |
| `data-motion="reduce"` khi bật chế độ đọc | Hợp đồng chuyển động |
| Không cuộn ngang ở 390 px | Điện thoại là nơi đọc chính |
| Vùng chạm ≥ 44 px | Ngón tay không chính xác như chuột |
| `lang` đúng | Trình đọc màn hình và tìm kiếm theo ngôn ngữ |

## Điều mình học được

Phần khó nhất không phải là làm hiệu ứng đẹp, mà là làm hiệu ứng **biết lùi lại**. Một trang đoạt giải có thể khiến người ta trầm trồ trong mười giây; một blog phải dễ đọc trong mười phút.

[^lop-loi]: Lõi không biết gì về giao diện. Nó chỉ trả về dữ liệu và vài thành phần không có kiểu dáng như khung bình luận hay thẻ meta.

[^nhay]: Kỹ thuật này giống cách nhiều trang tránh "nháy" khi chuyển sáng tối: đọc lựa chọn đã lưu và gắn thuộc tính trước khi CSS được áp dụng.

[^webaudio]: Đây cũng là lý do âm thanh không bao giờ tự phát: trình duyệt chỉ cho Web Audio chạy sau một thao tác của người dùng.
