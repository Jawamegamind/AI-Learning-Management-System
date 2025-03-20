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
import { useRouter } from 'next/navigation';

// interface User {
//     email: string;
//     firstName: string;
//     lastName: string;
//     password: string;
// }

// function Copyright(props: { sx?: object }) {
//   return (
//     <Typography variant="body2" color="text.secondary" align="center" {...props}>
//       {'Copyright © '}
//       <Link color="inherit" href="https://jawamegamind-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer">
//         Jawad Saeed
//       </Link>{' '}
//       {new Date().getFullYear()}
//       {'.'}
//     </Typography>
//   );
// }

export default function SignIn() {
    const router = useRouter();
    // const [user, setUser] = React.useState<User | null>(null);
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = data.get('email') as string;
        const password = data.get('password') as string;

        // Sending api request to login user
        fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                // Check the messages from the backend for appropraite alerts
                if (data.message == "User not found") {
                    alert("User not found")
                } else if (data.message == "Invalid password") {
                    alert("Invalid password")
                } else if (data.message == "Login successful") {
                    alert("Login successful")
                    // Redirect to the dashboard
                    router.push('/dashboard');
                }
                else if (data.message == "Login failed") {
                    alert("Login failed")
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });
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
            {/* <Copyright sx={{ mt: 4, mb: 2 }} /> */}
        </Container>
    );
}
