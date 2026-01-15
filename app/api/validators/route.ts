import { NextRequest, NextResponse } from "next/server";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { ValidatorService, type ValidatorInfo } from "@/lib/services/validator-service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/validators
 * Fetch validators from Solana and optionally sync with database
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get("network") || "devnet";
    const sync = searchParams.get("sync") === "true";

    // Get RPC endpoint based on network
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

    // Fallback to public endpoint if custom RPC fails
    if (!rpcUrl || rpcUrl.includes("YOUR_API_KEY")) {
      console.warn("[Validators API] Using public RPC endpoint. Consider setting NEXT_PUBLIC_SOLANA_RPC_DEVNET");
      rpcUrl = clusterApiUrl(network === "mainnet-beta" ? "mainnet-beta" : "devnet");
    }

    let connection: Connection;
    let validators;

    try {
      connection = new Connection(rpcUrl, "confirmed");
      const validatorService = new ValidatorService(connection, network as "devnet" | "mainnet-beta");

      // Fetch validators from Solana
      validators = await validatorService.fetchValidators();
    } catch (error) {
      console.error("[Validators API] Error connecting to RPC:", error);

      // If custom RPC fails, try public endpoint as fallback
      if (rpcUrl !== clusterApiUrl(network === "mainnet-beta" ? "mainnet-beta" : "devnet")) {
        console.log("[Validators API] Retrying with public RPC endpoint...");
        const publicRpcUrl = clusterApiUrl(network === "mainnet-beta" ? "mainnet-beta" : "devnet");
        connection = new Connection(publicRpcUrl, "confirmed");
        const validatorService = new ValidatorService(connection, network as "devnet" | "mainnet-beta");
        validators = await validatorService.fetchValidators();
      } else {
        throw error;
      }
    }

    // Sync with database if requested
    let dbSyncSuccess = false;
    if (sync) {
      try {
        console.log(`[Validators API] Syncing ${validators.length} validators to database...`);

        const syncResults = await Promise.allSettled(
          validators.map(async (validator) => {
            try {
              await (prisma as any).validator.upsert({
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
            } catch (error) {
              console.error(`[Validators API] Error syncing validator ${validator.voteAccount}:`, error);
              throw error;
            }
          })
        );

        const successful = syncResults.filter((r) => r.status === "fulfilled").length;
        const failed = syncResults.filter((r) => r.status === "rejected").length;

        if (successful > 0) {
          console.log(`[Validators API] Successfully synced ${successful} validators to database${failed > 0 ? ` (${failed} failed)` : ""}`);
          dbSyncSuccess = true;
        } else {
          console.warn(`[Validators API] Database sync failed for all validators. Continuing without database sync.`);
        }
      } catch (error) {
        // Database connection error - log but don't fail the entire request
        console.error(`[Validators API] Database connection error during sync:`, error);
        console.warn(`[Validators API] Continuing without database sync. Validators will still be returned from Solana.`);
        dbSyncSuccess = false;
      }
    }

    // Filter to only active validators (non-delinquent)
    // For devnet, we only want active validators
    const activeValidators = validators.filter((v) => !v.delinquent);

    // If syncing and database is available, get database IDs for validators
    type ValidatorWithId = ValidatorInfo & { id?: string };
    let validatorsWithIds: ValidatorWithId[] = activeValidators;

    if (sync && dbSyncSuccess) {
      try {
        const dbValidators = await (prisma as any).validator.findMany({
          where: {
            network,
            isActive: true, // Only get active validators
          },
          select: { id: true, voteAccount: true },
        });

        const validatorMap = new Map(dbValidators.map((v: { voteAccount: string; id: string }) => [v.voteAccount, v.id]));
        validatorsWithIds = activeValidators.map((v) => {
          const mappedId = validatorMap.get(v.voteAccount);
          return {
            ...v,
            id: mappedId ? mappedId : v.voteAccount, // Use vote account as fallback ID
          } as ValidatorWithId;
        });
      } catch (error) {
        // Database query failed - use vote account as ID fallback
        console.warn(`[Validators API] Could not fetch database IDs. Using vote accounts as IDs.`, error instanceof Error ? error.message : String(error));
        validatorsWithIds = activeValidators.map((v) => ({
          ...v,
          id: v.voteAccount,
        } as ValidatorWithId));
      }
    } else {
      // No sync or sync failed - use vote account as ID
      validatorsWithIds = activeValidators.map((v) => ({
        ...v,
        id: v.voteAccount,
      } as ValidatorWithId));
    }

    return NextResponse.json({
      validators: validatorsWithIds.map((v) => ({
        ...v,
        id: v.id || v.voteAccount,
        activatedStake: v.activatedStake.toString(),
        epochCredits: v.epochCredits.toString(),
        lastVote: v.lastVote.toString(),
        rootSlot: v.rootSlot.toString(),
      })),
      count: activeValidators.length,
      network,
      synced: sync && dbSyncSuccess,
      dbAvailable: dbSyncSuccess,
    });
  } catch (error) {
    console.error("[Validators API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch validators", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/validators/sync
 * Force sync validators with database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const network = body.network || "devnet";

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
    const validatorService = new ValidatorService(connection, network as "devnet" | "mainnet-beta");

    const validators = await validatorService.fetchValidators();

    // Sync to database
    const results = await Promise.allSettled(
      validators.map(async (validator) => {
        return await (prisma as any).validator.upsert({
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
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      synced: successful,
      failed,
      total: validators.length,
      network,
    });
  } catch (error) {
    console.error("[Validators API] Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync validators", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

