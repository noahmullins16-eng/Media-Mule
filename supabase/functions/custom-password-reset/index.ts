import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'

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
    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
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

    // Look up user by email
    let userId: string | null = null
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()

      if (listError) {
        console.error('Error listing users:', listError)
        // Return success anyway to not enumerate users
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const user = users.users.find((u) => u.email === email)
      if (user) {
        userId = user.id
      }
    } catch (err) {
      console.error('Error finding user:', err)
      // Return success anyway to not enumerate users
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If user not found, return success (don't reveal existence)
    if (!userId) {
      console.log('User not found for email:', email)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete any existing unused tokens for this user
    await supabase.from('password_reset_tokens').delete().eq('user_id', userId).is('used_at', null)

    // Generate token
    const token = crypto.randomUUID()

    // Insert token into database
    const { error: tokenError } = await supabase.from('password_reset_tokens').insert({
      user_id: userId,
      token,
    })

    if (tokenError) {
      console.error('Error inserting reset token:', tokenError)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Render email
    const siteUrl = 'https://mediamuleco.com'
    const confirmationUrl = `${siteUrl}/reset-password?token=${token}`

    const html = await renderAsync(
      React.createElement(RecoveryEmail, {
        siteName: 'Media Mule',
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
        subject: 'Reset your Media Mule password',
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', { status: response.status, error })
    }

    console.log('Password reset email sent', { email })

    // Always return success to not enumerate users
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Password reset error:', error)
    // Return success anyway
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
