"use client";

import {useState, useLayoutEffect} from "react";
import { useParams } from "next/navigation";
import { Box, Typography, Tabs, Tab, Grid2, Paper, List, ListItem, ListItemText, Divider, Button, Link, IconButton, FormGroup, FormControlLabel, Checkbox, TextField, InputLabel, Select, MenuItem, FormControl, LinearProgress, CircularProgress, FormLabel } from "@mui/material";
import { Modal, Sheet, Textarea } from '@mui/joy';
import { Delete, Download } from "@mui/icons-material";
import { createClient } from "@/utils/supabase/client";
import ResponsiveAppBar from "@/app/_components/navbar";
import LoadingModal from '../../../../../_components/LoadingModal';
import {fetchCourseDataFromID, generateFileEmbeddingsonUpload, generateAssignmentOrQuiz, summarizeLecture} from './actions';

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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userFeedback, setUserFeedback] = useState('');
  const [currAssignmentUrl, setcurrAssignmentUrl] = useState('')
  const [assignmentName, setAssignmentname] = useState('')
  const [ prevAssignmentVersion , setprevAssignmentVersion] = useState('')

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

  const handleGeneratewithFeedback = async () => {
    console.log("handling gen w feedback")
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
        'assignment',
        userFeedback,
        JSON.stringify(prevAssignmentVersion)
      );
      console.log(score_and_assignment)
      setLoading(false)
      const result = score_and_assignment.assignment

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Generation complete! Saving file...');

      const folderType = 'assignments';
      if (result !== undefined) {

          let filename = assignmentName
          console.log(`${'assignment'.charAt(0).toUpperCase() + 'assignment'.slice(1)}: saving to ${folderType}`, result);
          const path = `${courseID}/${folderType}/${assignmentName}.ipynb`;

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
          const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('course-materials')
          .createSignedUrl(data.path, 60 * 60); // URL valid for 1 hour

          if (urlError) {
            console.error('Error creating signed URL:', urlError);
          } else {
            console.log('Signed File URL:', signedUrlData.signedUrl);
            setcurrAssignmentUrl(signedUrlData.signedUrl)
          }

      }
      // TODO: Display the result in a modal or new section
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
      if (score_and_assignment.status === 'awaiting_feedback') {
        setShowFeedbackModal(true);
      } else {
        setShowFileSelector(false);
        setActiveTool(null);
        setSelectedFiles([]);
        setSelectedFilePaths([]);
        setPrompt('');
      }
    } catch (error) {
      console.error(`assignment generation error:`, error);
      alert(`Failed to generate assignment`);
      setLoading(false);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }

  }

  const handleGenerateContent = async (option: 'quiz' | 'assignment') => {
    // if (selectedFiles.length === 0) {
    //   alert('Please select at least one file');
    //   return;
    // }
    // setShowFeedbackModal(true);
    // return;

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
        option,
        '',
        ''
      );
      console.log(score_and_assignment)
      setLoading(false)
      if (option === 'quiz') {
        alert(`The score evaluated for the quiz by the LLM was ${score_and_assignment.score}`)
      }
      const result = score_and_assignment.assignment

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Generation complete! Saving file...');

      const folderType = option === 'quiz' ? 'quizzes' : 'assignments';
      if (result !== undefined) {
        let filename: string | null = "";
        if(assignmentName === ''){
            while (!filename || filename.trim() === "") {
              filename = prompt(`The ${option} has been generated successfully. Enter a filename:`);
              if (filename === null) {
                alert("Filename is required!");
              }
            }
            setAssignmentname(filename)
          } else {
            filename = assignmentName
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
            setprevAssignmentVersion(result)
            let path
            console.log(assignmentName)
            if(assignmentName === ''){
              path = `${courseID}/${folderType}/${filename}.ipynb`;
            } else {
              path = `${courseID}/${folderType}/${assignmentName}.ipynb`;
            }
            console.log(path)

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
            const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('course-materials')
            .createSignedUrl(data.path, 60 * 60); // URL valid for 1 hour

            if (urlError) {
              console.error('Error creating signed URL:', urlError);
            } else {
              console.log('Signed File URL:', signedUrlData.signedUrl);
              setcurrAssignmentUrl(signedUrlData.signedUrl)
            }
          }
      }
      // TODO: Display the result in a modal or new section
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
      if (score_and_assignment.status === 'awaiting_feedback') {
        setShowFeedbackModal(true);
      } else {

        setShowFileSelector(false);
        setActiveTool(null);
        setSelectedFiles([]);
        setSelectedFilePaths([]);
        setPrompt('');
      }
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
        console.log('Failed to delete embeddings:', rpcError?.message || 'No data returned');
        alert('Warning: Embeddings for deleted file were not present in database. Confirm if this is expected behaviour');
        return;
      }

      // Check RPC response
      if (data.status !== 'success') {
        console.log('Failed to delete embeddings:', data.message || 'No data returned');
        alert('Warning: Embeddings for deleted file were not present in database. Confirm if this is expected behaviour');
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

  const fetchFiles = async () => {
    const folders = ["assignments", "quizzes", "lectures", "summarizations", "flashcards"];
    const allFiles: FileItem[] = [];

    for (const folder of folders) {
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
              name: `${folder}/${item.name}`, // include folder path
              url: signedUrlData?.signedUrl ?? "#",
            };
          })
        );

        allFiles.push(...fileItems.filter((item): item is FileItem => item !== null));
      }
    }

    setFiles(allFiles);
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

            {["assignments", "quizzes", "lectures", "summarizations", "flashcards"].map((folder) => (
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
            </Grid2>

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
                            handleFilePathSelection(`${courseID}/`+file.name)
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
                  <LoadingModal open={loading} title={`Generating ${activeTool}`}/>
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
                <Modal
                    open={showFeedbackModal}
                    onClose={() => setShowFeedbackModal(false)}
                    aria-labelledby="feedback-modal-title"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(3px)',
                    }}
                  >
                    <Sheet
                      variant="outlined"
                      sx={{
                        width: { xs: '90%', sm: 500 },  // responsive width
                        maxWidth: '90vw',
                        borderRadius: 'md',
                        p: 4,
                        boxShadow: 'lg',
                        bgcolor: 'background.surface',
                      }}
                    >
                      <Typography level="h4" id="feedback-modal-title" mb={2}  sx={{ textAlign: 'center', display: 'block' }}>
                        Assignment Ready for Feedback
                      </Typography>

                      <Typography
                        level="body-sm"
                        sx={{
                          mb: 2,
                          color: 'text.secondary',
                          wordBreak: 'break-all',  // wrap long URLs
                          overflowWrap: 'break-word'
                        }}
                      >
                        Preview it here: <Link href={currAssignmentUrl} target="_blank">{currAssignmentUrl}</Link>
                      </Typography>

                      <FormControl fullWidth sx={{ mb: 2}}>
                        <FormLabel  sx={{ textAlign: 'center', display: 'block' }}>Your Feedback</FormLabel>
                        <Textarea
                          sx={{ mt:2 }}
                          minRows={5}
                          value={userFeedback}
                          onChange={(e) => setUserFeedback(e.target.value)}
                          placeholder="Suggest improvements, or confirm if it looks good..."
                        />
                      </FormControl>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button variant="outlined"
                          onClick={() => {
                            setShowFeedbackModal(false);
                            handleGeneratewithFeedback();
                          }}
                          disabled={!userFeedback.trim()}
                        >
                          Generate Again
                        </Button>

                        <Button variant="contained"
                          onClick={() => {  setShowFeedbackModal(false); }}
                        >
                          Confirm Assignment
                        </Button>
                      </Box>
                    </Sheet>
                  </Modal>


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
                    const lecturePath = `${courseID}/${file.name}`; // Construct courseID/lectures/*.pdf
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
              <LoadingModal open={loading} title="Generating summary"/>
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
    </Box>
  </Box>
);
}