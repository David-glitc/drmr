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
    if (sync) {
      console.log(`[Validators API] Syncing ${validators.length} validators to database...`);
      
      await Promise.all(
        validators.map(async (validator) => {
          try {
            // @ts-expect-error - Prisma client needs regeneration after schema update
            await prisma.validator.upsert({
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
          }
        })
      );

      console.log(`[Validators API] Successfully synced validators to database`);
    }

    // If syncing, get database IDs for validators
    type ValidatorWithId = ValidatorInfo & { id?: string };
    let validatorsWithIds: ValidatorWithId[] = validators;
    
    if (sync) {
      // @ts-expect-error - Prisma client needs regeneration after schema update
      const dbValidators = await prisma.validator.findMany({
        where: { network },
        select: { id: true, voteAccount: true },
      });
      
      const validatorMap = new Map(dbValidators.map((v: { voteAccount: string; id: string }) => [v.voteAccount, v.id]));
      validatorsWithIds = validators.map((v) => {
        const mappedId = validatorMap.get(v.voteAccount);
        return {
          ...v,
          id: mappedId ? mappedId : v.voteAccount, // Use vote account as fallback ID
        } as ValidatorWithId;
      });
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
      count: validators.length,
      network,
      synced: sync,
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
        // @ts-expect-error - Prisma client needs regeneration after schema update
        return await prisma.validator.upsert({
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

