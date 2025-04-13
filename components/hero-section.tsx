import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Clock, Shield, Coins } from "lucide-react"

export function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Pay2Ping: Accountability for Meetings
              </h1>
              <p className="max-w-[600px] text-slate-500 md:text-xl dark:text-slate-400">
                Stake crypto, show up on time, get your money back. Miss the meeting, lose your stake. Simple
                accountability for better meetings.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Link href="/create-meeting">
                <Button size="lg">Schedule a Meeting</Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-4 bg-white dark:bg-slate-950">
                <Clock className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-bold">Punctuality</h3>
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Incentivize on-time attendance for all participants
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-4 bg-white dark:bg-slate-950">
                <Shield className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-bold">Security</h3>
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Blockchain-powered staking with transparent transactions
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-4 bg-white dark:bg-slate-950">
                <Coins className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-bold">Flexibility</h3>
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Choose your stake amount and beneficiary
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-4 bg-white dark:bg-slate-950">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-primary"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="text-xl font-bold">Integration</h3>
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Works with Zoom, Google Meet, and other platforms
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
