"use client"
import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import { Alert } from '@mui/material';
import Snackbar, {SnackbarCloseReason} from '@mui/material/Snackbar';
// import { useRouter } from 'next/navigation';
import {login} from '@/app/(authentication)/login/actions';


export default function SignIn() {
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

    // const router = useRouter();
    // const [user, setUser] = React.useState<User | null>(null);
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        // Check for empty fields
        if (!email || !password) {
            handleClick("All fields are required", "error");
            return;
        }

        // Using the login action
        try {
            const response = await login(formData);
            
            // Checking the response message and displaying appropriate alerts
            if (response == "Invalid credentials") {
                handleClick("Invalid credentials", "error");
            } else if (response == "Login failed") {
                handleClick("Login failed", "error");
            }
        } catch (error) {
            console.error('Error:', error);
            handleClick("Login failed", "error");
        }

        // const email = data.get('email') as string;
        // const password = data.get('password') as string;

        // // Sending api request to login user
        // fetch('http://localhost:8000/api/login', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({ email, password }),
        // })
        //     .then(response => response.json())
        //     .then(data => {
        //         console.log(data);
        //         // Check the messages from the backend for appropriate alerts
        //         if (data.message == "User not found") {
        //             alert("User not found")
        //         } else if (data.message == "Invalid password") {
        //             alert("Invalid password")
        //         } else if (data.message == "Login successful") {
        //             handleClick("Login successful", "success");
        //             // Delay redirect to let snackbar show
        //             setTimeout(() => {
        //                 router.push('/dashboard');
        //             }, 1000); // 2-second delay
        //             // router.push('/dashboard');
        //         }
        //         else if (data.message == "Login failed") {
        //             alert("Login failed")
        //         }
        //     })
        //     .catch((error) => {
        //         console.error('Error:', error);
        //     });
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh' }}>
            <CssBaseline />
            <Paper elevation={6} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <LockOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Login
                </Typography>
                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Sign In
                    </Button>
                    <Box display="flex" justifyContent="center">
                        <Link href="/forgot-password" variant="body2">
                            Forgot password?
                        </Link>
                    </Box>
                </Box>
            </Paper>
            <Box mt={2} textAlign="center">
                <Link href="/register" variant="body2">
                    {"Don't have an account? Sign Up"}
                </Link>
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
            {/* <Copyright sx={{ mt: 4, mb: 2 }} /> */}
        </Container>
    );
}
