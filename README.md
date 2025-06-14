🧠 AI Learning Management System
An AI-powered Learning Management System built with Next.js (frontend) and FastAPI (backend), designed to streamline teaching and learning using intelligent content generation, grading assistance, and student support.

🚀 Setup Guide
To run the LMS locally, follow the steps below for both the frontend and backend:

📦 Frontend (Next.js)
Navigate to the lms-frontend folder:

bash
Copy
Edit
cd lms-frontend
Install project dependencies:

bash
Copy
Edit
npm install
Run the development server:

bash
Copy
Edit
npm run dev
Open your browser and go to:

arduino
Copy
Edit
http://localhost:3000
🐍 Backend (FastAPI)
Navigate to the lms-backend folder:

bash
Copy
Edit
cd lms-backend
Create and activate a virtual environment:

Linux/macOS:

bash
Copy
Edit
python3 -m venv venv
source venv/bin/activate
Windows:

cmd
Copy
Edit
python -m venv venv
venv\Scripts\activate
Install required dependencies:

bash
Copy
Edit
pip install -r requirements.txt
Start the FastAPI server:

bash
Copy
Edit
uvicorn main:app --reload
Access the API docs at:

bash
Copy
Edit
http://localhost:8000/docs
✨ Features
🔍 AI-Powered Quiz & Assignment Generation – Automatically generate questions from lecture files.

📝 AI-Based Grading Assistant – Auto-grade assignments and quizzes with minimal instructor input.

📚 Context-Aware Student Assistant – Personalized Q&A support based on course material.

📤 File Upload and Management – Upload lectures, assignments, and resources easily.

📈 Dashboard Interface – Monitor course progress, manage content, and view student submissions.

📄 Report
You can find a detailed project report including design decisions, architecture, features, and evaluation in the report/ directory.

👥 Contributors
Jawad Saeed – Full Stack Developer, AI Integration

📬 Contact
For questions, feedback, or collaborations:
📧 jawad.saeed@example.com (Replace with your email)
