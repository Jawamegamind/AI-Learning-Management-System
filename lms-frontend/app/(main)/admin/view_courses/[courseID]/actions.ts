"use server"

import axios from 'axios'

export async function fetchCourseDataFromID(courseId: string) {
    // Send a request to your backend to fetch the course details
    const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseId}`);
    // console.log(response.data); // Log the response
    return response.data
}

export async function fetchUsers() {
    // Send a request to your backend to fetch all the users details
    const usersRes = await axios.get("http://localhost:8000/api/users");
    // console.log("userrs",usersRes.data)
    return usersRes.data;
}

export async function enrollUser(courseId: string, selectedUser: string, selectedRole: string) {
    // Send a request to your backend to enroll the new user into this course under this role
    const response = await axios.post(`http://localhost:8000/api/courses/${courseId}/enroll_user`, {
        user_id: selectedUser,
        role: selectedRole,
    });
    return response.data.message
}

export async function updateUserRole(courseId: string, userId: string, newRole: string){
    // Send a request to your update role of this user for this course
    const response = await axios.post(`http://localhost:8000/api/courses/${courseId}/update_role`, {
        user_id: userId,
        role: newRole,
    });
    return response.data.message
}

export async function unenrollUser(courseId: string, userId: string) {
    // Send a request to your backend to unenroll this user for this course
    const response = await axios.delete(`http://localhost:8000/api/courses/${courseId}/unenroll_user/${userId}`);
    return response.data.message
}
