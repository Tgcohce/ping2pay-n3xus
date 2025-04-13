import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, DollarSign } from "lucide-react"

interface MeetingCardProps {
  title: string
  date: string
  participants: number
  stakeAmount: number
  platform: "Zoom" | "Google Meet"
}

export function MeetingCard({ title, date, participants, stakeAmount, platform }: MeetingCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{title}</CardTitle>
          <Badge variant={platform === "Zoom" ? "default" : "secondary"}>{platform}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            {date}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-2 h-4 w-4" />
            {participants} participants
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="mr-2 h-4 w-4" />
            {stakeAmount} USDC stake
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">
          View Details
        </Button>
        <Button size="sm">Join Meeting</Button>
      </CardFooter>
    </Card>
  )
}
