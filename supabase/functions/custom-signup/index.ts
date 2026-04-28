import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create user via admin API (unconfirmed)
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })

    if (createError) {
      console.error('Error creating user:', createError.message)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!user.user) {
      return new Response(JSON.stringify({ error: 'Failed to create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete any existing unused tokens for this user
    await supabase.from('email_verification_tokens').delete().eq('user_id', user.user.id).is('used_at', null)

    // Generate token
    const token = crypto.randomUUID()

    // Insert token into database
    const { error: tokenError } = await supabase.from('email_verification_tokens').insert({
      user_id: user.user.id,
      token,
    })

    if (tokenError) {
      console.error('Error inserting token:', tokenError)
      return new Response(JSON.stringify({ error: 'Failed to generate verification token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Render email
    const siteUrl = 'https://mediamuleco.com'
    const confirmationUrl = `${siteUrl}/verify-email?token=${token}`

    const html = await renderAsync(
      React.createElement(SignupEmail, {
        siteName: 'Media Mule',
        siteUrl,
        recipient: email,
        confirmationUrl,
      })
    )

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@mediamuleco.com',
        to: email,
        subject: 'Welcome to Media Mule — Confirm Your Account',
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', { status: response.status, error })

      // Delete the user since email sending failed
      await supabase.auth.admin.deleteUser(user.user.id)

      return new Response(JSON.stringify({ error: 'Failed to send confirmation email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Signup email sent successfully', { email, userId: user.user.id })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
