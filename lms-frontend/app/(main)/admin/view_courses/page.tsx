"use client"

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CircularProgress } from "@mui/joy";
import ResponsiveAppBar from "@/app/_components/navbar";
import CourseCard from "@/app/_components/courseCardAdmin";
// import Layout from "../components/layout";
import { fetchAllCourses } from './actions';

export default function ManagerTeamView() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state

    // Fetch courses on component mount
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true); // Start loading
                console.log("fetching all courses")
                const courses = await fetchAllCourses();
                setCourses(courses);
            } catch (error) {
                console.error("Error during fetching courses:", error);
            } finally {
                setLoading(false); // End loading
            }
        };

        fetchCourses();
    }, []);

    // Map courses to CourseCard components
    const courseEls = courses.map((course, idx) => (
        <CourseCard key={idx} course={course} />
    ));

    // Conditionally render based on loading state
    return (
        <Box>
            <ResponsiveAppBar />
            <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Box>
                    <Box sx={{ padding: 5, textAlign: "center" }}>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h3">All Courses</Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                                    <CircularProgress />
                                </div>
                            ) : (
                                courseEls
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}