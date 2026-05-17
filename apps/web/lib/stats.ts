import { createPublicClient, http } from "viem";

import { celoSepolia, DEFAULT_CHAIN_ID, chainById } from "./chain";
import { coreAbi, getDeployment } from "./contracts";
import { tokenToUsd, type SupportedToken } from "./usd-conversion";

export type LiveStats = {
  bountyCount: bigint;
  totalBountyVolumeUsd: number;
  totalProtocolRevenueUsd: number;
  totalBountiesResolved: bigint;
  uniquePosterCount: bigint;
  uniqueWorkerCount: bigint;
  feeBps: bigint;
  graceSeconds: bigint;
};

const rpcOverrides: Partial<Record<number, string>> = {
  [celoSepolia.id]: process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC,
  42_220: process.env.NEXT_PUBLIC_CELO_MAINNET_RPC,
};

export async function fetchLiveStats(chainId: number = DEFAULT_CHAIN_ID): Promise<LiveStats> {
  const chain = chainById(chainId);
  if (!chain) throw new Error(`Unsupported chain id ${chainId}`);
  const rpc = rpcOverrides[chainId] ?? chain.rpcUrls.default.http[0];
  const client = createPublicClient({ chain, transport: http(rpc) });
  const deploy = getDeployment(chainId);
  const tokenEntries = Object.entries(deploy.tokens) as Array<[SupportedToken, `0x${string}`]>;

  const [bountyCount, totalBountiesResolved, uniquePosterCount, uniqueWorkerCount, feeBps, graceSeconds, tokenStats] =
    await Promise.all([
      client.readContract({ address: deploy.core, abi: coreAbi, functionName: "bountyCount" }),
      client.readContract({ address: deploy.core, abi: coreAbi, functionName: "totalBountiesResolved" }),
      client.readContract({ address: deploy.core, abi: coreAbi, functionName: "uniquePosterCount" }),
      client.readContract({ address: deploy.core, abi: coreAbi, functionName: "uniqueWorkerCount" }),
      client.readContract({ address: deploy.core, abi: coreAbi, functionName: "PROTOCOL_FEE_BPS" }),
      client.readContract({ address: deploy.core, abi: coreAbi, functionName: "RESOLUTION_GRACE_PERIOD" }),
      Promise.all(
        tokenEntries.map(async ([token, tokenAddress]) => ({
          token,
          stats: await client.readContract({
            address: deploy.core,
            abi: coreAbi,
            functionName: "getStats",
            args: [tokenAddress],
          }),
        })),
      ),
    ]);

  return {
    bountyCount,
    totalBountyVolumeUsd: tokenStats.reduce((sum, { token, stats }) => sum + tokenToUsd(token, stats[0]), 0),
    totalProtocolRevenueUsd: tokenStats.reduce((sum, { token, stats }) => sum + tokenToUsd(token, stats[1]), 0),
    totalBountiesResolved,
    uniquePosterCount,
    uniqueWorkerCount,
    feeBps,
    graceSeconds: graceSeconds as bigint,
  };
}
