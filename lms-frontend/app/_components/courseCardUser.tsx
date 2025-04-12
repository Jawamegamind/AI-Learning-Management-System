import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import CardActions from '@mui/joy/CardActions';
import Typography from '@mui/joy/Typography';
import { useRouter } from 'next/navigation';
// import { useNavigate } from "react-router-dom";

interface Course {
    id: number;
    title: string;
    description: string;
    // Add other properties of the course object if needed
}

export default function CourseCardUser({course}: {course: Course}) {
    const router = useRouter();

    const redirectToCourseView = () => {
        // Redirect to the course view page
        router.push(`/user/dashboard/student/${course.id}`);
    }

    return (
        <Card
        variant="outlined"
        sx={{
            width: {xs: "60vw", md:320},
            // to make the card resizable
            overflow: 'auto',
            resize: 'horizontal',
            margin: 2,
        }}
        >
        <Box
            sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            }}
        >
        </Box>
        <CardContent>
            <Typography level="title-lg">{course.title}</Typography>
            <Typography level="body-md" sx={{ mb: 1 }}>{course.description}</Typography>
        </CardContent>
        <CardActions sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button variant="outlined" color="neutral" onClick={redirectToCourseView}>
                View Course
            </Button>
        </CardActions>
        </Card>
    );
}