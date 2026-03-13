import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { name, email, phone, vehicle, service, date } = await request.json()

    // 1. Save to Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Determine user_id if logged in
    const userId = user?.id || null

    const { error: dbError } = await supabase
      .from('leads')
      .insert([
        { 
          name, 
          email, 
          phone, 
          vehicle, 
          service, 
          preferred_date: date,
          status: 'pending'
        }
      ])

    // Also create a booking in the bookings table if user is logged in
    if (userId) {
      // Find service ID by name
      const { data: serviceData } = await supabase
        .from('services')
        .select('id')
        .eq('name', service)
        .single()

      if (serviceData) {
        await supabase
          .from('bookings')
          .insert([
            {
              user_id: userId,
              service_id: serviceData.id,
              status: 'pending'
            }
          ])
      }
    }

    if (dbError) {
      console.error('Database Error:', dbError)
      return NextResponse.json({ error: 'Failed to save booking inquiry.' }, { status: 500 })
    }

    // 2. Send Email via Resend
    const { error: mailError } = await resend.emails.send({
      from: 'Arise And Shine VT <onboarding@resend.dev>', // Change to verified domain later
      to: ['contact@ariseandshinevt.com'],
      subject: `New Booking Inquiry: ${name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #fbbf24;">New Booking Request</h1>
          <p>You have a new booking inquiry from the Arise And Shine VT website.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Vehicle:</strong> ${vehicle}</p>
          <p><strong>Service Requested:</strong> ${service}</p>
          <p><strong>Preferred Date:</strong> ${date}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #999;">This inquiry has been saved in your database.</p>
        </div>
      `,
    })

    if (mailError) {
      console.error('Mail Error:', mailError)
      // We don't return 500 here since the lead was saved in DB
    }

    return NextResponse.json({ success: true, message: 'Inquiry received.' })
  } catch (error) {
    console.error('Booking Error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
