# 🧠 AI Learning Management System

An AI-powered Learning Management System that revolutionizes educational technology by integrating large language models into the learning environment. Built with **Next.js** (frontend) and **FastAPI** (backend), this system addresses key pain points in education: students' need for summarized content for exam preparation and instructors' time-consuming manual grading processes.

## 🎯 Problem Statement

Traditional learning management systems lack intelligent automation, leading to:

- Students struggling with extensive lecture materials without proper summarization
- Instructors spending valuable time manually grading assignments and quizzes
- Limited personalized learning experiences
- Inefficient content generation and assessment creation

## ✨ Key Features

### For Students

- **📝 Lecture Summarization** - Generate concise, relevant summaries from lecture content
- **🎴 Flashcard Generation** - Create interactive flashcards for effective study and review
- **❓ Practice Question Generation** - Generate practice questions with varying difficulty levels
- **💬 Chat with Lectures** - Interactive chatbot to discuss and clarify lecture content using RAG
- **📤 Assignment & Quiz Submission** - Seamless submission interface for assessments

### For Instructors

- **📋 AI-Powered Quiz Generation** - Automatically create theoretical assessments from lecture materials
- **💻 Assignment Generation** - Generate practical/coding assignments with proper formatting
- **🎯 Mark Scheme & Rubric Generation** - Create comprehensive grading criteria automatically
- **⚡ AI-Assisted Grading** - Automated grading with detailed feedback generation
- **📊 Course Management** - Complete course creation and management functionality

### For Administrators

- **🔧 Advanced Grading Tools** - Enhanced grading capabilities with administrative oversight
- **📈 System Management** - Full system administration and monitoring capabilities

## 🏗️ System Architecture

### Technology Stack

- **Frontend**: Next.js with Material UI for responsive, modern interface
- **Backend**: FastAPI for lightweight, AI-integrated API services
- **Database**: Supabase for user authentication, storage buckets, and vector embeddings
- **AI Framework**: Langchain for RAG implementation and LangGraph for agent orchestration
- **LLM Integration**:
  - OpenRouter for unified LLM interface
  - Together.ai for hosting fine-tuned Llama3-8b model
  - Llama 4 Maverick (17B parameters, Mixture of Experts architecture)

### Core Components

- **Retrieval Augmented Generation (RAG)** - Context-aware content generation and retrieval
- **Agent-based Workflows** - Intelligent task orchestration for complex features
- **LLM-as-Judge** - Automated evaluation and iterative improvement of generated content
- **Vector Embeddings** - Semantic search and content matching capabilities

## 🚀 Setup Guide

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- Docker & Docker Compose (for containerized setup)

---

## 🖥️ Local Development Setup

### Frontend Setup (Next.js)

1. Navigate to the frontend directory:

   ```bash
   cd lms-frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Access the application:
   ```
   http://localhost:3000
   ```

### Backend Setup (FastAPI)

1. Navigate to the backend directory:

   ```bash
   cd lms-backend
   ```

2. Create and activate virtual environment:

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

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:

   ```bash
   uvicorn main:app --reload
   ```

5. Access API documentation:
   ```
   http://localhost:8000/docs
   ```

---

## 🐳 Docker Setup

### Quick Start with Docker Compose

1. Ensure you have Docker and Docker Compose installed

2. Add environment configuration:
   Create `lms-frontend/.env.docker` with:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   NEXT_PUBLIC_BACKEND_URL=http://backend:8000
   ```

   **Note**: The backend URL must use the internal container name: `http://backend:8000`

3. Build and run the application:

   ```bash
   docker-compose up --build
   ```

   **⏱️ Build Time**: Expect 30-45 minutes for initial build due to heavy backend requirements (~6GB)

4. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend**: http://localhost:8000

### Monitoring Docker Containers

Check running containers:

```bash
docker ps
```

View logs (recommended):

```bash
docker compose logs -f
```

Wait for "Application startup complete" message before using the application.

### Stopping Docker Services

Stop services:

```bash
docker-compose down
```

Remove volumes and images:

```bash
docker-compose down --volumes --rmi all
```

---

## 🧪 Testing & Demo

### Test Credentials

**Student/Instructor Account:**

- Email: `test@gmail.com`
- Password: `ghop3690`

**Administrator Account:**

- Email: `jawad.saeed586@gmail.com`
- Password: `ghop3690`

### Feature Testing Guide

1. **Student Features**: Use the student account to test summarization, flashcard generation, practice questions, and chat functionality
2. **Instructor Features**: Generate assignments, quizzes, and test the grading workflows
3. **Admin Features**: Access advanced grading tools and system management features

---

## 🔧 Common Issues & Troubleshooting

### Docker Issues

- **Frontend "Invalid URL" errors**: Verify `NEXT_PUBLIC_BACKEND_URL=http://backend:8000` in `.env.docker`
- **Changes not reflected**: Rebuild with `--build` flag
- **Container startup issues**: Check logs with `docker compose logs -f`

### Local Development Issues

- **Port conflicts**: Ensure ports 3000 and 8000 are available
- **Dependency issues**: Clear node_modules and reinstall, or recreate Python virtual environment
- **Environment variables**: Ensure all required environment variables are properly configured

---

## 📊 Performance Metrics

### Measured Improvements

- **Time Savings**: 30-45 minutes saved on lecture summarization compared to manual note-taking
- **Efficiency Gains**: 1-2 hours saved on assignment/quiz creation for instructors
- **Accuracy**: 90% correctness rate in generated Q&As for flashcards
- **Format Consistency**: 100% format accuracy for generated assessments

### Quality Assurance

- Automated LLM-as-Judge evaluation for content quality
- Human-in-the-loop feedback for assignment generation
- Iterative improvement based on coherence, clarity, and relevance metrics

---

## 🔮 Future Enhancements

- Enhanced "Grade All" functionality for bulk assessment processing
- Advanced prompt engineering tools for improved content generation
- Extended multimodal support for diverse content types
- Scalable evaluation strategies for large-scale deployments
- Enhanced mobile responsiveness and offline capabilities

---

## 👥 Project Authors

- **Jawad Saeed**
- **Ibrahim Farrukh**
- **Muhammad Ahmad**
- **Huraira Anwer**
- **Junaid Jamshed**

---

## 📄 License

This project is part of an academic research initiative exploring AI integration in educational technology.
