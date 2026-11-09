/**
 * Site-wide settings shared by the hub and every theme.
 * The blog name is still a placeholder: it gets picked after the design concept.
 */
export const SITE = {
  origin: 'https://dinh144.github.io',
  name: 'dinh144',
  author: 'dinh144',
  github: 'https://github.com/dinh144',
  repo: 'dinh144/dinh144.github.io',
  license: { content: 'CC BY 4.0', code: 'MIT' },
  /** Filled in once the giscus app is installed on the repo (ids come from giscus.app). */
  giscus: {
    repo: 'dinh144/dinh144.github.io',
    repoId: '',
    category: 'Comments',
    categoryId: '',
  },
  /** Analytics stay off in the lab; the winning theme turns them on with PUBLIC_ANALYTICS=on. */
  analytics: {
    goatcounterCode: '',
    clarityId: '',
  },
} as const;
