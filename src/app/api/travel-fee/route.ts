import { NextResponse } from 'next/server'

const BASE_ADDRESS = "209 Porterwood Dr, Waterbury, VT 05676";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const destination = searchParams.get('address')

    if (!destination) {
      return NextResponse.json({ fee: 0, distance: 0 })
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(BASE_ADDRESS)}&destinations=${encodeURIComponent(destination)}&units=imperial&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.rows[0].elements[0].distance) {
      return NextResponse.json({ fee: 0, distance: 0, error: 'Could not calculate distance' })
    }

    // Distance comes back in meters, but we used units=imperial so it might have text in miles
    // Let's use the meters value for precision and convert to miles
    const distanceMeters = data.rows[0].elements[0].distance.value
    const distanceMiles = distanceMeters * 0.000621371
    
    // Logic: $1 per mile OVER 15 miles
    const overage = Math.max(0, distanceMiles - 15)
    const travelFee = Math.ceil(overage) // Round up to nearest dollar

    return NextResponse.json({ 
      fee: travelFee, 
      distance: Math.round(distanceMiles * 10) / 10,
      isLocal: distanceMiles <= 15
    })
  } catch (error) {
    console.error('Distance Matrix Error:', error)
    return NextResponse.json({ fee: 0, error: 'Internal Error' }, { status: 500 })
  }
}
