import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { SmartphoneIcon } from "lucide-react";

import { getMobileAppDownloadUrl } from "@/lib/mobile-app-link";

export async function MobileAppDownloadQr() {
  const downloadUrl = getMobileAppDownloadUrl();
  if (!downloadUrl) return null;

  const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
    margin: 1,
    width: 160,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-white">
          <Image
            src={qrDataUrl}
            alt="QR code to download the CheckIn mobile app"
            width={160}
            height={160}
            unoptimized
            className="size-36 sm:size-40"
          />
        </div>
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            <SmartphoneIcon className="size-3.5" />
            Mobile app
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Scan to download the app
          </p>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Employees can punch in, view shifts, and apply for leave from the mobile app using
            the same account credentials.
          </p>
          <Link
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Open download link
          </Link>
        </div>
      </div>
    </div>
  );
}
