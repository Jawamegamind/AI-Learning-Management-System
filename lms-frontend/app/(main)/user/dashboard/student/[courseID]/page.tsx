"use client";

import {useState, useLayoutEffect} from "react";
// import axios from "axios";
import { useParams } from "next/navigation";
import { Box, Typography, Tabs, Tab, Grid2, Paper, List, ListItem, ListItemText, Divider, Button, Link,TextField, FormGroup, FormControl , InputLabel ,  Select,MenuItem, FormControlLabel, Checkbox } from "@mui/material";
import { createClient } from "@/utils/supabase/client";
import ResponsiveAppBar from "@/app/_components/navbar";
import jsPDF from "jspdf";
import { Alert } from '@mui/material';
import Snackbar, {SnackbarCloseReason} from '@mui/material/Snackbar';
import LoadingModal from '../../../../../_components/LoadingModal';
import FlashcardModal from '../../../../../_components/flashCardModal';
import {fetchCourseDataFromID, generateSummarization, generateFlashcards, generatePracticeQuestions, chatWithLecture} from './actions';

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface FileItem {
  name: string;
  url: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  // Add other properties of the course object if needed
}

interface FlashcardData {
  [key: string]: {
    Q: string;
    A: string;
  }[];
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function CoursePage() {
  const { courseID } = useParams();
    const [tabIndex, setTabIndex] = useState(0);
    const [course, setCourse] = useState<Course | null>(null);
    const [activeTool, setActiveTool] = useState<null | 'summarize' | 'quiz' | 'assignment' | 'flashcards' | 'practice' | 'chat'>(null);
    const [summarizationPrompt, setSummarizationPrompt] = useState("");
    const [flashcardsPrompt, setFlashcardsPrompt] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [selectedSummarizationLectures, setSelectedSummarizationLectures] = useState<string[]>([]);
    const [selectedFlashcardsLectures, setSelectedFlashcardsLectures] = useState<string[]>([]);
    const [summarizationGenerating, setSummarizationGenerating] = useState(false);
    const [flashcardsGenerating, setFlashcardsGenerating] = useState(false);
    const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
    const [generatedFlashcards, setGeneratedFlashcards] = useState<string | null>(null);
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedFlashcardData, setSelectedFlashcardData] = useState<FlashcardData | null>(null);
    const [practicePrompt, setPracticePrompt] = useState("");
    const [selectedPracticeLectures, setSelectedPracticeLectures] = useState<string[]>([]);
    const [practiceDifficulty, setPracticeDifficulty] = useState<"easy" | "medium" | "hard" | "">("");
    const [practiceGenerating, setPracticeGenerating] = useState(false);
    const [generatedPracticeQuestions, setGeneratedPracticeQuestions] = useState("");
    const [chatMessage, setChatMessage] = useState("");
    const [selectedChatLectures, setSelectedChatLectures] = useState<string[]>([]);
    const [chatGenerating, setChatGenerating] = useState(false);
    const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

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
    const [userAuth, setUserAuth] = useState<any>(null);

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
      const fetchUser = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error fetching user:", error.message);
        } else {
          setUserAuth(data.user);
        }
      };
      fetchUser();
    }, []);

    async function uploadSummaryToSupabase(summaryText: string) {
      if (!userAuth?.id) {
        handleClick("User not authenticated", "error");
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(summaryText, 180);
      const margin = 10;
      const lineHeight = 10;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      const pdfBlob = doc.output("blob");

      const fileName = `summary_${Date.now()}.pdf`;
      const filePath = `${courseID}/summarizations/${userAuth.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("course-materials")
        .upload(filePath, pdfBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (error) {
        console.error("Upload failed:", error.message);
        handleClick("Failed to upload summary PDF.", "error");
      } else {
        handleClick("Summary uploaded successfully!", "success");
        // Refetch files to show the new summary
        const fetchFiles = async () => {
          if (!userAuth?.id) return;

          const folders = ["assignments", "quizzes", "lectures", "summarizations", "quiz_submissions", "quiz_feedback", "quiz_marks", "assignment_submissions", "assignment_feedback", "assignment_marks"];
          const allFiles: FileItem[] = [];

          for (const folder of folders) {
            let path = `${courseID}/${folder}`;

            // For summarizations, we need to look in the user's specific directory
            if (folder === "summarizations" || folder === "quiz_submissions" || folder === "quiz_feedback" || folder === "quiz_marks" || folder === "assignment_submissions" || folder === "assignment_feedback" || folder === "assignment_marks") {
              path = `${path}/${userAuth.id}`;
            }

            const { data, error } = await supabase.storage.from("course-materials").list(path, {
              limit: 100,
              offset: 0,
              sortBy: { column: "name", order: "asc" },
            });

            if (error) {
              console.error(`Failed to list files in ${folder}:`, error.message);
              continue;
            }

            const fileItems = await Promise.all<FileItem | null>(
              (data || []).map(async (item) => {
                const filePath = `${path}/${item.name}`;

                const { data: signedUrlData, error: urlError } = await supabase.storage
                  .from("course-materials")
                  .createSignedUrl(filePath, 60 * 60); // 1-hour expiry

                if (urlError) {
                  console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
                  return null;
                }

                return {
                  name: `${folder}/${item.name}`, // include folder path
                  url: signedUrlData?.signedUrl ?? "#",
                };
              })
            );

            allFiles.push(...fileItems.filter((item): item is FileItem => item !== null));
          }

          setFiles(allFiles);
        };
        fetchFiles();
      }
    }

    async function uploadFlashcardsToSupabase(flashcardsText: string) {
      if (!userAuth?.id) {
        handleClick("User not authenticated", "error");
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(flashcardsText, 180);
      const margin = 10;
      const lineHeight = 10;
      const pageHeight = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      const pdfBlob = doc.output("blob");

      const fileName = `flashcards_${Date.now()}`;
      const filePath = `${courseID}/flashcards/${userAuth.id}/${fileName}.pdf`;

      const { error } = await supabase.storage
        .from("course-materials")
        .upload(filePath, pdfBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (error) {
        console.error("Upload failed:", error.message);
        handleClick("Failed to upload flashcards PDF.", "error");
      } else {
         // --- Convert to JSON and Upload ---
        const flashcardsJSON: Record<string, { Q: string; A: string }[]> = {};
        const lines = flashcardsText.split("\n").map(line => line.trim()).filter(Boolean);

        let currentTopic = "";
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];

          if (line.startsWith("**") && line.endsWith("**")) {
            currentTopic = line.replace(/\*\*/g, "").trim();
            if (!flashcardsJSON[currentTopic]) {
              flashcardsJSON[currentTopic] = [];
            }
            i++;
          } else if (line.startsWith("Q:") && lines[i + 1]?.startsWith("A:")) {
            const question = line.replace(/^Q:\s*/, "").trim();
            const answer = lines[i + 1].replace(/^A:\s*/, "").trim();
            flashcardsJSON[currentTopic].push({ Q: question, A: answer });
            i += 2;
          } else {
            i++;
          }
        }

        const jsonBlob = new Blob([JSON.stringify(flashcardsJSON, null, 2)], { type: "application/json" });
        const jsonFilePath = `${courseID}/flashcards/${userAuth.id}/${fileName}.json`;
        const { error: jsonError } = await supabase.storage
          .from("course-materials")
          .upload(jsonFilePath, jsonBlob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "application/json",
          });

        if (jsonError) {
          console.error("JSON upload failed:", jsonError.message);
          handleClick("Flashcards PDF uploaded, but JSON upload failed.", "warning");
        }
        handleClick("Flashcards uploaded successfully!", "success");
        // Refetch files to show the new flashcards
        const fetchFiles = async () => {
          if (!userAuth?.id) return;

          const folders = ["assignments", "quizzes", "lectures", "summarizations", "flashcards", "quiz_submissions", "quiz_feedback", "quiz_marks", "assignment_submissions", "assignment_feedback", "assignment_marks"];
          const allFiles: FileItem[] = [];

          for (const folder of folders) {
            let path = `${courseID}/${folder}`;

            // For user-specific content, we need to look in the user's specific directory
            if (folder === "summarizations" || folder === "flashcards" || folder === "quiz_submissions" || folder === "quiz_feedback" || folder === "quiz_marks" || folder === "assignment_submissions" || folder === "assignment_feedback" || folder === "assignment_marks") {
              path = `${path}/${userAuth.id}`;
            }

            const { data, error } = await supabase.storage.from("course-materials").list(path, {
              limit: 100,
              offset: 0,
              sortBy: { column: "name", order: "asc" },
            });

            if (error) {
              console.error(`Failed to list files in ${folder}:`, error.message);
              continue;
            }

            const fileItems = await Promise.all<FileItem | null>(
              (data || []).map(async (item) => {
                const filePath = `${path}/${item.name}`;

                const { data: signedUrlData, error: urlError } = await supabase.storage
                  .from("course-materials")
                  .createSignedUrl(filePath, 60 * 60); // 1-hour expiry

                if (urlError) {
                  console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
                  return null;
                }

                return {
                  name: `${folder}/${item.name}`, // include folder path
                  url: signedUrlData?.signedUrl ?? "#",
                };
              })
            );

            allFiles.push(...fileItems.filter((item): item is FileItem => item !== null));
          }

          setFiles(allFiles);
        };
        fetchFiles();
      }
    }

    useLayoutEffect(() => {
      const fetchCourse = async () => {
        if (!courseID) return;
        const course = await fetchCourseDataFromID(courseID.toString());
        setCourse(course);
      };

      const fetchFiles = async () => {
        if (!userAuth?.id) return;

        const folders = ["assignments", "quizzes", "lectures", "summarizations", "flashcards", "quiz_submissions", "quiz_feedback", "quiz_marks", "assignment_submissions", "assignment_feedback", "assignment_marks"];
        const allFiles: FileItem[] = [];

        for (const folder of folders) {
          let path = `${courseID}/${folder}`;

          // For user-specific content, we need to look in the user's specific directory
          if (folder === "summarizations" || folder === "flashcards" || folder === "quiz_submissions" || folder === "quiz_feedback" || folder === "quiz_marks" || folder === "assignment_submissions" || folder === "assignment_feedback" || folder === "assignment_marks") {
            path = `${path}/${userAuth.id}`;
          }

          const { data, error } = await supabase.storage.from("course-materials").list(path, {
            limit: 100,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
          });

          if (error) {
            console.error(`Failed to list files in ${folder}:`, error.message);
            continue;
          }

          const fileItems = await Promise.all<FileItem | null>(
            (data || []).map(async (item) => {
              const filePath = `${path}/${item.name}`;

              const { data: signedUrlData, error: urlError } = await supabase.storage
                .from("course-materials")
                .createSignedUrl(filePath, 60 * 60); // 1-hour expiry

              if (urlError) {
                console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
                return null;
              }

              return {
                name: `${folder}/${item.name}`, // include folder path
                url: signedUrlData?.signedUrl ?? "#",
              };
            })
          );

          allFiles.push(...fileItems.filter((item): item is FileItem => item !== null));
        }

        setFiles(allFiles);
      };

      fetchCourse();
      fetchFiles();
    }, [courseID, userAuth?.id]);

    const handleChatSubmit = async () => {
        if (!chatMessage.trim()) {
            setError("Please enter a message");
            return;
        }

        setChatGenerating(true);
        setError(null);

        try {
            // Add user message to conversation history
            const userMessage: ChatMessage = { role: 'user', content: chatMessage };
            setConversationHistory(prev => [...prev, userMessage]);

            const response = await chatWithLecture(chatMessage, selectedChatLectures, conversationHistory);
            
            // Add assistant response to conversation history
            const assistantMessage: ChatMessage = { role: 'assistant', content: response };
            setConversationHistory(prev => [...prev, assistantMessage]);
            
            setChatMessage("");
            handleClick("Message sent successfully.", "success");
        } catch (err: any) {
            setError(err?.message || "Failed to send message. Please try again.");
            handleClick("Failed to send message. Please try again.", "error");
        } finally {
            setChatGenerating(false);
        }
    };

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
          {/* <Tab label="Assignments" /> */}
          <Tab label="AI Tools" />
          {/* <Tab label="Submissions" /> */}
          <Tab label="Quiz Submissions" />
          <Tab label="Assignment Submissions" />

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

            {["assignments", "quizzes", "lectures", "summarizations", "flashcards"].map((folder) => (
              <Box key={folder} mb={4}>
                <Typography variant="subtitle1" gutterBottom sx={{ textTransform: "capitalize" }}>
                  {folder}
                </Typography>

                <List>
                  {files
                    .filter((f) => f.name.startsWith(`${folder}/`))
                    .filter((f) => folder !== "flashcards" || f.name.endsWith(".pdf")) // Filter only .pdf for flashcards
                    .map((file, index, arr) => {
                      const fileName = file.name.replace(`${folder}/`, "");

                      return (
                        <Box key={file.name}>
                          <ListItem
                            secondaryAction={
                              folder === "flashcards" && fileName.endsWith(".pdf") ? (
                                <Button
                                  variant="outlined"
                                  onClick={async () => {
                                    try {
                                      const jsonFilePath = `${courseID}/flashcards/${userAuth.id}/${fileName.replace(".pdf", ".json")}`;

                                      const { data, error } = await supabase
                                        .storage
                                        .from("course-materials")
                                        .download(jsonFilePath);

                                      if (error) {
                                        console.error("Error fetching JSON:", error.message);
                                        handleClick("Failed to load flashcard content.", "error");
                                        return;
                                      }

                                      const text = await data.text();
                                      const parsed = JSON.parse(text);
                                      setSelectedFlashcardData(parsed);
                                      setModalOpen(true);
                                    } catch (err) {
                                      console.error("JSON parsing error:", err);
                                      handleClick("Invalid flashcard data format.", "error");
                                    }
                                  }}
                                >
                                  View Flashcards
                                </Button>
                              ) : null
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

            {/* Modal for flashcards */}
            {selectedFlashcardData && (
              <FlashcardModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                flashcardData={selectedFlashcardData}
              />
            )}
          </Box>
        )}
{/* 
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
        )} */}

        {tabIndex === 3 && (
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
                  <LoadingModal open={loading} title="Generating summary"/>

                  {activeTool === 'summarize' && (
                    <Box mt={2}>
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
                            setLoading(true)
                            const result = await generateSummarization(summarizationPrompt, selectedSummarizationLectures);
                            setLoading(false)
                            setGeneratedSummary(result);
                            await uploadSummaryToSupabase(result);
                            handleClick("Summarization generated successfully.", "success");
                          } catch (err: any) {
                            setLoading(false)
                            setError(err?.message || "Failed to generate summary please try again.");
                            handleClick("Failed to generate summary please try again.", "error");
                          } finally {
                            setSummarizationGenerating(false);
                            setSelectedSummarizationLectures([]);
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

              <Grid2 size={{ xs:12, sm:6, md:4 }}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Generate Flashcards</Typography>
                  <Button
                    fullWidth
                    sx={{ mt: 1 }}
                    variant="outlined"
                    disabled={activeTool !== null && activeTool !== 'flashcards'}
                    onClick={() => setActiveTool(activeTool === 'flashcards' ? null : 'flashcards')}
                  >
                    {activeTool === 'flashcards' ? "Close" : "Start"}
                  </Button>
                  <LoadingModal open={loading} title="Generating flashcards"/>

                  {activeTool === 'flashcards' && (
                    <Box mt={2}>
                      <TextField
                        fullWidth
                        label="Please mention the topics or concepts you want flashcards for"
                        value={flashcardsPrompt}
                        onChange={(e) => setFlashcardsPrompt(e.target.value)}
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
                                  checked={selectedFlashcardsLectures.includes(file.url)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedFlashcardsLectures(prev =>
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
                          if (flashcardsPrompt.trim() === "") {
                            setError("Please enter a prompt");
                            return;
                          }

                          setFlashcardsGenerating(true);
                          setError(null);

                          try {
                            setLoading(true)
                            const result = await generateFlashcards(flashcardsPrompt, selectedFlashcardsLectures);
                            setLoading(false)
                            setGeneratedFlashcards(result);
                            await uploadFlashcardsToSupabase(result);
                            handleClick("Flashcards generated successfully.", "success");
                          } catch (err: any) {
                            setLoading(false)
                            setError(err?.message || "Failed to generate flashcards please try again.");
                            handleClick("Failed to generate flashcards please try again.", "error");
                          } finally {
                            setFlashcardsGenerating(false);
                            setSelectedFlashcardsLectures([]);
                          }
                        }}
                      >
                        {flashcardsGenerating ? "Generating..." : "Generate"}
                      </Button>

                      {generatedFlashcards && (
                        <Box mt={2}>
                          <Typography variant="subtitle2">Generated Flashcards:</Typography>
                          <Paper elevation={1} sx={{ p: 2, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                            {generatedFlashcards}
                          </Paper>
                          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => downloadPDF(generatedFlashcards)}>
                            Download as PDF
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid2>
              <Grid2 size={{ xs:12, sm:6, md:4 }}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Practice Question Generation</Typography>
                  <Button
                    fullWidth
                    sx={{ mt: 1 }}
                    variant="outlined"
                    disabled={activeTool !== null && activeTool !== 'practice'}
                    onClick={() => setActiveTool(activeTool === 'practice' ? null : 'practice')}
                  >
                    {activeTool === 'practice' ? "Close" : "Start"}
                  </Button>
                  <LoadingModal open={loading} title="Generating practice questions" />

                  {activeTool === 'practice' && (
                    <Box mt={2}>
                      <TextField
                        fullWidth
                        label="What kind of questions should be generated?"
                        value={practicePrompt}
                        onChange={(e) => setPracticePrompt(e.target.value)}
                        multiline
                        rows={3}
                      />
                      {error && (
                        <Typography color="error" mt={1}>
                          {error}
                        </Typography>
                      )}

                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Difficulty</InputLabel>
                        <Select
                          value={practiceDifficulty}
                          label="Difficulty"
                          onChange={(e) => setPracticeDifficulty(e.target.value as "easy" | "medium" | "hard")}
                        >
                          <MenuItem value="easy">Easy</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="hard">Hard</MenuItem>
                        </Select>

                      </FormControl>

                      <FormGroup sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Select lectures to include:</Typography>
                        {files
                          .filter(f => f.name.startsWith("lectures/"))
                          .map((file) => (
                            <FormControlLabel
                              key={file.name}
                              control={
                                <Checkbox
                                  checked={selectedPracticeLectures.includes(file.url)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedPracticeLectures(prev =>
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
                          if (!practicePrompt.trim()) {
                            setError("Please enter a prompt");
                            return;
                          }
                          if (!practiceDifficulty) {
                            setError("Please select a difficulty");
                            return;
                          }

                          setPracticeGenerating(true);
                          setError(null);

                          try {
                            setLoading(true);
                            const result = await generatePracticeQuestions(selectedPracticeLectures, practicePrompt, practiceDifficulty);
                            setLoading(false);
                            setGeneratedPracticeQuestions(result);
                            handleClick("Practice questions generated successfully.", "success");
                          } catch (err: any) {
                            setLoading(false);
                            setError(err?.message || "Failed to generate practice questions.");
                            handleClick("Failed to generate practice questions.", "error");
                          } finally {
                            setPracticeGenerating(false);
                            setSelectedPracticeLectures([]);
                          }
                        }}
                      >
                        {practiceGenerating ? "Generating..." : "Generate"}
                      </Button>

                      {generatedPracticeQuestions && (
                        <Box mt={2}>
                          <Typography variant="subtitle2">Generated Practice Questions:</Typography>
                          <Paper elevation={1} sx={{ p: 2, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                            {generatedPracticeQuestions}
                          </Paper>
                          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => downloadPDF(generatedPracticeQuestions)}>
                            Download as PDF
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid2>

              <Grid2 size={{ xs:12, sm:12, md:12 }}>
                <Paper elevation={2} sx={{ p: 2, height: '600px', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1">Talk to Your Lecture</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                    setConversationHistory([]);
                                    setSelectedChatLectures([]);
                                    setChatMessage("");
                                    handleClick("Conversation cleared.", "info");
                                }}
                                disabled={!activeTool || activeTool !== 'chat'}
                            >
                                Clear Session
                            </Button>
                            <Button
                                variant="outlined"
                                disabled={activeTool !== null && activeTool !== 'chat'}
                                onClick={() => setActiveTool(activeTool === 'chat' ? null : 'chat')}
                            >
                                {activeTool === 'chat' ? "Close" : "Start"}
                            </Button>
                        </Box>
                    </Box>

                    {activeTool === 'chat' && (
                        <Box mt={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ 
                                flex: 1, 
                                overflowY: 'auto', 
                                mb: 2, 
                                p: 2, 
                                bgcolor: 'background.paper',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider'
                            }}>
                                {conversationHistory.map((msg, index) => (
                                    <Box 
                                        key={index} 
                                        mb={2}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                maxWidth: '70%',
                                                p: 2,
                                                borderRadius: 2,
                                                bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                                                color: msg.role === 'user' ? 'white' : 'text.primary',
                                                position: 'relative',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: '50%',
                                                    [msg.role === 'user' ? 'right' : 'left']: '-8px',
                                                    transform: 'translateY(-50%)',
                                                    borderStyle: 'solid',
                                                    borderWidth: '8px 8px 8px 0',
                                                    borderColor: msg.role === 'user' 
                                                        ? 'transparent primary.main transparent transparent'
                                                        : 'transparent transparent transparent grey.100'
                                                }
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.8 }}>
                                                {msg.role === 'user' ? 'You' : 'Assistant'}:
                                            </Typography>
                                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {msg.content}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>

                            <FormGroup sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Select lectures to chat with:</Typography>
                                <Box sx={{ 
                                    maxHeight: '100px', 
                                    overflowY: 'auto',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    p: 1,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 1
                                }}>
                                    {files
                                        .filter(f => f.name.startsWith("lectures/"))
                                        .map((file) => (
                                            <FormControlLabel
                                                key={file.name}
                                                control={
                                                    <Checkbox
                                                        checked={selectedChatLectures.includes(file.url)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setSelectedChatLectures(prev =>
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
                                </Box>
                            </FormGroup>

                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    label="Type your message"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    multiline
                                    rows={2}
                                    sx={{ flex: 1 }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleChatSubmit}
                                    disabled={chatGenerating}
                                    sx={{ 
                                        alignSelf: 'flex-end',
                                        minWidth: '100px',
                                        height: '56px'
                                    }}
                                >
                                    {chatGenerating ? "Sending..." : "Send"}
                                </Button>
                            </Box>

                            {error && (
                                <Typography color="error" mt={1}>
                                    {error}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Paper>
              </Grid2>

            </Grid2>
          </Box>
        )}
         <Box p={4}>

        {/* Submissions Tab */}
        {/* {tabIndex === 5 && (
          <Box>
            <Typography variant="h6" gutterBottom>Submissions</Typography>

            {["assignments", "quizzes"].map((folder) => (
              <Box key={folder} mb={4}>
                <Typography variant="subtitle1" gutterBottom sx={{ textTransform: "capitalize" }}>
                  {folder}
                </Typography>

              
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
                        
                          <Button
                            variant="contained"
                            component="label"
                            sx={{ ml: 2 }}
                          >
                            Upload
                            <input
                              type="file"
                              hidden
                              onChange={async (e) => {
                                if (!e.target.files || e.target.files.length === 0) return;
                                const selectedFile = e.target.files[0];
                                const filePath = `${courseID}/${folder}/${userAuth.id}/${selectedFile.name}`;

                                const { error } = await supabase.storage
                                  .from("course-materials")
                                  .upload(filePath, selectedFile, {
                                    cacheControl: "3600",
                                    upsert: true,
                                    contentType: selectedFile.type,
                                  });

                                if (error) {
                                  console.error("File upload failed:", error.message);
                                  alert("Failed to upload file. Please try again.");
                                } else {
                                  alert("File uploaded successfully!");
                             
                                  const fetchFiles = async () => {
                                    if (!userAuth?.id) return;

                                    const folders = ["assignments", "quizzes", "lectures", "summarizations", "flashcards"];
                                    const allFiles: FileItem[] = [];

                                    for (const folder of folders) {
                                      let path = `${courseID}/${folder}`;

                                      if (folder === "summarizations" || folder === "flashcards") {
                                        path = `${path}/${userAuth.id}`;
                                      }

                                      const { data, error } = await supabase.storage.from("course-materials").list(path, {
                                        limit: 100,
                                        offset: 0,
                                        sortBy: { column: "name", order: "asc" },
                                      });

                                      if (error) {
                                        console.error(`Failed to list files in ${folder}:`, error.message);
                                        continue;
                                      }

                                      const fileItems = await Promise.all<FileItem | null>(
                                        (data || []).map(async (item) => {
                                          const filePath = `${path}/${item.name}`;

                                          const { data: signedUrlData, error: urlError } = await supabase.storage
                                            .from("course-materials")
                                            .createSignedUrl(filePath, 60 * 60); // 1-hour expiry

                                          if (urlError) {
                                            console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
                                            return null;
                                          }

                                          return {
                                            name: `${folder}/${item.name}`, // include folder path
                                            url: signedUrlData?.signedUrl ?? "#",
                                          };
                                        })
                                      );

                                      allFiles.push(...fileItems.filter((item): item is FileItem => item !== null));
                                    }

                                    setFiles(allFiles);
                                  };
                                  fetchFiles();
                                }
                              }}
                            />
                          </Button>
                        </ListItem>
                        {index < arr.length - 1 && <Divider />}
                      </Box>
                    );
                  })}
                </List>
              </Box>
            ))}
          </Box>
        )} */}

{tabIndex === 4 && (
  <Box>
    <Typography variant="h6" gutterBottom>Quiz Submissions</Typography>

    {files.filter(f => f.name.startsWith("quizzes/")).map((file, idx, arr) => {
      const fileName = file.name.replace("quizzes/", "");
      console.log("file name is: ", fileName)
      const quizBaseName = fileName.replace(".pdf", "");
      console.log("quiz base  name is: ", quizBaseName)
      console.log("all the files are: ", files)

      // Look for any submission file uploaded by student for this quiz
      // const submission = files.find(f =>
      //   f.name.startsWith(`${courseID}/quiz_submissions/${userAuth?.id}/`) &&
      //   f.name.includes(fileName)
      // );
      const submission = files.find(f =>
        f.name.startsWith(`quiz_submissions/`) &&
        f.name.endsWith(fileName)
      );
      
      console.log("submission is: ", submission)

      // Look for corresponding feedback and marks
      // const feedback = files.find(f =>
      //   f.name === `quiz_feedback/${userAuth?.id}/${quizBaseName}_feedback.pdf`
      // );
     
      // const marks = files.find(f =>
      //   f.name === `quiz_marks/${userAuth?.id}/${quizBaseName}_marks.txt`
      // );
      
      const feedback = files.find(f =>
        f.name === `quiz_feedback/${quizBaseName}_feedback.pdf`
      );
      console.log("feedback is: ", feedback)
      const marks = files.find(f =>
        f.name === `quiz_marks/${quizBaseName}_marks.txt`
      );
      console.log("marks is: ", marks)
      return (
        <Box key={file.name} mb={3}>
          <Typography variant="subtitle1">{fileName}</Typography>
          <Typography variant="body2">Due: TBD</Typography>

          {/* Upload submission */}
          {!submission ? (
            <Button
              sx={{ mt: 1 }}
              variant="contained"
              component="label"
            >
              Submit Quiz
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={async (e) => {
                  if (!e.target.files || !e.target.files[0]) return;
                  const selectedFile = e.target.files[0];
                  const filePath = `${courseID}/quiz_submissions/${userAuth?.id}/${selectedFile.name}`;

                  const { error } = await supabase.storage
                    .from("course-materials")
                    .upload(filePath, selectedFile, {
                      upsert: true,
                      contentType: "application/pdf",
                    });

                  if (error) {
                    handleClick("Quiz submission failed.", "error");
                  } else {
                    handleClick("Quiz submitted successfully!", "success");
                    window.location.reload();
                  }
                }}
              />
            </Button>
          ) : (
            <>
              <Typography sx={{ mt: 1 }} color="success.main">
                ✅ Submitted
              </Typography>
              <Link
                href={submission.url}
                target="_blank"
                underline="hover"
              >
                View Submission
              </Link>
            </>
          )}

          {/* Marks Display */}
          <Box mt={2}>
            <Typography variant="subtitle2">Marks Obtained:</Typography>
            {marks ? (
              <Link href={marks.url} target="_blank" underline="hover">View Marks</Link>
            ) : (
              <Typography color="text.secondary">Pending Evaluation</Typography>
            )}
          </Box>

          {/* Feedback Report */}
          <Box mt={1}>
            <Typography variant="subtitle2">Feedback Report:</Typography>
            {feedback ? (
              <Link href={feedback.url} target="_blank" underline="hover">Download Feedback</Link>
            ) : (
              <Typography color="text.secondary">Feedback not available yet</Typography>
            )}
          </Box>

          {idx < arr.length - 1 && <Divider sx={{ my: 3 }} />}
        </Box>
      );
    })}
  </Box>
)}

{tabIndex === 5 && (
  <Box>
    <Typography variant="h6" gutterBottom>Assignment Submissions</Typography>

    {files.filter(f => f.name.startsWith("assignments/")).map((assignmentFile, idx, arr) => {
      const assignmentName = assignmentFile.name.replace("assignments/", "");
      const baseName = assignmentName.replace(".ipynb", "");
      console.log("all the assns names are: ", assignmentName)
      console.log("all the files are: ", files)
      const submission = files.find(f =>
        f.name.startsWith(`assignment_submissions/`) &&
        f.name.endsWith(`${baseName}_Sol.ipynb`)
      );

      const feedback = files.find(f =>
        f.name === `assignment_feedback/${baseName}_feedback.pdf`
      );

      const marks = files.find(f =>
        f.name === `assignment_marks/${baseName}_marks.txt`
      );

      return (
        <Box key={assignmentFile.name} mb={3}>
          <Typography variant="subtitle1">{assignmentName}</Typography>
          <Typography variant="body2">Due: TBD</Typography>

          {/* Upload submission */}
          {!submission ? (
            <Button sx={{ mt: 1 }} variant="contained" component="label">
              Submit Assignment
              <input
                type="file"
                hidden
                accept=".ipynb,application/json"
                onChange={async (e) => {
                  if (!e.target.files || !e.target.files[0]) return;
                  const selectedFile = e.target.files[0];
                  const filePath = `${courseID}/assignment_submissions/${userAuth?.id}/${selectedFile.name}`;

                  const { error } = await supabase.storage
                    .from("course-materials")
                    .upload(filePath, selectedFile, {
                      upsert: true,
                      contentType: "application/json",
                    });

                  if (error) {
                    handleClick("Assignment submission failed.", "error");
                  } else {
                    handleClick("Assignment submitted successfully!", "success");
                    window.location.reload();
                  }
                }}
              />
            </Button>
          ) : (
            <>
              <Typography sx={{ mt: 1 }} color="success.main">
                ✅ Submitted
              </Typography>
              <Link
                href={submission.url}
                target="_blank"
                underline="hover"
              >
                View Submission
              </Link>
            </>
          )}

          {/* Marks Display */}
          <Box mt={2}>
            <Typography variant="subtitle2">Marks Obtained:</Typography>
            {marks ? (
              <Link href={marks.url} target="_blank" underline="hover">
                View Marks
              </Link>
            ) : (
              <Typography color="text.secondary">Pending Evaluation</Typography>
            )}
          </Box>

          {/* Feedback Report */}
          <Box mt={1}>
            <Typography variant="subtitle2">Feedback Report:</Typography>
            {feedback ? (
              <Link href={feedback.url} target="_blank" underline="hover">
                Download Feedback
              </Link>
            ) : (
              <Typography color="text.secondary">Feedback not available yet</Typography>
            )}
          </Box>

          {idx < arr.length - 1 && <Divider sx={{ my: 3 }} />}
        </Box>
      );
    })}
  </Box>
)}





      </Box>
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
