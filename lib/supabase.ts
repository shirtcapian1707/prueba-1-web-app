
import { createClient } from '@supabase/supabase-js'

// Credenciales proporcionadas para el proyecto VOM SAS
const supabaseUrl = 'https://qxuynjupwrezkaqrxwdh.supabase.co'
const supabaseKey = 'sb_publishable_72a5tVdFixWUEPw3gjJDmg_c4wxU9eT'

export const supabase = createClient(supabaseUrl, supabaseKey)
