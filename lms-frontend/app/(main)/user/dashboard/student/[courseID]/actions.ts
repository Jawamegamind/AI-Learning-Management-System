"use server"

import axios from 'axios'

export async function fetchCourseDataFromID(courseId: string) {
    // Send a request to your backend to fetch the course details
    const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseId}`);
    // console.log(response.data); // Log the response
    return response.data.course
}

export async function generateSummarization(summarizationPrompt: string, selectedSummarizationLectures: string[]) {
    // const response = await axios.post(`http://localhost:8000/api/summarization/generate_summarization`, {
    //     summarizationPrompt,
    //     selectedSummarizationLectures
    // });
    // return response.data;
    console.log(summarizationPrompt, selectedSummarizationLectures);
    const response = await axios.post(`http://localhost:8000/api/summarization/generate_summarization`, {
        summarization_prompt: summarizationPrompt,
        lecture_urls: selectedSummarizationLectures
    });
    return response.data.summary;
}

export async function generateFlashcards(flashcardsPrompt: string, selectedFlashcardsLectures: string[]) {
    console.log(flashcardsPrompt, selectedFlashcardsLectures);
    const response = await axios.post(`http://localhost:8000/api/summarization/generate_flashcards`, {
        flashcards_prompt: flashcardsPrompt,
        lecture_urls: selectedFlashcardsLectures
    });
    return response.data.flashcards;
}