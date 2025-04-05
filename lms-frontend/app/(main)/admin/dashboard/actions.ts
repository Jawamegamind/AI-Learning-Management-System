"use server"

import axios from 'axios'
import { createClient } from '@/utils/supabase/server'

export async function fetchCurrentUser(user_id: string) {
    // Send a request to your backend to fetch the user details
    const response = await axios.get(`http://localhost:8000/api/user/${user_id}`)

    console.log("The user object reteived from the backend is", response.data.user)

    return response.data.user
}

export async function fetchUserCourses(user_id: string) {
    // Send a request to your backend to fetch the user ernollments first
    const response = await axios.get(`http://localhost:8000/api/courses/get_user_enrollments/${user_id}`)

    console.log("The user courses reteived from the backend are", response.data.enrollments)

    // Now that we have the enrollments use the course_id field in the enrollments to fetch the course details
    const enrollments = response.data.enrollments

    if (!enrollments || enrollments.length === 0) {
        console.log("No enrollments found for the user")
        return [];
    }
    else {
        const courseIDs = enrollments.map((enrollment: { course_id: string }) => enrollment.course_id);
        console.log("The course IDs are", courseIDs)

        // Now fetch the courses using the courseIDs
        const coursesResponse = await axios.post(`http://localhost:8000/api/courses/get_courses_by_ids`, courseIDs)
        console.log("The courses are", coursesResponse.data.courses)

        return coursesResponse.data.courses;
    }

    // return response.data.courses
}