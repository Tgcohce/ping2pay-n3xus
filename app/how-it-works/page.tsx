import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react'

export default function HowItWorks() {
  return (
    <main className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">How Pay2Ping Works</h1>
        <p className="text-xl text-muted-foreground mb-8">
          A simple way to ensure meeting punctuality using crypto staking
        </p>
        
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" />
                Step 1: Schedule a Meeting
              </CardTitle>
              <CardDescription>
                Create a meeting and set the stake amount
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                As a meeting organizer, you can create a new meeting through our platform. 
                Choose your preferred meeting platform (Zoom or Google Meet), set the date and time, 
                and determine how much each participant will stake (e.g., 1 USDC).
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-primary" />
                Step 2: Participants Stake Funds
              </CardTitle>
              <CardDescription>
                Each participant connects their wallet and stakes the required amount
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                When participants receive the meeting invitation, they'll be prompted to connect 
                their Solana wallet and stake the required amount of USDC. This creates a 
                financial incentive to attend the meeting on time. The staked funds are held 
                in a smart contract until the meeting concludes.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                Step 3: Attend the Meeting
              </CardTitle>
              <CardDescription>
                Join on time to get your stake back
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                When it's time for the meeting, participants join through the meeting link. 
                Our system automatically tracks attendance and punctuality. If you join on time 
                (within the grace period), you'll receive your staked funds back at the end of 
                the meeting.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <XCircle className="mr-2 h-5 w-5 text-red-500" />
                What If Someone Is Late?
              </CardTitle>
              <CardDescription>
                Late or absent participants forfeit their stake
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                If a participant is late or doesn't show up at all, they forfeit their staked 
                funds. Depending on the meeting settings, these funds can go to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The meeting host</li>
                <li>A designated charity</li>
                <li>Distributed among the on-time participants</li>
              </ul>
            </CardContent>
          </Card>
          
          <div className="bg-slate-50 p-6 rounded-lg dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-4">Technical Implementation</h2>
            <p className="mb-4">
              Pay2Ping uses Solana blockchain for fast, low-cost transactions. Our smart contract 
              handles the staking process, attendance verification, and fund distribution.
            </p>
            <p>
              The system integrates with popular meeting platforms through their APIs, allowing 
              us to automatically track when participants join the meeting. All transactions are 
              transparent and verifiable on the blockchain.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
