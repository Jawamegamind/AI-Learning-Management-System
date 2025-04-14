"use client";

import {useState, useLayoutEffect} from "react";
// import axios from "axios";
import { useParams } from "next/navigation";
import { Box, Typography, Tabs, Tab, Grid2, Paper, List, ListItem, ListItemText, Divider, Button, Link, IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { createClient } from "@/utils/supabase/client";
import ResponsiveAppBar from "@/app/_components/navbar";
import {fetchCourseDataFromID} from './actions';

interface Course {
  id: number;
  title: string;
  description: string;
  // Add other properties of the course object if needed
}

interface FileItem {
  name: string;
  url: string;
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

  const handleDeleteFile = async (fileName: string) => {
    const { error } = await supabase.storage
      .from("course-materials")
      .remove([`${courseID}/${fileName}`]);

    if (error) {
      console.error("Failed to delete file:", error.message);
      alert("Failed to delete file.");
      return;
    }

    // Remove file from local state
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  useLayoutEffect(() => {
    const fetchCourse = async () => {
      // Fetching course details from the backend
      const course = await fetchCourseDataFromID(courseID)
      setCourse(course);
    };

    const fetchFiles = async () => {
      const folders = ["assignments", "quizzes", "lectures"];
      const allFiles: FileItem[] = [];

      for (const folder of folders) {
        const { data, error } = await supabase.storage.from("course-materials").list(`${courseID}/${folder}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });

        if (error) {
          console.error(`Failed to list files in ${folder}:`, error.message);
          continue;
        }

        const fileItems: FileItem[] = await Promise.all(
          (data || []).map(async (item) => {
            const filePath = `${courseID}/${folder}/${item.name}`;

            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from("course-materials")
              .createSignedUrl(filePath, 60 * 60); // 1-hour expiry

            if (urlError) {
              console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
            }

            return {
              name: `${folder}/${item.name}`, // include folder path
              url: signedUrlData?.signedUrl ?? "#",
            };
          })
        );

        allFiles.push(...fileItems);
      }

      setFiles(allFiles);
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
        {course ? course.title : "Course Title..."}
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

            {["assignments", "quizzes", "lectures"].map((folder) => (
              <Box key={folder} mb={4}>
                <Typography variant="subtitle1" gutterBottom sx={{ textTransform: "capitalize" }}>
                  {folder}
                </Typography>

                {/* Upload Section */}
                <Box component="form" sx={{ my: 2 }}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !courseID) return;

                      const filePath = `${courseID}/${folder}/${file.name}`;

                      const { error } = await supabase.storage
                        .from("course-materials")
                        .upload(filePath, file, {
                          cacheControl: "3600",
                          upsert: true,
                        });

                      if (error) {
                        console.error("Upload error:", error.message);
                        alert(`Failed to upload file to ${folder}.`);
                      } else {
                        alert(`File uploaded to ${folder} successfully!`);
                        // Refresh files for this folder
                        const { data: signedUrlData } = await supabase.storage
                          .from("course-materials")
                          .createSignedUrl(filePath, 60 * 60);

                        setFiles((prev) => [...prev, { name: `${folder}/${file.name}`, url: signedUrlData?.signedUrl ?? "#" }]);
                      }
                    }}
                  />
                </Box>

                {/* File List */}
                <List>
                  {files.filter((f) => f.name.startsWith(`${folder}/`)).map((file, index, arr) => {
                    const fileName = file.name.replace(`${folder}/`, "");
                    return (
                      <Box key={file.name}>
                        <ListItem
                          secondaryAction={
                            <IconButton
                              edge="end"
                              aria-label="delete"
                              onClick={() => handleDeleteFile(file.name)}
                            >
                              <Delete/>
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={
                              <Link href={file.url} target="_blank" rel="noopener noreferrer" underline="hover">
                                {fileName}
                              </Link>
                            }
                            secondary={`Uploaded to ${folder}`}
                          />
                        </ListItem>
                        {index < arr.length - 1 && <Divider />}
                      </Box>
                    );
                  })}
                </List>
              </Box>
            ))}
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
              <Grid2 size={{ xs:12, sm:6, md:4 }}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Generate Assignment</Typography>
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
