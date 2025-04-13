// controllers/escrowController.js
const anchor = require('@project-serum/anchor');
const { PublicKey, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const anchorService = require('../services/anchorService'); // Assuming path is correct

// *** NEW FUNCTION ***
/**
 * Provides necessary data for the frontend to construct the initialize transaction.
 */
exports.getInitData = async (req, res, next) => {
    console.log("\n--- Received request for /escrow/init-data ---");
    try {
        const { userPubkey } = req.body; // Only need userPubkey
        console.log("Request Body:", req.body);

        if (!userPubkey) {
            console.error("Missing userPubkey in /init-data request.");
            return res.status(400).json({ error: "Missing userPubkey" });
        }

        let userPublicKey;
        try {
            userPublicKey = new PublicKey(userPubkey);
        } catch (e) {
            console.error("Invalid userPubkey provided:", e.message);
            return res.status(400).json({ error: `Invalid userPubkey provided: ${e.message}` });
        }

        console.log("Deriving PDAs...");
        // Derive the escrow PDA.
        const [escrowPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("escrow"), userPublicKey.toBuffer()],
            anchorService.program.programId
        );

        // Derive the vault token account PDA.
        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), escrowPda.toBuffer()],
            anchorService.program.programId
        );
        console.log(`Escrow PDA: ${escrowPda.toBase58()}, Vault PDA: ${vaultPda.toBase58()}`);

        console.log("Fetching latest blockhash...");
        const { blockhash } = await anchorService.connection.getLatestBlockhash();
        console.log(`Blockhash: ${blockhash}`);

        console.log("Sending response for /init-data...");
        // Send back the necessary data as strings
        res.json({
            success: true,
            escrowPubkey: escrowPda.toBase58(),
            vaultPubkey: vaultPda.toBase58(),
            recentBlockhash: blockhash,
            programId: anchorService.program.programId.toBase58(), // Send program ID too
        });
        console.log("--- Successfully processed /escrow/init-data ---");

    } catch (error) {
        console.error("!!! Error in getInitData:", error);
        next(error);
    }
};


// --- generateInitializePdaTransaction (Keep for reference or remove if unused) ---
exports.generateInitializePdaTransaction = async (req, res, next) => {
    // ... (previous code remains here, but won't be used by the new frontend flow) ...
    console.log("\n--- Received request for /escrow/initialize-pda (DEPRECATED FLOW) ---");
    // ... rest of the function ...
};

// --- submitTransaction (No changes needed here) ---
exports.submitTransaction = async (req, res, next) => {
    console.log("\n--- Received request for /escrow/submit ---");
    try {
        const { signedTransaction } = req.body;
        console.log("Request Body received in /submit:", req.body ? "Exists" : "Missing");

        if (!signedTransaction) {
            console.error("Missing signedTransaction field in /submit request.");
            return res.status(400).json({ error: "Missing signedTransaction field" });
        }
        console.log(`Received signedTransaction starting with: ${signedTransaction.substring(0, 10)}...`);

        console.log("Calling anchorService.submitTransaction...");
        const signature = await anchorService.submitTransaction(signedTransaction); // Service handles sending

        console.log("anchorService.submitTransaction returned successfully.");
        console.log("Sending response for /submit...");
        res.json({ success: true, signature });
        console.log("--- Successfully processed /escrow/submit ---");

    } catch (error) {
        console.error("!!! Error in submitTransaction controller:", error);
        next(error);
    }
};
