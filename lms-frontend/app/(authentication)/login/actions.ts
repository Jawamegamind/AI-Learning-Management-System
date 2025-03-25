'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    console.log("login action")
    const supabase = await createClient()
  
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const formdata = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }
  
    const { data, error } = await supabase.auth.signInWithPassword(formdata)
  
    if (error) {
      console.error('Error:', error)
    }
    else {
        console.log('Data:', data)
    }
  
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  export async function logout() {
    console.log("logout action")
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error:', error)
    }

    revalidatePath('/', 'layout')
    redirect('/login')
}   

// export async function signup(formData: FormData) {
//   const supabase = await createClient()

//   // type-casting here for convenience
//   // in practice, you should validate your inputs
//   const data = {
//     email: formData.get('email') as string,
//     password: formData.get('password') as string,
//   }

//   const { error } = await supabase.auth.signUp(data)

//   if (error) {
//     redirect('/error')
//   }

//   revalidatePath('/', 'layout')
//   redirect('/account')
// }