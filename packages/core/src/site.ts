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
  /** Announcements category: only the giscus app (and the owner) can open threads. Needs the giscus GitHub app installed on the repo. */
  giscus: {
    repo: 'dinh144/dinh144.github.io',
    repoId: 'R_kgDOVn33Hw',
    category: 'Announcements',
    categoryId: 'DIC_kwDOVn33H84DKteF',
  },
  /** Analytics stay off in the lab; the winning theme turns them on with PUBLIC_ANALYTICS=on. */
  analytics: {
    goatcounterCode: '',
    clarityId: '',
  },
} as const;
