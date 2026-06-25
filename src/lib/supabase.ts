import { createClient } from '@supabase/supabase-js'

// Las credenciales vienen de variables de entorno (archivo .env en local,
// y en Cloudflare se cargan en la config del proyecto).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

// Si no está configurado, la app funciona en memoria (sin compartir datos).
export const supabase = supabaseConfigured
  ? createClient(url!, key!)
  : (null as unknown as ReturnType<typeof createClient>)
