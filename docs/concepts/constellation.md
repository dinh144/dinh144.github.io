# Concept: Knowledge constellation (`constellation`)

## Idea
The blog as a night sky of what I know. Every post is a star (size = length, colour = type), topics are lines
between stars, series are named constellations. You browse by flying through it, and land in calm articles.

## Type (from canvas direction A)
- Display: Fraunces (opsz), Body: Source Serif 4 at ~20 px, UI: Inter, Code: JetBrains Mono.
  (Test Fraunces' optical sizes with stacked tone marks; fall back to Newsreader if they clip.)

## Palette
- Dark first: deep ink-blue night #0B1020, starlight #E8E4DA, muted #9AA3B5, accents warm gold #E9B86A and
  oxblood #E59A8B for highlights.
- Light ("dawn"): #FAF8F2, ink #22251E, accent #8A2B2B.

## Signature moments
- Home hero: a Three.js star field built from the real post data (core `getPosts` + `tagsOf`); stars drift;
  hovering/tapping a star shows the title; tag lines glow; clicking flies the camera to the star and transitions
  into the article. A plain list is always present below (and is the whole page in reading/reduced mode).
- Series page: its parts drawn as a named constellation.
- Tags page: the graph filtered to one topic.
- Article: calm serif reading column with the star of this post fading into the header; a tiny mini-map of
  neighbouring posts at the end.

## References
guillaumecolombel.fr and leoparpeix.com (WebGL scenes, transitions), gionatannese.com (Three.js + GSAP).
