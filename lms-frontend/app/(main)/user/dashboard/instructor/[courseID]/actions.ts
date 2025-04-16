"use server"

import axios from 'axios'

export async function fetchCourseDataFromID(courseId: string) {
    // Send a request to your backend to fetch the course details
    const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseId}`);
    // console.log(response.data); // Log the response
    return response.data.course
}

export async function generateFileEmbeddingsonUpload(courseId: string, filePath: string, signedUrl: string) {
    // console.log(`Generating document and chunk level embeddings for new file ${filePath} in course ${courseId} signedUrl ${signedUrl}`)

    const response = await axios.post(
      `http://localhost:8000/api/courses/process_file?courseId=${courseId}&filePath=${filePath}&signedUrl=${encodeURIComponent(signedUrl)}`
    )

    console.log("The backend's response to generating embeddings is", response.data)

    return response.data

}