"use client";

import {useState, useLayoutEffect} from "react";
import { useParams } from "next/navigation";
import { Box, Typography, Tabs, Tab, Grid2, Paper, List, ListItem, ListItemText, Divider, Button, Link, IconButton, FormGroup, FormControlLabel, Checkbox, TextField, InputLabel, Select, MenuItem, FormControl, LinearProgress, CircularProgress } from "@mui/material";
import { Delete, Download } from "@mui/icons-material";
import { createClient } from "@/utils/supabase/client";
import ResponsiveAppBar from "@/app/_components/navbar";
import LoadingModal from '@/app/_components/LoadingModal';

import {fetchCourseDataFromID, generateFileEmbeddingsonUpload, generateAssignmentOrQuiz, summarizeLecture, generateMarkscheme} from './actions';

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

interface RPCResponse {
  status: string;
  message: string;
}

interface FileTreeNode {
  type: 'folder' | 'file';
  name: string;
  url?: string;
  children?: Record<string, FileTreeNode>;
}

export default function CoursePage() {
  const { courseID } = useParams();
  const [tabIndex, setTabIndex] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [activeTool, setActiveTool] = useState<'quiz' | 'assignment' | 'summarize' | null>(null);
  const [userprompt, setPrompt] = useState<string>('');
  const [selectedLecture, setSelectedLecture] = useState<string>('');
  const [showLectureSelector, setShowLectureSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [loading, setLoading] = useState(false)
  const supabase = createClient();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleFileSelection = (fileUrl: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileUrl)) {
        return prev.filter(url => url !== fileUrl);
      } else {
        return [...prev, fileUrl];
      }
    });
  };

  const handleFilePathSelection = (filePath: string) => {
    setSelectedFilePaths(prev => {
      if (prev.includes(filePath)) {
        return prev.filter(path => path !== filePath);
      } else {
        return [...prev, filePath];
      }
    });
  };

  const handleGenerateContent = async (option: 'quiz' | 'assignment') => {
    // if (selectedFiles.length === 0) {
    //   alert('Please select at least one file');
    //   return;
    // }

    if (!userprompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Starting generation...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);

      setLoading(true)
      const score_and_assignment = await generateAssignmentOrQuiz(
        userprompt,
        selectedFilePaths as string[],
        option
      );
      setLoading(false)
      if (option === 'assignment') {
        alert(`The score evaluated for the assignment by the LLM was ${score_and_assignment.score}`)
      }
      const result = score_and_assignment.assignment

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Generation complete! Saving file...');

      const folderType = option === 'quiz' ? 'quizzes' : 'assignments';
      if (result !== undefined) {
          let filename: string | null = "";
          while (!filename || filename.trim() === "") {
            filename = prompt(`The ${option} has been generated successfully. Enter a filename:`);
            if (filename === null) {
              alert("Filename is required!");
            }
          }
          console.log(`${option.charAt(0).toUpperCase() + option.slice(1)}: saving to ${folderType}`, result);
          if (option === 'quiz'){
            const path = `${courseID}/${folderType}/${filename}.pdf`;

            // Decode base64 to binary data (if you used base64 encoding)
            const pdfBuffer = Uint8Array.from(atob(result), c => c.charCodeAt(0));

            const { data, error } = await supabase.storage
              .from('course-materials')
              .upload(path, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true, // Overwrites if the file already exists
              });

            if (error) {
              console.error('Upload failed:', error.message);
              throw new Error(`Upload failed: ${error.message}`);
            }

          } else {  //'assignment'
            const path = `${courseID}/${folderType}/${filename}.ipynb`;

            const { data, error } = await supabase.storage
              .from('course-materials')
              .upload(path, JSON.stringify(result), {
                contentType: 'application/json',
                upsert: true, // Overwrites if the file already exists
              });

            if (error) {
              console.error('Upload failed:', error.message);
              throw new Error(`Upload failed: ${error.message}`);
            }
          }
      }
      // TODO: Display the result in a modal or new section
      setShowFileSelector(false);
      setActiveTool(null);
      setSelectedFiles([]);
      setSelectedFilePaths([]);
      setPrompt('');
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    } catch (error) {
      console.error(`${option} generation error:`, error);
      alert(`Failed to generate ${option}`);
      setLoading(false);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
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
      const embedFilePath = storageFilePath;

      // Call delete_embeddings_by_path via RPC
      const { data, error: rpcError } = await supabase
        .rpc('delete_embeddings_by_path', { file_path_param: embedFilePath })
        .single();

      if (rpcError || !data) {
        console.error('Failed to delete embeddings:', rpcError?.message || 'No data returned');
        alert('Failed to delete embeddings from database.');
        return;
      }

      const rpcResponse = data as RPCResponse;

      // Check RPC response
      if (rpcResponse.status !== 'success') {
        console.error('Embedding deletion failed:', rpcResponse.message);
        alert(`Failed to delete embeddings: ${rpcResponse.message}`);
        return;
      }

      console.log('Successfully deleted file and embeddings:', rpcResponse.message);

      // Update local state
      setFiles((prev) => prev.filter((f) => f.name !== fileName));

    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    }
  };

  const fetchFiles = async () => {
    const folders = [
      "assignments",
      "quizzes",
      "lectures",
      "summarizations", "flashcards",
      "quiz_solutions",
      "assignment_solutions",
      "quiz_submissions",
      "quiz_feedback",
      "quiz_marks",
      "assignment_submissions",
      "assignment_marks",
      "assignment_feedback"
    ];
  
    const allFiles: FileItem[] = [];
  
    for (const folder of folders) {
      if (folder === "quiz_submissions" || folder === "quiz_feedback" || folder === "quiz_marks" || folder === "assignment_submissions" || folder === "assignment_feedback" || folder === "assignment_marks") {
        // ✅ Handle nested user folders inside quiz_submissions
        const { data: userFolders, error: userFolderError } = await supabase.storage
          .from("course-materials")
          .list(`${courseID}/${folder}`, {
            limit: 100,
            offset: 0,
          });
  
        if (userFolderError) {
          console.error(`Failed to list user folders in ${folder}:`, userFolderError.message);
          continue;
        }
  
        for (const userFolder of userFolders || []) {
          const userID = userFolder.name;
          const { data: submissions, error: submissionError } = await supabase.storage
            .from("course-materials")
            .list(`${courseID}/${folder}/${userID}`, {
              limit: 100,
              offset: 0,
            });
  
          if (submissionError) {
            console.error(`Failed to list submissions for ${userID}:`, submissionError.message);
            continue;
          }
  
          const fileItems: FileItem[] = await Promise.all(
            (submissions || []).map(async (item) => {
              const filePath = `${courseID}/${folder}/${userID}/${item.name}`;
  
              const { data: signedUrlData, error: urlError } = await supabase.storage
                .from("course-materials")
                .createSignedUrl(filePath, 60 * 60); // 1-hour expiry
  
              if (urlError) {
                console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
              }
  
              return {
                name: `${folder}/${userID}/${item.name}`,
                url: signedUrlData?.signedUrl ?? "#",
              };
            })
          );
  
          allFiles.push(...fileItems);
        }
      } else {
        // ✅ Handle flat folder structures
        let path = `${courseID}/${folder}`;
        
        // For user-specific content, we need to list all user directories
        if (folder === "summarizations" || folder === "flashcards") {
          // First list all user directories
          const { data: userDirs, error: dirError } = await supabase.storage
            .from("course-materials")
            .list(path);

          if (dirError) {
            console.error(`Failed to list user directories in ${folder}:`, dirError.message);
            continue;
          }

          // For each user directory, list their files
          for (const userDir of userDirs || []) {
            const userPath = `${path}/${userDir.name}`;
            const { data, error } = await supabase.storage
              .from("course-materials")
              .list(userPath, {
                limit: 100,
                offset: 0,
                sortBy: { column: "name", order: "asc" },
              });

            if (error) {
              console.error(`Failed to list files in ${userPath}:`, error.message);
              continue;
            }

            const fileItems = await Promise.all<FileItem | null>(
              (data || []).map(async (item) => {
                const filePath = `${userPath}/${item.name}`;

                const { data: signedUrlData, error: urlError } = await supabase.storage
                  .from("course-materials")
                  .createSignedUrl(filePath, 60 * 60); // 1-hour expiry

                if (urlError) {
                  console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
                  return null;
                }

                return {
                  name: `${folder}/${userDir.name}/${item.name}`, // include user directory in path
                  url: signedUrlData?.signedUrl ?? "#",
                };
              })
            );

            allFiles.push(...fileItems.filter((item): item is FileItem => item !== null));
          }
        } else {
          // For non-user-specific content, list files directly
          const { data, error } = await supabase.storage
            .from("course-materials")
            .list(path, {
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
                name: `${folder}/${item.name}`,
                url: signedUrlData?.signedUrl ?? "#",
              };
            })
          );
  
          allFiles.push(...fileItems.filter((item): item is FileItem => item !== null));
        }
      }
    }
  
    setFiles(allFiles);
    console.log("Fetched files:", allFiles.map(f => f.name));
  };
  

  const handleSummarizeLecture = async () => {
    if (!selectedLecture) {
      alert('Please select a lecture to summarize');
      return;
    }

    try {
      setLoading(true)
      const result = await summarizeLecture(selectedLecture);
      setLoading(false)
      console.log('Summary:', result);
      // TODO: Display the summary in a modal or new section
      setShowLectureSelector(false);
      setActiveTool(null);
      setSelectedLecture('');
    } catch (error) {
      console.error('Summarization error:', error);
      setLoading(false);
      alert('Failed to generate summary');
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  useLayoutEffect(() => {
    const fetchCourse = async () => {
      // Fetching course details from the backend
      // const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseID}`);
      // setCourse(response.data.course);
      if (!courseID) return;
      const course = await fetchCourseDataFromID(courseID.toString());
      setCourse(course);
    };

    fetchCourse();
    fetchFiles();
  }, [courseID]);

  const renderFileTree = (node: Record<string, FileTreeNode>, pathPrefix = "") => {
    return Object.entries(node).map(([key, value]) => {
      if (value.type === "folder") {
        return (
          <Box key={key} sx={{ ml: 2, mt: 1 }}>
            <Typography variant="subtitle2">📁 {value.name}</Typography>
            <List dense>{renderFileTree(value.children || {}, `${pathPrefix}${value.name}/`)}</List>
          </Box>
        );
      } else {
        return (
          <ListItem
            key={key}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDeleteFile(`${courseID}/${pathPrefix}${value.name}`)}
              >
                <Delete />
              </IconButton>
            }
          >
            <ListItemText
              primary={
                <Link href={value.url} target="_blank" rel="noopener noreferrer" underline="hover">
                  {value.name}
                </Link>
              }
              secondary="Uploaded file"
            />
          </ListItem>
        );
      }
    });
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
          <Tab label="Quiz Grading" />
          <Tab label="Assignment Grading" />
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

            {["assignments", "quizzes", "lectures", "summarizations", "flashcards", "quiz_solutions", "assignment_solutions"].map((folder) => (
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
                        return;
                      }

                      const { data: signedUrlData, error: urlError } = await supabase.storage
                          .from("course-materials")
                          .createSignedUrl(filePath, 60 * 60);

                      if (urlError) {
                        console.error(`Failed to create signed URL for ${filePath}:`, urlError.message);
                        alert(`Failed to create signed URL for ${filePath}.`);
                        return;
                      }

                      try {
                        var parts = filePath.split("/")
                        const file_name = parts[2]
                        const temp = file_name.split(".");
                        const fileExt = temp.length > 1 ? `.${temp[temp.length - 1].toLowerCase()}` : '';
                        const allowed_types = ['.pdf', '.txt', '.docx', '.md']
                        if (!fileExt || !allowed_types.includes(fileExt)) {
                          alert(`File type not allowed. Allowed types are: ${allowed_types.join(', ')}`);
                          return;
                        }
                        const { data: signedUrlData, error: urlError } = await supabase.storage.from("course-materials").createSignedUrl(filePath, 60);
                        // console.log(signedUrlData, urlError)
                        if (urlError){
                          console.error("signed URL creation error:", error);
                          alert(`File uploaded, but signed url creation failed: ${error}`)
                          return
                        }
                        const result = await generateFileEmbeddingsonUpload(courseID, filePath, signedUrlData.signedUrl);
                        console.log("File processed successfully:", result);

                        alert(`File uploaded to ${folder} and processed successfully!`);
                        setFiles((prev) => [
                          ...prev,
                          { name: `${folder}/${file.name}`, url: signedUrlData.signedUrl },
                        ]);
                      } catch (error) {
                        console.error("Backend processing error:", error);
                        alert(`File uploaded, but processing failed: ${error}`);
                      }
                    }}
                  />
                </Box>

                {/* File List */}
                <List>
                  {files.filter((f) => f.name.startsWith(`${folder}/`)).map((file, index, arr) => {
                    const fileName = file.name.replace(`${folder}/`, "");
                    // For user-specific content, show the user ID in the secondary text
                    const isUserSpecific = folder === "summarizations" || folder === "flashcards";
                    const userInfo = isUserSpecific ? ` (User: ${fileName.split('/')[0]})` : '';
                    const displayName = isUserSpecific ? fileName.split('/').slice(1).join('/') : fileName;

                    return (
                      <Box key={file.name}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                edge="end"
                                aria-label="download"
                                onClick={() => handleDownloadFile(file.url, fileName)}
                              >
                                <Download />
                              </IconButton>
                              <IconButton
                                edge="end"
                                aria-label="delete"
                                onClick={() => handleDeleteFile(file.name)}
                              >
                                <Delete/>
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={
                              <Link href={file.url} target="_blank" rel="noopener noreferrer" underline="hover">
                                {displayName}
                              </Link>
                            }
                            secondary={`Uploaded to ${folder}${userInfo}`}
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


        {/* {tabIndex === 3 && (
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
      <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle1">Summarize Lecture</Typography>
          <Button
            fullWidth
            sx={{ mt: 1 }}
            variant="outlined"
            onClick={() => {
              setActiveTool('summarize');
              setShowLectureSelector(true);
            }}
          >
            Start
          </Button>
        </Paper>
      </Grid2>

      <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle1">Generate Quiz</Typography>
          <Button
            fullWidth
            sx={{ mt: 1 }}
            variant="outlined"
            onClick={() => {
              setActiveTool('quiz');
              setShowFileSelector(true);
            }}
          >
            Start
          </Button>
        </Paper>
      </Grid2>

      <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle1">Generate Assignment</Typography>
          <Button
            fullWidth
            sx={{ mt: 1 }}
            variant="outlined"
            onClick={() => {
              setActiveTool('assignment');
              setShowFileSelector(true);
            }}
          >
            Start
          </Button>
        </Paper>
      </Grid2>

      {/* ✅ NEW TOOL: Generate Markscheme from Quiz */}
      <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
  <Paper elevation={2} sx={{ p: 2 }}>
    <Typography variant="subtitle1">Generate Markscheme from Quiz</Typography>
    <FormControl fullWidth sx={{ mt: 1 }}>
      <InputLabel id="quiz-select-label">Select Quiz</InputLabel>
      <Select
        labelId="quiz-select-label"
        value={selectedLecture} // reusing selectedLecture state to avoid creating a new one
        label="Select Quiz"
        onChange={(e) => setSelectedLecture(e.target.value)}
      >
        {files
          .filter((file) => file.name.startsWith("quizzes/"))
          .map((file) => {
            const quizPath = `${courseID}/${file.name}`;
            return (
              <MenuItem key={file.url} value={quizPath}>
                {file.name.replace("quizzes/", "")}
              </MenuItem>
            );
          })}
      </Select>
    </FormControl>
    <Button
      fullWidth
      sx={{ mt: 2 }}
      variant="outlined"
      onClick={async () => {
        if (!selectedLecture) {
          alert("Please select a quiz file first.");
          return;
        }

        setLoading(true);
        try {
          const selectedFile = files.find((f) => `${courseID}/${f.name}` === selectedLecture);
          if (!selectedFile) throw new Error("Selected file not found.");

          const blob = await fetch(selectedFile.url).then((res) => res.blob());
          const fileName = selectedFile.name.replace("quizzes/", "");
          const base64PDF = await generateMarkscheme(new File([blob], fileName));
          const pdfBuffer = Uint8Array.from(atob(base64PDF), (c) => c.charCodeAt(0));
          const savePath = `${courseID}/quiz_solutions/${fileName.replace(".pdf", "")}_solution.pdf`;

          const { error } = await supabase.storage
            .from("course-materials")
            .upload(savePath, pdfBuffer, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (error) throw error;

          alert("✅ Markscheme generated and uploaded to Resources > quiz_solutions.");
          fetchFiles();
          setSelectedLecture('');
        } catch (error: any) {
          console.error(error);
          alert("❌ Failed to generate markscheme.");
        }
        setLoading(false);
      }}
    >
      Generate
    </Button>
  </Paper>
</Grid2>

<Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
  <Paper elevation={2} sx={{ p: 2 }}>
    <Typography variant="subtitle1">Generate Markscheme from Assignment</Typography>
    <FormControl fullWidth sx={{ mt: 1 }}>
      <InputLabel id="assignment-select-label">Select Assignment</InputLabel>
      <Select
        labelId="assignment-select-label"
        value={selectedLecture}
        label="Select Assignment"
        onChange={(e) => setSelectedLecture(e.target.value)}
      >
        {files
          .filter((file) => file.name.startsWith("assignments/") && file.name.endsWith(".ipynb"))
          .map((file) => {
            const assignmentPath = `${courseID}/${file.name}`;
            return (
              <MenuItem key={file.url} value={assignmentPath}>
                {file.name.replace("assignments/", "")}
              </MenuItem>
            );
          })}
      </Select>
    </FormControl>
    <Button
      fullWidth
      sx={{ mt: 2 }}
      variant="outlined"
      onClick={async () => {
        if (!selectedLecture) {
          alert("Please select an assignment first.");
          return;
        }

        setLoading(true);
        try {
          const selectedFile = files.find((f) => `${courseID}/${f.name}` === selectedLecture);
          if (!selectedFile) throw new Error("Selected file not found.");

          const blob = await fetch(selectedFile.url).then((res) => res.blob());
          const fileName = selectedFile.name.replace("assignments/", "");
          const formData = new FormData();
          formData.append("file", new File([blob], fileName));

          const res = await fetch("http://localhost:8000/api/generation/generate-assignment-markscheme", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!data || data.status !== "success") throw new Error("Invalid response");

          // ✅ Decode base64 PDF
          const pdfBuffer = Uint8Array.from(atob(data.markscheme_pdf), (c) => c.charCodeAt(0));

          const savePath = `${courseID}/assignment_solutions/${fileName.replace(".ipynb", "")}_markscheme.pdf`;

          const { error } = await supabase.storage
            .from("course-materials")
            .upload(savePath, pdfBuffer, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (error) throw error;

          alert("✅ Assignment marking scheme uploaded to Resources > assignment_solutions.");
          fetchFiles();
          setSelectedLecture('');
        } catch (err) {
          console.error(err);
          alert("❌ Failed to generate assignment marking scheme.");
        }
        setLoading(false);
      }}
    >
      Generate
    </Button>
  </Paper>
</Grid2>


    </Grid2>

    


    {/* File selector UI for quiz/assignment generation */}
    {showFileSelector && (
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select files for {activeTool === 'quiz' ? 'quiz' : 'assignment'} generation
        </Typography>
        <FormGroup>
          {files.map((file) => (
            <FormControlLabel
              key={file.name}
              control={
                <Checkbox
                  checked={selectedFiles.includes(file.url)}
                  onChange={() => {
                    handleFileSelection(file.url)
                    handleFilePathSelection(`${courseID}/` + file.name)
                  }}
                />
              }
              label={file.name}
            />
          ))}
        </FormGroup>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Enter your prompt:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={userprompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Enter instructions for generating a ${activeTool}...`}
            sx={{ mb: 2 }}
          />
          <LoadingModal open={loading} title={`Generating ${activeTool}`} />
        </Box>
        {isGenerating && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" value={generationProgress} />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">{`${Math.round(generationProgress)}%`}</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              {generationStatus}
            </Typography>
          </Box>
        )}
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => handleGenerateContent(activeTool as 'quiz' | 'assignment')}
            disabled={!userprompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setShowFileSelector(false);
              setActiveTool(null);
              setSelectedFiles([]);
              setSelectedFilePaths([]);
              setPrompt('');
              setIsGenerating(false);
              setGenerationProgress(0);
              setGenerationStatus('');
            }}
            disabled={isGenerating}
          >
            Cancel
          </Button>
        </Box>
      </Paper>
    )}

    {showLectureSelector && (
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select a lecture to summarize
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="lecture-select-label">Lecture</InputLabel>
          <Select
            labelId="lecture-select-label"
            value={selectedLecture}
            label="Lecture"
            onChange={(e) => setSelectedLecture(e.target.value)}
          >
            {files
              .filter(file => file.name.startsWith('lectures/'))
              .map((file) => {
                const lecturePath = `${courseID}/${file.name}`;
                return (
                  <MenuItem key={file.url} value={lecturePath}>
                    {file.name.replace('lectures/', '')}
                  </MenuItem>
                );
              })}
          </Select>
        </FormControl>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSummarizeLecture}
            disabled={!selectedLecture}
          >
            Summarize
          </Button>
          <LoadingModal open={loading} title="Generating summary" />
          <Button
            variant="outlined"
            onClick={() => {
              setShowLectureSelector(false);
              setActiveTool(null);
              setSelectedLecture('');
            }}
          >
            Cancel
          </Button>
        </Box>
      </Paper>
    )}
  </Box>
)}

{tabIndex === 4 && (
  <Box>
    <Typography variant="h6" gutterBottom>Quiz Grading</Typography>

    {/* Quiz Selector */}
    <FormControl fullWidth sx={{ mb: 3 }}>
      <InputLabel id="quiz-select-label">Select Quiz</InputLabel>
      <Select
        labelId="quiz-select-label"
        value={selectedLecture}
        label="Select Quiz"
        onChange={(e) => setSelectedLecture(e.target.value)}
      >
        
        {files
          .filter((file) => file.name.startsWith("quizzes/"))
          .map((file) => (
            <MenuItem
              key={file.name}
              value={file.name.replace("quizzes/", "")}
            >
              {file.name.replace("quizzes/", "")}
            </MenuItem>
          ))}
      </Select>
    </FormControl>

    {/* Student Submissions */}
    {selectedLecture && (
      <Box>
        {files
          .filter(
            (file) =>
              file.name.startsWith("quiz_submissions/") &&
              file.name.endsWith(`/${selectedLecture}`)
          )
          .map((submission) => {
            const parts = submission.name.split("/");
            console.log("hellooooooooooooooooooooooooooooooooo")
            console.log("all the files are: ", files)
            const userId = parts[1];
            const marks = files.find((f) =>
              f.name === `quiz_marks/${userId}/${selectedLecture.replace(".pdf", "_marks.txt")}`
            );
            const feedback = files.find((f) =>
              f.name === `quiz_feedback/${userId}/${selectedLecture.replace(".pdf", "_feedback.pdf")}`
            );

            return (
              <Paper key={submission.name} elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography><b>Student ID:</b> {userId}</Typography>
                <Typography>
                  <b>Submission:</b>{" "}
                  <Link href={submission.url} target="_blank" underline="hover">
                    View PDF
                  </Link>
                </Typography>
                <Typography>
                  <b>Marks:</b>{" "}
                  {marks ? (
                    <Link href={marks.url} target="_blank" underline="hover">
                      View Marks
                    </Link>
                  ) : (
                    "Not Graded"
                  )}
                </Typography>
                <Typography>
                  <b>Feedback Report:</b>{" "}
                  {feedback ? (
                    <Link href={feedback.url} target="_blank" underline="hover">
                      Download Feedback
                    </Link>
                  ) : (
                    "Not Available"
                  )}
                </Typography>
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  disabled={!!marks}
                  onClick={async () => {
                    const quizFile = files.find((f) => f.name === `quizzes/${selectedLecture}`);
                    if (!quizFile) return alert("Quiz file not found.");

                    
                    const formData = new FormData();
                    const solutionFile = files.find(
                      (f) => f.name === `quiz_solutions/${selectedLecture.replace(".pdf", "_solution.pdf")}`
                    );
                    
                    if (!solutionFile) {
                      alert("Quiz solution (markscheme) not found.");
                      return;
                    }
                    
                    const solutionBlob = await fetch(solutionFile.url).then((res) => res.blob());
                    formData.append("quiz", new File([solutionBlob], solutionFile.name));
                    // formData.append("quiz", new File([await (await fetch(quizFile.url)).blob()], quizFile.name));
                    formData.append("quiz_solution", new File([await (await fetch(submission.url)).blob()], submission.name));
                    formData.append("student_id", userId);

                    const res = await fetch("http://localhost:8000/api/grading/grade-quiz", {
                      method: "POST",
                      body: formData,
                    });

                    console.log("req has been sent")

                    // const data = await res.json();
                    const data = await res.json();
                    if (data.status === "success") {
                      const { marks, feedback_pdf_base64 } = data;

                      // Prepare files
                      const feedbackBlob = new Blob([Uint8Array.from(atob(feedback_pdf_base64), c => c.charCodeAt(0))], { type: "application/pdf" });
                      const marksBlob = new Blob([marks.toString()], { type: "text/plain" });

                      const feedbackFilePath = `${courseID}/quiz_feedback/${userId}/${selectedLecture.replace(".pdf", "_feedback.pdf")}`;
                      const marksFilePath = `${courseID}/quiz_marks/${userId}/${selectedLecture.replace(".pdf", "_marks.txt")}`;

                      await supabase.storage.from("course-materials").upload(feedbackFilePath, feedbackBlob, { upsert: true });
                      await supabase.storage.from("course-materials").upload(marksFilePath, marksBlob, { upsert: true });

                      alert("Grading successful and uploaded!");
                      fetchFiles();
                    } else {
                      alert("Grading failed.");
                    }
                    // if (data.status === "success") {
                    //   alert("Grading successful!");
                    //   fetchFiles();
                    // } else {
                    //   alert("Grading failed.");
                    // }
                  }}
                >
                  Grade
                </Button>
              </Paper>
            );
          })}

        {/* <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={async () => {
            const quizFile = files.find((f) => f.name === `quizzes/${selectedLecture}`);
            if (!quizFile) return alert("Quiz file not found.");

            const submissions = files.filter(
              (file) =>
                file.name.startsWith("quiz_submissions/") &&
                file.name.endsWith(`/${selectedLecture}`)
            );

            for (const submission of submissions) {
              const userId = submission.name.split("/")[1];
              const marksExist = files.find((f) =>
                f.name === `quiz_marks/${userId}/${selectedLecture.replace(".pdf", "_marks.txt")}`
              );
              if (marksExist) continue;

              
              const formData = new FormData();
              formData.append("quiz", new File([await (await fetch(quizFile.url)).blob()], quizFile.name));
              formData.append("quiz_solution", new File([await (await fetch(submission.url)).blob()], submission.name));
              formData.append("student_id", userId);

              await fetch("http://localhost:8000/api/grading/grade-quiz", {
                method: "POST",
                body: formData,
              });
            }

            alert("All ungraded submissions graded successfully!");
            fetchFiles();
          }}
        >
          Grade All
        </Button> */}
      </Box>
    )}
  </Box>
)}

{tabIndex === 5 && (
  <Box>
    <Typography variant="h6" gutterBottom>Assignment Grading</Typography>

    {/* Assignment Selector */}
    <FormControl fullWidth sx={{ mb: 3 }}>
      <InputLabel id="assignment-select-label">Select Assignment</InputLabel>
      <Select
        labelId="assignment-select-label"
        value={selectedLecture}
        label="Select Assignment"
        onChange={(e) => setSelectedLecture(e.target.value)}
      >
        {files
          .filter((file) => file.name.startsWith("assignments/"))
          .map((file) => (
            <MenuItem
              key={file.name}
              value={file.name.replace("assignments/", "")}
            >
              {file.name.replace("assignments/", "")}
            </MenuItem>
          ))}
      </Select>
    </FormControl>

    {/* Student Submissions */}
    {selectedLecture && (
      <Box>
        {files
          .filter(
            (file) =>
              file.name.startsWith("assignment_submissions/") &&
              file.name.endsWith(`/${selectedLecture.replace(".ipynb", "_Sol.ipynb")}`)
          )
          .map((submission) => {
            const parts = submission.name.split("/");
            const userId = parts[1];

            const marks = files.find((f) =>
              f.name === `assignment_marks/${userId}/${selectedLecture.replace(".ipynb", "_marks.txt")}`
            );

            const feedback = files.find((f) =>
              f.name === `assignment_feedback/${userId}/${selectedLecture.replace(".ipynb", "_feedback.pdf")}`
            );

            return (
              <Paper key={submission.name} elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography><b>Student ID:</b> {userId}</Typography>
                <Typography>
                  <b>Submission:</b>{" "}
                  <Link href={submission.url} target="_blank" underline="hover">
                    View Notebook
                  </Link>
                </Typography>
                <Typography>
                  <b>Marks:</b>{" "}
                  {marks ? (
                    <Link href={marks.url} target="_blank" underline="hover">
                      View Marks
                    </Link>
                  ) : (
                    "Not Graded"
                  )}
                </Typography>
                <Typography>
                  <b>Feedback Report:</b>{" "}
                  {feedback ? (
                    <Link href={feedback.url} target="_blank" underline="hover">
                      Download Feedback
                    </Link>
                  ) : (
                    "Not Available"
                  )}
                </Typography>
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  disabled={!!marks}
                  onClick={async () => {
                    const assignmentFile = files.find(f => f.name === `assignments/${selectedLecture}`);
                    const solutionFile = files.find(f =>
                      f.name === `assignment_solutions/${selectedLecture.replace(".ipynb", "_markscheme.pdf")}`
                    );

                    if (!assignmentFile || !solutionFile) {
                      alert("Assignment or its solution markscheme is missing.");
                      return;
                    }

                    const submissionBlob = await fetch(submission.url).then(res => res.blob());

                    const formData = new FormData();
                    formData.append("assignment", new File([submissionBlob], submission.name));
                    formData.append("assignment_solution", new File([await (await fetch(solutionFile.url)).blob()], solutionFile.name));
                    formData.append("student_id", userId);

                    const res = await fetch("http://localhost:8000/api/grading/grade-assignment", {
                      method: "POST",
                      body: formData,
                    });

                    const data = await res.json();
                    if (data.status === "success") {
                      const { marks, feedback_pdf_base64 } = data;

                      const feedbackBlob = new Blob(
                        [Uint8Array.from(atob(feedback_pdf_base64), c => c.charCodeAt(0))],
                        { type: "application/pdf" }
                      );
                      const marksBlob = new Blob([marks.toString()], { type: "text/plain" });

                      const feedbackPath = `${courseID}/assignment_feedback/${userId}/${selectedLecture.replace(".ipynb", "_feedback.pdf")}`;
                      const marksPath = `${courseID}/assignment_marks/${userId}/${selectedLecture.replace(".ipynb", "_marks.txt")}`;

                      await supabase.storage.from("course-materials").upload(feedbackPath, feedbackBlob, { upsert: true });
                      await supabase.storage.from("course-materials").upload(marksPath, marksBlob, { upsert: true });

                      alert("✅ Grading successful and uploaded!");
                      fetchFiles();
                    } else {
                      alert("Grading failed.");
                    }
                  }}
                >
                  Grade
                </Button>
              </Paper>
            );
          })}

        {/* Grade All */}
        {/* <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={async () => {
            const assignmentFile = files.find((f) => f.name === `assignments/${selectedLecture}`);
            if (!assignmentFile) return alert("Assignment file not found.");

            const submissions = files.filter(
              (file) =>
                file.name.startsWith("assignment_submissions/") &&
                file.name.endsWith(`/${selectedLecture.replace(".ipynb", "_Sol.ipynb")}`)
            );

            for (const submission of submissions) {
              const userId = submission.name.split("/")[1];
              const marksExist = files.find((f) =>
                f.name === `assignment_marks/${userId}/${selectedLecture.replace(".ipynb", "_marks.txt")}`
              );
              if (marksExist) continue;

              const formData = new FormData();
              formData.append("assignment", new File([await (await fetch(submission.url)).blob()], submission.name));
              formData.append("assignment_solution", new File([await (await fetch(solutionFile.url)).blob()], solutionFile.name));
              formData.append("student_id", userId);

              await fetch("http://localhost:8000/api/grading/grade-assignment", {
                method: "POST",
                body: formData,
              });
            }

            alert("All ungraded submissions graded!");
            fetchFiles();
          }}
        >
          Grade All
        </Button> */}
      </Box>
    )}
  </Box>
)}



    </Box>
  </Box>
);
}