"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { Download, Expand, Maximize, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDateTimeInTimeZone } from "@attendance/shared";

function sanitizeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function QrDisplay({
  token,
  organizationName,
  organizationCode,
  activityName,
  timezone,
  validFrom,
  expiresAt,
}: {
  token: string;
  organizationName: string;
  organizationCode: string;
  activityName: string;
  timezone: string;
  validFrom: string;
  expiresAt: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(`attendance://${token}`, {
      margin: 2,
      width: 320,
      color: {
        dark: "#123b32",
        light: "#fffdf8",
      },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function downloadQr() {
    setDownloadError(null);
    try {
      const url =
        dataUrl ??
        (await QRCode.toDataURL(`attendance://${token}`, {
          margin: 2,
          width: 640,
          color: { dark: "#123b32", light: "#fffdf8" },
        }));
      const anchor = document.createElement("a");
      const filename = `activity-log-${sanitizeFilenamePart(organizationCode)}-${sanitizeFilenamePart(activityName)}-qr.png`;
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      setDownloadError("Unable to download the QR image.");
    }
  }

  const qrContent = (
    <div className="flex flex-col items-center gap-4">
      {dataUrl ? (
        <div className="rounded-[26px] border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <Image src={dataUrl} alt="Activity QR code" width={288} height={288} className="rounded-2xl" unoptimized />
        </div>
      ) : (
        <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--muted)]">
          Generating QR...
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="mt-5 grid gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Created</span>
            <span className="font-mono text-xs text-[var(--foreground)]">{formatDateTimeInTimeZone(validFrom, timezone)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[var(--muted)]">Expires</span>
            <span className="font-mono text-xs text-[var(--foreground)]">{formatDateTimeInTimeZone(expiresAt, timezone)}</span>
          </div>
        </div>

        {qrContent}

        {downloadError ? <p className="text-sm text-[var(--danger)]">{downloadError}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFullscreen(true)} className="admin-button-secondary">
            <Expand className="h-4 w-4" />
            Display Full Screen
          </button>
          <button type="button" onClick={downloadQr} className="admin-button-secondary">
            <Download className="h-4 w-4" />
            Download QR
          </button>
        </div>
      </div>

      {fullscreen ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--sidebar)] text-white">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.4)]">Activity Log</p>
              <p className="mt-1 text-base font-semibold text-white">{organizationName}</p>
              <p className="text-sm text-[rgba(255,255,255,0.6)]">{activityName}</p>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-xl p-2 text-[rgba(255,255,255,0.7)] transition hover:bg-white/10 hover:text-white"
              aria-label="Close fullscreen"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-6 pb-10">
            {dataUrl ? (
              <div className="rounded-[32px] bg-white p-8 shadow-2xl">
                <Image src={dataUrl} alt="Activity QR code" width={420} height={420} className="rounded-2xl" unoptimized />
              </div>
            ) : (
              <p className="text-[rgba(255,255,255,0.5)]">Generating QR...</p>
            )}
          </div>
          <div className="pb-8 text-center">
            <button type="button" onClick={() => setFullscreen(false)} className="admin-button-secondary mx-auto inline-flex w-auto">
              <Maximize className="h-4 w-4" />
              Exit Fullscreen
            </button>
            <p className="mt-3 text-xs text-[rgba(255,255,255,0.4)]">Valid until {formatDateTimeInTimeZone(expiresAt, timezone)}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
