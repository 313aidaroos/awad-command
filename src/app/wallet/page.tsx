import { headers } from "next/headers";
import { commandOriginFromRequest } from "@/lib/walletEmbed";
import { WalletRoom } from "@/app/wallet/WalletRoom";

export default async function WalletPage() {
  const h = await headers();
  const commandOrigin = commandOriginFromRequest(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto"),
  );
  return <WalletRoom commandOrigin={commandOrigin} />;
}
