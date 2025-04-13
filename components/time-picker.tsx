"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function TimePicker() {
  const [hour, setHour] = React.useState<string>("")
  const [minute, setMinute] = React.useState<string>("")
  const [period, setPeriod] = React.useState<string>("AM")

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  const minutes = Array.from({ length: 4 }, (_, i) => (i * 15).toString().padStart(2, "0"))

  const formattedTime = hour && minute ? `${hour}:${minute} ${period}` : "Select time"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
          <Clock className="mr-2 h-4 w-4" />
          {formattedTime}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <div className="flex space-x-2">
          <Select value={hour} onValueChange={setHour}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={minute} onValueChange={setMinute}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="AM/PM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
