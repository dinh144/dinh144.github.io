/**
 * Site-wide settings shared by the hub and every theme.
 * The blog is called "dean" (reads like "Đinh"); the author and the GitHub handle stay dinh144.
 */
export const SITE = {
  origin: 'https://dinh144.github.io',
  name: 'dean',
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
