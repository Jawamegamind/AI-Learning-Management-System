import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import CardActions from '@mui/joy/CardActions';
import Typography from '@mui/joy/Typography';
import { useRouter } from 'next/navigation';
// import { useNavigate } from "react-router-dom";

export default function CourseCard({course}) {
    const router = useRouter();
    const redirectToMemberInfo = () => {
        // Redirect to the member info page
        // navigate(`/manager-team-info/${user._id}`);
        router.push(`/manager-team-info/${course._id}`);
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
            <Button variant="outlined" color="neutral" onClick={redirectToMemberInfo}>
                View Course
            </Button>
        </CardActions>
        </Card>
    );
}