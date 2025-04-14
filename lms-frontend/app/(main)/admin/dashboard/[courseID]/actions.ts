"use server"

import axios from 'axios'

export async function fetchCourseDataFromID(courseId: string) {
    // Send a request to your backend to fetch the course details
    const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseId}`);
    // console.log(response.data); // Log the response
    return response.data.course
}


export async function generateAssignmentOrQuiz(prompt: string, lectureUrls:string[], option: string) {

    // option can be "assignment" or "quiz"
    console.log(prompt, lectureUrls, option)
    return "thanks"
    
    // const response = await fetch('http://localhost:8000/api/generation/generate-assignment/', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ prompt }),
    // });

    // if (!response.ok) {
    //     const resp_txt = await response.text()
    //     // console.log("txt",resp_txt)
    //   throw new Error(`Backend error: ${response.status} - ${resp_txt}`);
    // }

    // const data = await response.json();
    // // console.log("final sending ... ",data)
    // return data;
  }
