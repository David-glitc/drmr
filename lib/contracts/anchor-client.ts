import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import idl from "./drmr_staking.json";
import type { DrmrStaking } from "./drmr_staking";

// Wallet interface that Anchor expects
interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

// Program ID from your contract
export const DRMR_STAKING_PROGRAM_ID = new PublicKey(
  "FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX"
);

// PDA seeds
export const STAKING_POOL_SEED = "staking_pool";
export const STAKER_SEED = "staker";
export const STAKE_VAULT_SEED = "stake_vault";
export const REWARD_VAULT_SEED = "reward_vault";
export const TRUSTED_ADMIN_SEED = "trusted_admin";

/**
 * Get the Anchor program instance
 */
export function getAnchorProgram(
  connection: Connection,
  wallet: AnchorWallet
): Program<DrmrStaking> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  return new Program(idl as Idl, provider) as Program<DrmrStaking>;
}

/**
 * React hook to get the Anchor program
 */
export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    const walletAdapter: AnchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions 
        ? wallet.signAllTransactions.bind(wallet)
        : async (txs) => {
            // Fallback: sign transactions one by one if signAllTransactions is not available
            return Promise.all(txs.map(tx => wallet.signTransaction!(tx)));
          },
    };

    return getAnchorProgram(connection, walletAdapter);
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);
}

/**
 * Derive PDA addresses
 */
export function deriveStakingPoolPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKING_POOL_SEED)],
    DRMR_STAKING_PROGRAM_ID
  );
}

export function deriveStakerPDA(
  stakingPool: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKER_SEED), stakingPool.toBuffer(), user.toBuffer()],
    DRMR_STAKING_PROGRAM_ID
  );
}

export function deriveStakeVaultPDA(
  stakingPool: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKE_VAULT_SEED), stakingPool.toBuffer()],
    DRMR_STAKING_PROGRAM_ID
  );
}

export function deriveRewardVaultPDA(
  stakingPool: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(REWARD_VAULT_SEED), stakingPool.toBuffer()],
    DRMR_STAKING_PROGRAM_ID
  );
}