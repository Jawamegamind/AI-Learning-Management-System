"use server"

// import axios from 'axios'
import api from '@/app/_utils/api'

export async function fetchCourseDataFromID(courseId: string) {
    // Send a request to your backend to fetch the course details
    // const response = await axios.get(`http://localhost:8000/api/courses/get_course/${courseId}`);
    const response = await api.get(`/api/courses/get_course/${courseId}`);
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
    // const response = await axios.post(`http://localhost:8000/api/summarization/generate_summarization`, {
    //     summarization_prompt: summarizationPrompt,
    //     lecture_urls: selectedSummarizationLectures
    // });
    const response = await api.post(`/api/summarization/generate_summarization`, {
        summarization_prompt: summarizationPrompt,
        lecture_urls: selectedSummarizationLectures
    });
    return response.data.summary;
}

export async function generateFlashcards(flashcardsPrompt: string, selectedFlashcardsLectures: string[]) {
    console.log(flashcardsPrompt, selectedFlashcardsLectures);
    // const response = await axios.post(`http://localhost:8000/api/summarization/generate_flashcards`, {
    //     flashcards_prompt: flashcardsPrompt,
    //     lecture_urls: selectedFlashcardsLectures
    // });
    const response = await api.post(`/api/summarization/generate_flashcards`, {
        flashcards_prompt: flashcardsPrompt,
        lecture_urls: selectedFlashcardsLectures
    });
    return response.data.flashcards;
}

export async function generatePracticeQuestions(selectedPracticeLectures: string[], practicePrompt: string, practiceDifficulty:string ) {
    console.log(practicePrompt,  selectedPracticeLectures,practiceDifficulty )
    try {
        // const response = await axios.post(`http://localhost:8000/api/generation/generate-practiceqas`, {
        //     prompt: practicePrompt,
        //     lecture_urls: selectedPracticeLectures,
        //     difficulty: practiceDifficulty
        // });
        const response = await api.post(`/api/generation/generate-practiceqas`, {
            prompt: practicePrompt,
            lecture_urls: selectedPracticeLectures,
            difficulty: practiceDifficulty
        });
        // console.log(response.data)
        if (response.data.status === "success") {
            return response.data.practice;
        } else {
            throw new Error("Generation failed");
        }
    } catch (error) {
      console.error("Generation error:", error);
      throw error;
    }

}

export async function chatWithLecture(message: string, selectedLectures: string[], conversationHistory: { role: string; content: string }[]) {
    console.log(message, selectedLectures, conversationHistory);
    try {
        // const response = await axios.post(`http://localhost:8000/api/summarization/chat_with_lecture`, {
        //     message,
        //     lecture_urls: selectedLectures,
        //     conversation_history: conversationHistory
        // });
        const response = await api.post(`/api/summarization/chat_with_lecture`, {
            message,
            lecture_urls: selectedLectures,
            conversation_history: conversationHistory
        });
        return response.data.response;
    } catch (error) {
        console.error("Chat error:", error);
        throw error;
    }
}