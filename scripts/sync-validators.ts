/**
 * Script to sync validators from Solana to PostgreSQL database
 * Run with: npx tsx scripts/sync-validators.ts
 */

import { Connection, clusterApiUrl } from "@solana/web3.js";
import { PrismaClient } from "@prisma/client";
import { ValidatorService } from "../lib/services/validator-service";

const prisma = new PrismaClient();

async function syncValidators(network: "devnet" | "mainnet-beta" = "devnet") {
  try {
    console.log(`[SyncValidators] Starting sync for ${network}...`);

    // Get RPC endpoint
    let rpcUrl: string;
    if (network === "mainnet-beta") {
      rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ||
        process.env.NEXT_PUBLIC_SOLANA_RPC ||
        clusterApiUrl("mainnet-beta");
    } else {
      rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ||
        process.env.NEXT_PUBLIC_SOLANA_RPC ||
        clusterApiUrl("devnet");
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const validatorService = new ValidatorService(connection, network);

    // Fetch validators
    const validators = await validatorService.fetchValidators();
    console.log(`[SyncValidators] Fetched ${validators.length} validators`);

    // Sync to database
    let synced = 0;
    let updated = 0;
    let errors = 0;

    for (const validator of validators) {
      try {
        const result = await prisma.validator.upsert({
          where: { voteAccount: validator.voteAccount },
          update: {
            identity: validator.identity,
            name: validator.name,
            apy: validator.apy,
            commission: validator.commission,
            activatedStake: BigInt(validator.activatedStake),
            epochCredits: BigInt(validator.epochCredits),
            lastVote: BigInt(validator.lastVote),
            rootSlot: BigInt(validator.rootSlot),
            delinquent: validator.delinquent,
            isActive: !validator.delinquent,
            lastSyncedAt: new Date(),
          },
          create: {
            voteAccount: validator.voteAccount,
            identity: validator.identity,
            name: validator.name,
            network: network,
            apy: validator.apy,
            commission: validator.commission,
            activatedStake: BigInt(validator.activatedStake),
            epochCredits: BigInt(validator.epochCredits),
            lastVote: BigInt(validator.lastVote),
            rootSlot: BigInt(validator.rootSlot),
            delinquent: validator.delinquent,
            isActive: !validator.delinquent,
          },
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          synced++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`[SyncValidators] Error syncing ${validator.voteAccount}:`, error);
        errors++;
      }
    }

    console.log(`[SyncValidators] Sync complete:`);
    console.log(`  - New validators: ${synced}`);
    console.log(`  - Updated validators: ${updated}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Total: ${validators.length}`);
  } catch (error) {
    console.error("[SyncValidators] Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run sync
const network = (process.argv[2] as "devnet" | "mainnet-beta") || "devnet";
syncValidators(network)
  .then(() => {
    console.log("[SyncValidators] Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[SyncValidators] Error:", error);
    process.exit(1);
  });

