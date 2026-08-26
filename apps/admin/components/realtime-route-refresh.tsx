"use client";

import { createRealtimeInvalidationChannel, type RealtimePostgresChange } from "@attendance/shared";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export function RealtimeRouteRefresh({
  channelName,
  changes,
}: {
  channelName: string;
  changes: readonly RealtimePostgresChange[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!changes.length) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const subscription = createRealtimeInvalidationChannel({
      client: supabase,
      channelName,
      changes,
      onInvalidate: () => {
        startTransition(() => {
          router.refresh();
        });
      },
    });

    return () => {
      void subscription.remove();
    };
  }, [channelName, changes, router, startTransition]);

  return null;
}
