import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Arise & Shine VT Session'
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const description = searchParams.get('desc') || ''
    const location = searchParams.get('loc') || 'Your Location'

    if (!start || !end) {
      return new Response('Missing parameters', { status: 400 })
    }

    // Format for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (dateStr: string) => {
      return new Date(dateStr).toISOString().replace(/-|:|\.\d+/g, '')
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Arise & Shine VT//NONSGML Detailing//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="detailing-appointment.ics"',
      },
    })
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 })
  }
}
