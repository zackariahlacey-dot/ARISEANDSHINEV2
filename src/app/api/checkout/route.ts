import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24-preview' as any,
})

export async function POST(request: Request) {
  try {
    const { 
      name, 
      email, 
      phone, 
      vehicle, 
      service, 
      date, 
      time, 
      totalPrice, 
      addons 
    } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Create a lead/booking record in Supabase first (status: 'pending_payment')
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert([
        { 
          name, 
          email, 
          phone, 
          vehicle, 
          service, 
          preferred_date: date,
          status: 'pending_payment'
        }
      ])
      .select()
      .single()

    if (leadError) throw leadError

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Arise & Shine VT: ${service}`,
              description: `Detailing session for ${vehicle} on ${date} at ${time}. Add-ons: ${addons.join(', ') || 'None'}`,
            },
            unit_amount: totalPrice * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${new URL(request.url).origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/?canceled=true`,
      metadata: {
        lead_id: lead.id,
        user_id: user?.id || null,
        service,
        vehicle,
        date,
        time
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
