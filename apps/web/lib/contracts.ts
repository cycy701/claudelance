import deployment from "../../../contracts/deployments/celo-sepolia.json";
import mainnetDeployment from "../../../contracts/deployments/celo-mainnet.json";
import { celoMainnet, celoSepolia } from "./chain";

/// Static deployment metadata pulled from the committed deployment record.
/// Importing JSON keeps the frontend in lockstep with the contract repo — the
/// next mainnet deploy adds celo-mainnet.json and we add a sibling import.
export const deployments = {
  [celoSepolia.id]: {
    core: deployment.core as `0x${string}`,
    tokens: deployment.tokens as Record<"cUSD" | "CELO" | "USDC", `0x${string}`>,
    treasury: deployment.treasury as `0x${string}`,
    ciRelayer: deployment.ciRelayer as `0x${string}`,
    owner: deployment.owner as `0x${string}`,
  },
  [celoMainnet.id]: {
    core: mainnetDeployment.core as `0x${string}`,
    tokens: mainnetDeployment.tokens as Record<"cUSD" | "CELO" | "USDC", `0x${string}`>,
    treasury: mainnetDeployment.treasury as `0x${string}`,
    ciRelayer: mainnetDeployment.ciRelayer as `0x${string}`,
    owner: mainnetDeployment.owner as `0x${string}`,
  },
} as const;

export function getDeployment(chainId: number) {
  const entry = deployments[chainId as keyof typeof deployments];
  if (!entry) throw new Error(`No Claudelance deployment for chain ${chainId}`);
  return entry;
}

/// Minimal ClaudelanceCore ABI surface — read-only views the frontend needs for
/// dashboards. Write-side ABI lives next to the post-bounty / claim flows so
/// each route ships only the calls it actually invokes.
export const coreAbi = [
  {
    type: "function",
    name: "bountyCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getStats",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "volume", type: "uint256" },
      { name: "revenue", type: "uint256" },
      { name: "resolved", type: "uint256" },
      { name: "posters", type: "uint256" },
      { name: "workers", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "totalBountiesResolved",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "uniquePosterCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "uniqueWorkerCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "PROTOCOL_FEE_BPS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "RESOLUTION_GRACE_PERIOD",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "postBounty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "bountyType", type: "uint8" },
      { name: "targetRepoUrl", type: "string" },
      { name: "instructionUrl", type: "string" },
      { name: "requirementsHash", type: "bytes32" },
      { name: "amount", type: "uint96" },
      { name: "maxSlots", type: "uint8" },
      { name: "stake", type: "uint96" },
      { name: "deadline", type: "uint64" },
      { name: "ciRequired", type: "bool" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "postDirectHire",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "targetWorker", type: "address" },
      { name: "bountyType", type: "uint8" },
      { name: "targetRepoUrl", type: "string" },
      { name: "instructionUrl", type: "string" },
      { name: "requirementsHash", type: "bytes32" },
      { name: "amount", type: "uint96" },
      { name: "stake", type: "uint96" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "claimSlot",
    stateMutability: "nonpayable",
    inputs: [{ name: "bountyId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "submitPR",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "prUrl", type: "string" },
      { name: "commitHash", type: "bytes32" },
      { name: "metadata", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pickWinner",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "winner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settleStake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "worker", type: "address" },
    ],
    outputs: [],
  },
] as const;
