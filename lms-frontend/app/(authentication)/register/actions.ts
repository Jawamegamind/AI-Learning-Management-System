'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function register(formData: FormData) {
    console.log("register action")
    const supabase = await createClient()
  
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const formdata = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }
  
    const { data, error } = await supabase.auth.signUp(formdata)
  
    if (error) {
      console.error('Error:', error)
    }
    else {
        console.log('Data:', data)
    }
  
    revalidatePath('/', 'layout')
    redirect('/login')
  }