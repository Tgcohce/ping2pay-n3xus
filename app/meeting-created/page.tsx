"use client"; // Needs to be a client component to use hooks

import Link from "next/link";
import { useSearchParams } from 'next/navigation'; // Import hook
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";
import { SOLANA_EXPLORER_URL } from "@/lib/constants"; // Assuming you have constants file

// Helper function to copy text
const copyToClipboard = (text: string, callback?: () => void) => {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard:', text);
    if (callback) callback();
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
};

// Helper function to shorten addresses/signatures
const shorten = (text: string | null | undefined, chars = 8): string => {
  if (!text) return "N/A";
  if (text.length <= chars * 2 + 3) return text;
  return `${text.substring(0, chars)}...${text.substring(text.length - chars)}`;
};


export default function MeetingCreated() {
  const searchParams = useSearchParams();
  const [copiedLink, setCopiedLink] = useState(false);

  // Extract data from query parameters
  const title = searchParams.get('title') || "Meeting Scheduled";
  const dateTime = searchParams.get('dateTime') || "Date/Time Not Available";
  const joinUrl = searchParams.get('joinUrl');
  const stakeAmount = searchParams.get('stakeAmount') || "N/A";
  const beneficiary = searchParams.get('beneficiary') || "N/A";
  const escrow = searchParams.get('escrow');
  const initTx = searchParams.get('initTx');
  const depositTx = searchParams.get('depositTx');

  // Handle copying invite link
  const handleCopyLink = () => {
    if (joinUrl) {
      copyToClipboard(joinUrl, () => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000); // Reset after 2 seconds
      });
    }
  };

  // Function to build Solana Explorer link
  const getExplorerLink = (signature: string | null, type: 'tx' | 'address' = 'tx') => {
    if (!signature) return '#';
    // Assuming devnet - adjust cluster query param if needed
    return `https://explorer.solana.com/${type}/${signature}?cluster=devnet`;
  };

  return (
      <main className="container py-12 flex flex-col items-center">
        <div className="max-w-md w-full text-center mb-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold">Meeting Created & Staked!</h1>
          <p className="text-muted-foreground mt-2">Your meeting is scheduled and the stake is secured.</p>
        </div>

        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{dateTime}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {joinUrl && joinUrl !== 'Not Available' ? (
                <div className="bg-slate-50 p-4 rounded-lg dark:bg-slate-900">
                  <p className="text-sm font-medium mb-1">Zoom Meeting Link</p>
                  <a
                      href={joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {joinUrl} <ExternalLink className="inline h-3 w-3 ml-1" />
                  </a>
                </div>
            ) : (
                <div className="bg-yellow-50 p-4 rounded-lg dark:bg-yellow-900">
                  <p className="text-sm font-medium mb-1 text-yellow-700 dark:text-yellow-300">Zoom Meeting Link</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Not available. Check console or backend logs.</p>
                </div>
            )}


            <div className="bg-slate-50 p-4 rounded-lg dark:bg-slate-900">
              <p className="text-sm font-medium mb-1">Stake Details</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stakeAmount} USDC staked • Beneficiary (on miss): {beneficiary}
              </p>
              {escrow && escrow !== 'N/A' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Escrow Account: {' '}
                    <a href={getExplorerLink(escrow, 'address')} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 font-mono">
                      {shorten(escrow)} <ExternalLink className="inline h-3 w-3 ml-1" />
                    </a>
                  </p>
              )}
            </div>

            {(initTx && initTx !== 'N/A') || (depositTx && depositTx !== 'N/A') ? (
                <div className="bg-slate-50 p-4 rounded-lg dark:bg-slate-900">
                  <p className="text-sm font-medium mb-1">Transactions (Devnet)</p>
                  {initTx && initTx !== 'N/A' && (
                      <p className="text-xs text-muted-foreground mt-1 break-all">
                        Initialize Tx: {' '}
                        <a href={getExplorerLink(initTx)} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 font-mono">
                          {shorten(initTx)} <ExternalLink className="inline h-3 w-3 ml-1" />
                        </a>
                      </p>
                  )}
                  {depositTx && depositTx !== 'N/A' && (
                      <p className="text-xs text-muted-foreground mt-1 break-all">
                        Deposit Tx: {' '}
                        <a href={getExplorerLink(depositTx)} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 font-mono">
                          {shorten(depositTx)} <ExternalLink className="inline h-3 w-3 ml-1" />
                        </a>
                      </p>
                  )}
                </div>
            ) : null}

          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            {joinUrl && joinUrl !== 'Not Available' && (
                <Button className="w-full" onClick={handleCopyLink} disabled={copiedLink}>
                  {copiedLink ? <><CheckCircle className="mr-2 h-4 w-4" /> Copied!</> : <><Copy className="mr-2 h-4 w-4" /> Copy Invite Link</>}
                </Button>
            )}
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
  )
}
