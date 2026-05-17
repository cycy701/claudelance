"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Coins, ExternalLink, Loader2, Trophy } from "lucide-react";
import { isAddress } from "viem";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { formatTokenAmount, getBountyTokenMeta } from "@/components/bounty-card";
import { cn } from "@/lib/utils";

type ProfileKind = "worker" | "poster";

type ApiBounty = {
  id: string;
  poster: `0x${string}`;
  amount: string;
  winner: `0x${string}`;
  stakeRequired: string;
  token: `0x${string}`;
  deadline: string;
  maxSlots: number;
  claimedSlots: number;
  ciRequired: boolean;
  targetWorker: `0x${string}`;
  status: number;
  targetRepoUrl: string;
  instructionUrl: string;
};

type BountiesResponse = {
  items?: ApiBounty[];
  nextCursor?: string | null;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const STATUS_LABELS: Record<number, string> = { 0: "Open", 1: "Resolved", 2: "Cancelled", 3: "Expired" };

export function ProfilePage({ address, kind }: { address: string; kind: ProfileKind }) {
  const [bounties, setBounties] = React.useState<ApiBounty[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const normalizedAddress = address.toLowerCase();
  const validAddress = isAddress(address);

  React.useEffect(() => {
    if (!validAddress) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadAll(cursor: string | null = null, acc: ApiBounty[] = []) {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/bounties?${params.toString()}`, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Unable to load bounties");
      const data = (await response.json()) as BountiesResponse;
      const nextAcc = [...acc, ...(data.items ?? [])];
      if (data.nextCursor) return loadAll(data.nextCursor, nextAcc);
      return nextAcc;
    }

    setLoading(true);
    loadAll()
      .then((items) => {
        if (cancelled) return;
        setBounties(items);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setBounties([]);
        setError("Profile data is not available yet.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [validAddress]);

  const matching = React.useMemo(() => {
    if (!validAddress) return [];

    return bounties.filter((bounty) => {
      if (kind === "poster") return bounty.poster.toLowerCase() === normalizedAddress;
      return (
        bounty.winner.toLowerCase() === normalizedAddress ||
        bounty.targetWorker.toLowerCase() === normalizedAddress
      );
    });
  }, [bounties, kind, normalizedAddress, validAddress]);

  const stats = React.useMemo(() => buildStats(matching, normalizedAddress, kind), [kind, matching, normalizedAddress]);
  const title = kind === "worker" ? "Worker profile" : "Poster profile";
  const subtitle =
    kind === "worker"
      ? "Wins, direct-hire targets, and visible onchain work for this wallet."
      : "Posted bounty volume and resolution status for this wallet.";

  if (!validAddress) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-20">
        <GlassCard>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Invalid address</h1>
          <p className="mt-2 text-sm text-muted-foreground">Check the wallet address and try again.</p>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-20">
      <Link href="/bounties" className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to bounties
      </Link>

      <section className="space-y-6">
        <GlassCard className="!rounded-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{title}</p>
              <h1 className="mt-2 break-all font-display text-2xl font-semibold tracking-tight sm:text-4xl">
                {shortAddress(address)}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
            </div>
            <Button asChild variant="secondary">
              <a href={`https://celoscan.io/address/${address}`} target="_blank" rel="noreferrer">
                Celoscan <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </GlassCard>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card/70">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <EmptyState message={error} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={<BriefcaseBusiness className="h-4 w-4" />} label={kind === "poster" ? "Posted" : "Matched"} value={String(stats.total)} />
              <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Resolved" value={String(stats.resolved)} />
              <Metric icon={<Trophy className="h-4 w-4" />} label={kind === "poster" ? "Open" : "Wins"} value={String(kind === "poster" ? stats.open : stats.wins)} />
            </div>

            <div className="rounded-lg border border-border bg-card/80 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Token totals</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {stats.totals.map((item) => (
                  <div key={item.symbol} className="rounded-lg border border-border bg-background/50 p-3">
                    <div className="text-xs text-muted-foreground">{item.symbol}</div>
                    <div className="mt-1 text-lg font-semibold">{item.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            {matching.length === 0 ? (
              <EmptyState message="No matching bounties found for this wallet yet." />
            ) : (
              <div className="grid gap-3">
                {matching.map((bounty) => (
                  <ProfileBountyRow key={bounty.id} bounty={bounty} kind={kind} address={normalizedAddress} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function ProfileBountyRow({ bounty, kind, address }: { bounty: ApiBounty; kind: ProfileKind; address: string }) {
  const token = getBountyTokenMeta(bounty.token);
  const isWinner = bounty.winner.toLowerCase() === address;
  const isDirectHire = bounty.targetWorker.toLowerCase() === address && bounty.targetWorker !== ZERO_ADDRESS;
  const label = kind === "worker" ? (isWinner ? "Winner" : isDirectHire ? "Direct hire" : "Worker") : "Poster";

  return (
    <article className="rounded-lg border border-border bg-card/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{label}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", bounty.status === 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
              {STATUS_LABELS[bounty.status] ?? "Unknown"}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold">Bounty #{bounty.id}</h3>
          <a href={bounty.instructionUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-muted-foreground hover:text-foreground">
            {bounty.instructionUrl}
          </a>
        </div>
        <div className="flex shrink-0 flex-col gap-2 text-sm sm:items-end">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Coins className="h-4 w-4" />
            {formatTokenAmount(BigInt(bounty.amount), token.decimals)} {token.symbol}
          </span>
          <Link href={`/bounty/${bounty.id}`} className="text-primary hover:underline">Open bounty</Link>
        </div>
      </div>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function buildStats(bounties: ApiBounty[], address: string, kind: ProfileKind) {
  const totals = new Map<string, { symbol: string; decimals: number; amount: bigint }>();

  for (const bounty of bounties) {
    const token = getBountyTokenMeta(bounty.token);
    const key = token.symbol;
    const current = totals.get(key) ?? { symbol: token.symbol, decimals: token.decimals, amount: 0n };
    current.amount += BigInt(bounty.amount);
    totals.set(key, current);
  }

  return {
    total: bounties.length,
    open: bounties.filter((bounty) => bounty.status === 0).length,
    resolved: bounties.filter((bounty) => bounty.status === 1).length,
    wins: bounties.filter((bounty) => bounty.winner.toLowerCase() === address).length,
    totals: Array.from(totals.values()).map((item) => ({
      symbol: item.symbol,
      amount: formatTokenAmount(item.amount, item.decimals),
    })),
  };
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
