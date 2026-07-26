export type HelpWorkflow = {
  title: string;
  steps: string[];
};

export type HelpSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  steps?: string[];
  bullets?: string[];
  workflows?: HelpWorkflow[];
  callout?: string;
};

export type HelpModule = {
  slug: string;
  title: string;
  summary: string;
  appRoute?: string;
  keywords: string[];
  sections: HelpSection[];
  relatedSlugs?: string[];
};

export type HelpSearchResult = {
  slug: string;
  moduleTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  snippet: string;
  href: string;
};
