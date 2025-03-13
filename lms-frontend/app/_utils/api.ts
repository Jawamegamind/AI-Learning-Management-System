const API_BASE_URL = "http://localhost:8000"; // FastAPI Backend URL

export const fetchTestData = async () => {
    const response = await fetch(`${API_BASE_URL}/api/test`);
    const data = await response.json();
    return data;
};
