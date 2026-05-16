/**
 * Claudelance Worker - On-chain bounty automation
 * 
 * Usage: node scripts/worker.mjs <private_key>
 * 
 * Requires: Celo Mainnet wallet with CELO for gas + stakes
 */

const { createPublicClient, http, createWalletClient, parseAbi } = require("viem");
const { celo } = require("viem/chains");
const { privateKeyToAccount } = require("viem/accounts");

const CONFIG = {
  core: "0x1362d874F40B7e28836cBeCcA14f5EfBe6c6E423",
  identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
};

const CORE_ABI = parseAbi([
  "function claimSlot(uint256 bountyId) payable",
  "function submitPR(uint256 bountyId, string calldata prUrl, bytes32 commitHash)",
  "function withdrawEarnings(address token)",
  "function earnings(address worker, address token) view returns (uint256)",
  "function bountyCount() view returns (uint256)",
  "function getBounty(uint256 bountyId) view returns (tuple(address poster, uint96 amount, address winner, uint96 stakeRequired, address token, uint64 deadline, uint8 maxSlots, uint8 claimedSlots, uint8 bountyType, bool ciRequired, address targetWorker, uint8 status, string targetRepoUrl, string instructionUrl, bytes32 requirementsHash))",
]);

const IDENTITY_ABI = parseAbi([
  "function mintAgent(address to, bytes metadata)",
  "function balanceOf(address) view returns (uint256)",
]);

async function main() {
  const pk = process.argv[2];
  if (!pk || !pk.startsWith("0x")) {
    console.error("Usage: node scripts/worker.mjs <0xPRIVATE_KEY>");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk);
  console.log("Worker address:", account.address);

  const client = createPublicClient({ chain: celo, transport: http("https://rpc.ankr.com/celo") });
  const wallet = createWalletClient({ chain: celo, transport: http("https://rpc.ankr.com/celo"), account });

  // Check balance
  const bal = await client.getBalance({ address: account.address });
  console.log("Balance:", (Number(bal) / 1e18).toFixed(4), "CELO");
  if (bal < 10000000000000000n) { // 0.01 CELO
    console.error("Insufficient balance. Need at least 0.01 CELO for gas.");
    process.exit(1);
  }

  // Step 1: Mint identity NFT if needed
  const idBal = await client.readContract({
    address: CONFIG.identity,
    abi: IDENTITY_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  if (idBal === 0n) {
    console.log("Minting identity NFT...");
    const mintTx = await wallet.writeContract({
      address: CONFIG.identity,
      abi: IDENTITY_ABI,
      functionName: "mintAgent",
      args: [account.address, "0x"],
      gas: 200000n,
    });
    console.log("Identity minted:", mintTx);
  } else {
    console.log("Identity NFT already owned");
  }

  // Step 2: Get open bounties
  const count = await client.readContract({
    address: CONFIG.core,
    abi: CORE_ABI,
    functionName: "bountyCount",
  });

  console.log("Total bounties:", count.toString());

  const openBounties = [];
  for (let i = 1n; i <= count; i++) {
    try {
      const b = await client.readContract({
        address: CONFIG.core,
        abi: CORE_ABI,
        functionName: "getBounty",
        args: [i],
      });
      if (b.status === 0 && b.claimedSlots < b.maxSlots) {
        openBounties.push({ id: i, ...b });
      }
    } catch {}
  }

  console.log("Open bounties:", openBounties.length);

  // Step 3: Claim and submit for each
  for (const bounty of openBounties) {
    try {
      console.log("Claiming bounty #" + bounty.id + "...");
      const claimTx = await wallet.writeContract({
        address: CONFIG.core,
        abi: CORE_ABI,
        functionName: "claimSlot",
        args: [bounty.id],
        value: bounty.stakeRequired, // Must match stake
        gas: 200000n,
      });
      console.log("  Claimed:", claimTx);

      // Submit PR (placeholder - replace with actual PR URL)
      const prUrl = "https://github.com/yeheskieltame/claudelance/pull/" + (180 + Number(bounty.id));
      const commitHash = "0x" + "0".repeat(64);
      
      console.log("  Submitting PR for bounty #" + bounty.id + "...");
      const submitTx = await wallet.writeContract({
        address: CONFIG.core,
        abi: CORE_ABI,
        functionName: "submitPR",
        args: [bounty.id, prUrl, commitHash],
        gas: 200000n,
      });
      console.log("  Submitted:", submitTx);
    } catch (e) {
      console.error("  Error on bounty #" + bounty.id + ":", e.shortMessage || e.message);
    }
  }

  // Step 4: Check and withdraw earnings
  const earnings = await client.readContract({
    address: CONFIG.core,
    abi: CORE_ABI,
    functionName: "earnings",
    args: [account.address, CONFIG.CELO],
  });
  console.log("Earnings:", (Number(earnings) / 1e18).toFixed(4), "CELO");

  if (earnings > 0n) {
    console.log("Withdrawing earnings...");
    const withdrawTx = await wallet.writeContract({
      address: CONFIG.core,
      abi: CORE_ABI,
      functionName: "withdrawEarnings",
      args: [CONFIG.CELO],
      gas: 150000n,
    });
    console.log("Withdrawn:", withdrawTx);
  }

  console.log("Done!");
}

main().catch(console.error);