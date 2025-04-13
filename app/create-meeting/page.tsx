"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Buffer } from 'buffer';
import { Button } from "@/components/ui/button";
// Assuming these UI components exist and are imported correctly
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { WalletButton } from "@/components/wallet-button";

import usePhantomWallet from "@/hooks/usePhantomWallet"; // Assuming path is correct
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  clusterApiUrl
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from "bn.js";
import * as anchor from "@project-serum/anchor";
// Ensure the path to your CORRECTED IDL (with metadata) is right
// Example: Adjust if your idl folder is elsewhere relative to this file
import idlJson from '../idl/idl.json';

// --- Constants ---
const BACKEND_AUTHORITY_PUBKEY = new PublicKey("BMkbUX4AvG1xVwKgCLNWUwtYDppMYB6hWVoqeqfmNAbC");
const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); // Devnet USDC Mint
const USDC_DECIMALS = 6;
const STAKE_AMOUNT_USDC = 10;
const DEFAULT_MEETING_DURATION_MINUTES = 60;
const BACKEND_URL = "http://localhost:3002";
const network = clusterApiUrl('devnet');
const connection = new Connection(network, 'confirmed');


// --- Component ---
export default function CreateMeeting() {
  const router = useRouter();
  // Get wallet object AND signTransaction function separately
  const { publicKey, signTransaction: signTransactionFromHook, connect, wallet } = usePhantomWallet();

  // --- State ---
  const [meetingTitle, setMeetingTitle] = useState("My Staked Meeting");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [meetingTime, setMeetingTime] = useState<Date | undefined>(() => { const now = new Date(); now.setHours(now.getHours() + 1, 0, 0, 0); return now; });
  const [platform, setPlatform] = useState("zoom");
  const [beneficiary, setBeneficiary] = useState("host");
  const [errorMessage, setErrorMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false); // Loading state for connection
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for form submission
  const [loadingStep, setLoadingStep] = useState("");
  const [escrowPubkeyStr, setEscrowPubkeyStr] = useState<string | null>(null);
  const [vaultPubkeyStr, setVaultPubkeyStr] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const isConnected = !!publicKey;

  // --- Frontend Anchor Provider & Program ---
  const provider = useMemo(() => {
    console.log("Attempting to create provider..."); // Log entry
    // Check all required components from the hook/wallet object
    if (!wallet) {
      console.log("Provider not created: `wallet` object is null.");
      return null;
    }
    if (!publicKey) {
      console.log("Provider not created: `publicKey` is null.");
      return null;
    }
    // *** Explicitly check for signTransaction on the wallet object ***
    // NOTE: Phantom's injected wallet object might have slightly different structure
    // depending on adapter versions. Check what `wallet` actually contains.
    if (typeof wallet.signTransaction !== 'function') {
      console.error("Provider not created: `wallet.signTransaction` is not a function on the wallet object.", wallet);
      // setErrorMessage("Wallet provider issue: signTransaction method missing on wallet object.");
      return null;
    }
    // Check for signAllTransactions if your app needs it, otherwise optional
    if (typeof wallet.signAllTransactions !== 'function') {
      console.warn("Provider warning: `wallet.signAllTransactions` is not a function on the wallet object.");
    }

    console.log("Creating Anchor Provider with publicKey:", publicKey.toBase58());
    // Construct the wallet object expected by AnchorProvider
    const anchorWallet = {
      publicKey: publicKey,
      signTransaction: (tx: Transaction) => wallet.signTransaction!(tx), // Use method from wallet object
      signAllTransactions: wallet.signAllTransactions ? (txs: Transaction[]) => wallet.signAllTransactions!(txs) : undefined
    };

    return new anchor.AnchorProvider(connection, anchorWallet as anchor.Wallet, { preflightCommitment: 'confirmed' });
  }, [wallet, publicKey]); // Recreate provider if wallet or publicKey changes

  const program = useMemo(() => {
    console.log("Attempting to create program instance...");
    if (!provider) {
      console.log("Program not created: Provider is null.");
      return null;
    }
    // *** Add detailed check for IDL content ***
    if (!idlJson) {
      console.error("IDL JSON object is null or undefined. Check import.");
      setErrorMessage("IDL file issue: Failed to import.");
      return null;
    }
    if (!idlJson.metadata) {
      console.error("IDL JSON is missing 'metadata' field.", idlJson);
      setErrorMessage("IDL file issue: Missing 'metadata'.");
      return null;
    }
    if (!idlJson.metadata.address) {
      console.error("IDL JSON is missing 'metadata.address' field.", idlJson.metadata);
      setErrorMessage("IDL file issue: Missing 'metadata.address'.");
      return null;
    }
    console.log("IDL JSON seems valid, attempting program creation...");

    try {
      const programId = new PublicKey(idlJson.metadata.address);
      const createdProgram = new anchor.Program(idlJson as anchor.Idl, programId, provider);
      console.log(`Frontend Anchor program initialized successfully for ID: ${programId.toBase58()}`);
      return createdProgram;
    } catch (e: any) {
      console.error("Error creating frontend program instance:", e);
      setErrorMessage(`Failed to initialize program interface: ${e.message}`);
      return null;
    }
  }, [provider]); // Recreate program if provider changes


  // Ensure Buffer polyfill is available
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
      window.Buffer = Buffer;
      console.log("Buffer polyfill applied to window object.");
    }
  }, []);

  useEffect(() => {
    // Log status changes, use signTransactionFromHook from the hook directly
    // This function (`signTransactionFromHook`) is what we should check for readiness
    console.log(`EFFECT: Wallet status changed: isConnected=${isConnected}, pk=${!!publicKey}, program=${!!program}, signTxFunc=${!!signTransactionFromHook}`);
    if (isConnected && program && !errorMessage.includes("Program init error")) {
      setErrorMessage("");
    }
    // Add signTransactionFromHook to dependency array
  }, [isConnected, publicKey, program, signTransactionFromHook, errorMessage]);

  // --- Handlers ---
  const handleConnectWallet = async () => {
    // *** Add log for isConnecting state at entry ***
    console.log(`handleConnectWallet called. isConnecting=${isConnecting}`);
    if (isConnecting) {
      console.log("handleConnectWallet: Already connecting, returning.");
      return;
    }
    setErrorMessage("");
    setIsConnecting(true);
    try {
      console.log("Attempting wallet connection..."); // Check if this appears
      await connect(); // Call the connect function from the hook
      console.log("Wallet connect function finished.");
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setErrorMessage(`Failed to connect wallet: ${err.message}`);
    } finally {
      console.log("handleConnectWallet: Setting isConnecting to false.");
      setIsConnecting(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isConnecting) return;
    if (!userEmail || !/\S+@\S+\.\S+/.test(userEmail)) { setErrorMessage("Please enter a valid email address."); return; }
    setIsSubmitting(true); setErrorMessage(""); setEscrowPubkeyStr(null); setVaultPubkeyStr(null); setLoadingStep("Starting...");
    console.log("--- Starting handleCreateMeeting (Initialize + Deposit + Zoom Flow) ---");

    // 1. --- Pre-flight Checks ---
    // Use the hook's signTransaction function directly in the check
    const currentPublicKey = publicKey;
    const currentSignTransaction = signTransactionFromHook; // Use function from hook
    const currentProgram = program;
    const currentIsConnected = !!currentPublicKey;

    if (!currentIsConnected || !currentPublicKey || !currentSignTransaction || !currentProgram) {
      const errorMsg = `Pre-flight check failed: Wallet or Program not ready. (isConnected: ${currentIsConnected}, publicKey: ${!!currentPublicKey}, signTransactionFn: ${!!currentSignTransaction}, program: ${!!currentProgram})`;
      console.error(errorMsg);
      let specificError = "Wallet not connected or signTransaction function unavailable.";
      if (!currentProgram && currentIsConnected) { specificError = "Program interface failed to initialize. Check IDL."; }
      setErrorMessage(specificError + " Please connect/reconnect and check console.");
      setIsSubmitting(false); setLoadingStep(""); return;
    }
    console.log("Pre-flight checks passed.");

    let escrowPda: PublicKey | null = null, vaultPda: PublicKey | null = null, initSignature: string | null = null, depositSignature: string | null = null, zoomMeetingData: any = null, combinedDateTime: Date | null = null;
    try {
      combinedDateTime = new Date(meetingDate!); combinedDateTime.setHours(meetingTime!.getHours()); combinedDateTime.setMinutes(meetingTime!.getMinutes()); combinedDateTime.setSeconds(0); combinedDateTime.setMilliseconds(0);

      // Step 2: Get Init Data
      setLoadingStep("Fetching account data..."); console.log("Step 2: Fetching init data...");
      const initDataUrl = `${BACKEND_URL}/escrow/init-data`; const initDataResp = await fetch(initDataUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userPubkey: currentPublicKey.toBase58() }) }); if (!initDataResp.ok) { const d = await initDataResp.text(); throw new Error(`Failed init data: ${d} (${initDataResp.status})`); } const { escrowPubkey, vaultPubkey, recentBlockhash, programId: backendProgramId } = await initDataResp.json(); console.log("Received Init Data:", { escrowPubkey, vaultPubkey, recentBlockhash }); setEscrowPubkeyStr(escrowPubkey); setVaultPubkeyStr(vaultPubkey); if (!escrowPubkey || !vaultPubkey || !recentBlockhash) { throw new Error("Incomplete init data."); } if (currentProgram.programId.toBase58() !== backendProgramId) { console.warn(`Program ID mismatch!`); } escrowPda = new PublicKey(escrowPubkey); vaultPda = new PublicKey(vaultPubkey);

      // Step 3-6: Initialize Tx
      setLoadingStep("Creating escrow account..."); console.log("Step 3: Building Initialize..."); let initializeTx = await currentProgram.methods.initialize(BACKEND_AUTHORITY_PUBKEY).accounts({ escrowAccount: escrowPda, vaultTokenAccount: vaultPda, initializer: currentPublicKey, usdcMint: USDC_MINT, systemProgram: SystemProgram.programId, tokenProgram: TOKEN_PROGRAM_ID }).transaction(); initializeTx.feePayer = currentPublicKey; initializeTx.recentBlockhash = recentBlockhash; console.log("Step 4: Signing Initialize..."); const signedInitializeTx = await currentSignTransaction(initializeTx); console.log("Step 5: Serializing Initialize..."); const base64InitializeTx = signedInitializeTx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"); console.log("Step 6: Submitting Initialize..."); const submitInitUrl = `${BACKEND_URL}/escrow/submit`; const submitInitResp = await fetch(submitInitUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ signedTransaction: base64InitializeTx }) }); if (!submitInitResp.ok) { const d = await submitInitResp.text(); throw new Error(`Backend submit failed (Initialize): ${d} (${submitInitResp.status})`); } const initResult = await submitInitResp.json(); initSignature = initResult.signature; console.log("Initialize successful! Signature:", initSignature);

      // Step 7-11: Deposit Tx
      setLoadingStep(`Staking ${STAKE_AMOUNT_USDC} USDC...`); console.log("Step 7: Preparing Deposit..."); const depositAmountLamports = new BN(STAKE_AMOUNT_USDC).mul(new BN(10).pow(new BN(USDC_DECIMALS))); const depositorTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, currentPublicKey, true); console.log(`User's USDC ATA: ${depositorTokenAccount.toBase58()}`); console.log("Step 8: Building Deposit..."); const { blockhash: depositBlockhash } = await connection.getLatestBlockhash(); let depositTx = await currentProgram.methods.deposit(depositAmountLamports).accounts({ escrowAccount: escrowPda, depositor: currentPublicKey, depositorTokenAccount: depositorTokenAccount, vaultTokenAccount: vaultPda, tokenProgram: TOKEN_PROGRAM_ID }).transaction(); depositTx.feePayer = currentPublicKey; depositTx.recentBlockhash = depositBlockhash; console.log("Step 9: Signing Deposit..."); const signedDepositTx = await currentSignTransaction(depositTx); console.log("Step 10: Serializing Deposit..."); const base64DepositTx = signedDepositTx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"); console.log("Step 11: Submitting Deposit..."); const submitDepositUrl = `${BACKEND_URL}/escrow/submit`; const submitDepositResp = await fetch(submitDepositUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ signedTransaction: base64DepositTx }) }); if (!submitDepositResp.ok) { const d = await submitDepositResp.text(); throw new Error(`Backend submit failed (Deposit): ${d} (${submitDepositResp.status})`); } const depositResult = await submitDepositResp.json(); depositSignature = depositResult.signature; console.log("Deposit successful! Signature:", depositSignature);

      // Step 12: Create Zoom Meeting
      setLoadingStep("Creating Zoom meeting..."); console.log("Step 12: Creating Zoom meeting..."); const zoomPayload = { topic: meetingTitle || "Staked Meeting", startTimeISO: combinedDateTime ? combinedDateTime.toISOString() : new Date(Date.now() + 5*60000).toISOString(), durationMinutes: DEFAULT_MEETING_DURATION_MINUTES, userEmail: userEmail }; console.log("Sending to Zoom create endpoint:", zoomPayload); const zoomUrl = `${BACKEND_URL}/zoom/create-meeting`; const zoomResp = await fetch(zoomUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(zoomPayload) }); console.log(`Fetch response status (Zoom create): ${zoomResp.status}`); if (!zoomResp.ok) { const d = await zoomResp.text(); throw new Error(`Failed Zoom: ${d} (${zoomResp.status})`); } zoomMeetingData = await zoomResp.json(); console.log("Zoom meeting created:", zoomMeetingData);

      // Step 13: Navigate
      console.log("Navigating to confirmation page..."); router.push(`/meeting-created?` + new URLSearchParams({ title: meetingTitle || "Staked Meeting", dateTime: combinedDateTime ? combinedDateTime.toLocaleString() : "N/A", joinUrl: zoomMeetingData?.joinUrl || "N/A", stakeAmount: String(STAKE_AMOUNT_USDC), beneficiary: beneficiary, escrow: escrowPubkey || "N/A", initTx: initSignature || "N/A", depositTx: depositSignature || "N/A", email: userEmail }).toString()); console.log("--- Process Completed Successfully ---");

    } catch (err: any) { console.error("!!! Error in handleCreateMeeting main try block:", err); setErrorMessage(`Error: ${err.message || "An unknown error occurred."}`); setIsSubmitting(false); setLoadingStep("");
    } finally { console.log("--- Exiting handleCreateMeeting ---"); }

  };

  // Use signTransactionFromHook in the check
  const isSubmitDisabled = !publicKey || !signTransactionFromHook || !program || isConnecting || isSubmitting;

  // --- Render ---
  return (
      <main className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Create Meeting & Stake {STAKE_AMOUNT_USDC} USDC</h1>
        <Card className="max-w-2xl mx-auto shadow-lg rounded-lg">
          <form onSubmit={handleCreateMeeting}>
            <CardHeader>
              <CardTitle className="text-xl">Meeting Details</CardTitle>
              <CardDescription>
                Set up your meeting. This will create an escrow and require a {STAKE_AMOUNT_USDC} USDC stake.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Meeting Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="font-medium">Meeting Title</Label>
                <Input id="title" placeholder="e.g., Weekly Team Sync" required value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="rounded-md" />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">Your Email (for Zoom Check)</Label>
                <Input id="email" type="email" placeholder="you@example.com" required value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="rounded-md" />
                <p className="text-xs text-muted-foreground">Email used to join Zoom.</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="font-medium">Description (Optional)</Label>
                <Textarea id="description" placeholder="e.g., Discuss project updates" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-md" />
              </div>

              {/* Date and Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"> <Label className="font-medium">Date</Label> <DatePicker value={meetingDate} onChange={setMeetingDate} /> </div>
                <div className="space-y-2"> <Label className="font-medium">Time</Label> <TimePicker value={meetingTime} onChange={setMeetingTime} /> </div>
              </div>

              {/* Meeting Platform */}
              <div className="space-y-2">
                <Label htmlFor="platform" className="font-medium">Meeting Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger id="platform" className="rounded-md"><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent> <SelectItem value="zoom">Zoom</SelectItem> <SelectItem value="google-meet" disabled>Google Meet (Not Implemented)</SelectItem> </SelectContent>
                </Select>
              </div>

              {/* Stake Amount Display (Fixed) */}
              <div className="space-y-2">
                <Label className="font-medium">Stake Amount</Label>
                <Input value={`${STAKE_AMOUNT_USDC} USDC (Devnet)`} disabled className="rounded-md bg-gray-100 dark:bg-gray-800" />
                <p className="text-xs text-gray-500 dark:text-gray-400">This amount will be transferred to the escrow vault upon creation.</p>
              </div>

              {/* Stake Beneficiary */}
              <div className="space-y-2">
                <Label className="font-medium">Stake Beneficiary (If you miss)</Label>
                <RadioGroup value={beneficiary} onValueChange={setBeneficiary} className="pt-1">
                  <div className="flex items-center space-x-2"> <RadioGroupItem value="host" id="host" /> <Label htmlFor="host" className="font-normal">Host keeps stake</Label> </div>
                  <div className="flex items-center space-x-2"> <RadioGroupItem value="charity" id="charity" /> <Label htmlFor="charity" className="font-normal">Donate to Charity (Example)</Label> </div>
                  <div className="flex items-center space-x-2"> <RadioGroupItem value="distribute" id="distribute" /> <Label htmlFor="distribute" className="font-normal">Distribute to Participants (Example)</Label> </div>
                </RadioGroup>
                <p className="text-xs text-gray-500 dark:text-gray-400">Determines where the stake goes if the meeting conditions aren't met.</p>
              </div>

              {/* Wallet Connection Area */}
              {!isConnected && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-center">
                    <p className="text-sm mb-3 text-blue-800 dark:text-blue-200">Connect your Phantom wallet</p>
                    {/* Log click directly */}
                    <WalletButton
                        onClick={() => {
                          console.log("WalletButton clicked! Calling handleConnectWallet..."); // Direct log here
                          handleConnectWallet();
                        }}
                        disabled={isConnecting}
                    >
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </WalletButton>
                  </div>
              )}
              {/* Show connected status */}
              {isConnected && ( <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm p-3 rounded-md">Wallet Connected: {publicKey?.toBase58()}</div> )}
              {/* Updated condition to show program status */}
              {isConnected && !program && !isSubmitting && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 text-sm p-3 rounded-md">
                    Program initializing... (Provider: {provider ? 'OK' : 'Not Ready'}, IDL: {idlJson ? 'OK' : 'Not Loaded'})
                  </div>
              )}

              {/* Error Message Display */}
              {errorMessage && ( <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded-md">{errorMessage}</div> )}
              {/* Escrow/Vault Address Display */}
              {escrowPubkeyStr && vaultPubkeyStr && !errorMessage && !isSubmitting && ( <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs p-3 rounded-md space-y-1 font-mono break-all"><p>Escrow: {escrowPubkeyStr}</p><p>Vault: {vaultPubkeyStr}</p></div> )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={() => router.push("/")} className="w-full sm:w-auto rounded-md" disabled={isSubmitting || isConnecting}> Cancel </Button>
              {/* Use correct disabled check */}
              <Button type="submit" disabled={isSubmitDisabled} className="w-full sm:w-auto rounded-md" title={isSubmitDisabled ? "Connect wallet or program not ready" : "Create Meeting & Stake"} >
                {isSubmitting ? ( <> {/* Spinner */} <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle> <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"></path> </svg> {loadingStep || "Processing..."} </> )
                    : ( `Create Meeting & Stake ${STAKE_AMOUNT_USDC} USDC` )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
  );
}
