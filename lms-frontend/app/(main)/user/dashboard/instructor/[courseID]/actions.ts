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

export async function generateAssignmentOrQuiz(prompt: string, lectureUrls: string[], option: string) {

  try {
    const endpoint = option === "assignment"
    ? "http://localhost:8000/api/generation/generate-assignment"
    : "http://localhost:8000/api/generation/generate-quiz";

    const response = await axios.post(endpoint, {
      prompt,
      lecture_urls: lectureUrls,
      option
    });

    if (response.data.status === "success") {
      return response.data.assignment;
    } else {
      throw new Error("Generation failed");
    }
  } catch (error) {
    console.error("Generation error:", error);
    throw error;
  }

  // return {
    //   "cells": [
      //     {
        //       "cell_type": "markdown",
        //       "metadata": {},
        //       "source": [
          //         "# Hello Jupyter\n",
          //         "This is a markdown cell."
          //       ]
          //     },
          //     {
            //       "cell_type": "code",
            //       "execution_count": null,
            //       "metadata": {},
            //       "outputs": [],
            //       "source": [
              //         "print(\"Hello from code cell!\")"
              //       ]
              //     }
              //   ],
              //   "metadata": {
                //     "kernelspec": {
                  //       "display_name": "Python 3",
//       "language": "python",
//       "name": "python3"
//     },
//     "language_info": {
  //       "name": "python",
  //       "version": "3.8"
  //     }
  //   },
  //   "nbformat": 4,
  //   "nbformat_minor": 5
  // }
}

export async function summarizeLecture(lectureUrl: string) {
  try {
    console.log(`Sending summarize request for lecture URL: ${lectureUrl}`);
    const response = await axios.post(
      "http://localhost:8000/api/generation/summarize-lecture",
      { lecture_url: lectureUrl }
    );

    if (response.data.status === "success") {
      return response.data;
    } else {
      throw new Error("Summarization failed");
    }
  } catch (error) {
    console.error("Summarization error:", error);
    throw error;
  }
}