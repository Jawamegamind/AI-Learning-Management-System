"use server"

import axios from 'axios'

interface Course {
    id: number;
    title: string;
    description: string;
}

export async function fetchCurrentUser(user_id: string) {
    // Send a request to your backend to fetch the user details
    const response = await axios.get(`http://localhost:8000/api/user/${user_id}`)

    console.log("The user object reteived from the backend is", response.data.user)

    return response.data.user
}

export async function fetchUserCourses(user_id: string): Promise<{
  studentCourses: any[];
  instructorCourses: any[];
}> {
    // Send a request to your backend to fetch the user ernollments first
    const response = await axios.get(`http://localhost:8000/api/courses/get_user_enrollments/${user_id}`)

    console.log("The user courses reteived from the backend are", response.data.enrollments)

    // Now that we have the enrollments use the course_id field in the enrollments to fetch the course details
    const enrollments = response.data.enrollments

    if (!enrollments || enrollments.length === 0) {
        console.log("No enrollments found for the user")
        return {
      studentCourses: [],
      instructorCourses: [],
    };
    }
    else {
        // Separate course IDs by role
        const studentCourseIDs = enrollments
        .filter((e: any) => e.role === 'student')
        .map((e: any) => e.course_id);

        const instructorCourseIDs = enrollments
            .filter((e: any) => e.role === 'instructor')
            .map((e: any) => e.course_id);

        const courseIDs = enrollments.map((enrollment: { course_id: string }) => enrollment.course_id);
        console.log("The course IDs are", courseIDs)

        // Now fetch the courses using the courseIDs
        const coursesResponse = await axios.post(`http://localhost:8000/api/courses/get_courses_by_ids`, courseIDs)
        console.log("The courses are", coursesResponse.data.courses)

        // Filter courses by role
        const studentCourses = coursesResponse.data.courses.filter((course: Course) => studentCourseIDs.includes(course.id));
        const instructorCourses = coursesResponse.data.courses.filter((course: Course) => instructorCourseIDs.includes(course.id));
        console.log("The student courses are", studentCourses)
        console.log("The instructor courses are", instructorCourses)

        // Returning the instructor and student courses so that they can be rendered properly
        return {
            studentCourses,
            instructorCourses
        }
    }

    // return response.data.courses
}