import {
  Authorized,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Lockup,
  PublicKey,
  StakeProgram,
  Transaction,
  SendOptions,
  TransactionSignature,
} from '@solana/web3.js';

/**
 * Interface compatible with the Solana Wallet Adapter
 */
interface WalletInterface {
  publicKey: PublicKey | null;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
    options?: SendOptions & { signers?: Keypair[] }
  ) => Promise<TransactionSignature>;
}

/**
 * Validator details interface
 */
export interface ValidatorDetails {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number;
  commission: number;
  name?: string;
}

/**
 * Solana Staking Service
 * 
 * Complete Devnet staking service that handles:
 * - Fetching top validators by active stake
 * - Constructing staking transactions
 * - Managing dual-signature requirement (User Wallet + New Stake Account)
 * 
 * Uses the Solana Wallet Adapter pattern for wallet integration.
 */
export class SolanaStakingService {
  private connection: Connection;
  private wallet: WalletInterface;

  /**
   * Initializes the staking service with wallet adapter interface.
   * @param connection Solana connection instance
   * @param wallet Wallet adapter interface (compatible with useWallet hook)
   */
  constructor(connection: Connection, wallet: WalletInterface);
  /**
   * Legacy constructor for backward compatibility
   */
  constructor(
    connection: Connection,
    publicKey: PublicKey,
    signTransaction: (transaction: Transaction) => Promise<Transaction>,
    sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
  );
  constructor(
    connection: Connection,
    walletOrPublicKey: WalletInterface | PublicKey,
    signTransaction?: (transaction: Transaction) => Promise<Transaction>,
    sendTransaction?: (transaction: Transaction, connection: Connection) => Promise<string>
  ) {
    this.connection = connection;
    
    // Support both new wallet interface and legacy constructor
    if (walletOrPublicKey instanceof PublicKey && signTransaction && sendTransaction) {
      // Legacy mode - create a wallet-like object
      this.wallet = {
        publicKey: walletOrPublicKey,
        signTransaction,
        sendTransaction: async (tx: Transaction, conn: Connection, options?: SendOptions & { signers?: Keypair[] }) => {
          // For legacy mode, we need to handle signers manually
          if (options?.signers && options.signers.length > 0) {
            // Sign with wallet first, then partially sign with additional signers
            const signed = await signTransaction(tx);
            signed.partialSign(...options.signers);
            // Send the fully signed transaction
            return await sendTransaction(signed, conn);
          }
          return await sendTransaction(tx, conn);
        },
      };
    } else {
      // New wallet interface mode - wrap sendTransaction to handle signers
      const originalWallet = walletOrPublicKey as WalletInterface;
      this.wallet = {
        ...originalWallet,
        sendTransaction: async (tx: Transaction, conn: Connection, options?: SendOptions & { signers?: Keypair[] }) => {
          // If we have additional signers (like stake account keypair), we need special handling
          if (options?.signers && options.signers.length > 0) {
            try {
              // Ensure transaction is properly set up
              if (!tx.recentBlockhash) {
                const { blockhash } = await conn.getLatestBlockhash();
                tx.recentBlockhash = blockhash;
              }
              if (!tx.feePayer && originalWallet.publicKey) {
                tx.feePayer = originalWallet.publicKey;
              }

              // Check if signTransaction is available
              if (!originalWallet.signTransaction) {
                throw new Error("Wallet signTransaction is not available. Cannot sign transaction with additional signers.");
              }

              // Create a fresh copy of the transaction to avoid mutation issues
              // Serialize and deserialize to get a clean copy
              const txBuffer = tx.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
              });
              const txCopy = Transaction.from(txBuffer);
              
              // Ensure the copy has all necessary properties
              if (tx.recentBlockhash) txCopy.recentBlockhash = tx.recentBlockhash;
              if (tx.feePayer) txCopy.feePayer = tx.feePayer;
              if (tx.lastValidBlockHeight) txCopy.lastValidBlockHeight = tx.lastValidBlockHeight;
              
              // Step 1: Sign with wallet first (wallet adapter SDK)
              const walletSigned = await originalWallet.signTransaction(txCopy);
              
              // Step 2: Partially sign with additional signers (stake account keypair)
              walletSigned.partialSign(...options.signers);
              
              // Step 3: Send the fully signed transaction using connection directly
              const signature = await conn.sendRawTransaction(walletSigned.serialize(), {
                skipPreflight: options?.skipPreflight,
                maxRetries: options?.maxRetries,
              });
              
              return signature;
            } catch (error) {
              console.error("[SolanaStakingService] Error in dual-signature transaction:", error);
              console.error("[SolanaStakingService] Error details:", error instanceof Error ? error.stack : String(error));
              // Re-throw with more context
              if (error instanceof Error) {
                throw new Error(`Failed to send transaction with additional signers: ${error.message}`);
              }
              throw error;
            }
          }
          // No additional signers, use normal sendTransaction
          return await originalWallet.sendTransaction(tx, conn, options);
        },
      };
    }
  }

  /**
   * Gets the public key from the wallet
   */
  private get publicKey(): PublicKey {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    return this.wallet.publicKey;
  }

  /**
   * Creates a new stake account and funds it with the specified amount of SOL.
   * @param amountSol Amount of SOL to stake (excluding rent exemption).
   * @returns The generated stake account Keypair and transaction signature.
   */
  async createStakeAccount(amountSol: number): Promise<{ stakeAccount: Keypair; signature: string }> {
    const stakeAccount = Keypair.generate();
    const minimumRent = await this.connection.getMinimumBalanceForRentExemption(StakeProgram.space);
    const amountUserWantsToStake = amountSol * LAMPORTS_PER_SOL;
    const amountToStake = minimumRent + amountUserWantsToStake;

    const createStakeAccountInstruction = StakeProgram.createAccount({
      authorized: new Authorized(this.publicKey, this.publicKey),
      fromPubkey: this.publicKey,
      lamports: amountToStake,
      lockup: new Lockup(0, 0, this.publicKey),
      stakePubkey: stakeAccount.publicKey,
    });

    const transaction = new Transaction().add(createStakeAccountInstruction);
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = this.publicKey;

    // Use sendTransaction with signers array for dual-signature
    const signature = await this.wallet.sendTransaction(transaction, this.connection, {
      signers: [stakeAccount],
    });
    
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`[SolanaStakingService] Stake account created. Tx Id: ${signature}`);
    return { stakeAccount, signature };
  }

  /**
   * Delegates the stake account to a validator.
   * @param stakePubkey Public key of the stake account.
   * @param votePubkeyStr Validator vote account public key string.
   * @returns Transaction signature.
   */
  async delegateStake(stakePubkey: PublicKey, votePubkeyStr: string): Promise<string> {
    const votePubkey = new PublicKey(votePubkeyStr);
    const delegateInstruction = StakeProgram.delegate({
      stakePubkey,
      authorizedPubkey: this.publicKey,
      votePubkey,
    });

    const transaction = new Transaction().add(delegateInstruction);
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = this.publicKey;

    const signature = await this.wallet.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`[SolanaStakingService] Stake delegated. Tx Id: ${signature}`);
    return signature;
  }

  /**
   * Constructs and sends transactions to create a new stake account and delegate it.
   * Note: Solana requires creating the stake account first, then delegating in a separate transaction.
   * Uses dual-signature approach: Wallet (fee payer & authority) + Stake Account Keypair
   * 
   * @param amountSOL Amount of SOL to stake (e.g., 1.5)
   * @param validatorVoteAddress The vote address of the validator to delegate to
   * @returns Transaction signatures, stake account public key, and keypair
   */
  async stakeSol(amountSOL: number, validatorVoteAddress: string): Promise<{ signature: string; stakeAccount: string; stakeAccountKeypair: Keypair; createSignature: string; delegateSignature: string }> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const votePubkey = new PublicKey(validatorVoteAddress);
    const amountLamports = amountSOL * LAMPORTS_PER_SOL;
    
    // 1. Create a new Keypair for the Stake Account
    const stakeAccount = Keypair.generate();

    // 2. Calculate minimum rent exemption for a stake account
    const minimumRent = await this.connection.getMinimumBalanceForRentExemption(
      StakeProgram.space
    );

    // Step 1: Create the Stake Account
    const createStakeAccountIx = StakeProgram.createAccount({
      fromPubkey: this.publicKey,
      stakePubkey: stakeAccount.publicKey,
      authorized: {
        staker: this.publicKey,
        withdrawer: this.publicKey
      },
      lamports: minimumRent + amountLamports,
    });

    const createTransaction = new Transaction().add(createStakeAccountIx);
    const { blockhash: createBlockhash, lastValidBlockHeight: createLastValidBlockHeight } = 
      await this.connection.getLatestBlockhash();
    createTransaction.recentBlockhash = createBlockhash;
    createTransaction.lastValidBlockHeight = createLastValidBlockHeight;
    createTransaction.feePayer = this.publicKey;

    try {
      console.log(`[SolanaStakingService] Creating stake account...`);
      console.log(`[SolanaStakingService] Stake account pubkey: ${stakeAccount.publicKey.toBase58()}`);
      console.log(`[SolanaStakingService] Amount: ${amountSOL} SOL (${amountLamports} lamports)`);
      console.log(`[SolanaStakingService] Minimum rent: ${minimumRent} lamports`);
      
      // Send create transaction with stake account keypair as signer
      console.log(`[SolanaStakingService] Sending create transaction...`);
      const createSignature = await this.wallet.sendTransaction(createTransaction, this.connection, {
        signers: [stakeAccount],
      });
      console.log(`[SolanaStakingService] Create transaction sent: ${createSignature}`);

      // Wait for confirmation
      console.log(`[SolanaStakingService] Waiting for confirmation...`);
      const confirmation = await this.connection.confirmTransaction(createSignature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[SolanaStakingService] ✓ Stake account created. Tx: ${createSignature}`);

      // Wait a bit for the stake account to be fully initialized
      console.log(`[SolanaStakingService] Waiting for stake account initialization...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Delegate the Stake to the Validator
      console.log(`[SolanaStakingService] Creating delegate instruction...`);
      console.log(`[SolanaStakingService] Validator vote account: ${votePubkey.toBase58()}`);
      
      const delegateStakeIx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: this.publicKey,
        votePubkey: votePubkey,
      });

      const delegateTransaction = new Transaction().add(delegateStakeIx);
      const { blockhash: delegateBlockhash, lastValidBlockHeight: delegateLastValidBlockHeight } = 
        await this.connection.getLatestBlockhash();
      delegateTransaction.recentBlockhash = delegateBlockhash;
      delegateTransaction.lastValidBlockHeight = delegateLastValidBlockHeight;
      delegateTransaction.feePayer = this.publicKey;

      console.log(`[SolanaStakingService] Sending delegate transaction...`);
      const delegateSignature = await this.wallet.sendTransaction(delegateTransaction, this.connection);
      console.log(`[SolanaStakingService] Delegate transaction sent: ${delegateSignature}`);
      
      console.log(`[SolanaStakingService] Waiting for delegate confirmation...`);
      const delegateConfirmation = await this.connection.confirmTransaction(delegateSignature, 'confirmed');
      if (delegateConfirmation.value.err) {
        throw new Error(`Delegate transaction failed: ${JSON.stringify(delegateConfirmation.value.err)}`);
      }
      
      console.log(`[SolanaStakingService] Staking successful!`);
      console.log(`[SolanaStakingService] Create Tx: ${createSignature}`);
      console.log(`[SolanaStakingService] Delegate Tx: ${delegateSignature}`);
      console.log(`[SolanaStakingService] Stake Account: ${stakeAccount.publicKey.toBase58()}`);
      
      return { 
        signature: delegateSignature, // Return delegate signature as main signature
        stakeAccount: stakeAccount.publicKey.toBase58(),
        stakeAccountKeypair: stakeAccount, // Return the actual keypair
        createSignature,
        delegateSignature,
      };
    } catch (error) {
      console.error("[SolanaStakingService] ✗ Staking failed:", error);
      if (error instanceof Error) {
        console.error("[SolanaStakingService] Error message:", error.message);
        console.error("[SolanaStakingService] Error stack:", error.stack);
        // Re-throw with more context
        throw new Error(`Staking failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Creates a stake account and delegates it to a validator.
   * Uses sequential transactions (required by Solana - cannot combine create + delegate).
   * @param amountSol Amount of SOL to stake.
   * @param votePubkeyStr Validator vote account public key string.
   * @returns The stake account keypair and transaction signatures.
   */
  async createAndDelegateStake(
    amountSol: number,
    votePubkeyStr: string
  ): Promise<{ stakeAccount: Keypair; createSignature: string; delegateSignature: string }> {
    // Use the stakeSol method which handles sequential transactions properly
    const result = await this.stakeSol(amountSol, votePubkeyStr);
    
    // Return the actual keypair from stakeSol
    return {
      stakeAccount: result.stakeAccountKeypair,
      createSignature: result.createSignature,
      delegateSignature: result.delegateSignature,
    };
  }

  /**
   * Sequential staking approach (fallback method)
   */
  private async createAndDelegateStakeSequential(
    amountSol: number,
    votePubkeyStr: string
  ): Promise<{ stakeAccount: Keypair; createSignature: string; delegateSignature: string }> {
    const stakeAccount = Keypair.generate();
    const votePubkey = new PublicKey(votePubkeyStr);
    
    // Calculate amounts
    const minimumRent = await this.connection.getMinimumBalanceForRentExemption(StakeProgram.space);
    const amountUserWantsToStake = amountSol * LAMPORTS_PER_SOL;
    const amountToStake = minimumRent + amountUserWantsToStake;

    // Create stake account instruction
    const createStakeAccountInstruction = StakeProgram.createAccount({
      authorized: new Authorized(this.publicKey, this.publicKey),
      fromPubkey: this.publicKey,
      lamports: amountToStake,
      lockup: new Lockup(0, 0, this.publicKey),
      stakePubkey: stakeAccount.publicKey,
    });
    
    // Step 1: Create stake account
    const createTransaction = new Transaction().add(createStakeAccountInstruction);
    const { blockhash: createBlockhash, lastValidBlockHeight: createLastValidBlockHeight } = 
      await this.connection.getLatestBlockhash();
    createTransaction.recentBlockhash = createBlockhash;
    createTransaction.lastValidBlockHeight = createLastValidBlockHeight;
    createTransaction.feePayer = this.publicKey;

    const createSignature = await this.wallet.sendTransaction(createTransaction, this.connection, {
      signers: [stakeAccount],
    });
    
    // Wait for confirmation
    await this.connection.confirmTransaction(createSignature, 'confirmed');
    console.log(`[SolanaStakingService] Stake account created. Tx Id: ${createSignature}`);

    // Step 2: Wait for stake account to be fully initialized (devnet can be slow)
    let retries = 0;
    const maxRetries = 10;
    while (retries < maxRetries) {
      try {
        const accountInfo = await this.connection.getAccountInfo(stakeAccount.publicKey);
        if (accountInfo && accountInfo.owner.equals(StakeProgram.programId)) {
          break;
        }
      } catch {
        // Account might not be ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (retries >= maxRetries) {
      throw new Error('Stake account not ready after creation. Please try again.');
    }

    // Step 3: Delegate stake
    const delegateInstruction = StakeProgram.delegate({
      stakePubkey: stakeAccount.publicKey,
      authorizedPubkey: this.publicKey,
      votePubkey,
    });

    const delegateTransaction = new Transaction().add(delegateInstruction);
    const { blockhash: delegateBlockhash, lastValidBlockHeight: delegateLastValidBlockHeight } = 
      await this.connection.getLatestBlockhash();
    delegateTransaction.recentBlockhash = delegateBlockhash;
    delegateTransaction.lastValidBlockHeight = delegateLastValidBlockHeight;
    delegateTransaction.feePayer = this.publicKey;

    const delegateSignature = await this.wallet.sendTransaction(delegateTransaction, this.connection);
    await this.connection.confirmTransaction(delegateSignature, 'confirmed');
    
    console.log(`[SolanaStakingService] Stake delegated. Tx Id: ${delegateSignature}`);
    
    return { stakeAccount, createSignature, delegateSignature };
  }

  /**
   * Deactivates the stake account.
   * @param stakePubkey Public key of the stake account.
   * @returns Transaction signature.
   */
  async deactivateStake(stakePubkey: PublicKey): Promise<string> {
    const deactivateInstruction = StakeProgram.deactivate({
      stakePubkey,
      authorizedPubkey: this.publicKey,
    });

    const transaction = new Transaction().add(deactivateInstruction);
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = this.publicKey;

    const signature = await this.wallet.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`[SolanaStakingService] Stake deactivated. Tx Id: ${signature}`);
    return signature;
  }

  /**
   * Withdraws all funds from the stake account back to the wallet.
   * @param stakePubkey Public key of the stake account.
   * @returns Transaction signature.
   */
  async withdrawStake(stakePubkey: PublicKey): Promise<string> {
    const stakeBalance = await this.connection.getBalance(stakePubkey);
    
    if (stakeBalance === 0) {
      throw new Error('Stake account has no balance to withdraw');
    }

    const withdrawInstruction = StakeProgram.withdraw({
      stakePubkey,
      authorizedPubkey: this.publicKey,
      toPubkey: this.publicKey,
      lamports: stakeBalance,
    });

    const transaction = new Transaction().add(withdrawInstruction);
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = this.publicKey;

    const signature = await this.wallet.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`[SolanaStakingService] Stake withdrawn. Tx Id: ${signature}`);
    return signature;
  }

  /**
   * Placeholder for staking custom SPL tokens.
   * Currently unsupported as requested.
   */
  async stakeCustomToken(tokenMintAddress: string, amount: number): Promise<void> {
    console.warn(
      `[SolanaStakingService] Request to stake custom token ${tokenMintAddress} with amount ${amount}`
    );
    // Future implementation: Logic for Liquid Staking Tokens (LSTs) or Governance tokens would go here.
    throw new Error("Custom token staking is not currently supported by this service.");
  }

  /**
   * Gets the balance of the stake account in SOL.
   * @param stakePubkey Public key of the stake account.
   * @returns Balance in SOL.
   */
  async getStakeBalance(stakePubkey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(stakePubkey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Gets the activation status of the stake account.
   * @param stakePubkey Public key of the stake account.
   * @returns Stake activation info.
   */
  async getStakeStatus(stakePubkey: PublicKey) {
    const status = await this.connection.getStakeActivation(stakePubkey);
    return status;
  }

  /**
   * Gets stake account info.
   * @param stakePubkey Public key of the stake account.
   * @returns Stake account info or null if not found.
   */
  async getStakeAccountInfo(stakePubkey: PublicKey) {
    const accountInfo = await this.connection.getAccountInfo(stakePubkey);
    if (!accountInfo) {
      return null;
    }
    // Return account info - parsing can be done by caller if needed
    return {
      owner: accountInfo.owner,
      lamports: accountInfo.lamports,
      data: accountInfo.data,
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch,
    };
  }

  /**
   * Fetches top active validators on Devnet sorted by active stake.
   * @param limit Number of validators to return (default 10)
   * @returns Array of validator details sorted by activated stake (descending)
   */
  async getTopActiveValidators(limit: number = 10): Promise<ValidatorDetails[]> {
    try {
      // Fetch all vote accounts
      const { current } = await this.connection.getVoteAccounts();
      
      // We only want active (current) validators
      // Sort by activatedStake (descending) to find the "top" ones
      const sortedValidators = current.sort((a, b) => {
        return b.activatedStake - a.activatedStake;
      });

      return sortedValidators.slice(0, limit).map((val) => ({
        votePubkey: val.votePubkey,
        nodePubkey: val.nodePubkey,
        activatedStake: val.activatedStake,
        commission: val.commission,
      }));
    } catch (error) {
      console.error("[SolanaStakingService] Failed to fetch validators:", error);
      throw new Error("Could not fetch top validators.");
    }
  }

  /**
   * Fetches detailed info for active validators (legacy method for backward compatibility).
   * @returns Array of validator info objects.
   */
  async getValidatorInfos(): Promise<Array<{
    votePubkey: string;
    nodePubkey?: string;
    commission: number;
    activatedStake: number;
    name?: string;
    apy?: number;
  }>> {
    try {
      const validators = await this.getTopActiveValidators(100);
      return validators.map((v) => ({
        votePubkey: v.votePubkey,
        nodePubkey: v.nodePubkey,
        commission: v.commission,
        activatedStake: v.activatedStake / LAMPORTS_PER_SOL,
      }));
    } catch (error) {
      console.error('[SolanaStakingService] Error fetching validators:', error);
      throw error;
    }
  }

  /**
   * Gets all stake accounts for the connected wallet.
   * @returns Array of stake account public keys and their info.
   */
  async getStakeAccounts(): Promise<Array<{
    pubkey: PublicKey;
    balance: number;
    activation: { state: string; active: number; inactive: number };
  }>> {
    const stakeAccounts = await this.connection.getParsedProgramAccounts(
      StakeProgram.programId,
      {
        filters: [
          {
            memcmp: {
              offset: 12, // Stake account authorized staker offset
              bytes: this.publicKey.toBase58(),
            },
          },
        ],
      }
    );

    const results = await Promise.all(
      stakeAccounts.map(async (account) => {
        const pubkey = account.pubkey;
        const balance = await this.getStakeBalance(pubkey);
        const activation = await this.getStakeStatus(pubkey);
        
        return {
          pubkey,
          balance,
          activation,
        };
      })
    );

    return results;
  }

  /**
   * Request airdrop on devnet (for testing purposes).
   * @param amountSol Amount of SOL to airdrop.
   * @returns Transaction signature.
   */
  async requestAirdrop(amountSol: number): Promise<string> {
    const lamports = amountSol * LAMPORTS_PER_SOL;
    const signature = await this.connection.requestAirdrop(this.publicKey, lamports);
    await this.connection.confirmTransaction(signature, 'confirmed');
    console.log(`[SolanaStakingService] Airdrop received. Tx Id: ${signature}`);
    return signature;
  }
}

