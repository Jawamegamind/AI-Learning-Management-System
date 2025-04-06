"use client"

import * as React from 'react';
import Navbar from '../../../_components/navbar';
import { createClient } from '@/utils/supabase/client';
import {useState, useLayoutEffect} from 'react';
import { Button, Typography } from '@mui/material';
import { CircularProgress } from '@mui/joy';
import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';
import CourseCard from '@/app/_components/courseCardUser';
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
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(true);

    const router = useRouter();

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
                const userCourses = await fetchUserCourses(user_id);
                console.log("The user courses are", userCourses);
                setCourses(userCourses);
            }
            setCoursesLoading(false); // End loading
        };

        fetchUser();
    }, []);

    const handleCreateCourse = () => {
        router.push("/admin/create_course");
    };

    const handleViewCourses = () => {
        router.push("/admin/view_courses");
    }

    // Map courses to CourseCard components
    const courseEls = courses.map((course, idx) => (
        <CourseCard key={idx} course={course} />
    ));

    return (
        <div>
            <Navbar />
            <h1>This is the User Dashboard of the LMS</h1>
            {userAuth && user ? (
                <div>
                    <h2>Welcome, {user.name}!</h2>
                    {/* <pre>{JSON.stringify(userAuth, null, 2)}</pre> */}
                    <Typography>Your Courses</Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                        {coursesLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                <CircularProgress />
                            </Box>
                        ) : courses.length > 0 ? (
                            courseEls
                        ) : (
                            <Typography>No courses found.</Typography>
                        )}
                    </Box>
                    <Button variant="contained" color="primary" onClick={handleCreateCourse} sx={{ mt: 2 }}>
                        Create New Course
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleViewCourses} sx={{ mt: 2 }}>
                        View All Courses
                    </Button>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                    <CircularProgress />
                </div>
            )}
        </div>
    );
}
