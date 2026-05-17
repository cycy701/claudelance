import { http, createConfig, injected } from "wagmi";
import { celoSepolia, celoMainnet } from "@/lib/chain";

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celoMainnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [celoSepolia.id]: http(),
    [celoMainnet.id]: http(),
  },
});

export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.ethereum?.isMiniPay);
}
