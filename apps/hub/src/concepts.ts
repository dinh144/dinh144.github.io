/** Lab themes served under /lab/<id>/. `base` is the plain reference theme. */
export const CONCEPTS = [
  {
    id: 'ink',
    vi: { name: 'Mực & giấy', blurb: 'Giấy ấm, mực loang khi cuộn, dấu thanh rơi vào chỗ.' },
    en: { name: 'Ink & paper', blurb: 'Warm paper, ink that spreads as you scroll, tone marks dropping into place.' },
  },
  {
    id: 'signal',
    vi: { name: 'Tín hiệu', blurb: 'Màn hình CRT, ký tự ASCII tự giải mã thành tiêu đề.' },
    en: { name: 'Signal', blurb: 'A CRT and ASCII world where text decodes into titles.' },
  },
  {
    id: 'rhythm',
    vi: { name: 'Nhịp chữ', blurb: 'Chữ chuyển động theo nhịp, tiêu đề co giãn như bản nhạc.' },
    en: { name: 'Rhythm', blurb: 'Type that moves to a beat; titles stretch like a score.' },
  },
  {
    id: 'constellation',
    vi: { name: 'Chòm sao tri thức', blurb: 'Mỗi bài là một ngôi sao, chủ đề nối chúng lại.' },
    en: { name: 'Knowledge constellation', blurb: 'Every post is a star; topics connect them.' },
  },
  {
    id: 'base',
    vi: { name: 'Bản gốc', blurb: 'Giao diện trơn, đủ mọi tính năng, để so sánh.' },
    en: { name: 'Base', blurb: 'Plain styling with every feature, for comparison.' },
  },
] as const;
