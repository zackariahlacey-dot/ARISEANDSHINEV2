import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
})

export async function POST(request: Request) {
  try {
    const { 
      name, 
      email, 
      phone, 
      address,
      vehicle, 
      service, 
      date, 
      time, 
      totalPrice, 
      addons,
      vehicles 
    } = await request.json()

    const isMonthly = service.includes("Monthly")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const vehicleString = Array.isArray(vehicles) ? vehicles.join(', ') : vehicle

    // 1. Create a lead record in Supabase
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert([
        { 
          name, 
          email, 
          phone, 
          address,
          vehicle: vehicleString, 
          service, 
          preferred_date: date,
          preferred_time: time,
          total_price: totalPrice,
          status: 'pending_payment'
        }
      ])
      .select()
      .single()

    if (leadError) throw leadError

    // 2. Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    if (isMonthly) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Monthly Detailing Membership: ${service}`,
            description: `Recurring monthly care for your ${vehicleString}. Location: ${address}`,
          },
          unit_amount: (service.includes("Elite") ? 199 : 99) * 100,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      })

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: "Deep Clean Startup Fee",
            description: "One-time initial deep cleaning service fee.",
          },
          unit_amount: 10000, 
        },
        quantity: 1,
      })

      if (addons.length > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: "Initial Enhancements",
              description: addons.join(", "),
            },
            unit_amount: (totalPrice - (service.includes("Elite") ? 199 : 99) - 100) * 100,
          },
          quantity: 1,
        })
      }
    } else {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Arise & Shine VT: ${service}`,
            description: `Session for ${vehicleString} at ${address}. Add-ons: ${addons.join(', ') || 'None'}`,
          },
          unit_amount: totalPrice * 100,
        },
        quantity: 1,
      })
    }

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: lineItems,
      mode: isMonthly ? 'subscription' : 'payment',
      success_url: `${new URL(request.url).origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/?canceled=true`,
      metadata: {
        lead_id: lead.id,
        user_id: user?.id || null,
        service,
        vehicle: vehicleString,
        address,
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
