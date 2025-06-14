# 🧠 AI Learning Management System

An AI-powered Learning Management System built with **Next.js** (frontend) and **FastAPI** (backend), designed to streamline teaching and learning using intelligent content generation, grading assistance, and student support.

---

## 🚀 Setup Guide

To run the LMS locally, follow the steps below for both the **frontend** and **backend**:

---

### 📦 Frontend (Next.js)

1. Navigate to the `lms-frontend` folder:

    ```bash
    cd lms-frontend
    ```

2. Install project dependencies:

    ```bash
    npm install
    ```

3. Run the development server:

    ```bash
    npm run dev
    ```

4. Open your browser and go to:

    ```
    http://localhost:3000
    ```

---

### 🐍 Backend (FastAPI)

1. Navigate to the `lms-backend` folder:

    ```bash
    cd lms-backend
    ```

2. Create and activate a virtual environment:

    **Linux/macOS:**

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

    **Windows:**

    ```cmd
    python -m venv venv
    venv\Scripts\activate
    ```

3. Install required dependencies:

    ```bash
    pip install -r requirements.txt
    ```

4. Start the FastAPI server:

    ```bash
    uvicorn main:app --reload
    ```

5. Access the API docs at:

    ```
    http://localhost:8000/docs
    ```

---

## ✨ Features

- 🔍 **AI-Powered Quiz & Assignment Generation** – Automatically generate questions from lecture files.
- 📝 **AI-Based Grading Assistant** – Auto-grade assignments and quizzes with minimal instructor input.
- 📚 **Context-Aware Student Assistant** – Personalized Q&A support based on course material.
- 📤 **File Upload and Management** – Upload lectures, assignments, and resources easily.
- 📈 **Dashboard Interface** – Monitor course progress, manage content, and view student submissions.

---

## 📄 Report

You can find a detailed project report including design decisions, architecture, features, and evaluation in the `report/` directory.

---

## 👥 Contributors

- **Jawad Saeed**
- **Ibrahim Farrukh**
- **Muhammad Ahmed**
- **Huraira Anwer**
- **Junaid Jamshed**

---

