// backend/src/services/escrowService.js
const anchor = require('@project-serum/anchor');
const { PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
// Import shared Anchor setup, including the backend wallet keypair
const { program, connection, backendWallet } = require('./anchorService');
const BN = require('bn.js');

/**
 * Calls the releaseFunds instruction on the Anchor program.
 * Requires backendWallet to be the authority stored in the escrow account.
 * @param {object} params - Parameters for releasing funds.
 * @param {string} params.escrowAddress - The public key string of the escrow PDA.
 * @param {string} params.initializerAddress - The public key string of the original initializer (needed for seeds).
 * @param {string} params.vaultAddress - The public key string of the vault PDA.
 * @param {string} params.recipientTokenAccountAddress - The public key string of the recipient's token account.
 * @param {BN} params.amountLamports - The amount to release in lamports (as a BN instance).
 * @returns {Promise<string>} - The transaction signature.
 * @throws {Error} - If the transaction fails.
 */
async function triggerReleaseFunds({ escrowAddress, initializerAddress, vaultAddress, recipientTokenAccountAddress, amountLamports }) {
    console.log(`Attempting to release ${amountLamports.toString()} lamports from escrow ${escrowAddress} to ${recipientTokenAccountAddress}`);

    if (!escrowAddress || !initializerAddress || !vaultAddress || !recipientTokenAccountAddress || !amountLamports) {
        throw new Error("Missing required parameters for triggerReleaseFunds");
    }
    if (!(amountLamports instanceof BN)) {
        throw new Error("amountLamports must be an instance of BN");
    }
    if (amountLamports.isNeg() || amountLamports.isZero()) {
        throw new Error("amountLamports must be positive");
    }


    const escrowPda = new PublicKey(escrowAddress);
    const vaultPda = new PublicKey(vaultAddress);
    const recipientAta = new PublicKey(recipientTokenAccountAddress);
    // Initializer Pubkey is needed for deriving/validating escrow seeds in the Accounts struct constraint
    // We don't pass it directly to .accounts() unless the struct requires it explicitly there
    // const initializerPubkey = new PublicKey(initializerAddress);

    try {
        // Ensure backendWallet is loaded (should be handled in anchorService)
        if (!backendWallet) {
            throw new Error("Backend wallet keypair not loaded in anchorService.");
        }
        console.log(`Using backend signer: ${backendWallet.publicKey.toBase58()}`);

        // Fetch escrow account data to ensure constraints can be checked if needed
        // (e.g., if constraint used escrow_account.initializer)
        // const escrowAccountData = await program.account.escrowAccount.fetch(escrowPda);
        // console.log("Fetched escrow data:", escrowAccountData);

        // Build the transaction using the program instance
        const signature = await program.methods
            .releaseFunds(amountLamports) // Pass amount as BN
            .accounts({
                escrowAccount: escrowPda,
                vaultTokenAccount: vaultPda,
                backendSigner: backendWallet.publicKey, // The backend wallet *must* be the signer
                recipientTokenAccount: recipientAta,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([backendWallet]) // Sign the transaction with the backend wallet's keypair
            .rpc({
                skipPreflight: false, // Keep preflight enabled
                commitment: 'confirmed'
            });

        console.log(`Release funds successful. Signature: ${signature}`);
        return signature;

    } catch (error) {
        console.error(`Error in triggerReleaseFunds for escrow ${escrowAddress}:`, error);
        // Try to parse AnchorError or ProgramError for more details
        try {
            const anchorError = anchor.AnchorError.parse(error.logs);
            if (anchorError) {
                console.error("Anchor Error:", anchorError);
                throw new Error(`Anchor Error: ${anchorError.error.errorMessage} (Code: ${anchorError.error.errorCode.code})`);
            }
            const programError = anchor.ProgramError.parse(error);
            if (programError) {
                console.error("Program Error:", programError);
                throw new Error(`Program Error: ${programError.msg} (Code: ${programError.code})`);
            }
        } catch (parseError) {
            console.error("Could not parse Anchor/Program error:", parseError);
        }
        // Fallback to original error
        throw error;
    }
}

module.exports = {
    triggerReleaseFunds,
};
