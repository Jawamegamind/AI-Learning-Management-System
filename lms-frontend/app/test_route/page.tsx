"use client"

import { useEffect, useState } from "react";
import { fetchTestData } from "../_utils/api";

export default function Home() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetchTestData().then(data => setMessage(data.message));
    }, []);

    return (
        <div>
            <h1>Next.js + FastAPI</h1>
            <p>Backend Response: {message}</p>
        </div>
    );
}
