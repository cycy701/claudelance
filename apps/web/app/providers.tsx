"use client";

import * as React from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { DEFAULT_CHAIN_ID, chainById, supportedChains } from "@/lib/chain";
import { PrivyEnabledProvider } from "@/lib/wallet/auth";
import { wagmiConfig } from "@/lib/wallet/config";
import { TransactionToast } from "@/components/transaction-toast";

function getQueryClient() {
  let client: QueryClient | null = null;
  return () => {
    if (!client) {
      client = new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      });
    }
    return client;
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const privyConfig = React.useMemo<PrivyClientConfig>(
    () => ({
      loginMethods: ["wallet"],
      supportedChains: [...supportedChains],
      defaultChain: chainById(DEFAULT_CHAIN_ID) ?? supportedChains[0],
      appearance: {
        accentColor: "#22c55e",
        landingHeader: "Connect Claudelance",
        loginMessage: "Use a Celo wallet to post, claim, and settle bounties.",
        showWalletLoginFirst: true,
        walletChainType: "ethereum-only",
        walletList: ["detected_wallets", "metamask", "coinbase_wallet", "wallet_connect"],
      },
      embeddedWallets: {
        ethereum: {
          createOnLogin: "off",
        },
      },
    }),
    [],
  );

  const app = (
    <PrivyEnabledProvider enabled={Boolean(privyAppId)}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <TransactionToast />
      </ThemeProvider>
    </PrivyEnabledProvider>
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {privyAppId ? (
          <PrivyProvider appId={privyAppId} config={privyConfig}>
            {app}
          </PrivyProvider>
        ) : (
          app
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
