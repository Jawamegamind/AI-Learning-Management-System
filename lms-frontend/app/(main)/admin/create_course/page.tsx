"use client";

import * as React from 'react';
import { Box, Button, TextField, Typography, Paper, Grid2 } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Navbar from '../../../_components/navbar';
import { useState } from 'react';
import { Dayjs } from 'dayjs';

export default function CreateCourseForm() {
    const [courseData, setCourseData] = useState({
        title: '',
        description: '',
        start_date: null,
        end_date: null,
        max_students: ''
    });

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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log(courseData);
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
        </LocalizationProvider>
    );
}
