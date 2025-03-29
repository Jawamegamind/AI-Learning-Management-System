'use server'

import axios from 'axios'
// import { revalidatePath } from 'next/cache'
// import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function createCourse(formData: FormData, currentUser: any) {
    console.log("create course action")
    // const supabase = await createClient()

    // // Getting the user data
    // const { data, error } = await supabase.auth.getSession()
    // if (error) {
    //     console.error('Error:', error)
    //     return "Error fetching user session"
    // }
    // console.log("The session is", data.session)
  
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const formdata = {
      course_title: formData.get('title') as string,
      course_description: formData.get('description') as string,
      course_start_date : formData.get('start_date') as string,
      course_end_date : formData.get('end_date') as string,
      max_students: formData.get('max_students') as string,
    }

    console.log("The form data is",formdata)
    console.log("The current user is",currentUser)

    // Now sending the request to the backend for course creation
    const response = await axios.post('http://localhost:8000/api/courses/create_course', {
        formdata,
        currentUser
    })

    console.log("The backend's response to creating course is",response.data)

    return response.data
}

export async function getCurrentUser() {
    const supabase = await createClient()
    // Getting the user data
    const { data, error } = await supabase.auth.getSession()
    if (error) {
        console.error('Error:', error)
        return "Error fetching user session"
    }
    console.log("The session is", data.session)

    // Now basically using the id get the user details from the user table
    const userId = data.session?.user.id
    const response = await axios.get(`http://localhost:8000/api/user/${userId}`)
    console.log("The backend's response to retrieving user data is",response.data)

    // Returning the user data
    return response.data
}
