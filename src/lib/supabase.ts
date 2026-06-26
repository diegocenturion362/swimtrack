import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

// Storage personalizado: guarda en localStorage si el usuario tildó "Recordarme",
// o en sessionStorage si no (la sesión se borra al cerrar el browser).
const FLAG = 'swimtrack-recordar'

const authStorage = {
  getItem: (k: string) =>
    sessionStorage.getItem(k) ?? localStorage.getItem(k),

  setItem: (k: string, v: string) => {
    if (localStorage.getItem(FLAG) === '1') {
      localStorage.setItem(k, v)
    } else {
      sessionStorage.setItem(k, v)
    }
  },

  removeItem: (k: string) => {
    localStorage.removeItem(k)
    sessionStorage.removeItem(k)
  },
}

export const supabase = supabaseConfigured
  ? createClient(url!, key!, { auth: { storage: authStorage } })
  : (null as unknown as ReturnType<typeof createClient>)

// Guardar la preferencia antes de hacer signIn para que authStorage la tome
export function setRecordarme(valor: boolean) {
  localStorage.setItem(FLAG, valor ? '1' : '0')
}
