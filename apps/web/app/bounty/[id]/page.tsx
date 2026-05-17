"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle, Coins, ExternalLink, GitPullRequest, Loader2, Trophy, Users } from "lucide-react";
import { erc20Abi, formatUnits, isAddress, parseUnits, type Hash } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { DEFAULT_CHAIN_ID } from "@/lib/chain";
import { coreAbi, getDeployment } from "@/lib/contracts";
import { useTransactionToast } from "@/components/transaction-toast";
import { cn } from "@/lib/utils";

interface BountySubmission {
  worker: `0x${string}`;
  commitHash: `0x${string}`;
  submittedAt: string;
  ciPassed: boolean;
  stakeRefunded: boolean;
  prUrl: string;
  metadata: string;
}

interface BountyDetail {
  id: string;
  poster: `0x${string}`;
  amount: string;
  token: `0x${string}`;
  stakeRequired: string;
  deadline: string;
  maxSlots: number;
  claimedSlots: number;
  ciRequired: boolean;
  status: number;
  targetRepoUrl: string;
  instructionUrl: string;
  winner: `0x${string}`;
  claimers: `0x${string}`[];
  submissions: BountySubmission[];
}

const STATUS_LABELS: Record<number, string> = { 0: "Open", 1: "Resolved", 2: "Cancelled", 3: "Expired" };
const ZERO_HASH = `0x${"0".repeat(64)}` as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function BountyDetailPage({ params }: { params: { id: string } }) {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [bounty, setBounty] = React.useState<BountyDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<Hash | null>(null);
  const [prUrl, setPrUrl] = React.useState("");
  const [commitHash, setCommitHash] = React.useState("");
  const [winner, setWinner] = React.useState("");

  const activeChainId = hasDeployment(chainId) ? chainId : DEFAULT_CHAIN_ID;
  const deployment = getDeployment(activeChainId);
  const tokenMeta = getTokenMeta(bounty?.token, deployment.tokens);
  const bountyId = BigInt(params.id);

  useTransactionToast(txHash, {
    chainId: activeChainId,
    pendingMessage: "Bounty transaction pending",
    confirmedMessage: "Bounty transaction confirmed",
  });

  const refresh = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/bounty/${params.id}`, { headers: { accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load bounty");
        return r.json();
      })
      .then((data) => {
        setBounty(data);
        setWinner(data.submissions?.find((s: BountySubmission) => Number(s.submittedAt) > 0)?.worker ?? "");
        setError(null);
      })
      .catch(() => setError("Failed to load bounty"))
      .finally(() => setLoading(false));
  }, [params.id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = async (name: string, fn: (targetDeployment: ReturnType<typeof getDeployment>, targetChainId: number) => Promise<Hash>) => {
    if (!isConnected || !address) {
      setActionError("Connect a wallet first.");
      return;
    }

    setBusyAction(name);
    setActionError(null);
    setTxHash(null);

    try {
      if (chainId && !hasDeployment(chainId)) await switchChainAsync({ chainId: DEFAULT_CHAIN_ID });
      const targetChainId = hasDeployment(chainId) ? chainId : DEFAULT_CHAIN_ID;
      const targetDeployment = getDeployment(targetChainId);
      const hash = await fn(targetDeployment, targetChainId);
      setTxHash(hash);
      await publicClient?.waitForTransactionReceipt({ hash });
      refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Transaction failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const claimSlot = () =>
    runAction("claim", async (targetDeployment, targetChainId) => {
      if (!bounty) throw new Error("Bounty not loaded.");
      const token = getTokenMeta(bounty.token, targetDeployment.tokens);
      const stake = parseUnits(formatUnits(BigInt(bounty.stakeRequired), token.decimals), token.decimals);
      const approveHash = await writeContractAsync({
        address: bounty.token,
        abi: erc20Abi,
        functionName: "approve",
        args: [targetDeployment.core, stake],
        chainId: targetChainId,
      });
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      return writeContractAsync({
        address: targetDeployment.core,
        abi: coreAbi,
        functionName: "claimSlot",
        args: [bountyId],
        chainId: targetChainId,
      });
    });

  const submitPR = () =>
    runAction("submit", async (targetDeployment, targetChainId) => {
      if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(prUrl)) {
        throw new Error("Enter a valid GitHub PR URL.");
      }
      const normalizedCommit = commitHash.trim();
      const hash = normalizedCommit
        ? (`0x${normalizedCommit.replace(/^0x/, "").padStart(64, "0")}` as `0x${string}`)
        : ZERO_HASH;
      return writeContractAsync({
        address: targetDeployment.core,
        abi: coreAbi,
        functionName: "submitPR",
        args: [bountyId, prUrl, hash, JSON.stringify({ source: "claudelance-web" })],
        chainId: targetChainId,
      });
    });

  const pickWinner = () =>
    runAction("pick", async (targetDeployment, targetChainId) => {
      if (!isAddress(winner)) throw new Error("Choose a valid worker address.");
      return writeContractAsync({
        address: targetDeployment.core,
        abi: coreAbi,
        functionName: "pickWinner",
        args: [bountyId, winner],
        chainId: targetChainId,
      });
    });

  const settleStake = (worker: `0x${string}`) =>
    runAction(`settle:${worker}`, async (targetDeployment, targetChainId) =>
      writeContractAsync({
        address: targetDeployment.core,
        abi: coreAbi,
        functionName: "settleStake",
        args: [bountyId, worker],
        chainId: targetChainId,
      }),
    );

  if (loading) return <div className="p-8 text-center"><div className="glass mx-auto h-64 max-w-2xl animate-pulse rounded-3xl" /></div>;
  if (error || !bounty) return <div className="p-8 text-center text-muted-foreground">{error || "Bounty not found"}</div>;

  const isOpen = bounty.status === 0;
  const isResolved = bounty.status === 1;
  const isPoster = address?.toLowerCase() === bounty.poster.toLowerCase();
  const hasClaimed = bounty.claimers.some((claimer) => claimer.toLowerCase() === address?.toLowerCase());
  const mySubmission = bounty.submissions.find((submission) => submission.worker.toLowerCase() === address?.toLowerCase());
  const eligibleSubmissions = bounty.submissions.filter((submission) => Number(submission.submittedAt) > 0 && (!bounty.ciRequired || submission.ciPassed));
  const deadlineDate = new Date(Number(bounty.deadline) * 1000);
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86_400_000);
  const amount = formatUnits(BigInt(bounty.amount), tokenMeta.decimals);
  const stake = formatUnits(BigInt(bounty.stakeRequired), tokenMeta.decimals);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
      <Link href="/bounties" className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to bounties
      </Link>

      <GlassCard className="space-y-6 !p-6 sm:!p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", isOpen ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600")}>
              {STATUS_LABELS[bounty.status] || "Unknown"}
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Bounty #{bounty.id}
            </h1>
          </div>
          <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-600">
            <Coins className="mr-1 inline h-4 w-4" />{trimAmount(amount)} {tokenMeta.symbol}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Metric label="Slots" value={`${bounty.claimedSlots}/${bounty.maxSlots}`} icon={<Users className="mr-1 inline h-3.5 w-3.5" />} />
          <Metric label="Deadline" value={daysLeft > 0 ? `${daysLeft}d left` : "Ended"} icon={<CalendarClock className="mr-1 inline h-3.5 w-3.5" />} danger={daysLeft <= 1} />
          <Metric label="Stake" value={`${trimAmount(stake)} ${tokenMeta.symbol}`} />
          <Metric label="CI" value={bounty.ciRequired ? "Required" : "Manual"} icon={bounty.ciRequired ? <CheckCircle className="mr-1 inline h-3.5 w-3.5 text-emerald-500" /> : null} />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Links</h2>
          <Link href={`/poster/${bounty.poster}`} className="flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-foreground">
            Poster {shortAddress(bounty.poster)}
          </Link>
          <a href={bounty.targetRepoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-sm text-primary hover:underline">
            <GitPullRequest className="h-4 w-4 shrink-0" />{bounty.targetRepoUrl}<ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          <a href={bounty.instructionUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-foreground">
            View issue <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        {isOpen ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="flex-1" disabled={busyAction !== null || hasClaimed} onClick={claimSlot}>
                {busyAction === "claim" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {hasClaimed ? "Slot claimed" : `Claim Slot (${trimAmount(stake)} ${tokenMeta.symbol})`}
              </Button>
            </div>

            {hasClaimed ? (
              <div className="grid gap-3 rounded-lg border border-border bg-card/70 p-4">
                <input value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/owner/repo/pull/123" className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary" />
                <input value={commitHash} onChange={(event) => setCommitHash(event.target.value)} placeholder="commit hash (optional)" className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary" />
                <Button variant="secondary" disabled={busyAction !== null || Number(mySubmission?.submittedAt ?? 0) > 0} onClick={submitPR}>
                  {busyAction === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {Number(mySubmission?.submittedAt ?? 0) > 0 ? "PR submitted" : "Submit PR"}
                </Button>
              </div>
            ) : null}

            {isPoster ? (
              <div className="grid gap-3 rounded-lg border border-border bg-card/70 p-4">
                <select value={winner} onChange={(event) => setWinner(event.target.value)} className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">Choose winner</option>
                  {eligibleSubmissions.map((submission) => (
                    <option key={submission.worker} value={submission.worker}>{shortAddress(submission.worker)}</option>
                  ))}
                </select>
                <Button disabled={busyAction !== null || !winner} onClick={pickWinner}>
                  {busyAction === "pick" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Pick winner
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {bounty.submissions.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Submissions</h2>
            {bounty.submissions.map((submission) => (
              <div key={submission.worker} className="flex flex-col gap-3 rounded-lg border border-border bg-card/70 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/worker/${submission.worker}`} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                    {shortAddress(submission.worker)}
                  </Link>
                  <a href={submission.prUrl || "#"} target="_blank" rel="noreferrer" className="text-primary hover:underline">{submission.prUrl || "No PR yet"}</a>
                  <p className="text-xs text-muted-foreground">{submission.ciPassed ? "CI passed" : "CI pending"} · {submission.stakeRefunded ? "stake settled" : "stake unsettled"}</p>
                </div>
                {isResolved && !submission.stakeRefunded ? (
                  <Button size="sm" variant="secondary" disabled={busyAction !== null} onClick={() => settleStake(submission.worker)}>
                    {busyAction === `settle:${submission.worker}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Settle stake
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {bounty.winner !== ZERO_ADDRESS ? (
          <Link href={`/worker/${bounty.winner}`} className="text-sm text-muted-foreground hover:text-foreground">
            Winner: {shortAddress(bounty.winner)}
          </Link>
        ) : null}
        {actionError ? <p className="break-words text-xs text-destructive">{actionError}</p> : null}
        {txHash ? <p className="break-all text-xs text-muted-foreground">Latest transaction {txHash}</p> : null}
      </GlassCard>
    </main>
  );
}

function Metric({ label, value, icon, danger }: { label: string; value: string; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-semibold", danger && "text-destructive")}>{icon}{value}</p>
    </div>
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

function getTokenMeta(token: `0x${string}` | undefined, tokens: Record<"cUSD" | "CELO" | "USDC", `0x${string}`>) {
  const normalized = token?.toLowerCase();
  if (normalized === tokens.USDC.toLowerCase()) return { symbol: "USDC", decimals: 6 };
  if (normalized === tokens.CELO.toLowerCase()) return { symbol: "CELO", decimals: 18 };
  return { symbol: "cUSD", decimals: 18 };
}

function trimAmount(value: string) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
