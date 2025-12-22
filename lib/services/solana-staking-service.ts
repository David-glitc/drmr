import {
  Authorized,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Lockup,
  PublicKey,
  StakeProgram,
  Transaction,
  VoteAccountInfo,
} from '@solana/web3.js';

/**
 * Solana Staking Service
 * 
 * Handles staking operations on Solana using the wallet adapter.
 * Works with devnet (default) or mainnet.
 * 
 * This service uses the wallet adapter's signTransaction method instead of private keys.
 */
export class SolanaStakingService {
  private connection: Connection;
  private publicKey: PublicKey;
  private signTransaction: (transaction: Transaction) => Promise<Transaction>;
  private sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>;

  /**
   * Initializes the staking service with wallet adapter functions.
   * @param connection Solana connection instance
   * @param publicKey User's public key
   * @param signTransaction Wallet adapter's signTransaction function
   * @param sendTransaction Wallet adapter's sendTransaction function
   */
  constructor(
    connection: Connection,
    publicKey: PublicKey,
    signTransaction: (transaction: Transaction) => Promise<Transaction>,
    sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
  ) {
    this.connection = connection;
    this.publicKey = publicKey;
    this.signTransaction = signTransaction;
    this.sendTransaction = sendTransaction;
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

    // Sign with wallet adapter (for fee payer) and stake account keypair
    const signedTransaction = await this.signTransaction(transaction);
    signedTransaction.partialSign(stakeAccount);

    const signature = await this.sendTransaction(signedTransaction, this.connection);
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

    const signedTransaction = await this.signTransaction(transaction);
    const signature = await this.sendTransaction(signedTransaction, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`[SolanaStakingService] Stake delegated. Tx Id: ${signature}`);
    return signature;
  }

  /**
   * Creates a stake account and delegates it to a validator.
   * Uses a combined transaction for better efficiency on devnet.
   * @param amountSol Amount of SOL to stake.
   * @param votePubkeyStr Validator vote account public key string.
   * @returns The stake account keypair and transaction signatures.
   */
  async createAndDelegateStake(
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

    // Create delegate instruction (will be added after stake account is created)
    // Note: We can't combine these in one transaction, so we'll do them sequentially
    
    // Step 1: Create stake account
    const createTransaction = new Transaction().add(createStakeAccountInstruction);
    const { blockhash: createBlockhash, lastValidBlockHeight: createLastValidBlockHeight } = 
      await this.connection.getLatestBlockhash();
    createTransaction.recentBlockhash = createBlockhash;
    createTransaction.lastValidBlockHeight = createLastValidBlockHeight;
    createTransaction.feePayer = this.publicKey;

    const signedCreateTransaction = await this.signTransaction(createTransaction);
    signedCreateTransaction.partialSign(stakeAccount);
    
    const createSignature = await this.sendTransaction(signedCreateTransaction, this.connection);
    
    // Wait for confirmation
    await this.connection.confirmTransaction(createSignature, 'confirmed');
    console.log(`[SolanaStakingService] Stake account created. Tx Id: ${createSignature}`);

    // Step 2: Wait for stake account to be fully initialized (devnet can be slow)
    // Poll until stake account is ready
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

    const signedDelegateTransaction = await this.signTransaction(delegateTransaction);
    const delegateSignature = await this.sendTransaction(signedDelegateTransaction, this.connection);
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

    const signedTransaction = await this.signTransaction(transaction);
    const signature = await this.sendTransaction(signedTransaction, this.connection);
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

    const signedTransaction = await this.signTransaction(transaction);
    const signature = await this.sendTransaction(signedTransaction, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log(`[SolanaStakingService] Stake withdrawn. Tx Id: ${signature}`);
    return signature;
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
   * Fetches detailed info for active validators.
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
      const voteAccounts = await this.connection.getVoteAccounts();
      const validators = voteAccounts.current;

      return validators.map((v: VoteAccountInfo) => ({
        votePubkey: v.votePubkey,
        nodePubkey: v.nodePubkey,
        commission: v.commission,
        activatedStake: v.activatedStake / LAMPORTS_PER_SOL,
        // Name and APY would need to be fetched from external APIs or calculated
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

