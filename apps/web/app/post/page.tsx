"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TOKENS = [
  { symbol: "cUSD", label: "cUSD stable", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { symbol: "CELO", label: "CELO native", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  { symbol: "USDC", label: "USDC stable", color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/30" },
] as const;

type FormState = {
  token: string; amount: string;
  repoUrl: string; issueUrl: string;
  stake: string; maxSlots: string; deadlineDays: string;
  ciRequired: boolean;
};

const INITIAL: FormState = {
  token: "CELO", amount: "1",
  repoUrl: "", issueUrl: "",
  stake: "0.1", maxSlots: "3", deadlineDays: "7",
  ciRequired: true,
};

export default function PostBountyPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [txHash, setTxHash] = React.useState<string | null>(null);

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1 && (!form.amount || Number(form.amount) <= 0)) e.amount = "Must be > 0";
    if (s === 2) {
      if (!form.repoUrl.startsWith("https://github.com/")) e.repoUrl = "Enter a valid GitHub repo URL";
      if (!form.issueUrl.startsWith("https://github.com/")) e.issueUrl = "Enter a valid GitHub issue URL";
    }
    if (s === 3) {
      if (!form.stake || Number(form.stake) <= 0) e.stake = "Must be > 0";
      if (!form.maxSlots || Number(form.maxSlots) < 1) e.maxSlots = "Min 1 slot";
      if (!form.deadlineDays || Number(form.deadlineDays) < 1) e.deadlineDays = "Min 1 day";
    }
    return e;
  };

  const next = () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    setIsSubmitting(true);
    // Placeholder: actual on-chain submission to be wired
    setTimeout(() => {
      setTxHash("0x" + "0".repeat(64));
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-20">
      <button onClick={() => router.back()} className="mb-6 inline-flex touch-target items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Post a Bounty</h1>
      <p className="mt-1 text-sm text-muted-foreground">Step {step} of 4</p>

      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-200", s <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {step === 1 && (
        <GlassCard className="mt-6 !p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Choose token and amount</h2>
          <div className="grid grid-cols-3 gap-2">
            {TOKENS.map((t) => (
              <button key={t.symbol} onClick={() => set("token", t.symbol)}
                className={cn("rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all touch-target",
                  form.token === t.symbol ? t.bg + " " + t.color : "border-white/10 text-muted-foreground hover:border-white/20")}>
                {t.symbol}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Amount</label>
            <input type="number" min="0" step="0.1" value={form.amount} onChange={(e) => set("amount", e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-lg font-semibold outline-none focus:border-primary" />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount}</p>}
          </div>
        </GlassCard>
      )}

      {step === 2 && (
        <GlassCard className="mt-6 !p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Link the issue</h2>
          {["repoUrl", "issueUrl"].map((field) => (
            <div key={field}>
              <label className="text-xs text-muted-foreground">{field === "repoUrl" ? "Repo URL" : "Issue URL"}</label>
              <input type="url" value={(form as any)[field]} onChange={(e) => set(field as any, e.target.value)}
                placeholder={"https://github.com/user/" + (field === "repoUrl" ? "repo" : "repo/issues/1")}
                className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-mono outline-none focus:border-primary" />
              {(errors as any)[field] && <p className="mt-1 text-xs text-destructive">{(errors as any)[field]}</p>}
            </div>
          ))}
        </GlassCard>
      )}

      {step === 3 && (
        <GlassCard className="mt-6 !p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Set rules</h2>
          {[{ field: "stake", label: "Stake per slot" }, { field: "maxSlots", label: "Max slots" }].map(({ field, label }) => (
            <div key={field}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <input type="number" min={field === "maxSlots" ? "1" : "0"} step="0.01" value={(form as any)[field]} onChange={(e) => set(field as any, e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary" />
              {(errors as any)[field] && <p className="mt-1 text-xs text-destructive">{(errors as any)[field]}</p>}
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground">Deadline (days)</label>
            <input type="number" min="1" value={form.deadlineDays} onChange={(e) => set("deadlineDays", e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary" />
            {errors.deadlineDays && <p className="mt-1 text-xs text-destructive">{errors.deadlineDays}</p>}
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.ciRequired} onChange={(e) => set("ciRequired", e.target.checked)} className="h-4 w-4 rounded accent-primary" />
            Require CI verification
          </label>
        </GlassCard>
      )}

      {step === 4 && (
        <GlassCard className="mt-6 !p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Review</h2>
          {[
            ["Token", form.amount + " " + form.token],
            ["Repo", form.repoUrl],
            ["Issue", form.issueUrl],
            ["Stake", form.stake + " " + form.token],
            ["Slots", form.maxSlots],
            ["Deadline", form.deadlineDays + " days"],
            ["CI", form.ciRequired ? "Yes" : "No"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-white/5 py-2">
              <span className="text-muted-foreground text-sm">{label}</span>
              <span className="font-mono text-xs text-foreground truncate max-w-[60%]">{value}</span>
            </div>
          ))}
          <Button size="lg" className="w-full touch-target" disabled={isSubmitting} onClick={submit}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</> : <><Coins className="mr-2 h-4 w-4" />Post Bounty</>}
          </Button>
        </GlassCard>
      )}

      {step < 4 && (
        <div className="mt-6 flex justify-end gap-2">
          {step > 1 && <Button variant="ghost" size="lg" onClick={prev}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
          <Button size="lg" onClick={next}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      )}
    </main>
  );
}