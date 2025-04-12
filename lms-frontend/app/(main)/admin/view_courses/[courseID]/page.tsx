"use client"

import React, { useLayoutEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import {fetchCourseDataFromID, fetchUsers, enrollUser, unenrollUser, updateUserRole} from './actions';

interface Course {
    title: string;
    description: string;
    // Add other properties of the course object if needed
}

interface User {
    user_id: string;
    name: string;
    email: string;
    password: string;
    role: string;
}

interface Enrollment {
    user_id: string;
    role: string;
}

export default function ManageCoursePage() {
    // const router = useRouter();
    const { courseID } = useParams();
    console.log("The courseId is: ", courseID);

    const [course, setCourse] = useState<Course | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
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
          const response = await fetchCourseDataFromID(courseID)
          setCourse(response.course);
          setEnrollments(response.enrolments);
        } catch (error) {
          console.error("Error fetching course data", error);
        }
      };


    useLayoutEffect(() => {
        const fetchData = async () => {
          try {
            const courseRes = await fetchCourseDataFromID(courseID)
            const courseData = courseRes.course;
            const enrolmentsData = courseRes.enrolments;

            setCourse(courseData);
            setEnrollments(enrolmentsData);

            const usersRes = await fetchUsers();
            console.log("Users API response:", usersRes);
            const enrolledUserIds = new Set(enrolmentsData.map((e: { user_id: string; }) => e.user_id));
            // const availableUsers = usersRes.data.filter((user) => !enrolledUserIds.has(user.id));
            const availableUsers = usersRes.users.filter((user: { id: unknown; }) => !enrolledUserIds.has(user.id));
            console.log("availableusers",availableUsers)


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
          console.log("bef enrolling user",typeof courseID, typeof selectedUser, typeof selectedRole)
          const resp = await enrollUser(courseID, selectedUser, selectedRole)
          if (resp === "User already enrolled in this course") {
            handleClick("User already enrolled in this course", "error");
          }
          else if (resp === "Enrollment failed") {
            handleClick("Enrollment failed, please try again", "error");
            }
          else if (resp === "User enrolled successfully") {
            handleClick("User enrolled successfully", "success");
        }
          setSelectedUser("");
          setSelectedRole("student");
          fetchCourseData();
        } catch (error) {
          console.error("Error assigning user", error);
        }
      };

      const handleRoleChange = async (userId: string, newRole: string) => {
        try {
          const resp = await updateUserRole(courseID, userId, newRole)
            if (resp === "User role updated successfully") {
                handleClick("User role updated successfully", "success");
            } else {
                handleClick("Role update failed", "error");
            }
          fetchCourseData();
        } catch (error) {
          console.error("Error updating role", error);
        }
      };

      const handleRemoveUser = async (userId: string) => {
        try {
          const resp = await unenrollUser(courseID, userId)
            if (resp === "User unenrolled") {
                handleClick("User unenrolled successfully", "success");
            }
          fetchCourseData();
        } catch (error) {
          console.error("Error removing user", error);
        }
      };

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
                {/* <Typography level="body-md">User ID: {enrollment.user_id}</Typography> */}
                Name: {
                    users.find((u) => u.user_id === enrollment.user_id)?.name || enrollment.user_id
                }
                <Select
                  value={enrollment.role}
                  onChange={(e, value) => {
                    if (value !== null) {
                      handleRoleChange(enrollment.user_id, value);
                    }
                  }}
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
            onChange={(e, value) => {
                if (value !== null) {
                    setSelectedUser(value);
                }
            }}
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
            onChange={(e, value) => {
                if (value !== null) {
                    setSelectedRole(value);
                }
            }}
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
