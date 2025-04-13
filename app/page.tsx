import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MeetingCard } from "@/components/meeting-card"
import { HeroSection } from "@/components/hero-section"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <HeroSection />

      <section className="container py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Your Upcoming Meetings</h2>
          <Link href="/create-meeting">
            <Button>Create New Meeting</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MeetingCard title="Team Standup" date="Tomorrow, 9:00 AM" participants={5} stakeAmount={1} platform="Zoom" />
          <MeetingCard
            title="Project Review"
            date="Apr 10, 2:30 PM"
            participants={3}
            stakeAmount={2}
            platform="Google Meet"
          />
          <MeetingCard
            title="Client Presentation"
            date="Apr 15, 11:00 AM"
            participants={8}
            stakeAmount={5}
            platform="Zoom"
          />
        </div>
      </section>
    </main>
  )
}
