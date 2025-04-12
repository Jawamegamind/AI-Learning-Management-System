"use client";

import {useState, useLayoutEffect} from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { Box, Typography, Tabs, Tab, Grid2, Paper, List, ListItem, ListItemText, Divider, Button, Link } from "@mui/material";
import { createClient } from "@/utils/supabase/client";
import ResponsiveAppBar from "@/app/_components/navbar";

interface Course {
  id: number;
  title: string;
  description: string;
  // Add other properties of the course object if needed
}

export default function CoursePage() {
  const { courseID } = useParams();
    const [tabIndex, setTabIndex] = useState(0);
    const [course, setCourse] = useState<Course | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
  
    const supabase = createClient();
  
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
      setTabIndex(newValue);
    };
  
    useLayoutEffect(() => {
      const fetchCourse = async () => {
        // Fetching course details from the backend
        const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseID}`);
        setCourse(response.data.course);
      };
    
      const fetchFiles = async () => {
        const { data, error } = await supabase.storage.from("course-materials").list(`${courseID}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });
    
        if (error) {
          console.error("Failed to list files:", error.message);
          return;
        }
    
        const fileItems: FileItem[] = await Promise.all(
          (data || []).map(async (item) => {
            const { data: signedUrlData } = await supabase.storage
              .from("course-materials")
              .createSignedUrl(`${courseID}/${item.name}`, 60 * 60); // 1-hour expiry
    
            return {
              name: item.name,
              url: signedUrlData?.signedUrl ?? "#",
            };
          })
        );
    
        setFiles(fileItems);
      };
  
      fetchCourse();
      fetchFiles();
    }, [courseID]);

  return (
    <Box>
      {/* Navbar */}
      <ResponsiveAppBar />

      {/* Course Header */}
      <Box p={4}>
        <Typography variant="h4" gutterBottom>
          Course Title
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {course ? course.description : "Loading course description..."}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box px={4}>
        <Tabs value={tabIndex} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="Overview" />
          <Tab label="Announcements" />
          <Tab label="Resources" />
          <Tab label="Assignments" />
          <Tab label="AI Tools" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box p={4}>
        {tabIndex === 0 && (
          <Box>
            <Typography variant="h6">Overview</Typography>
            <Typography>This section contains the overall course goals, modules, and timeline.</Typography>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            <Typography variant="h6">Announcements</Typography>
            <List>
              <ListItem>
                <ListItemText primary="Welcome to the course!" secondary="Posted on March 29, 2025" />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="First assignment released." secondary="Posted on March 30, 2025" />
              </ListItem>
            </List>
          </Box>
        )}

        {tabIndex === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Resources</Typography>
            {/* File List */}
            <List>
              {files.map((file, index) => (
                <Box key={file.name}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Link href={file.url} target="_blank" rel="noopener noreferrer" underline="hover">
                          {file.name}
                        </Link>
                      }
                      secondary="Uploaded file"
                    />
                  </ListItem>
                  {index < files.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Box>
        )}

        {tabIndex === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>Assignments</Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Assignment 1: Intro Quiz</Typography>
                  <Typography variant="body2">Due: April 2, 2025</Typography>
                  <Button sx={{ mt: 1 }} variant="contained">View Assignment</Button>
                </Paper>
              </Grid2>
            </Grid2>
          </Box>
        )}

        {tabIndex === 4 && (
          <Box>
            <Typography variant="h6" gutterBottom>AI Tools</Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs:12, sm:6, md:4 }}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Summarize Lecture</Typography>
                  <Button fullWidth sx={{ mt: 1 }} variant="outlined">Start</Button>
                </Paper>
              </Grid2>
              <Grid2 size={{ xs:12, sm:6, md:4 }}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Generate Quiz</Typography>
                  <Button fullWidth sx={{ mt: 1 }} variant="outlined">Start</Button>
                </Paper>
              </Grid2>
            </Grid2>
          </Box>
        )}
      </Box>
    </Box>
  );
}
