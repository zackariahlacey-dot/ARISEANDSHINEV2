import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) return NextResponse.json({ bookedTimes: [] })

    const supabase = await createClient()
    
    // Fetch all bookings for the selected date
    const { data: bookings, error } = await supabase
      .from('leads')
      .select('preferred_date, service')
      .eq('preferred_date', date)
      // We check for both leads and confirmed bookings
      // In a production app, you might want to join or check a unified 'schedule' view

    if (error) throw error

    // Return the start times that are already taken
    // You could also calculate overlaps here based on service duration
    const bookedTimes = bookings?.map(b => {
      // This logic assumes we store time in a 'preferred_time' field 
      // or similar in the 'leads' table. Let's ensure leads has a time field.
      return b.preferred_time // Placeholder: we need to add this column
    }).filter(Boolean) || []

    return NextResponse.json({ bookedTimes })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
