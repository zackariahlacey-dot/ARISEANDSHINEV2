import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const LOGO_URL = "https://ariseandshinevt.com/e.png"; 

export async function POST(request: Request) {
  try {
    const { 
      name, email, phone, address, vehicle, service, 
      date, time, totalPrice, amountSaved, addons, 
      paymentMethod, vehicles, xpRedeemed 
    } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const vehicleString = Array.isArray(vehicles) ? vehicles.join(', ') : vehicle

    // 1. Save to Leads
    await supabase
      .from('leads')
      .insert([{ 
        name, email, phone, address, vehicle: vehicleString, 
        service, 
        preferred_date: date, 
        preferred_time: time,
        total_price: totalPrice,
        status: paymentMethod === 'stripe' ? 'pending_payment' : 'confirmed_after_service'
      }])

    // 2. If LOGGED IN: Handle Profile Updates & Official Booking
    if (user) {
      const { data: serviceData } = await supabase
        .from('services')
        .select('id')
        .eq('name', service)
        .single()

      if (serviceData) {
        // Create Booking Record
        await supabase
          .from('bookings')
          .insert([{
            user_id: user.id,
            service_id: serviceData.id,
            vehicle: vehicleString,
            status: 'confirmed',
            scheduled_at: `${date}T${time}:00`,
            xp_earned: totalPrice, // Award XP based on what they actually paid
            price_paid: totalPrice,
            amount_saved: amountSaved || 0
          }])

        // Update Profile (XP, Lifetime Stats, Vault)
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp, saved_vehicles, lifetime_spent, lifetime_saved')
          .eq('id', user.id)
          .single()

        if (profile) {
          // Logic: Subtract redeemed XP, then Add new XP earned
          const xpSpent = xpRedeemed || 0
          const xpEarned = totalPrice
          const newXp = Math.max(0, (profile.xp || 0) - xpSpent + xpEarned)
          
          const newSpent = (Number(profile.lifetime_spent) || 0) + totalPrice
          const newSaved = (Number(profile.lifetime_saved) || 0) + (amountSaved || 0)
          
          const currentVault = profile.saved_vehicles || []
          const newVehiclesList = Array.isArray(vehicles) ? vehicles : [vehicle]
          const updatedVault = [...new Set([...currentVault, ...newVehiclesList.filter(Boolean)])]

          await supabase
            .from('profiles')
            .update({ 
              xp: newXp, 
              lifetime_spent: newSpent,
              lifetime_saved: newSaved,
              saved_vehicles: updatedVault,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
        }
      }
    }

    // 3. Email Notifications (Simplified for brevity)
    const baseUrl = "https://ariseandshinevt.com"
    const start = new Date(`${date}T${time}:00`).toISOString()
    const end = new Date(new Date(`${date}T${time}:00`).getTime() + 3 * 60 * 60 * 1000).toISOString()
    const title = `Arise & Shine VT: ${service}`
    const desc = `Detailing for ${vehicleString}. Total: $${totalPrice}`
    const appleCalendarLink = `${baseUrl}/api/calendar/generate?title=${encodeURIComponent(title)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&desc=${encodeURIComponent(desc)}&loc=${encodeURIComponent(address)}`
    const googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start.replace(/-|:|\.\d+/g, '')}/${end.replace(/-|:|\.\d+/g, '')}&details=${encodeURIComponent(desc)}&location=${encodeURIComponent(address)}&sf=true&output=xml`

    await resend.emails.send({
      from: 'Arise & Shine VT <bookings@ariseandshinevt.com>',
      to: [email],
      subject: `Your Session is Secured | Arise & Shine VT`,
      html: `
        <div style="background-color: #000000; padding: 40px; text-align: center; font-family: sans-serif; border-radius: 24px;">
          <img src="${LOGO_URL}" width="60" style="margin-bottom: 20px;" />
          <h1 style="color: #ffffff; text-transform: uppercase; letter-spacing: 4px;">Session Secured</h1>
          <p style="color: #fbbf24; font-weight: bold; font-size: 20px;">$${totalPrice} Total</p>
          <p style="color: #888;">Confirmed for ${date} @ ${time} PM</p>
          <p style="color: #555; font-size: 12px; margin-top: 10px;">Service Location: ${address}</p>
          ${xpRedeemed ? `<p style="color: #22c55e; font-size: 10px; font-weight: bold;">-${xpRedeemed} XP REDEEMED</p>` : ''}
          <div style="margin-top: 30px;">
            <a href="${appleCalendarLink}" style="background: #fbbf24; color: #000; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 10px; text-transform: uppercase;">Apple Calendar</a>
            <a href="${googleCalendarLink}" style="background: #fff; color: #000; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 10px; text-transform: uppercase; margin-left: 10px;">Google Calendar</a>
          </div>
        </div>
      `,
    })

    await resend.emails.send({
      from: 'Arise & Shine VT <bookings@ariseandshinevt.com>',
      to: ['zackariahlacey@gmail.com'],
      subject: `NEW BOOKING: ${name} | ${service}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>New Booking Details</h2>
          <p><strong>Client:</strong> ${name}</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Vehicle:</strong> ${vehicleString}</p>
          <p><strong>Revenue:</strong> $${totalPrice}</p>
          ${xpRedeemed ? `<p style="color: #ef4444;"><strong>XP REDEEMED:</strong> ${xpRedeemed}</p>` : ''}
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Booking Error:', error)
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 })
  }
}
