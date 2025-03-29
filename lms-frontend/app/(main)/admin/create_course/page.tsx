"use client";

import * as React from 'react';
import { Box, Button, TextField, Typography, Paper, Grid2 } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Navbar from '../../../_components/navbar';
import { useState } from 'react';
import { Dayjs } from 'dayjs';
import { Alert } from '@mui/material';
import Snackbar, {SnackbarCloseReason} from '@mui/material/Snackbar';
import { useEffect } from 'react';
import { createCourse, getCurrentUser } from './actions';

export default function CreateCourseForm() {
    const [courseData, setCourseData] = useState<{
        title: string;
        description: string;
        start_date: Dayjs | null;
        end_date: Dayjs | null;
        max_students: string;
    }>({
        title: '',
        description: '',
        start_date: null,
        end_date: null,
        max_students: ''
    });
    const [userData, setUserData] = useState<any>(null); // Store admin user data
    const [open, setOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error' | 'info' | 'warning'>('info');

    // Fetch the user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            const user = await getCurrentUser();
            setUserData(user); // Store user data
        };
        fetchUserData();
    }, []);
    
    const handleClick = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpen(true);
    };

    const handleClose = (
        event?: React.SyntheticEvent | Event,
        reason?: SnackbarCloseReason,
    ) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCourseData({
            ...courseData,
            [event.target.name]: event.target.value,
        });
    };

    const handleDateChange = (key: string, value: Dayjs | null) => {
        setCourseData({
            ...courseData,
            [key]: value,
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Validate the form data
        if (!courseData.title || !courseData.description || !courseData.start_date || !courseData.end_date || !courseData.max_students) {
            handleClick("All fields are required", "error");
            return;
        }
        // Checking the max students is negative
        if (parseInt(courseData.max_students) < 0) {
            handleClick("Max students cannot be negative", "error");
            return;
        }
        // Checking the start date is after the end date
        if (courseData.start_date && courseData.end_date && courseData.start_date.isAfter(courseData.end_date)) {
            handleClick("Start date cannot be after end date", "error");
            return;
        }

        // Format dates to YYYY-MM-DD
        const formatDate = (date: Dayjs | null) => date?.format('YYYY-MM-DD') || '';
        
        // Now sending the data to the server
        const formData = new FormData();
        formData.append('title', courseData.title);
        formData.append('description', courseData.description);
        formData.append('start_date', formatDate(courseData.start_date));
        formData.append('end_date', formatDate(courseData.end_date));
        formData.append('max_students', courseData.max_students);
        const response = await createCourse(formData, userData);
        // console.log("The response is", response);

        // console.log(courseData);

        // Check the returned response data and display the alerts based on that
        if (response.message == "Course created successfully") {
            handleClick("Course created successfully", "success");
        }
        else if (response.message == "Course creation failed") {
            handleClick("Course creation failed", "error");
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Navbar />
            <Paper elevation={3} sx={{ padding: 6, margin: "auto", mt: 5, maxWidth: 500 }}>
                <Typography variant="h4" gutterBottom>Create a New Course</Typography>
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Course Title"
                        name="title"
                        fullWidth
                        margin="normal"
                        onChange={handleChange}
                    />
                    <TextField
                        label="Description"
                        name="description"
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                        onChange={handleChange}
                    />
                    <Grid2 container spacing={2} justifyContent="space-between" alignItems="center">
                        <Grid2>
                            <DatePicker
                                label="Start Date"
                                value={courseData.start_date}
                                onChange={(value) => handleDateChange('start_date', value)}
                            />
                        </Grid2>
                        <Grid2>
                            <DatePicker
                                label="End Date"
                                value={courseData.end_date}
                                onChange={(value) => handleDateChange('end_date', value)}
                            />
                        </Grid2>
                    </Grid2>
                    <TextField
                        label="Max Students"
                        name="max_students"
                        type="number"
                        fullWidth
                        margin="normal"
                        onChange={handleChange}
                    />
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                            Create Course
                        </Button>
                    </Box>
                </form>
            </Paper>
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleClose}
                    severity={snackbarSeverity}
                    variant="filled"
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </LocalizationProvider>
    );
}
