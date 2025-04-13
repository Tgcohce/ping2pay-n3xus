// services/anchorService.js
const anchor = require('@project-serum/anchor');
const { Connection, PublicKey, clusterApiUrl, Keypair, SendTransactionError } = require('@solana/web3.js'); // Import SendTransactionError
const fs = require('fs');
const path = require('path');
const { solana, programId, backendWalletSecret } = require('../config'); // Assuming config file exists

// --- IDL Loading ---
const idlPath = path.join(__dirname, 'idl', 'idl.json'); // Adjust path if needed
let idl;
try {
    const idlData = fs.readFileSync(idlPath, 'utf8');
    idl = JSON.parse(idlData);
    console.log("Loaded IDL successfully.");
} catch (err) {
    console.error("Error loading IDL file from:", idlPath, err);
    process.exit(1);
}

// --- Solana Connection & Provider Setup ---
const network = solana?.network || clusterApiUrl('devnet');
const connection = new Connection(network, 'confirmed');
console.log(`Connected to Solana cluster: ${network}`);

let backendWallet;
try {
    backendWallet = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(backendWalletSecret))
    );
    console.log(`Backend wallet loaded: ${backendWallet.publicKey.toBase58()}`);
} catch (err) {
    console.error("Error loading backend wallet from secret key:", err);
    process.exit(1);
}

const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(backendWallet),
    { preflightCommitment: 'confirmed' }
);
anchor.setProvider(provider);

// --- Anchor Program Instantiation ---
let program;
try {
    const resolvedProgramId = new PublicKey(programId);
    program = new anchor.Program(idl, resolvedProgramId, provider);
    console.log(`Anchor program instantiated for program ID: ${resolvedProgramId.toBase58()}`);
} catch (err) {
    console.error("Error instantiating Anchor program:", err);
    process.exit(1);
}

/**
 * Submits a client-signed transaction (expected to be Base64 encoded string)
 * to the Solana network.
 *
 * @param {string} signedTxBase64 - The Base64 encoded string of the signed transaction.
 * @returns {Promise<string>} - The transaction signature.
 * @throws {Error} - Throws an error if submission or confirmation fails.
 */
async function submitTransaction(signedTxBase64) {
    console.log("Received signed transaction (Base64) for submission.");
    const signedTxBuffer = Buffer.from(signedTxBase64, "base64");
    console.log(`Decoded buffer length: ${signedTxBuffer.length}`);

    try {
        console.log("Sending raw transaction buffer...");
        const signature = await connection.sendRawTransaction(
            signedTxBuffer,
            {
                skipPreflight: false, // Keep preflight enabled to catch simulation errors
                preflightCommitment: 'confirmed' // Or 'processed'
            }
        );
        console.log(`Transaction sent. Signature: ${signature}`);

        console.log("Confirming transaction...");
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
            console.error("Transaction confirmation failed:", confirmation.value.err);
            // Try to get logs even on confirmation failure, though less likely here
            let logs = [];
            try {
                logs = (await connection.getConfirmedTransaction(signature))?.meta?.logMessages || [];
            } catch (logErr) {
                console.warn("Could not fetch logs for failed confirmation:", logErr);
            }
            throw new Error(`Transaction confirmation failed: ${JSON.stringify(confirmation.value.err)}\nLogs:\n${logs.join('\n')}`);
        }

        console.log(`Transaction confirmed successfully. Signature: ${signature}`);
        return signature;

    } catch (err) {
        console.error("Transaction submission/confirmation failed:", err.message); // Log the message

        // *** Attempt to get logs if it's a SendTransactionError ***
        if (err instanceof SendTransactionError) {
            console.error("Error is SendTransactionError. Attempting to get logs...");
            try {
                const logs = await err.getLogs(); // Call the method as suggested
                if (logs) {
                    console.error("Simulation Logs:\n", logs.join('\n'));
                    // Include logs in the error thrown upwards
                    err.message += `\n--- Simulation Logs ---\n${logs.join('\n')}`;
                } else {
                    console.error("getLogs() returned null or undefined.");
                }
            } catch (logError) {
                console.error("!!! Failed to get logs from SendTransactionError:", logError);
            }
        }
        // Rethrow the original (potentially augmented) error
        throw err;
    }
}

// --- Exports ---
module.exports = {
    connection,
    provider,
    program,
    backendWallet,
    submitTransaction,
};
