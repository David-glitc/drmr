import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/staking
 * Get staking records for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
    }

    // Get staking records
    const stakingRecords = await prisma.stakingRecord.findMany({
      where: { userId: user.id },
      include: {
        validator: true,
      },
      orderBy: { stakedAt: "desc" },
    });

    return NextResponse.json({
      records: stakingRecords.map((record) => ({
        ...record,
        activatedStake: record.validator.activatedStake.toString(),
        epochCredits: record.validator.epochCredits.toString(),
        lastVote: record.validator.lastVote.toString(),
        rootSlot: record.validator.rootSlot.toString(),
        lastRewardEpoch: record.lastRewardEpoch?.toString(),
      })),
      totalStaked: stakingRecords.reduce((sum, r) => sum + r.amount, 0),
      totalRewards: stakingRecords.reduce((sum, r) => sum + r.totalRewards, 0),
    });
  } catch (error) {
    console.error("[Staking API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staking records", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staking
 * Create a new staking record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, validatorId, amount, stakeAccount } = body;

    if (!walletAddress || !validatorId || !amount) {
      return NextResponse.json(
        { error: "Wallet address, validator ID, and amount are required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
    }

    // Get validator to get current APY
    // Try by ID first, then by vote account
    let validator = await prisma.validator.findUnique({
      where: { id: validatorId },
    });

    if (!validator) {
      // Try finding by vote account (in case ID is actually vote account)
      validator = await prisma.validator.findUnique({
        where: { voteAccount: validatorId },
      });
    }

    if (!validator) {
      return NextResponse.json(
        { error: "Validator not found. Please sync validators first." },
        { status: 404 }
      );
    }

    // Create staking record
    const stakingRecord = await prisma.stakingRecord.create({
      data: {
        userId: user.id,
        validatorId: validator.id,
        amount: parseFloat(amount),
        stakeAccount: stakeAccount || null,
        apy: validator.apy,
        status: "delegating",
      },
      include: {
        validator: true,
      },
    });

    // Update user's total staked
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalStaked: {
          increment: parseFloat(amount),
        },
      },
    });

    return NextResponse.json({
      success: true,
      record: {
        ...stakingRecord,
        activatedStake: stakingRecord.validator.activatedStake.toString(),
        epochCredits: stakingRecord.validator.epochCredits.toString(),
        lastVote: stakingRecord.validator.lastVote.toString(),
        rootSlot: stakingRecord.validator.rootSlot.toString(),
        lastRewardEpoch: stakingRecord.lastRewardEpoch?.toString(),
      },
    });
  } catch (error) {
    console.error("[Staking API] Error creating staking record:", error);
    return NextResponse.json(
      { error: "Failed to create staking record", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

