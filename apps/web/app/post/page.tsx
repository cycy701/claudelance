"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, erc20Abi } from "viem";
import { ArrowLeft, ArrowRight, Check, Coins, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { chainById, DEFAULT_CHAIN_ID, celoSepolia } from "@/lib/chain";
import { deployments, coreAbi } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

const TOKENS = [
  { symbol: "cUSD", label: "cUSD (stable)", color: "text-green-500", bg: "bg-green-500/10" },
  { symbol: "CELO", label: "CELO (native)", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { symbol: "USDC", label: "USDC (stable)", color: "text-blue-500", bg: "bg-blue-500/10" },
] as const;

type TokenSymbol = (typeof TOKENS)[number]["symbol"];

interface FormState {
  token: TokenSymbol;
  amount: string;
  repoUrl: string;
  issueUrl: string;
  stake: string;
  maxSlots: string;
  deadlineDays: string;
  ciRequired: boolean;
}

const INITIAL: FormState = {
  token: "CELO",
  amount: "1",
  repoUrl: "",
  issueUrl: "",
  stake: "0.1",
  maxSlots: "3",
  deadlineDays: "7",
  ciRequired: true,
};

type Validation = Partial<Record<keyof FormState, string>>;

function validateStep1(state: FormState): Validation {
  const errors: Validation = {};
  if (!state.amount || Number(state.amount) <= 0) errors.amount = "Must be > 0";
  return errors;
}

function validateStep2(state: FormState): Validation {
  const errors: Validation = {};
  if (!state.repoUrl.startsWith("https://github.com/")) errors.repoUrl = "Enter a valid GitHub repo URL";
  if (!state.issueUrl.startsWith("https://github.com/")) errors.issueUrl = "Enter a valid GitHub issue URL";
  return errors;
}

function validateStep3(state: FormState): Validation {
  const errors: Validation = {};
  if (!state.stake || Number(state.stake) <= 0) errors.stake = "Must be > 0";
  if (!state.maxSlots || Number(state.maxSlots) < 1) errors.maxSlots = "Min 1 slot";
  if (!state.deadlineDays || Number(state.deadlineDays) < 1) errors.deadlineDays = "Min 1 day";
  return errors;
}

function getTokenAddress(chainId: number, symbol: TokenSymbol): `0x${string}` {
  const deployment = deployments[chainId as keyof typeof deployments];
  if (!deployment) throw new Error(`No deployment for chain ${chainId}`);
  if (symbol === "CELO") return "0x0000000000000000000000000000000000000000";
  if (symbol === "cUSD") return deployment.cUSD;
  if (symbol === "USDC") return deployment.cUSD;
  throw new Error(`Unknown token ${symbol}`);
}

export default function PostBountyPage() {
  const router = useRouter();
  const { chainId, isConnected } = useAccount();
  const activeChainId = chainId ?? celoSepolia.id;
  const chain = chainById(activeChainId);

  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [errors, setErrors] = React.useState<Validation>({});
  const [txHash, setTxHash] = React.useState<`0x${string}` | null>(null);

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const next = () => {
    let e: Validation = {};
    if (step === 1) e = validateStep1(form);
    if (step === 2) e = validateStep2(form);
    if (step === 3) e = validateStep3(form);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const deployment = deployments[activeChainId as keyof typeof deployments];
  const tokenAddr = deployment ? getTokenAddress(activeChainId, form.token) : undefined;

  const { writeContractAsync, isPending } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  React.useEffect(() => {
    if (txConfirmed) {
      toast.success("Bounty posted onchain!");
    }
  }, [txConfirmed]);

  const submit = async () => {
    if (!deployment || !tokenAddr) {
      toast.error("No deployment for this chain");
      return;
    }
    try {
      const amountWei = parseEther(form.amount);
      const stakeWei = parseEther(form.stake);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(form.deadlineDays) * 86400);
      const maxSlots = BigInt(form.maxSlots);

      if (form.token !== "CELO" && tokenAddr !== "0x0000000000000000000000000000000000000000") {
        const allowanceHash = await writeContractAsync({
          abi: erc20Abi,
          address: tokenAddr,
          functionName: "approve",
          args: [deployment.core, amountWei + stakeWei],
        });
        toast.loading("Approving token...");
        setTxHash(allowanceHash);
        return;
      }

      const hash = await writeContractAsync({
        abi: coreAbi,
        address: deployment.core,
        functionName: "postBounty",
        args: [
          tokenAddr,
          form.repoUrl,
          form.issueUrl,
          amountWei,
          stakeWei,
          maxSlots,
          deadline,
          form.ciRequired,
        ],
        value: form.token === "CELO" ? amountWei + stakeWei : undefined,
      });
      setTxHash(hash);
      toast.success("Bounty posted!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast.error(msg.slice(0, 100));
    }
  };

  if (!chain) return <div className="p-8 text-center text-muted-foreground">Unknown chain</div>;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-20">
      <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Post a Bounty</h1>
      <p className="mt-1 text-sm text-muted-foreground">{chain.name} · Step {step} of 4</p>

      {/* Progress bar */}
      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* Step 1: Token + Amount */}
      {step === 1 && (
        <GlassCard className="mt-6 !p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Choose token & amount</h2>
          <div className="grid grid-cols-3 gap-2">
            {TOKENS.map((t) => (
              <button
                key={t.symbol}
                onClick={() => set("token", t.symbol)}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all ${form.token === t.symbol ? `${t.bg} ${t.color} border-current` : "border-white/10 text-muted-foreground hover:border-white/20"}`}
              >
                {t.symbol}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Amount</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="1.0"
              className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-lg font-semibold outline-none focus:border-primary"
            />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Total: {form.amount || "0"} {form.token}</p>
          </div>
        </GlassCard>
      )}

      {/* Step 2: Repo + Issue */}
      {step === 2 && (
        <GlassCard className="mt-6 !p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Link the issue</h2>
          <div>
            <label className="text-xs text-muted-foreground">Repo URL</label>
            <input
              type="url"
              value={form.repoUrl}
              onChange={(e) => set("repoUrl", e.target.value)}
              placeholder="https://github.com/user/repo"
              className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-mono outline-none focus:border-primary"
            />
            {errors.repoUrl && <p className="mt-1 text-xs text-destructive">{errors.repoUrl}</p>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Issue URL</label>
            <input
              type="url"
              value={form.issueUrl}
              onChange={(e) => set("issueUrl", e.target.value)}
              placeholder="https://github.com/user/repo/issues/1"
              className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-mono outline-none focus:border-primary"
            />
            {errors.issueUrl && <p className="mt-1 text-xs text-destructive">{errors.issueUrl}</p>}
          </div>
        </GlassCard>
      )}

      {/* Step 3: Stake + Config */}
      {step === 3 && (
        <GlassCard className="mt-6 !p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Set rules</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Stake per slot (CELO)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.stake}
                onChange={(e) => set("stake", e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              {errors.stake && <p className="mt-1 text-xs text-destructive">{errors.stake}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max slots</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.maxSlots}
                onChange={(e) => set("maxSlots", e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              {errors.maxSlots && <p className="mt-1 text-xs text-destructive">{errors.maxSlots}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Deadline (days)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.deadlineDays}
              onChange={(e) => set("deadlineDays", e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            {errors.deadlineDays && <p className="mt-1 text-xs text-destructive">{errors.deadlineDays}</p>}
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.ciRequired}
              onChange={(e) => set("ciRequired", e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            Require CI verification
          </label>
        </GlassCard>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <GlassCard className="mt-6 !p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Review your bounty</h2>
          <div className="space-y-2 text-sm">
            <Row label="Token" value={`${form.amount} ${form.token}`} />
            <Row label="Repo" value={form.repoUrl} />
            <Row label="Issue" value={form.issueUrl} />
            <Row label="Stake" value={`${form.stake} CELO`} />
            <Row label="Slots" value={form.maxSlots} />
            <Row label="Deadline" value={`${form.deadlineDays} days`} />
            <Row label="CI" value={form.ciRequired ? "Yes" : "No"} />
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={isPending || isWaiting}
            onClick={submit}
          >
            {isPending || isWaiting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isWaiting ? "Confirming..." : "Confirm in wallet..."}
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Post Bounty ({form.amount} {form.token})
              </>
            )}
          </Button>
          {txHash && (
            <a
              href={`${chain.blockExplorers?.default.url}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              View tx on {chain.blockExplorers?.default.name} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </GlassCard>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div className="mt-6 flex justify-end">
          {step > 1 && (
            <Button variant="ghost" size="lg" onClick={prev} className="mr-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          <Button size="lg" onClick={next}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </div>
  );
}