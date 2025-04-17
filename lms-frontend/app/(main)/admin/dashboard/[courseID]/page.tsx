"use client";

import {useState, useLayoutEffect} from "react";
// import axios from "axios";
import { useParams } from "next/navigation";
import { Box, Typography, Tabs, Tab, Grid2, Paper, List, ListItem, ListItemText, Divider, Button, Link, IconButton, TextField, FormControlLabel, FormGroup, Checkbox  } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { createClient } from "@/utils/supabase/client";
import ResponsiveAppBar from "@/app/_components/navbar";
import {fetchCourseDataFromID, generateAssignmentOrQuiz } from './actions';

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
  const [activeTool, setActiveTool] = useState<null | 'summarize' | 'quiz' | 'assignment'>(null);
  const [assignmentPrompt, setAssignmentPrompt] = useState("");
  const [selectedLectures, setSelectedLectures] = useState<string[]>([]);
  const [assignmentGenerating, setAssignmentGenerating] = useState(false);
  const [quizPrompt, setQuizPrompt] = useState("");
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [selectedQuizLectures, setSelectedQuizLectures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);



  const supabase = createClient();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      // Construct the file path as stored in storage
      const storageFilePath = `${courseID}/${fileName}`; // e.g., "CS101/lecture.pdf"

      // Delete file from Supabase storage
      const { error: storageError } = await supabase.storage
        .from('course-materials')
        .remove([storageFilePath]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError.message);
        alert('Failed to delete file from storage.');
        return;
      }

      // Construct file_path for document_embed (adjust based on your format)
      const embedFilePath = storageFilePath

      // Call delete_embeddings_by_path via RPC
      const { data, error: rpcError } = await supabase
        .rpc('delete_embeddings_by_path', { file_path_param: embedFilePath })
        .single();

      if (rpcError || !data) {
        console.error('Failed to delete embeddings:', rpcError?.message || 'No data returned');
        alert('Failed to delete embeddings from database.');
        return;
      }

      // Check RPC response
      if (data.status !== 'success') {
        console.error('Embedding deletion failed:', data.message);
        alert(`Failed to delete embeddings: ${data.message}`);
        return;
      }

      console.log('Successfully deleted file and embeddings:', data.message);

      // Update local state
      setFiles((prev) => prev.filter((f) => f.name !== fileName));

    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    }
  };

  useLayoutEffect(() => {
    const fetchCourse = async () => {
      // Fetching course details from the backend
      if (!courseID) return;
      const course = await fetchCourseDataFromID(courseID.toString());
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
              <Grid2 size={{xs:12, sm:6, md:4}}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Summarize Lecture</Typography>
                  <Button
                    fullWidth
                    sx={{ mt: 1 }}
                    variant="outlined"
                    disabled={activeTool !== null && activeTool !== 'summarize'}
                    onClick={() => setActiveTool(activeTool === 'summarize' ? null : 'summarize')}
                  >
                    {activeTool === 'summarize' ? "Close" : "Start"}
                  </Button>

                  {activeTool === 'summarize' && (
                    <Box mt={2}>
                      {/* Add summarize lecture input UI here */}
                      <Typography>Summarizing feature in progress...</Typography>
                    </Box>
                  )}
                </Paper>
              </Grid2>

              <Grid2 size={{xs:12, sm:6, md:4}}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Generate Quiz</Typography>
                  <Button
                    fullWidth
                    sx={{ mt: 1 }}
                    variant="outlined"
                    disabled={activeTool !== null && activeTool !== 'quiz'}
                    onClick={() => setActiveTool(activeTool === 'quiz' ? null : 'quiz')}
                  >
                    {quizGenerating ? "Generating" : activeTool === 'quiz' ? "Close" : "Start"}
                  </Button>

                  {activeTool === 'quiz' && (
                    <Box mt={2}>
                      <TextField
                        fullWidth
                        label="Please mention the specific topics or problems you want the quiz to be based on"
                        value={quizPrompt}
                        onChange={(e) => setQuizPrompt(e.target.value)}
                        multiline
                        rows={3}
                      />
                      {error && (
                        <Typography color="error" mt={1}>
                          {error}
                        </Typography>
                      )}

                      <FormGroup sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Select lectures to include:</Typography>
                        {files
                          .filter(f => f.name.startsWith("lectures/"))
                          .map((file) => (
                            <FormControlLabel
                              key={file.name}
                              control={
                                <Checkbox
                                  checked={selectedQuizLectures.includes(file.url)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedQuizLectures(prev =>
                                      checked
                                        ? [...prev, file.url]
                                        : prev.filter(url => url !== file.url)
                                    );
                                  }}
                                />
                              }
                              label={file.name.replace("lectures/", "")}
                            />
                          ))}
                      </FormGroup>

                      <Button
                        sx={{ mt: 2 }}
                        variant="contained"
                        onClick={async () => {
                          if (quizPrompt.trim() === "") {
                            setError("Please enter a prompt");
                            return;
                          }

                          setQuizGenerating(true);
                          setError(null);

                          try {
                            const result = await generateAssignmentOrQuiz(quizPrompt, selectedQuizLectures, "quiz");
                            console.log(result);
                            alert("Quiz generated successfully.");
                          } catch (err) {
                            setError(err.message || "Failed to generate quiz.");
                            alert("Failed to generate quiz.");
                          } finally {
                            setQuizGenerating(false);
                            setActiveTool(null);
                            setQuizPrompt("");
                            setSelectedQuizLectures([]);
                          }
                        }}
                      >
                        {quizGenerating ? "Generating..." : "Generate"}
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid2>

              <Grid2 size={{xs:12, sm:6, md:4}}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Generate Assignment</Typography>
                  <Button
                    fullWidth
                    sx={{ mt: 1 }}
                    variant="outlined"
                    disabled={activeTool !== null && activeTool !== 'assignment'}
                    onClick={() => setActiveTool(activeTool === 'assignment' ? null : 'assignment')}
                  >
                    {assignmentGenerating ? "Generating" : activeTool === 'assignment' ? "Close" : "Start"}
                  </Button>

                  {activeTool === 'assignment' && (
                    <Box mt={2}>
                      <TextField
                        fullWidth
                        label="Please mention the specific topics or problems you want the assignment to be based on"
                        value={assignmentPrompt}
                        onChange={(e) => setAssignmentPrompt(e.target.value)}
                        multiline
                        rows={3}
                      />
                      {error && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                          {error}
                        </Typography>
                      )}
                      <FormGroup sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Select lectures to include as reference material:</Typography>
                        {files
                          .filter(f => f.name.startsWith("lectures/"))
                          .map((file) => (
                            <FormControlLabel
                              key={file.name}
                              control={
                                <Checkbox
                                  checked={selectedLectures.includes(file.url)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedLectures(prev =>
                                      checked
                                        ? [...prev, file.url]
                                        : prev.filter(url => url !== file.url)
                                    );
                                  }}
                                />
                              }
                              label={file.name.replace("lectures/", "")}
                            />
                          ))}
                      </FormGroup>

                      <Button
                        sx={{ mt: 2 }}
                        variant="contained"
                        onClick={async () => {
                          if (!assignmentPrompt.trim()) {
                            setError("Please enter a prompt");
                            return;
                          }

                          setAssignmentGenerating(true);
                          setError(null);

                          try {
                              const result = await generateAssignmentOrQuiz(assignmentPrompt, selectedLectures, "assignment");
                              console.log(result)
                              alert("Assignment generated successfully.");
                          } catch (error) {
                              setError(err.message || 'Failed to generate assignment');
                              alert("Failed to generate assignment.");
                          } finally {
                              setAssignmentGenerating(false);
                              setActiveTool(null);
                              setAssignmentPrompt("");
                              setSelectedLectures([]);
                          }
                        }}
                      >
                        {assignmentGenerating ? "Generating..." : "Generate"}
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid2>
            </Grid2>
          </Box>
        )}

      </Box>
    </Box>
  );
}
