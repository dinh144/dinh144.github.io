# Agent avatars and AI mascots, 2026: decision report for the "dean" logo

Date: 2026-11-10. Scope: the 2026 agent-avatar trend, open-source libraries, motion patterns, legal/brand risk, criticism, and a recommendation for a blob character with two pill eyes and the owner's thick glasses. Not legal advice. Facts are cited inline; items marked "not found" were searched for and not confirmed.

## Overview

| Who | Character | Look | Motion / render | Brand guidelines |
|---|---|---|---|---|
| xAI / SpaceXAI, Grok Bot (11 Aug 2026) | Blob shapes with big orb/cylindrical eyes | One solid shape, white eyes, shape-morphing | "Entirely made in code", every state/shape/expression morphs smoothly (Benji Taylor, built with Grok Build). Renderer not stated. | Brand guidelines cover the Grok/SpaceXSI marks and logos, not the avatar specifically |
| OpenAI dots (29 Sep 2026) | Colored blobs with accessories: triangle with glasses or bow tie, frog with bow tie, cloud with beret, heart in sunglasses, ring default | Soft, neon, Pixar-like, mostly mouthless | Landing hero is a 3D canvas that morphs a ring into characters with squash, bounce, rotation. Animated cues show when an agent works. | Not found |
| Codex Pets (1 May 2026) | 8 built-in pixel-art pets, `/hatch` makes one from any image | Pixel-art sprites | Floating overlay with status bubbles | Not found |
| Meta Muse "Jolly" (8 Sep 2026) | Fuzzy, egg-shaped, rosy cheeks, toothless grin | Plush toy | Blinks, waves, types on a keyboard while working | Not found (Meta did not answer press questions) |
| Pickle (Oct 2026) | Purple creature with big eyes (Gummy) | Pixar/Disney-like | 3D | Not found |
| Anthropic Clawd | Pixel-art orange crab | Retro terminal | Pixel sprite | Not found |
| Microsoft Mico | Yellow smiling blob | Expressive blob | Reacts live to speech; pulled from Copilot voice Aug 2026 | Not found |
| Apple "Little Finder Guy" | Blue-and-white figure, oversized head | Finder-icon derived | Social video only | Not found |
| Google | Android robot, personalizable | Existing mascot | n/a | n/a |

Sources: Benji Taylor launch https://posts.design/benji-taylor-had-a-lot-of-fun-animating-2026-08-11 ; Fast Company on dots https://www.fastcompany.com/91615068/openai-dots-agent-crew-of-friendly-mascots ; 60fps.design on dots hero https://60fps.design/appsites/openai-dots-intro-mascot-animation ; Digital Trends on Codex Pets https://www.digitaltrends.com/computing/openais-codex-now-has-a-tiny-ai-pet-that-keeps-you-updated-while-you-code/ ; Axios on Jolly https://www.axios.com/2026/09/25/ai-doom-meta-muse-mascot ; Morningstar (Pickle, Clawd, Grok Bot) https://www.morningstar.com/news/marketwatch/2026100398/the-next-big-ai-battle-is-all-about-cuteness ; Verge on Mico https://www.theverge.com/tech/979871/microsoft-copilot-mico-retired ; BBC on Apple, Google, Microsoft https://www.bbc.com/news/articles/c99l1zzp8xzo

## 1. Big-company agent mascots

**Grok Bot.** Fast Company describes "shapes with giant, orb-like eyes" (https://www.fastcompany.com/91620091/big-tech-is-cutewashing-its-ai-agents); Morningstar says users pick from "blob-like avatars with cylindrical eyes"; Business Insider reports users nicknamed a teal one "Groklet" (https://www.businessinsider.com/meta-muse-jolly-ai-mascots-cuteness-2026-10). Benji Taylor credits the original icon design to four named colleagues and says the animation is made in code with no After Effects (https://www.24vids.com/video/had-a-lot-of-fun-animating-our-new-grok-bot-icon-its-entirely-made-in-code-p-tw-2087227155076046995). The reverse-engineering in bloub (below) measured the reference: one filled black shape, two white eyes leaning about 26 degrees, a perfect-circle body, exponential ease-outs with no overshoot, and "the life is gaze drift and blinking" (https://github.com/jeremy-prt/bloub). That last point is the useful lesson: Grok Bot's motion is restrained and non-springy.

**OpenAI dots.** Platformer: a dot can be "as simply as a colored ring", with jollier alternatives such as a hexagon in a beret or a heart in sunglasses (https://www.platformer.news/openai-dots-agents-devday-2026/). HuffPost names Iggy, Felipe, Jojo, Todd and Alfred, in neon colors with sunglasses and bow ties (https://www.huffpost.com/entry/meta-openai-jolly-dots-cute_n_6abffc42e4b02a789b35b0e3). Fortune: OpenAI built them with external partners, drawing on Codex Pets, after exploring "abstract shapes, recognizable objects, and different materials", settling on "a flexible system of shapes, colors, and accessories"; names and looks tell agents apart in a shared workspace; animated cues show when an agent is working (https://fortune.com/2026/10/02/meta-openai-ai-agent-mascots-jolly-dots-trust/). Simon Willison notes the UI "does look very Muse-like" (https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/). The "yellow triangle with glasses" is one of the hero variants (60fps.design link above). Brand guidelines for dots: not found.

**Muse / Jolly.** Designed by Muse product design lead Alex Cornell; the character grew from the problem of showing what a background agent is doing; users can customize name, look, and matching animations (Axios link above). Business Insider calls it a "slightly rotund, plush creature" that can wear headphones while "working".

**Mico (counter-example).** Microsoft's AI team hired Psyop and, after "hundreds of directions", chose "not the most complex, but the most legible", a form "defined not by fixed features, but by behavior" (https://www.psyop.com/work/microsoft-ai-mico). Less than a year later Microsoft removed it from Copilot voice (GeekWire: https://www.geekwire.com/2026/farewell-mico-microsofts-cute-little-ai-blob-is-going-the-way-of-bob/). A blob alone did not hold a brand.

## 2. Open-source libraries (stats pulled from `gh api`, 2026-11-10)

| Repo | Stars | Licence | Last push | Tech | States | Originality |
|---|---|---|---|---|---|---|
| jeremy-prt/bloub | 1,953 | MIT | 2026-08-17 | Vue 3, TS, SVG, no animation lib | 14 morph states, eyes as mask holes, timeline editor, SVG/PNG/GIF/MP4 export | Imitative: "recreates the x.ai bot avatar... The MIT licence covers the code... not the design it imitates." |
| dominikscholz/open-bot-avatar | 322 | MIT | 2026-11-10 | TS; one SVG path plus eye positions as JSON; canvas or SVG; `reducedMotion: "system"` | Moods, gaze | Generic spec, original-friendly |
| CX-ArtLab/BoopFace | 81 | MIT | 2026-11-08 | Vanilla JS web component, pure SVG, 188 skins | idle, thinking, waiting, done, failed; squeeze/drag; `motion=auto/reduce/full` | Own robot character; README: MIT does not transfer "character identity or visual identity". Lists Grok Bot and dots as intended hosts. |
| 0oooh/open-mascot-studio | 10 | MIT | 2026-08-19 | JSON definition, SVG, browser and React Native | Expressions, composable motion | Self-described "Grok-bot-like" |
| victoriawu-77/blob-atelier | 9 | MIT | 2026-10-23 | One HTML file, inline SVG filters, three.js for 3D animals | 8 agent states, breathing, blink, cursor follow, poke squash | Own look (mouthless blobs, plush animals) |
| zeeli-dev/agent-avatar | not queried | npm package, licence badge | n/a | Zero-dep web component, 24 characters, 22 kB gzip | idle, working, attention, done | Original cast; "reads at 16px", `prefers-reduced-motion` becomes still; lite mode at 32 px or less |
| Eyadkelleh/Grok_bot | 6 | none declared | 2026-10-11 | Vue SVG studio | Parity-tested against bloub | Derivative of a derivative; no licence, avoid |
| Mascot Engine (Rive) | n/a | Commercial studio, not an OSS library; small MIT starters (rive-ai-avatar-starter, 0 stars) | 2026-09 | Rive state machines, ViewModel data binding | Idle, listening, thinking, speaking, error, plus gaze | Paid custom work |

Sources: https://github.com/jeremy-prt/bloub , https://github.com/DominikScholz/open-bot-avatar , https://github.com/CX-ArtLab/BoopFace , https://github.com/0oooh/open-mascot-studio , https://github.com/victoriawu-77/blob-atelier , https://github.com/zeeli-dev/agent-avatar , https://avatars.zeeli.dev/ , https://github.com/Eyadkelleh/Grok_bot , https://mascotengine.com/docs/

Take-away: bloub is the one explicitly labelled as imitation, and it carries the "MIT covers code, not the design" disclaimer. For a logo, use libraries as references for engine design (pure function of time, reduced-motion, state contracts), not as a source of silhouette or eye geometry.

## 3. Design and motion patterns

- **Shape language.** One flat solid silhouette, no outline, eyes as cut-outs or a contrasting fill. Soft geometry signals approachability; the system is the shape set, not a single drawing (OpenAI: "a flexible system of shapes, colors, and accessories").
- **Eyes.** Two capsules ("pill eyes") are the Grok Bot signature; bloub measured them at about 26 degrees lean. Eyes carry nearly all the emotion, so tilt, height and squash are the expression channels.
- **Idle.** Grok Bot idle is gaze drift plus blinking, with no float (bloub). Mascot Engine suggests "low-frequency breathing, occasional blinking, minimal visual noise" (https://dev.to/uianimation/build-a-state-aware-ai-agent-mascot-with-rive-and-react-lhf).
- **States.** A shared contract: idle, listening, thinking/working, waiting (needs input), done, error. Zeeli collapses to four with colour plus badge so state reads at 16 px. Keep persistent states separate from one-shot events (celebrate); the app owns state, the character only visualizes it (dev.to link). Do not animate a state the page cannot know ("understanding").
- **Squash and stretch.** Used for poke and transitions (blob-atelier, OpenAI hero). Grok Bot's measured ease-outs have no overshoot, so choose spring or ease deliberately; it is a visible differentiator.
- **Pointer follow.** Eyes track the cursor with a clamped range (blob-atelier, open-bot-avatar `gaze`, Mascot Engine `lookX/lookY`).
- **Reduced motion.** open-bot-avatar `reducedMotion: "system"`; Zeeli renders a still image; BoopFace `motion=reduce`. This matches the blog's own motion contract (static page in reading mode and under `prefers-reduced-motion`).
- **16 px legibility.** Zeeli claims state reads at 16 px via colour, face and badge, and uses a lite mode at 32 px or less. For the favicon, drop glasses detail to two thick bars with pill eyes visible, or ship a separate simplified glyph; treat that as a design hypothesis to test, not a sourced fact.
- **Engine hygiene.** `sample(t)` as a pure function of time makes frozen frames, tests and screenshots deterministic (bloub architecture).

## 4. Legal and brand risk (practical picture, not legal advice)

- **Grok.** SpaceXSI claims rights in "SpaceXSI", "Grok", combinations and logos, and forbids using its marks "in or as part of your marks" or adding things nearby that create a new mark (https://x.ai/legal/brand-guidelines). The avatar is not named in those guidelines; whether it is a registered mark was not found. A near copy (circular/blob body, two slanted white capsule eyes, black on plain ground) invites a confusion or false-association claim. Do not use Grok or Bot in names or filenames.
- **OpenAI dots.** No brand guidelines found. The name is itself contested: Business Insider and a trademark practitioner report prior DOT/DOTS filings and confusion (https://www.businessinsider.com/openai-dots-name-causing-tons-confusion-spacexai-grok-cant-wait-2026-9 ; https://www.linkedin.com/posts/vince-merenda-565546235_ip-devday-trademark-activity-7512871383484383233-3UYH). A glasses-wearing blob is the exact variant OpenAI shows; "character with glasses" is an idea, but a colored blob plus round or triangular glasses plus a bow tie reads as a dot.
- **How the law frames it.** Character copyright needs stable, specific, distinctive traits; "color represents a mood" style ideas were denied protection (Daniels v. Disney), while well-delineated characters are enforceable (DC Comics v. Towle; Disney v. MiniMax, 2026) (https://www.apslaw.com/innovators-springboard/2026/10/22/they-can-copy-your-model-they-cant-copy-your-face-layering-design-patents-copyright-and-trade-dress-across-the-input-model-and-output-of-an-ai-platform/). Trade dress needs distinctiveness, non-functionality and likelihood of confusion; look-and-feel copying is "in the blast radius" (https://www.afslaw.com/perspectives/alerts/ai-software-clones-raise-trademark-and-trade-dress-issues-not-just-copyright). Mascots protect only when distinctive and source-identifying; generic avatars are "unprotectable" for the copier and the copied alike (Law360 PDF https://marketingstorageragrs.blob.core.windows.net/webfiles/Law360-Securing-IP-Protection-For-AI-Avatars.pdf).
- **Practical risk.** A personal blog logo is low enforcement risk, but the real cost is being read as a Grok Bot clone, and the library licences do not clear the design.
- **Stay distinct.** Different silhouette (not a circle), different eye geometry (not slanted capsules on black), no bow tie, colour from the blog palette, a signature prop (the owner's glasses, hair, tea) and a motion personality of your own. Never name it Grok, Bot, Dot or Pickle. Do not start from bloub's measured constants. Keep a dated record of the design process.

## 5. Criticism and reception

- **Cutewashing.** Fast Company: agents converge on "cute little guys", and designers say it is "less about being original and more about being instantly legible and trustworthy at scale"; backlash risk is flagged (https://www.fastcompany.com/91620091/big-tech-is-cutewashing-its-ai-agents). The Conversation: cuteness "can lower skepticism" so people grant broad permissions (https://theconversation.com/ai-agents-with-friendly-faces-and-adorable-bodies-can-distract-you-from-serious-risks-294339). Fortune, HuffPost and WSJ report similar expert concern (Fortune and HuffPost links above).
- **Sameness.** The Drum: "if every AI company ends up with its own cuddly creature, cuteness quickly stops being distinctive" (https://www.thedrum.com/opinion/sian-conway-wood-the-psychology-behind-ai-s-cuteness-offensive). Fast Company's lineage: buttholes, then sparkles and gradients, now cute guys.
- **Dev-culture contrast.** The Drum calls Clawd's pixel strangeness a badge of belonging; Jolly is mainstream-soft.
- **Cliches to avoid.** Rosy cheeks, toothless smile, plush fuzz, neon gradients, "wave hello" pop-ups, a mascot that claims feelings, a Clippy-style interrupter, and a mascot promoting data access. Axios warns a mascot "can be prompted into any situation" (brand risk).

## 6. Recommendation

The blog is not a consumer agent asking for credit cards, so cutewashing criticism hits less, but sameness does. The owner's own cues are the differentiator.

1. **Character, not mascot-as-product.** A logo mark plus an occasional state indicator, not a chatbot face. It is the signature of an editorial blog, so it should behave like a printed sticker that happens to blink.
2. **Silhouette.** A solid ink (#1A1A1A) blob with a smooth helmet-hair bump (Morty-style) so the top is not a circle. Two pill eyes in #EDEDED, fully legible against ink, behind thick round glasses drawn as heavy ink rings in red #FF4949 or as a single red bridge line. Red used sparingly is the ownable accent and sits well in the Huy Phan Vol.2 palette.
3. **Glasses as identity.** Glasses are the only element shared with OpenAI's glasses dot, so make them unmistakably the owner's: thick, slightly oversized, with a heavy bridge, and give them their own animation (slide down the nose when sleepy, push-up gesture, lens glint on "done"). Do not add a bow tie or beret.
4. **Differentiating motion.** Slow and sleepy rather than bouncy: long blink, turtle-pace head tilt, no constant float. Secondary props as state skins: tea steam for thinking, a book for reading, a cat tail flick for done. States: idle, reading, thinking, waiting, done, error (glasses askew, no joke).
5. **Contract.** Pure `sample(t)` engine, `motionAllowed()` gate, static pose in reading mode and `prefers-reduced-motion`, pointer-follow limited to the eyes, sound off. Page state drives it; never display a state the page cannot know.
6. **Favicon.** A separate 16 px glyph: ink blob, two light pill eyes, one red glasses bar. Test in light and dark tabs; verify with the screenshot pipeline.
7. **Process.** Draw it by hand from the owner's face and props, do not trace or import Grok Bot or dots geometry, and keep bloub, Grok_bot and open-mascot-studio as engine references only. If a library is used, pick one with an original design (open-bot-avatar, BoopFace engine ideas) and still replace the artwork.

## Sources

- https://posts.design/benji-taylor-had-a-lot-of-fun-animating-2026-08-11
- https://www.24vids.com/video/had-a-lot-of-fun-animating-our-new-grok-bot-icon-its-entirely-made-in-code-p-tw-2087227155076046995
- https://doomers.ai/launches/benji-taylor-lot-fun-animating
- https://openai.com/index/introducing-dots/
- https://www.fastcompany.com/91615068/openai-dots-agent-crew-of-friendly-mascots
- https://www.fastcompany.com/91620091/big-tech-is-cutewashing-its-ai-agents
- https://www.platformer.news/openai-dots-agents-devday-2026/
- https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/
- https://60fps.design/appsites/openai-dots-intro-mascot-animation
- https://fortune.com/2026/10/02/meta-openai-ai-agent-mascots-jolly-dots-trust/
- https://www.huffpost.com/entry/meta-openai-jolly-dots-cute_n_6abffc42e4b02a789b35b0e3
- https://www.businessinsider.com/meta-muse-jolly-ai-mascots-cuteness-2026-10
- https://www.axios.com/2026/09/25/ai-doom-meta-muse-mascot
- https://www.morningstar.com/news/marketwatch/2026100398/the-next-big-ai-battle-is-all-about-cuteness
- https://www.digitaltrends.com/computing/openais-codex-now-has-a-tiny-ai-pet-that-keeps-you-updated-while-you-code/
- https://www.wsj.com/tech/ai/tech-companies-roll-out-cuddly-mascots-to-ease-ai-anxiety-02e163fd
- https://www.bbc.com/news/articles/c99l1zzp8xzo
- https://www.theverge.com/tech/979871/microsoft-copilot-mico-retired
- https://www.geekwire.com/2026/farewell-mico-microsofts-cute-little-ai-blob-is-going-the-way-of-bob/
- https://www.psyop.com/work/microsoft-ai-mico
- https://theconversation.com/ai-agents-with-friendly-faces-and-adorable-bodies-can-distract-you-from-serious-risks-294339
- https://www.thedrum.com/opinion/sian-conway-wood-the-psychology-behind-ai-s-cuteness-offensive
- https://x.ai/legal/brand-guidelines
- https://www.businessinsider.com/openai-dots-name-causing-tons-confusion-spacexai-grok-cant-wait-2026-9
- https://www.linkedin.com/posts/vince-merenda-565546235_ip-devday-trademark-activity-7512871383484383233-3UYH
- https://www.apslaw.com/innovators-springboard/2026/10/22/they-can-copy-your-model-they-cant-copy-your-face-layering-design-patents-copyright-and-trade-dress-across-the-input-model-and-output-of-an-ai-platform/
- https://www.afslaw.com/perspectives/alerts/ai-software-clones-raise-trademark-and-trade-dress-issues-not-just-copyright
- https://marketingstorageragrs.blob.core.windows.net/webfiles/Law360-Securing-IP-Protection-For-AI-Avatars.pdf
- https://github.com/jeremy-prt/bloub , https://github.com/DominikScholz/open-bot-avatar , https://github.com/CX-ArtLab/BoopFace , https://github.com/0oooh/open-mascot-studio , https://github.com/victoriawu-77/blob-atelier , https://github.com/zeeli-dev/agent-avatar , https://avatars.zeeli.dev/ , https://github.com/Eyadkelleh/Grok_bot
- https://mascotengine.com/docs/ , https://dev.to/uianimation/build-a-state-aware-ai-agent-mascot-with-rive-and-react-lhf

## Gaps

Not found: rendering tech for Grok Bot, Jolly and Pickle; brand guidelines for dots or Jolly; Google or Apple agent avatars beyond Android and "Little Finder Guy"; star count for zeeli-dev/agent-avatar (not queried); any trademark filing on the Grok Bot avatar itself.
