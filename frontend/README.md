# AI Code Critic - Professional Static Analysis Tool

AI Code Critic is a full-stack web application designed to help developers review, optimize, and secure their source code using Artificial Intelligence.

## Features

- **AI-Powered Code Review**: Analyzes logic, performance, and security vulnerabilities.
- **Automated Refactoring**: Generates optimized code snippets that can be applied instantly.
- **Health Scoring**: Provides a numerical percentage score based on code quality.
- **User Authentication**: Secure Login and Signup system using JWT and Bcrypt.
- **Analysis History**: Stores previous reviews in MongoDB for future reference.
- **PDF Export**: Allows users to download a professional report of the AI audit.

## Tech Stack

- **Frontend**: React.js, Lucide Icons, Axios, Canvas-Confetti.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB Atlas (Cloud).
- **AI Engine**: Hugging Face Inference API (Qwen 2.5 Model).
- **Security**: JSON Web Tokens (JWT) and Password Hashing.

## Installation and Setup

1. **Clone the repository**
   ```bash
   git clone [https://github.com/srishti885/AI-Code-Critic.git](https://github.com/srishti885/AI-Code-Critic.git)
   cd AI-Code-Critic


2. **Setup Backend**
* Navigate to the backend folder.
* Install dependencies: `npm install`.
* Create a `.env` file and add:
```env
MONGO_URI=your_mongodb_connection_string
HF_TOKEN=your_hugging_face_token
JWT_SECRET=your_secret_key
PORT=5000



* Start the server: `node server.js`.


3. **Setup Frontend**
* Navigate to the frontend folder.
* Install dependencies: `npm install`.
* Start the development server: `npm run dev`.



## Environment Variables

To run this project, you will need to add the following environment variables to your .env file:

* `HF_TOKEN`: API Key from Hugging Face.
* `MONGO_URI`: Connection string for MongoDB Atlas.
* `JWT_SECRET`: A secure string for authentication.

## License

This project is developed for educational purposes as part of a professional portfolio.




### **Ab kya karna hai?**

1. Is file ko save kijiye.
2. Terminal mein ye commands chalaiye taaki ye GitHub par update ho jaye:
   ```bash
   git add README.md
   git commit -m "Added professional documentation"
   git push origin main

