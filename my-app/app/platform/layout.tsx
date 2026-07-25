import type { Metadata } from "next";

import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Platform console",
  description: "Super Admin platform console for tenant management, billing, and system settings.",
  path: "/platform",
});

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
