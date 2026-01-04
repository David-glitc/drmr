import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { DrmrStaking } from "../target/types/drmr_staking";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

describe("drmr_staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.drmrStaking as Program<DrmrStaking>;
  const provider = anchor.AnchorProvider.env();

  it("Is initialized!", async () => {
    // Derive the staking pool PDA
    const [stakingPoolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );

    // Create a creator keypair
    const creator = Keypair.generate();
    
    // Airdrop SOL to creator for transaction fees
    const airdropSig = await provider.connection.requestAirdrop(
      creator.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Mock mint account (using a dummy keypair since it's not validated)
    const drmrMint = Keypair.generate().publicKey;

    // u16 can be a number, u64 must be BN
    const apy = 1000;
    const max_stake_epoch_cycles = new BN(2);

    // Execute initialize with all required accounts (Anchor converts snake_case to camelCase)
    const tx = await program.methods
      .initialize(apy, max_stake_epoch_cycles)
      .accounts({
        stakingPool: stakingPoolPDA,
        creator: creator.publicKey,
        drmrMint: drmrMint,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([creator])
      .rpc();
    
    console.log("Your transaction signature", tx);
  });
});
