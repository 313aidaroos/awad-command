"use client";

import { useEffect, useState } from "react";
import { COMMAND_PROD_ORIGIN, walletDeepLink } from "@/lib/walletEmbed";

/** Allowlisted return target. Pass the request origin so the first paint matches the host. */
export function useWalletDeepLink(initialOrigin = COMMAND_PROD_ORIGIN): string {
  const [origin, setOrigin] = useState(initialOrigin);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return walletDeepLink(origin);
}
