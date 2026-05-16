import { http, createConfig } from "wagmi";
import { celoSepolia, celoMainnet } from "@/lib/chain";

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celoMainnet],
  transports: {
    [celoSepolia.id]: http(),
    [celoMainnet.id]: http(),
  },
});

export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).ethereum?.isMiniPay;
}