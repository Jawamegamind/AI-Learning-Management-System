'use server'

import axios from 'axios'
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

    // Signing in first using supabase auth
    const { data, error } = await supabase.auth.signInWithPassword(formdata)
  
    if (error) {
      console.error('Error:', error)

      // If invalid credentials are provided, we should not login the user
      if (error.code == 'invalid_credentials') {
          console.log('Invalid credentials')
          return "Invalid credentials";
      }
    }
    else {
        console.log('Data:', data)

        // Sign in successful so we redirect to the dashboard
        revalidatePath('/', 'layout')
        redirect('/dashboard')
    }

    // // Before loggin in the user using supabase we first log in using our backend
    // const response = await axios.post('http://localhost:8000/api/login', {
    //     email: formData.get('email'),
    //     password: formData.get('password')
    // })

    // // Before we login the user, we need to check the returned response message from the backend
    // // If the response message is "User not found", we should not login the user
    // // If the response message is "Invalid password", we should not login the user
    // // If the response message is "Login successful", we should login the user
    // // If the response message is "Login failed", we should not login the user

    // if (response.data.message == "User not found") {
    //     console.log("User not found")
    //     return "User not found";
    // }
    // else if (response.data.message == "Invalid password") {
    //     console.log("Invalid password")
    //     return "Invalid password";
    // }
    // else if (response.data.message == "Login successful") {
    //     console.log("Login successful")

    //     const { data, error } = await supabase.auth.signInWithPassword(formdata)
  
    //     if (error) {
    //       console.error('Error:', error)
    //     }
    //     else {
    //         console.log('Data:', data)
    //     }
      
    //     revalidatePath('/', 'layout')
    //     redirect('/dashboard')
    // }
    // else if (response.data.message == "Login failed") {
    //     console.log("Login failed")
    //     return "Login failed";
    // }
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