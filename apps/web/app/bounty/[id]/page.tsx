import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle, Coins, ExternalLink, GitPullRequest, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BountyDetail {
  id: string;
  poster: string;
  amount: string;
  token: string;
  stakeRequired: string;
  deadline: string;
  maxSlots: number;
  claimedSlots: number;
  ciRequired: boolean;
  status: number;
  targetRepoUrl: string;
  instructionUrl: string;
  winner: string;
}

const STATUS_LABELS: Record<number, string> = { 0: "Open", 1: "Resolved", 2: "Cancelled", 3: "Expired" };

export default function BountyDetailPage({ params }: { params: { id: string } }) {
  const [bounty, setBounty] = React.useState<BountyDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/bounty/" + params.id, { headers: { accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => { setBounty(d); setLoading(false); })
      .catch(() => { setError("Failed to load bounty"); setLoading(false); });
  }, [params.id]);

  if (loading) return <div className="p-8 text-center"><div className="glass h-64 animate-pulse rounded-3xl mx-auto max-w-2xl" /></div>;
  if (error || !bounty) return <div className="p-8 text-center text-muted-foreground">{error || "Bounty not found"}</div>;

  const isOpen = bounty.status === 0;
  const deadlineDate = new Date(Number(bounty.deadline) * 1000);
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000);
  const amount = (Number(bounty.amount) / 1e18).toFixed(2);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-20">
      <Link href="/bounties" className="mb-6 inline-flex touch-target items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to bounties
      </Link>

      <GlassCard className="!p-6 sm:!p-8 space-y-6">
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
            <Coins className="mr-1 inline h-4 w-4" />{amount} CELO
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Slots</p>
            <p className="font-semibold"><Users className="mr-1 inline h-3.5 w-3.5" />{bounty.claimedSlots}/{bounty.maxSlots}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className={cn("font-semibold", daysLeft <= 1 && "text-destructive")}>
              <CalendarClock className="mr-1 inline h-3.5 w-3.5" />{daysLeft > 0 ? daysLeft + "d left" : "Ended"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Stake</p>
            <p className="font-semibold">{(Number(bounty.stakeRequired) / 1e18).toFixed(2)} CELO</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">CI</p>
            <p className="font-semibold">{bounty.ciRequired ? <CheckCircle className="mr-1 inline h-3.5 w-3.5 text-emerald-500" /> : "No"}{bounty.ciRequired && "Required"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Links</h2>
          <a href={bounty.targetRepoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <GitPullRequest className="h-4 w-4" />{bounty.targetRepoUrl}<ExternalLink className="h-3 w-3" />
          </a>
          <a href={bounty.instructionUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            View issue <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {isOpen && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1 touch-target">Claim Slot ({(Number(bounty.stakeRequired) / 1e18).toFixed(2)} CELO)</Button>
            <Button size="lg" variant="secondary" className="flex-1 touch-target">Submit PR</Button>
          </div>
        )}
      </GlassCard>
    </main>
  );
}