"use client"

import React, { useEffect, useLayoutEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import CardActions from "@mui/joy/CardActions";
import Button from "@mui/joy/Button";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import { Alert } from '@mui/material';
import Snackbar, {SnackbarCloseReason} from '@mui/material/Snackbar';
import ResponsiveAppBar from "@/app/_components/navbar";

export default function ManageCoursePage() {
    const router = useRouter();
    const { courseID } = useParams();
    console.log("The courseId is: ", courseID);

    const [course, setCourse] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedRole, setSelectedRole] = useState("student");
    const [open, setOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error' | 'info' | 'warning'>('info');
    
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

    const fetchCourseData = async () => {
        try {
          const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseID}`);
          setCourse(response.data.course);
          setEnrollments(response.data.enrolments);
        } catch (error) {
          console.error("Error fetching course data", error);
        }
      };
    
    //   const fetchUsers = async () => {
    //     try {
    //       const response = await axios.get("http://localhost:8000/api/users");
    //       console.log("Users: ", response.data);
    //       const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));
    //       const availableUsers = response.data.filter((user) => !enrolledUserIds.has(user.id));
    //       setUsers(availableUsers);
    //     } catch (error) {
    //       console.error("Error fetching users", error);
    //     }
    //   };
    
    // useEffect(() => {
    //     if (courseID) {
    //         fetchCourseData();
    //     }
    // }, [courseID]);

    // useEffect(() => {
    // if (enrollments.length) {
    //     fetchUsers();
    // }
    // }, [enrollments]);

    useEffect(() => {
        const fetchData = async () => {
          try {
            const courseRes = await axios.get(`http://localhost:8000/api/courses/get_course/${courseID}`);
            const courseData = courseRes.data.course;
            const enrolmentsData = courseRes.data.enrolments;
      
            setCourse(courseData);
            setEnrollments(enrolmentsData);
      
            const usersRes = await axios.get("http://localhost:8000/api/users");
            console.log("Users API response:", usersRes.data);
            const enrolledUserIds = new Set(enrolmentsData.map((e) => e.user_id));
            // const availableUsers = usersRes.data.filter((user) => !enrolledUserIds.has(user.id));
            const availableUsers = usersRes.data.users.filter((user) => !enrolledUserIds.has(user.id));
      
            setUsers(availableUsers);
          } catch (error) {
            console.error("Error fetching data", error);
          }
        };
      
        if (courseID) {
          fetchData();
        }
      }, [courseID]);

    

    const handleAssignUser = async () => {
        try {
           const response = await axios.post(`http://localhost:8000/api/courses/${courseID}/enroll_user`, {
            user_id: selectedUser,
            role: selectedRole,
          });
          if (response.data.message === "User already enrolled in this course") {
            handleClick("User already enrolled in this course", "error");
          }
          else if (response.data.message === "Enrollment failed") {
            handleClick("Enrollment failed, please try again", "error");
            }
          else if (response.data.message === "User enrolled successfully") {
            handleClick("User enrolled successfully", "success");
        }
          setSelectedUser("");
          setSelectedRole("student");
          fetchCourseData();
        } catch (error) {
          console.error("Error assigning user", error);
        }
      };
    
      const handleRoleChange = async (userId, newRole) => {
        try {
          await axios.post(`http://localhost:8000/api/courses/${courseID}/update_role`, {
            user_id: userId,
            role: newRole,
          });
          fetchCourseData();
        } catch (error) {
          console.error("Error updating role", error);
        }
      };
    
      const handleRemoveUser = async (userId) => {
        try {
          await axios.delete(`http://localhost:8000/api/courses/${courseID}/unenroll_user/${userId}`);
          fetchCourseData();
        } catch (error) {
          console.error("Error removing user", error);
        }
      };

    // const handleAssignUser = async () => {
    //     try {
    //         await axios.post(`/api/courses/${courseId}/enroll_user`, {
    //             user_id: selectedUser,
    //             role: selectedRole
    //         });
    //         alert("User assigned successfully");
    //     } catch (error) {
    //         console.error("Error assigning user", error);
    //     }
    // };

    // const handleRoleChange = (userId, role) => {
    //     setEnrollments(enrollments.map(e => e.user_id === userId ? { ...e, role } : e));
    // };

    return (
    <Box>
      <ResponsiveAppBar />
      <Box sx={{ padding: 4 }}>
        <Typography level="h2">Manage Course: {course?.title}</Typography>
        <Typography level="body-md" sx={{ mb: 3 }}>{course?.description}</Typography>

        {/* Enrolled Users */}
        <Box sx={{ marginTop: 3 }}>
          <Typography level="h4">Enrolled Users</Typography>
          {enrollments.map((enrollment) => (
            <Card key={enrollment.user_id} variant="outlined" sx={{ marginBottom: 2 }}>
              <CardContent>
                <Typography level="body-md">User ID: {enrollment.user_id}</Typography>
                <Select
                  value={enrollment.role}
                  onChange={(e, value) => handleRoleChange(enrollment.user_id, value)}
                  sx={{ mt: 1 }}
                >
                  <Option value="student">Student</Option>
                  <Option value="instructor">Instructor</Option>
                </Select>
              </CardContent>
              <CardActions>
                <Button color="danger" onClick={() => handleRemoveUser(enrollment.user_id)}>
                  Remove
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>

        {/* Assign New User */}
        <Box sx={{ marginTop: 5 }}>
          <Typography level="h4">Assign New User</Typography>

          <Select
            placeholder="Select User"
            value={selectedUser}
            onChange={(e, value) => setSelectedUser(value)}
            sx={{ mt: 2 }}
          >
            {users.map((user) => (
              <Option key={user.user_id} value={user.user_id}>
                {user.name} ({user.email})
              </Option>
            ))}
          </Select>

          <Select
            placeholder="Select Role"
            value={selectedRole}
            onChange={(e, value) => setSelectedRole(value)}
            sx={{ mt: 2 }}
          >
            <Option value="student">Student</Option>
            <Option value="instructor">Instructor</Option>
          </Select>

          <Button sx={{ mt: 2 }} onClick={handleAssignUser} disabled={!selectedUser}>
            Assign User
          </Button>
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
