export const externalLinks = {
  discord: 'https://discord.gg/TBq62DysV',
  youtube: 'https://www.youtube.com/@mlen_community',
  linkedin: 'https://www.linkedin.com/company/machine-learning-engineering-network/about',
} as const;

export const socialLinks = [
  {
    label: 'YouTube',
    icon: 'youtube',
    href: externalLinks.youtube,
    description: 'Talks and community recordings',
  },
  {
    label: 'LinkedIn',
    icon: 'linkedin',
    href: externalLinks.linkedin,
    description: 'Professional updates',
  },
] as const;
