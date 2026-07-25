import type { Metadata } from "next";

export const SITE_NAME = "CheckIn HR";
export const SITE_TAGLINE = "Employee management portal";
export const SITE_DESCRIPTION =
  "Manage employees, geofenced attendance, leave, shifts, and payroll from one modern HR admin portal.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://hrms.intoship.cloud";

const DEFAULT_KEYWORDS = [
  "HR portal",
  "employee management",
  "attendance tracking",
  "leave management",
  "payroll",
  "workforce directory",
  "CheckIn HR",
];

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: "CheckIn" }],
  creator: "CheckIn",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
};

type PageMetadataOptions = {
  title: string;
  description?: string;
  path?: string;
  /** Auth and account pages should stay out of search indexes. */
  noIndex?: boolean;
};

export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  noIndex = true,
}: PageMetadataOptions): Metadata {
  const url = path ? `${SITE_URL}${path}` : SITE_URL;

  return {
    title,
    description,
    alternates: path ? { canonical: url } : undefined,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
    },
    twitter: {
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
  };
}
