"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Loader2, UserCheck } from "lucide-react";
import { erc20Abi, isAddress, keccak256, parseUnits, stringToHex, type Hash } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { useTransactionToast } from "@/components/transaction-toast";
import { DEFAULT_CHAIN_ID } from "@/lib/chain";
import { coreAbi, getDeployment } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const TOKENS = [
  { symbol: "cUSD", decimals: 18, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  { symbol: "CELO", decimals: 18, className: "border-amber-500/30 bg-amber-500/10 text-amber-500" },
  { symbol: "USDC", decimals: 6, className: "border-sky-500/30 bg-sky-500/10 text-sky-500" },
] as const;

type TokenSymbol = (typeof TOKENS)[number]["symbol"];

export default function HirePage() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [worker, setWorker] = React.useState("");
  const [token, setToken] = React.useState<TokenSymbol>("cUSD");
  const [amount, setAmount] = React.useState("3");
  const [stake, setStake] = React.useState("0.1");
  const [deadlineDays, setDeadlineDays] = React.useState("7");
  const [repoUrl, setRepoUrl] = React.useState("");
  const [issueUrl, setIssueUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<Hash | null>(null);
  const activeChainId = hasDeployment(chainId) ? chainId : DEFAULT_CHAIN_ID;
  const deployment = getDeployment(activeChainId);

  useTransactionToast(txHash, {
    chainId: activeChainId,
    pendingMessage: "Posting direct hire",
    confirmedMessage: "Direct hire posted",
  });

  const submit = async () => {
    setError(null);
    setTxHash(null);
    if (!isConnected || !address) return setError("Connect a wallet first.");
    if (!isAddress(worker)) return setError("Enter a valid worker address.");
    if (!repoUrl.startsWith("https://github.com/")) return setError("Enter a valid GitHub repo URL.");
    if (!issueUrl.startsWith("https://github.com/")) return setError("Enter a valid GitHub issue URL.");
    if (Number(amount) <= 0 || Number(stake) <= 0) return setError("Amount and stake must be greater than zero.");
    if (Number(deadlineDays) < 1 || Number(deadlineDays) > 14) return setError("Deadline must be 1-14 days.");

    setBusy(true);
    try {
      if (chainId && !hasDeployment(chainId)) await switchChainAsync({ chainId: DEFAULT_CHAIN_ID });
      const targetChainId = hasDeployment(chainId) ? chainId : DEFAULT_CHAIN_ID;
      const targetDeployment = getDeployment(targetChainId);
      const selectedToken = TOKENS.find((entry) => entry.symbol === token) ?? TOKENS[0];
      const tokenAddress = targetDeployment.tokens[selectedToken.symbol];
      const parsedAmount = parseUnits(amount, selectedToken.decimals);
      const parsedStake = parseUnits(stake, selectedToken.decimals);
      const deadline = BigInt(Math.round(Number(deadlineDays) * 86_400));
      const requirementsHash = keccak256(
        stringToHex(JSON.stringify({ targetWorker: worker, repoUrl, issueUrl, amount, stake, token })),
      );

      const approveHash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [targetDeployment.core, parsedAmount],
        chainId: targetChainId,
      });
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });

      const postHash = await writeContractAsync({
        address: targetDeployment.core,
        abi: coreAbi,
        functionName: "postDirectHire",
        args: [tokenAddress, worker, 0, repoUrl, issueUrl, requirementsHash, parsedAmount, parsedStake, deadline],
        chainId: targetChainId,
      });
      setTxHash(postHash);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to post direct hire.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <section className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16">
        <Link href="/post" className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to post
        </Link>

        <GlassCard className="space-y-5 !p-6">
          <div>
            <p className="text-sm font-medium text-primary">Direct hire</p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Target one worker</h1>
            <p className="mt-2 text-sm text-muted-foreground">Post a single-slot bounty that only the chosen ERC-8004 worker can claim.</p>
          </div>

          <input value={worker} onChange={(event) => setWorker(event.target.value)} placeholder="Worker wallet address" className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-mono outline-none focus:border-primary" />

          <div className="grid grid-cols-3 gap-2">
            {TOKENS.map((entry) => (
              <button key={entry.symbol} onClick={() => setToken(entry.symbol)} className={cn("rounded-xl border px-3 py-3 text-sm font-medium", token === entry.symbol ? entry.className : "border-border text-muted-foreground")}>
                {entry.symbol}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.1" placeholder="Amount" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={stake} onChange={(event) => setStake(event.target.value)} type="number" min="0" step="0.01" placeholder="Stake" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} type="number" min="1" max="14" placeholder="Days" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>

          <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/owner/repo" className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-mono outline-none focus:border-primary" />
          <input value={issueUrl} onChange={(event) => setIssueUrl(event.target.value)} placeholder="https://github.com/owner/repo/issues/1" className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-mono outline-none focus:border-primary" />

          <Button size="lg" className="w-full" disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Post direct hire
          </Button>

          <p className="text-xs text-muted-foreground">
            Escrows to {deployment.core.slice(0, 6)}...{deployment.core.slice(-4)} on chain {activeChainId}.
          </p>
          {error ? <p className="break-words text-xs text-destructive">{error}</p> : null}
          {txHash ? <p className="break-all text-xs text-muted-foreground"><Coins className="mr-1 inline h-3 w-3" />{txHash}</p> : null}
        </GlassCard>
      </section>
    </main>
  );
}

function hasDeployment(chainId: number | undefined): chainId is number {
  if (!chainId) return false;
  try {
    getDeployment(chainId);
    return true;
  } catch {
    return false;
  }
}
