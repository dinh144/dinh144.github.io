---
title: Font tiêu đề phải có subset vietnamese, không thì dấu chồng sẽ vỡ
description: ""
date: 2026-11-04
type: note
tags: [thiết-kế, typography]
---

Nhiều font đẹp trên Google Fonts không có subset `vietnamese`, ví dụ Instrument Serif, Jost hay DM Serif. Trình duyệt sẽ lấy font dự phòng cho riêng các chữ như **ệ, ữ, ặ**, nên một tiêu đề bị trộn hai kiểu chữ. Trước khi chọn font, kiểm tra danh sách subset và thử gõ chữ có dấu chồng ở cỡ lớn.
