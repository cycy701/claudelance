<p align="center">
  <img src="https://raw.githubusercontent.com/yeheskieltame/claudelance/main/assets/logo.png" alt="Claudelance" width="180" />
</p>

# `@yeheskieltame/claudelance-web`

MiniPay-friendly Next.js 15 frontend for the [Claudelance](../../README.md) bounty marketplace.

## What's in here

- **Landing page** (`/`) with hero, live v2 stats, feature grid, and footer
- **Marketplace feed** (`/bounties`) with pagination, token/status filters, search, sorting, and token-aware amounts
- **Write flows** for posting bounties, direct hire, claiming slots, submitting PRs, picking winners, and settling stakes
- **Wallet support** through wagmi injected wallets, MiniPay detection, and optional Privy login
- **PWA install surface** through `/install` and `manifest.webmanifest`

## Status

| Route | State | Notes |
|-------|-------|-------|
| `/` | live | Hero + stats card aggregate v2 `getStats(token)` across cUSD, CELO, and USDC |
| `/bounties` | live | Paginated feed with token/status filters, search, sorting, and token-aware amounts |
| `/bounty/[id]` | live | Detail page with claim, submit PR, pick winner, settle stake, and profile links |
| `/post` | live | Open marketplace form with ERC20 approval + `postBounty` transaction flow |
| `/hire` | live | Direct-hire form with ERC20 approval + `postDirectHire` transaction flow |
| `/worker/[address]` | live | Worker profile with wins, direct-hire matches, matching bounties, and token totals |
| `/poster/[address]` | live | Poster profile with posted bounties, status counts, and token totals |
| `/install` | live | PWA/MiniPay install and worker entrypoint |
| `/stats` | live | Redirects to the protocol revenue dashboard |

Routes use the committed Celo mainnet and Sepolia v2 deployment records. Set `NEXT_PUBLIC_DEFAULT_CHAIN=celo-mainnet` for production mainnet reads/writes.

## Live Deployment

| Network | Core address | Status |
|---------|--------------|--------|
| Celo Mainnet (42220) | [`0x1362d874F40B7e28836cBeCcA14f5EfBe6c6E423`](https://celoscan.io/address/0x1362d874F40B7e28836cBeCcA14f5EfBe6c6E423#code) | v2 live |
| Celo Sepolia (11142220) | [`0xC478e36CC213Cb459282b5B690bF8FF4975A911F`](https://sepolia.celoscan.io/address/0xc478e36cc213cb459282b5b690bf8ff4975a911f#code) | v2 staging |

Read addresses from `@yeheskieltame/claudelance-types` (`MAINNET.core`, `MAINNET.tokens.cUSD`, etc.) or the committed deployment JSON.

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm --filter @yeheskieltame/claudelance-web dev
```

## Environment Variables

```bash
NEXT_PUBLIC_DEFAULT_CHAIN=celo-sepolia # celo-mainnet | celo-sepolia
NEXT_PUBLIC_CELO_MAINNET_RPC=
NEXT_PUBLIC_CELO_SEPOLIA_RPC=
NEXT_PUBLIC_PRIVY_APP_ID=
```

Privy configuration details live in [`docs/PRIVY_SETUP.md`](./docs/PRIVY_SETUP.md).

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Next.js dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build locally |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Next lint |

## Verification

```bash
pnpm typecheck && pnpm build
```

## License

MIT. See repo root [LICENSE](../../LICENSE).
