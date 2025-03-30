"use client"

import { useLayoutEffect, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import axios from "axios";
import ResponsiveAppBar from "@/app/_components/navbar";
import CourseCard from "@/app/_components/courseCard";
// import Layout from "../components/layout";

export default function ManagerTeamView() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state

    // Fetch courses on component mount
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true); // Start loading
                const response = await axios.get(
                    `http://localhost:8000/api/courses/get_courses`
                );

                console.log(response.data); // Log the response
                setCourses(response.data.courses);
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
                                <Typography variant="h6">Loading courses...</Typography>
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