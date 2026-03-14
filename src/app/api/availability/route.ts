import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) return NextResponse.json({ bookedTimes: [] })

    const supabase = await createClient()
    
    // Fetch all bookings for the selected date including preferred_time
    const { data: bookings, error } = await supabase
      .from('leads')
      .select('preferred_date, service, preferred_time')
      .eq('preferred_date', date)

    if (error) throw error

    // Return the start times that are already taken
    const bookedTimes = bookings?.map(b => b.preferred_time).filter(Boolean) || []

    return NextResponse.json({ bookedTimes })
  } catch (error) {
    console.error('Availability Error:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
