"use client"

import React from "react";
import { useParams } from "next/navigation";

export default function CoursePage () {
  const { courseID } = useParams();

  return (
    <div>
      <h1>Course Page</h1>
      <p>This is the course page for course ID: {courseID}</p>
    </div>
  );
}