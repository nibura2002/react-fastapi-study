# Web App Development Study Repository

This repository is created for learning web application development. It contains a simple chat tool that demonstrates real-time streaming of responses from LLM via a FastAPI backend and a React frontend.

*Below sections are written before development by LLM. It may contain critical mistakes.

## Features

- **Backend**
  - Built with **FastAPI** to create a REST API.
  - Uses **LangChain** and **ChatOpenAI** to generate responses from LLM.
  - Streams output token-by-token using FastAPI’s `StreamingResponse` for real-time updates.
  - Integrated with **Mangum** for AWS Lambda compatibility (for serverless deployment).

- **Frontend**
  - A simple chat UI built with **React**.
  - Accepts user input and displays chat messages in real time as tokens stream in from the backend.

- **AWS Integration (Production)**
  - **AWS Amplify** for hosting the frontend and managing CI/CD.
  - **AWS Lambda** for deploying the backend API.
  - **AWS Cognito** for user authentication and management.

---

## Repository Structure

```
.
├── backend
│   ├── main.py                # FastAPI application with streaming chat API endpoint
│   ├── callback_handler.py    # Custom LangChain callback handler (queues tokens for streaming)
│   ├── .env                   # Environment variables (e.g., OPENAI_API_KEY)
│   └── pyproject.toml         # Poetry dependency management file
└── frontend
    └── [React App Files]      # React application files (e.g., src/App.js)
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js and npm
- Poetry
- Git

### Local Setup

#### 1. Backend

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/react-fastapi-study.git
   cd react-fastapi-study/backend
   ```

2. **Create a `.env` file** in the `backend` directory with the following content:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Install dependencies:**
   ```bash
   poetry install
   ```

4. **Run the FastAPI server in development mode:**
   ```bash
   poetry run uvicorn main:app --reload
   ```
   The server will be running at `http://127.0.0.1:8000`.

#### 2. Frontend

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   Your browser will open at `http://localhost:3000`, where you can interact with the chat UI.

---

## Usage

1. **Open the React app** in your browser.
2. **Enter a message** in the text box and click the "Send" button.
3. **The backend** calls LLM via LangChain and streams the response token-by-token.
4. **The chat window** updates in real time with the incoming tokens, showing the chatbot’s reply.

---

## AWS Deployment

This project is designed to be deployed on AWS using a serverless stack (Amplify + Lambda + Cognito). Below is an outline of the deployment steps.

### 1. Initialize an Amplify Project

Run the following command from the root or frontend directory:
```bash
amplify init
```
Follow the interactive prompts to set your project name, environment (dev/prod), and AWS region.

### 2. Add Authentication (Cognito)

Add authentication using AWS Cognito:
```bash
amplify add auth
```
Follow the prompts to set up a user pool and configure options such as email/password authentication and social logins if needed.

### 3. Add the Backend API (Lambda Function)

1. **Add a Lambda function** for your backend:
   ```bash
   amplify add function
   ```
   Choose Python as the runtime and configure your function to use the code from `backend/main.py` (with the necessary adjustments for AWS Lambda).

2. **Add a REST API endpoint:**
   ```bash
   amplify add api
   ```
   Choose REST and configure the endpoint (e.g., `/api/chat/stream`) to trigger the Lambda function.

### 4. Set Environment Variables

Set any required environment variables (e.g., `OPENAI_API_KEY`) for your Lambda function via the Amplify Console or CLI.

### 5. Deploy the Backend

Deploy all backend resources to AWS:
```bash
amplify push
```

### 6. Deploy the Frontend

1. **Add hosting** for your frontend:
   ```bash
   amplify add hosting
   ```
2. **Publish the app:**
   ```bash
   amplify publish
   ```
After deployment, update your frontend API URLs (in `aws-exports.js` or directly in your code) to point to the production API Gateway endpoint.

---

## Additional Information

- **LangChain Version Notes:**  
  Check the documentation for the version of LangChain you are using, as APIs may change.

- **Module Organization:**  
  Ensure that `callback_handler.py` is located in the same directory as `main.py`. Adjust import paths if you restructure the project.

- **Security:**  
  For production, ensure proper CORS configuration, IAM role assignments, and use Cognito to restrict API access to authenticated users only.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://reactjs.org/)
- [LangChain](https://github.com/hwchase17/langchain)
- [AWS Amplify](https://aws.amazon.com/amplify/)
- [OpenAI](https://openai.com/)

