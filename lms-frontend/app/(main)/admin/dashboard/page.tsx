"use client"

import * as React from 'react';
import Navbar from '../../../_components/navbar';
import { createClient } from '@/utils/supabase/client';
import {useState, useLayoutEffect} from 'react';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useLayoutEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data, error } = await supabase.auth.getUser();

            if (error) {
                console.error("Error fetching user:", error.message);
            } else {
                setUser(data.user);
            }
        };

        fetchUser();
    }, []);

    const handleCreateCourse = () => {
        router.push("/admin/create_course");
    };

    return (
        <div>
            <Navbar />
            <h1>This is the Admin Dashboard of the LMS</h1>
            {user ? (
                <div>
                    <h2>Welcome, {user.email}!</h2>
                    <pre>{JSON.stringify(user, null, 2)}</pre>
                    <Button variant="contained" color="primary" onClick={handleCreateCourse} sx={{ mt: 2 }}>
                        Create New Course
                    </Button>
                </div>
            ) : (
                <p>Loading user data...</p>
            )}
        </div>
    );
}
