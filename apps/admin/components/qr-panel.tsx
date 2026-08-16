"use client";

import Image from "next/image";
import { DEFAULT_QR_TTL_SECONDS } from "@attendance/shared";
import { Expand, Info, QrCode, RefreshCw, ShieldOff, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

interface QrSessionPayload {
  id: string;
  token: string;
  valid_from: string;
  expires_at: string;
}

export function QrPanel() {
  const [session, setSession] = useState<QrSessionPayload | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  async function generateQr() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: rpcError } = await supabase.rpc("create_qr_session", {
        ttl_seconds: DEFAULT_QR_TTL_SECONDS,
      });

      if (rpcError) {
        throw rpcError;
      }

      const nextSession = Array.isArray(data) ? data[0] : data;
      if (!nextSession) {
        throw new Error("Unable to generate a QR session.");
      }

      const payload = `attendance://${nextSession.token}`;
      const dataUrl = await QRCode.toDataURL(payload, {
        margin: 2,
        width: 280,
        color: {
          dark: "#123b32",
          light: "#fffdf8",
        },
      });

      setSession(nextSession);
      setSecondsLeft(getSecondsRemaining(nextSession.expires_at));
      setQrDataUrl(dataUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to generate QR.");
    } finally {
      setLoading(false);
    }
  }

  async function revokeCurrentQr() {
    if (!session) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("revoke_qr_session", {
      session_id: session.id,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSession(null);
    setQrDataUrl(null);
    setSecondsLeft(0);
  }

  async function deleteCurrentQr() {
    if (!session) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("delete_qr_session", {
      session_id: session.id,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSession(null);
    setQrDataUrl(null);
    setSecondsLeft(0);
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    const tick = () => {
      setSecondsLeft(getSecondsRemaining(session.expires_at));
    };

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [session]);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
      <div className="admin-card p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="admin-eyebrow">Live attendance QR</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Today&apos;s scan code</h2>
          </div>
          <span className={`admin-chip ${session ? "admin-chip-success" : "admin-chip-soft"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${session ? "bg-[var(--accent)]" : "bg-[#9da3ad]"}`} />
            {session ? "Active" : "Not generated"}
          </span>
        </div>

        <div className="mt-6 flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
          {qrDataUrl ? (
            <>
              <div className="rounded-[26px] border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                <Image
                  src={qrDataUrl}
                  alt="Attendance QR code"
                  width={288}
                  height={288}
                  className="rounded-2xl"
                  unoptimized
                />
              </div>
              <button type="button" className="admin-button-secondary mt-5">
                <Expand className="h-4 w-4" />
                Display full screen
              </button>
            </>
          ) : loading ? (
            <p className="text-sm text-[var(--muted)]">Generating QR...</p>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eeebe3] text-[#9aa0a8]">
                <QrCode className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">No QR code generated</p>
                <p className="mt-1 max-w-xs text-sm leading-7 text-[var(--muted)]">
                  Generate today&apos;s QR to start attendance scanning from the mobile app.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm">
          <span className="text-[var(--muted)]">Expires in</span>
          <span className="font-mono text-lg font-semibold text-[var(--foreground)]">{formatDuration(secondsLeft)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <section className="admin-card p-5">
          <p className="admin-eyebrow">QR information</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Status</dt>
              <dd className={`font-semibold ${session ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {session ? "Active" : "Not generated"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Valid from</dt>
              <dd className="font-mono text-xs text-[var(--foreground)]">{session ? formatDateTime(session.valid_from) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Expires at</dt>
              <dd className="font-mono text-xs text-[var(--foreground)]">{session ? formatDateTime(session.expires_at) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Validity</dt>
              <dd className="text-[var(--foreground)]">12 hours</dd>
            </div>
          </dl>
        </section>

        <section className="admin-card p-5">
          <p className="admin-eyebrow">Actions</p>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => generateQr().catch(() => undefined)}
              disabled={loading}
              className="admin-button w-full justify-start disabled:cursor-not-allowed disabled:opacity-70"
            >
              {session ? <RefreshCw className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
              {loading ? "Generating..." : session ? "Regenerate QR" : "Generate today's QR"}
            </button>
            <button
              type="button"
              onClick={() => revokeCurrentQr().catch(() => undefined)}
              disabled={!session}
              className="admin-button-warning w-full justify-start disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldOff className="h-4 w-4" />
              Remove validity
            </button>
            <button
              type="button"
              onClick={() => deleteCurrentQr().catch(() => undefined)}
              disabled={!session}
              className="admin-button-danger w-full justify-start disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Delete QR
            </button>
          </div>
        </section>

        <section className="admin-card p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Generation and scan guidance</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Generate a QR when attendance opens for the day. Creating a new one automatically invalidates any previous active code.
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            People must already be signed in on mobile before scanning the token for a trusted attendance log.
          </p>
        </section>

        <div className="admin-card-flat flex gap-2.5 px-4 py-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
          <p className="text-xs leading-6 text-[var(--muted)]">
            QR codes remain valid for {Math.floor(DEFAULT_QR_TTL_SECONDS / 3600)} hours by default. Removing validity stops new scans immediately without deleting the session record.
          </p>
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-[#fecaca] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return "0s";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes || hours) {
    parts.push(`${minutes}m`);
  }

  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getSecondsRemaining(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}
