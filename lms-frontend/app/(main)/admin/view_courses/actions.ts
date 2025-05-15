"use server"

// import axios from 'axios'
import api from '@/app/_utils/api'

export async function fetchAllCourses() {
    // Send a request to your backend to fetch all the courses details
    // const response = await axios.get(
    //     `http://localhost:8000/api/courses/get_courses`
    // );
    const response = await api.get(`/api/courses/get_courses`);
    console.log(response.data); // Log the response
    return response.data.courses;
}