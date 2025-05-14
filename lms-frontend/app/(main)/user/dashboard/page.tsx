"use client"

import * as React from 'react';
import Navbar from '../../../_components/navbar';
// import Navbar from '../../../_components/navbarStudent';
// import Sidebar from '../../../_components/sidebar';
import { createClient } from '@/utils/supabase/client';
import {useState, useLayoutEffect} from 'react';
import { Typography } from '@mui/material';
import { CircularProgress } from '@mui/joy';
import Box from '@mui/material/Box';
// import { useRouter } from 'next/navigation';
import CourseCardUser from '@/app/_components/courseCardUser';
import CourseCardInstructor from '@/app/_components/courseCardInstructor';
import { fetchCurrentUser, fetchUserCourses } from './actions';

interface User {
    user_id: string;
    name: string;
    email: string;
    password: string;
    role: string;
}

interface Course {
    id: number;
    title: string;
    description: string;
}

export default function Dashboard() {
    // const [user, setUser] = useState<any>(null);
    const [userAuth, setUserAuth] = useState<any>(null);
    const [user, setUser] = useState<User>();
    const [studentCourses, setStudentCourses] = useState<Course[]>([]);
    const [instructorCourses, setInstructorCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(true);

    // const router = useRouter();

    useLayoutEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data, error } = await supabase.auth.getUser();

            if (error) {
                console.error("Error fetching user:", error.message);
            } else {
                setUserAuth(data.user);
                // Now fetch the user details from the backend
                const user_id = data.user?.id;
                if (user_id) {
                    const userDetails = await fetchCurrentUser(user_id);
                    setUser(userDetails);
                }
                // Now fetch the user courses
                const courses = await fetchUserCourses(user_id);
                setStudentCourses(courses.studentCourses);
                setInstructorCourses(courses.instructorCourses);

            }
            setCoursesLoading(false); // End loading
        };

        fetchUser();
    }, []);

    // Map courses to CourseCard components
    // const courseEls = courses.map((course, idx) => (
    //     <CourseCard key={idx} course={course} />
    // ));

    return (
        <div>
            <Navbar />
            <Box sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>This is the User Dashboard of the LMS</Typography>

                {userAuth && user ? (
                    <div>
                        <Typography variant="h5" gutterBottom>Welcome, {user.name}!</Typography>

                        {coursesLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Typography variant="h6" gutterBottom>Courses You Teach</Typography>
                                    {instructorCourses && instructorCourses.length > 0 ? (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
                                            {instructorCourses.map((course, idx) => (
                                                <CourseCardInstructor key={idx} course={course} />
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography color="text.secondary">You’re not teaching any courses yet.</Typography>
                                    )}
                                </Box>

                                <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Typography variant="h6" gutterBottom>Courses You're Enrolled In</Typography>
                                    {studentCourses && studentCourses.length > 0 ? (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
                                            {studentCourses.map((course, idx) => (
                                                <CourseCardUser key={idx} course={course} />
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography color="text.secondary">You're not enrolled in any courses yet.</Typography>
                                    )}
                                </Box>

                            </>
                        )}
                    </div>
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                )}
            </Box>
        </div>
    );
}
