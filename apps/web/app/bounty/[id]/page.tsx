"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ArrowLeft, Check, Coins, Copy, ExternalLink, Loader2, Upload, Users } from "lucide-react";
import { toast } from "sonner";

import { chainById, DEFAULT_CHAIN_ID, celoSepolia } from "@/lib/chain";
import { deployments, coreAbi } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

interface Bounty {
  id: number;
  poster: string;
  amount: string;
  winner: string;
  stakeRequired: string;
  token: string;
  deadline: number;
  maxSlots: number;
  claimedSlots: number;
  bountyType: number;
  ciRequired: boolean;
  targetWorker: string;
  status: number;
  targetRepoUrl: string;
  instructionUrl: string;
}

const STATUS_LABELS = ["Open", "InProgress", "Resolved", "Cancelled"] as const;

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("API error"); return r.json(); });

export default function BountyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { address, chainId } = useAccount();
  const activeChainId = chainId ?? celoSepolia.id;
  const chain = chainById(activeChainId);
  const deployment = deployments[activeChainId as keyof typeof deployments];

  const { data, error, isLoading } = useSWR<Bounty>(`/api/bounty/${params.id}`, fetcher, { refreshInterval: 15000 });

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = React.useState<`0x${string}` | null>(null);
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const isPoster = address && data?.poster && address.toLowerCase() === data.poster.toLowerCase();
  const isClaimer = address && data ? true : false;
  const isOpen = data?.status === 0 || data?.status === 1;
  const canClaim = isOpen && address && !isPoster;

  const handleClaim = async () => {
    if (!deployment || !data) return;
    try {
      const hash = await writeContractAsync({
        abi: coreAbi,
        address: deployment.core,
        functionName: "claimSlot",
        args: [BigInt(data.id)],
      });
      setTxHash(hash);
      toast.success("Slot claimed!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg.slice(0, 100));
    }
  };

  const handlePickWinner = async () => {
    if (!deployment || !data) return;
    try {
      const hash = await writeContractAsync({
        abi: coreAbi,
        address: deployment.core,
        functionName: "pickWinner",
        args: [BigInt(data.id)],
      });
      setTxHash(hash);
      toast.success("Winner picked!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg.slice(0, 100));
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-20">
        <GlassCard className="!p-8">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </GlassCard>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-20">
        <GlassCard className="!p-8 text-center">
          <p className="text-destructive">Failed to load bounty #{params.id}</p>
          <Button variant="ghost" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back
          </Button>
        </GlassCard>
      </main>
    );
  }

  const statusLabel = STATUS_LABELS[data.status] ?? "Unknown";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-20">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <GlassCard className="!p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bounty #{data.id}</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {data.instructionUrl.split("/").pop()?.replace(/-/g, " ") ?? `Bounty #${data.id}`}
            </h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium border ${data.status === 2 ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-primary/10 text-primary border-primary/30"}`}>
            {statusLabel}
          </span>
        </div>

        {/* Issue link */}
        {data.instructionUrl && (
          <a href={data.instructionUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            View instruction <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Reward" value={`${(BigInt(data.amount) / 10n ** 16n).toString() / 100} CELO`} />
          <Stat label="Stake" value={`${(BigInt(data.stakeRequired) / 10n ** 16n).toString() / 100} CELO`} />
          <Stat label="Slots" value={`${data.claimedSlots}/${data.maxSlots}`} />
          <Stat label="Deadline" value={data.deadline ? new Date(data.deadline * 1000).toLocaleDateString() : "N/A"} />
        </div>

        {/* Poster info */}
        <div className="flex items-center gap-3 border-t border-white/10 pt-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-mono">
            {data.poster.slice(2, 6)}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Posted by</p>
            <button
              onClick={() => { navigator.clipboard.writeText(data.poster); toast.success("Copied!"); }}
              className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary"
            >
              {data.poster.slice(0, 10)}...{data.poster.slice(-6)}
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-white/10 pt-4 space-y-3">
          {isPoster && isOpen && (
            <Button size="lg" className="w-full" disabled={isPending || isWaiting} onClick={handlePickWinner}>
              {isPending || isWaiting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><Check className="mr-2 h-4 w-4" /> Pick Winner</>
              )}
            </Button>
          )}

          {canClaim && (
            <Button size="lg" variant="outline" className="w-full" disabled={isPending || isWaiting} onClick={handleClaim}>
              {isPending || isWaiting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Claiming...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Claim Slot</>
              )}
            </Button>
          )}

          {isClaimer && isOpen && (
            <Button size="lg" variant="secondary" className="w-full" onClick={() => router.push(`/post?bountyId=${data.id}`)}>
              <Upload className="mr-2 h-4 w-4" /> Submit PR
            </Button>
          )}

          {!address && (
            <p className="text-center text-sm text-muted-foreground">Connect your wallet to claim or submit.</p>
          )}

          {txHash && chain && (
            <a href={`${chain.blockExplorers?.default.url}/tx/${txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              View tx <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </GlassCard>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}