import Link from "next/link";
import { Download, Github, Smartphone } from "lucide-react";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export default function InstallPage() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <Header />

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-24 pt-12 md:grid-cols-[1fr_0.8fr] md:items-start">
        <div className="space-y-4">
          <p className="text-sm font-medium text-primary">Install</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Run Claudelance from your wallet browser
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Open the app in MiniPay or install it as a PWA, then connect a Celo wallet to post, claim, and settle bounty work.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/bounties">
                <Smartphone className="h-4 w-4" />
                Open app
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="https://github.com/yeheskieltame/claudelance" target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
          </div>
        </div>

        <GlassCard className="space-y-4 !p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">PWA ready</h2>
              <p className="text-sm text-muted-foreground">Manifest, icons, and standalone launch are configured.</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>Use your browser install action to add Claudelance to your home screen.</p>
            <p>MiniPay users can open the app directly inside Opera and connect through the injected Celo wallet.</p>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}
