# Chinese / zen / Vietnamese references on Awwwards (research notes, 2026-11-09)

Method: `awwwards` MCP (list_categories, search_sites compact, get_site_details, search_directory, get_collections).
SEEN = returned by a tool. INFERRED = my reading of the returned thumbnail/description.

## Coverage warning (important)
- The Awwwards taxonomy has NO Asian / Chinese / Japanese / calligraphy / ink tag (SEEN: list_categories, 195 tags).
- search_sites free text matches titles and tags only, over a partial local index. Queries returning zero (SEEN):
  China, Chinese, calligraphy, Asia, Asian, Tokyo, Kyoto, Osaka, nippon, Korea, Saigon, Hanoi, Viet (diacritic), samurai,
  sake, temple, garden, lacquer, mountain, Eislab, NIKI.
- Not found in the index: any Chinese ink-wash / shan shui site, any thu phap site, any Eislab / NIKI / Lumen Artspace site.
  I could not verify those studios' awards; do not assume they are absent from Awwwards itself.
- capture_live_site not attempted (no need; details came from get_site_details).
- Honest result: only ~2 awarded and ~6 nominee-stage precedents were reachable. Most are 2026 (index leans recent).
- Most of the best-matching sites are NOMINEES, not winners. Marked below. Nominee = submitted, no award yet.

## Awarded references (SEEN, get_site_details)

### 1. Huy Phan Vol.2 (Vietnamese studio, Ho Chi Minh City)
- URL https://huyml.co/  | Awwwards /sites/huy-phan-vol-2
- Award: Site of the Day, Oct 14, 2026 (also carries "ah" and Developer Award badges in the listing).
- Score 7.67: design 7.91, usability 7.26, creativity 7.78, content 7.73.
- Tags: Promotional, Web & Interactive, Clean +8; 11 technologies (list not returned in compact).
- Idea (INFERRED from thumbnail): monochrome grid, huge numerals (19/96), red uppercase manifesto, a line-art self-portrait.
  Swiss/editorial, not heritage-motif. Vietnamese designer, no Vietnamese cultural motif.
- Directory (SEEN search_directory Vietnam): Huy Phan = 30 awards (13 SOTD, 17 HM); Kenny Ho 10 (4 SOTD, 6 HM);
  Quang Dinh 3; Kaixa 2; Quan Ho 1 HM; Khanhs Bui 0.
- Diacritics/CJK: unknown. Usability 7.26 is the lowest sub-score (SEEN), typical of experimental navigation.
- Borrow: restraint, one accent colour, big type, generous grid; proves Vietnamese talent wins on clarity, not on motifs.

### 2. Lantern House (Dwayne Koh portfolio)
- URL http://www.dwaynekoh.com | /sites/lantern-house
- Award: Honorable Mention, Oct 11, 2026. Score not returned (not yet cached/shown).
- Tags SEEN: GSAP, 3D, Interaction Design +6. Description SEEN: "portfolio reimagined as an explorable lantern house,
  built with Blender, Three.js and AI, 24 projects".
- Idea (INFERRED from thumbnail): night scene, wooden house on water, paper lanterns, cherry trees, kanji-style signage
  (looks Japanese izakaya / Japanese-flavoured; the author's location is not stated in tool data).
- MOST relevant precedent for our concept: an explorable 3D world where each building/place is a project. 
  Text is on signage and nav only; reading happens elsewhere (INFERRED).
- Borrow: world = navigation, places = entries, warm lantern light as the "you are here / unread" signal. Risk: 3D weight on mobile,
  signage text is decorative, not a reading surface.

### 3. Matcha Cartel
- URL https://matcha-cartel.com/ | /sites/matcha-cartel
- Award: Honorable Mention, Jun 28, 2026. 14 elements, 2 palette entries (details compact).
- Idea (SEEN description + INFERRED thumbnail): matcha as "controlled commodity" in an underground trade; cold grey-blue, aluminium case,
  mono technical captions. A Japanese product reframed with industrial/data language.
- Borrow: Japanese object + infrastructure/logistics tone = surprisingly close to a cloud blog (lots, regions, tracking).
  Very little actual Japanese typography; a cultural subject, not an aesthetic of washi/ink.

## Nominee-stage references (SEEN, no award yet; weaker proof)

### 4. Mâm Cơm – Vietnamese Feast (Vietnamese heritage)
- URL https://the-family-rice-tray.vercel.app | /sites/mam-com-vietnamese-feast | Nominee, 2026/09 submission, no score.
- Tags: Culture & Education, Illustration, Food & Drink +9. Description SEEN: tribute to Vietnamese family meals,
  "visual details inspired by the Đông Sơn bronze..." (drum).
- INFERRED from thumbnail: deep maroon + gold line art, Đông Sơn drum, dragon in thin gold outline (the dragon style reads as
  imperial/Nguyen-era; fine for Vietnam, but check provenance before reuse), condensed display caps with full Vietnamese
  diacritics rendered (MÂM CƠM) and a humanist sans body in readable measure with italic loanword.
- Best Vietnamese heritage precedent found. Diacritics handled visibly (Â, Ơ, ă, ê in body).
- Borrow: Đông Sơn concentric rings as a map/compass motif (suits "regions" and radar-like world); gold-on-dark palette for a night mode.

### 5. PHIN PHIN (Saigon coffee concept, Helena Dang)
- URL https://phin.helenadang.work/ | /sites/phin-phin | Nominee, 2026/10, no score.
- SEEN description: made-up Saigon coffee shop; drip the phin, stir milk, knock over plastic stools. Tags Art & Illustration, Food & Drink, Animation +9.
- INFERRED: retro 2.5D illustration, red/yellow signage, Vietnamese shop-sign lettering with diacritics (CHUYẾN BẢN, SÀI GÒN, KÍNH)
  alongside bold English display. Street-culture Vietnam, not heritage-craft.
- Borrow: everyday Vietnam (shopfront, hẻm number, plastic stool) as playful "places"; toy physics as delight, reading text stays plain.

### 6. Cleal - Kakuta Paper (Japanese)
- URL https://www.cleal.co.jp/ | Nominee 2026/10. SEEN description: Omotenashi hospitality, paper hand towels.
- INFERRED: gold-leaf panel, serif Japanese headline (mincho-like), peony/seigaiha pattern backdrop. Real Japanese text, full CJK set.
- Borrow: single gold-leaf (kinpaku) texture panel behind a calm serif headline; seigaiha wave pattern also fits cloud/"network" waves.

### 7. Ribūto - Japan Essentials
- URL https://de.ributo.place/ | Nominee 2022/10. SEEN: "Japanese traditions and modern beauty tech; minimalistic style".
- INFERRED: muted sage, thin sans, vertical side-menu, round CTA, large breathing space. German-language, zen minimal.
- Borrow: vertical edge rail with small rotated labels, pale grey-green palette; calm, readable.

### 8. NAKAGAWA Co., Ltd. (Fukuoka housing)  
- URL https://nakagawa-corp.com/ | Nominee 2026/10. Tags Architecture, Business & Corporate, Clean +9. Description SEEN only; not viewed.
- Likely a quiet Japanese corporate-minimal reference with real Japanese typography (INFERRED, unverified).

### 9. Sunny's Journey (Sunny Wang)
- URL http://www.iamsunnywang.com/ | Nominee 2026/10. SEEN: ten worlds each with art, outfits, soundtrack; chat with a digital Sunny.
- Relevant structurally: worlds-as-sections + soundtrack. Cultural motif not verified (INFERRED, Chinese-name designer; no ink/calligraphy confirmed).

### Also seen but off-topic: YOYU DESIGN (Japanese pixel-art, nominee), Zenith Watches (HM, "zen" is just a name), JANM (museum, no award shown).

## Answers

### Best-proven directions on Awwwards (evidence is thin; judge accordingly)
1. Explorable world with warm light on a dark base: Lantern House (HM). Direct analogue of the "infrastructure world".
2. Japanese-object-as-system / calm minimal: Matcha Cartel (HM), Ribūto, Cleal (nominees). Gold-leaf + serif headline works; mono captions give a tech tone.
3. Vietnamese designer-led editorial restraint: Huy Phan (SOTD 7.67; 30 awards in total). The Vietnamese angle that wins is craft and clarity, not motif.
No ink-wash / shan shui / calligraphy-led site surfaced at all in this index. Not proof of absence; proof that I could not substantiate it.

### Risky for a reading blog
- Heavy 3D worlds (Lantern House): weight, mobile, motion; keep the article panel flat and static.
- Dark red/gold decoration (Mâm Cơm): fine for heroes; long text on saturated maroon needs 4.5:1 checks, use a paper/off-white reading panel.
- Calligraphy or brush display type: Vietnamese stacked diacritics (ệ ữ ặ ở) collide with brush fonts; use only for a big title or seal, never body.
- Ink-wash backgrounds behind text: low, uneven contrast. Use as a hero/region backdrop only.

### Under-used Vietnamese motifs (chance to stand out; INFERRED, based on what appeared in the index)
Only Đông Sơn drum, dragon and street-shop signage appeared. Not seen: sơn mài (lacquer: black/vermilion/gold with eggshell inlay), Đông Hồ woodblock prints (flat colour, điệp-paper sparkle, bold outline), thư pháp chữ Quốc ngữ (Vietnamese Latin calligraphy), áo dài silhouette, Hội An lanterns, gốm Bát Tràng blue-white, nón lá, tranh Hàng Trống. Best fits: sơn mài night palette (dark, gold, vermilion) for the world; Đông Hồ flat-colour icons for "places"; Hội An lantern glow as the active-place marker; thư pháp quốc ngữ for a single large title.

### Cultural sensitivity
- Keep Chinese, Japanese and Vietnamese motifs separate. Seigaiha, torii, kanji signage = Japanese; seals/ink shan shui = Chinese; the dragon in Mâm Cơm is a Vietnamese-court variant, not interchangeable with Chinese dragons.
- Do not caption lanterns generically: Hội An lanterns (silk, local) differ from Japanese chochin and Chinese red lanterns.
- Do not use kanji or hanzi as decoration without knowing the meaning; use Vietnamese words in chữ Quốc ngữ for our own labels.
- If the site is Vietnamese-first, Vietnam should lead; Japanese/zen calm can be the layout principle (whitespace, restraint), not the costume.

## Next step if more evidence is wanted
Use WebSearch/WebFetch on awwwards.com directly (collections, "Culture & Education" archive, Huy Phan's profile) since the MCP index is thin here.

---
# Addendum: live captures and motion (tools now working), Vietnamese depth

## Saved evidence (all SEEN as tool output; files under /home/dinh/.awwwards-mcp/images/)
| Site | Desktop | Mobile |
|---|---|---|
| Mâm Cơm | capture-ce8a4acc980a-desktop.png | capture-ce8a4acc980a-mobile.png |
| PHIN PHIN | capture-965cb209b419-desktop.png | capture-965cb209b419-mobile.png |
| Huy Phan Vol.2 | capture-0e6f108834de-desktop.png | capture-0e6f108834de-mobile.png |
| Matcha Cartel | capture-dccd1ee7f7da-desktop.png | capture-dccd1ee7f7da-mobile.png |
| Lantern House | FAILED (page.screenshot timeout 30 s, WebGL page) | FAILED (same) |

Motion recordings (record_site_motion, 12 frames):
- Mâm Cơm: motion-ce8a4acc98-desktop.webm, sheet at motion-ce8a4acc98-desktop/sheet.html and motion-sheet.md
- PHIN PHIN: motion-965cb209b4-desktop.webm, sheet at motion-965cb209b4-desktop/sheet.html and motion-sheet.md
get_motion_dna (live): huyml.co = Three.js/WebGL, 0 ScrollTriggers (no GSAP scroll census); matcha-cartel.com = no libs detected, 0 triggers;
dwaynekoh.com = Three.js/WebGL, 0 ScrollTriggers. Interpretation (INFERRED): motion is custom/WebGL or CSS, not GSAP ScrollTrigger; the census can miss custom code.
Not recorded: Huy Phan, Matcha Cartel, Lantern House motion video (DNA only); mobile motion not recorded.

## What the motion does (INFERRED from the filmstrips)
- Mâm Cơm: hero dragon and drum ring drift under text; sections scroll as long editorial panels; a rotating tray of seven dishes
  (arrow-key spin, dish card swaps); a recipe section flips to a cream "paper" panel with a serving scaler; a line-art family-meal
  illustration; a đồng-pattern footer band. Maroon stays for story, cream for the reading/recipe part: same split we want for a blog.
- PHIN PHIN: scroll-driven story: sign, drip timer (4:00 countdown), drag-to-stir interaction, tear-edge "torn paper" colour transitions
  between yellow, aqua, red, blue sections, sound toggle, "knock 'em over" physics stools. Playful, full-bleed colour blocks.
- Huy Phan: WebGL/Three.js layer on a flat grid (INFERRED; DNA shows three/webgl only).

## Diacritics and CJK rendering (from the saved images and filmstrips)
- Mâm Cơm (SEEN in filmstrip): display caps MÂM CƠM, CON RỒNG CHÁU TIÊN, ĂN CƠM CHƯA? render with all stacked marks intact in a condensed
  grotesque; body is a small sans on maroon; italic Vietnamese pull quote renders cleanly. Weakness: body text looks small and dim on
  dark maroon (INFERRED low contrast, verify with a contrast tool); some tiny labels are under 12 px. The recipe panel (cream background, dark text) is the readable part.
- PHIN PHIN (SEEN): lettering CHUYẾN BẢN, ĐEN ĐÁ, SỮA ĐÁ, BẠC XỈU, CÀ·PHÊ SÀI·GÒN, HẺM MÈO renders correctly in a heavy slab/display face;
  English-only body copy, so no long Vietnamese reading text tested.
- Huy Phan, Matcha Cartel: no Vietnamese or CJK body text observed (English). Cleal (nominee) has real Japanese; it was not captured live.
- Lantern House: kanji-like signage is decorative texture; no capture available.

## Vietnamese studios (SEEN search_directory country Vietnam)
Huy Phan (huyml.co): 30 awards (13 SOTD, 17 HM), HCMC. Kenny Ho: 10 (4 SOTD, 6 HM). Quang Dinh (quangdinh.im): 3 (1 SOTD, 2 HM).
Kaixa: 2 (1 SOTD, 1 HM). Quan Ho (hoquan.info): 1 HM (2026/06 submission). Khanhs Bui: no awards shown.
Eislab, NIKI Studio, Lumen Artspace: not in the directory page returned (one page only, hasMore=false), so unverified.
Pattern (INFERRED from Huy Phan's thumbnail): Vietnamese award winners are mostly international-style portfolios; no heritage-motif winner
found, which supports "Vietnamese motifs are under-used".

## Vietnamese direction: concrete motif palette for the infrastructure world (principles, not copies)
Facts about the cultural items are general knowledge (INFERRED, not tool-returned); confirm with a Vietnamese cultural source before shipping.
1. Sơn mài (lacquer) night world: deep black-brown ground, vermilion (son), gold leaf (vàng), crushed eggshell (vỏ trứng) as pale highlights.
   Use for the map base and region glows. Keep body text on a separate matte panel, never on glossy gradients.
2. Đông Sơn drum rings: concentric bands as the region/radar/compass motif (Mâm Cơm uses it; our version would be abstract rings for the
   ap-southeast-1 "home" marker). Credit the heritage; do not copy the dancer figures.
3. Tranh Đông Hồ: flat colour on điệp (shell-powder) paper, bold dark outline, indigo/vermilion/green/yellow. Good for place icons
   (a hamlet = a post). Proverb-style captions fit post teasers.
4. Hội An lantern: silk lantern glow as the "active place / new post" light; colour per region (lantern colours differ by shape/maker).
5. Thư pháp chữ Quốc ngữ: Vietnamese Latin calligraphy for the site title and one hero line only; verify the font covers ệ ữ ặ ở and stacked marks.
6. Gốm Bát Tràng blue-white and Hàng Trống prints: quieter options for article panel borders.
7. Everyday Vietnam à la PHIN PHIN (hẻm number, plastic stool, shop sign): playful region names or 404 page, with real Vietnamese typography.
Under-used on Awwwards in what I saw: 1, 3, 4, 5, 6 (none appeared in any tool result; only Đông Sơn/dragon and street signage did).

## Reading-panel rules drawn from the captures
- Story/hero on dark ornamented ground; reading on a plain paper-toned panel (Mâm Cơm recipe section is the pattern).
- Display caps with full diacritics are fine; lowercase Vietnamese in a body face needs generous line-height (>=1.6) so marks do not collide.
- Make decorative text ornaments `aria-hidden`; keep real Vietnamese/English text selectable.
