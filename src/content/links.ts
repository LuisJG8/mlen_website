export const externalLinks = {
  discord: 'https://discord.gg/mlen-placeholder',
  youtube: 'https://www.youtube.com/@mlen-placeholder',
  linkedin: 'https://www.linkedin.com/company/mlen-placeholder',
} as const;

export const socialLinks = [
  {
    label: 'YouTube',
    href: externalLinks.youtube,
    description: 'Talks and community recordings',
  },
  {
    label: 'LinkedIn',
    href: externalLinks.linkedin,
    description: 'Professional updates',
  },
] as const;
