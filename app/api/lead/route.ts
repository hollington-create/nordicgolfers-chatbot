import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const lead = await request.json()

    const { error } = await supabase.from('ng_chat_leads').insert({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      destination: lead.destination || null,
      dates: lead.dates || null,
      group_size: lead.group_size || null,
      preferences: lead.preferences || null,
      language: lead.language || 'da',
      source_page: lead.source_page || null,
      session_id: lead.session_id || null,
    })

    if (error) {
      console.error('Lead save error:', error)
      return new Response(JSON.stringify({ error: 'Failed to save lead' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Lead API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
