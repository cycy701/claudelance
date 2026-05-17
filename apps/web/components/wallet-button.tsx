"use client";

import * as React from "react";
import { useConnectWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CheckCircle2, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivyEnabled } from "@/lib/wallet/auth";
import { isMiniPay } from "@/lib/wallet/config";

export function WalletButton() {
  const privyEnabled = usePrivyEnabled();

  if (privyEnabled) return <PrivyWalletButton />;
  return <WagmiWalletButton />;
}

function PrivyWalletButton() {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { wallets } = useWallets();
  const { disconnectAsync } = useDisconnect();
  const [isLoading, setIsLoading] = React.useState(false);

  const privyAddress = wallets[0]?.address ?? user?.wallet?.address;
  const address = wagmiAddress ?? privyAddress;

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      if (!authenticated) {
        login({ loginMethods: ["wallet"] });
      } else {
        connectWallet({ walletChainType: "ethereum-only" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (isConnected) await disconnectAsync();
    if (authenticated) await logout();
  };

  if ((authenticated || isConnected) && address) {
    return <ConnectedWalletPill address={address} onDisconnect={handleDisconnect} source="Privy" />;
  }

  return (
    <Button size="sm" onClick={handleConnect} disabled={!ready || isLoading} className="gap-2">
      <Wallet className="h-4 w-4" />
      {isLoading ? "Connecting..." : "Connect"}
    </Button>
  );
}

function WagmiWalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      if (isMiniPay()) {
        const injected = connectors.find((c) => c.id === "injected" || c.name.includes("MiniPay"));
        if (injected) await connectAsync({ connector: injected });
      } else {
        const injected = connectors.find((c) => c.type === "injected" || c.id === "injected");
        if (injected) await connectAsync({ connector: injected });
      }
    } catch {}
    setIsLoading(false);
  };

  const handleDisconnect = async () => {
    await disconnectAsync();
  };

  if (isConnected && address) {
    return <ConnectedWalletPill address={address} chainId={chainId} onDisconnect={handleDisconnect} />;
  }

  return (
    <Button size="sm" onClick={handleConnect} disabled={isLoading} className="gap-2">
      <Wallet className="h-4 w-4" />
      {isLoading ? "Connecting..." : "Connect"}
    </Button>
  );
}

function ConnectedWalletPill({
  address,
  chainId,
  onDisconnect,
  source,
}: {
  address: string;
  chainId?: number;
  onDisconnect: () => Promise<void>;
  source?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-foreground sm:inline-flex">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        {truncate(address)}
        {source ? <span className="font-sans text-muted-foreground">{source}</span> : null}
        {chainId ? <span className="font-sans text-muted-foreground">{chainId}</span> : null}
      </span>
      <Button size="sm" variant="ghost" onClick={onDisconnect} aria-label="Disconnect wallet">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
