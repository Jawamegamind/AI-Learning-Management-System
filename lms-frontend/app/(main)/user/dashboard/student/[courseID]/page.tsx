"use client";

import {useState, useLayoutEffect} from "react";
// import axios from "axios";
import { useParams } from "next/navigation";
import { Box, Typography, Tabs, Tab, Grid2, Paper, List, ListItem, ListItemText, Divider, Button, Link, TextField, FormGroup, FormControlLabel, Checkbox } from "@mui/material";
import { createClient } from "@/utils/supabase/client";
import ResponsiveAppBar from "@/app/_components/navbar";
import jsPDF from "jspdf";
import { Alert } from '@mui/material';
import Snackbar, {SnackbarCloseReason} from '@mui/material/Snackbar';
import {fetchCourseDataFromID, generateSummarization} from './actions';

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
    const [activeTool, setActiveTool] = useState<null | 'summarize' | 'quiz' | 'assignment'>(null);
    const [summarizationPrompt, setSummarizationPrompt] = useState("")
    const [error, setError] = useState<string | null>(null);;
    const [selectedSummarizationLectures, setSelectedSummarizationLectures] = useState<string[]>([]);
    const [summarizationGenerating, setSummarizationGenerating] = useState(false);
    const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
    // const [files, setFiles] = useState<{
    //   assignments: FileItem[];
    //   quizzes: FileItem[];
    //   lectures: FileItem[];
    // }>({
    //   assignments: [],
    //   quizzes: [],
    //   lectures: [],
    // });
    const [files, setFiles] = useState<FileItem[]>([]);
    const [open, setOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    const supabase = createClient();

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
      setTabIndex(newValue);
    };

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

    function downloadPDF(content: string) {
      const doc = new jsPDF();
      const margin = 10;
      const lineHeight = 10;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;

      doc.setFontSize(10); // Set font size to 10pt
      const lines = doc.splitTextToSize(content, 180); // wrap text to fit page width
    
      let y = margin;
    
      lines.forEach((line: string | string[]) => {
        if (y + lineHeight > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
    
      doc.save("summary.pdf");
    }
    

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

                {/* File List */}
                <List>
                  {files.filter((f) => f.name.startsWith(`${folder}/`)).map((file, index, arr) => {
                    const fileName = file.name.replace(`${folder}/`, "");
                    return (
                      <Box key={file.name}>
                        <ListItem>
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
                      {/* <Typography>Summarizing feature in progress...</Typography> */}
                      <TextField
                        fullWidth
                        label="Please mention the specifics of how you want the lecture to be summarized"
                        value={summarizationPrompt}
                        onChange={(e) => setSummarizationPrompt(e.target.value)}
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
                                  checked={selectedSummarizationLectures.includes(file.url)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedSummarizationLectures(prev =>
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
                          if (summarizationPrompt.trim() === "") {
                            setError("Please enter a prompt");
                            return;
                          }

                          setSummarizationGenerating(true);
                          setError(null);

                          try {
                            const result = await generateSummarization(summarizationPrompt, selectedSummarizationLectures);
                            // console.log(result);
                            setGeneratedSummary(result); // store the returned summary
                            handleClick("Summarization generated successfully.", "success");
                          } catch (err) {
                            setError(err.message || "Failed to generate summary please try again.");
                            handleClick("Failed to generate summary please try again.", "error");
                          } finally {
                            setSummarizationGenerating(false);
                            // setActiveTool(null);
                            // setSummarizationPrompt("");
                            setSelectedSummarizationLectures([]);
                            // setGeneratedSummary(null);
                          }
                        }}
                      >
                        {summarizationGenerating ? "Generating..." : "Generate"}
                      </Button>

                      {generatedSummary && (
                        <Box mt={2}>
                          <Typography variant="subtitle2">Generated Summary:</Typography>
                          <Paper elevation={1} sx={{ p: 2, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                            {generatedSummary}
                          </Paper>
                          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => downloadPDF(generatedSummary)}>
                            Download as PDF
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid2>
            </Grid2>
          </Box>
        )}
      </Box>
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
    </Box>
  );
}
