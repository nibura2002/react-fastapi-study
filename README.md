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

# AWS Amplify Deployment Guide (byLLM)

This guide explains how to deploy the chat application using AWS Amplify and AWS Lambda.

## Frontend Deployment with AWS Amplify

1. **Connect your repository to AWS Amplify**:
   - Log in to the AWS Management Console
   - Navigate to AWS Amplify
   - Click "Create app" > "Host web app"
   - Choose your Git provider and connect your repository
   - Select the branch to deploy

2. **Configure build settings**:
   - Amplify will auto-detect React settings, but verify the build settings:

   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: build
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Set environment variables**:
   - Go to App settings > Environment variables
   - Add `REACT_APP_API_URL` pointing to your API Gateway URL (after backend deployment)

## Backend Deployment to AWS Lambda with Poetry

1. **Set up Poetry for dependency management**:
   - Install Poetry if you haven't already:
     ```bash
     curl -sSL https://install.python-poetry.org | python3 -
     ```
   - Initialize Poetry in your project:
     ```bash
     cd backend
     poetry init
     ```
   - Add required dependencies:
     ```bash
     poetry add fastapi uvicorn langchain langchain-openai python-dotenv pydantic mangum boto3
     ```

2. **Create a pyproject.toml file**:
   - Poetry will create this file, but ensure it includes your dependencies:
   ```toml
   [tool.poetry]
   name = "chatbot-backend"
   version = "0.1.0"
   description = "Chatbot backend with LangChain and OpenAI"
   authors = ["Your Name <your.email@example.com>"]

   [tool.poetry.dependencies]
   python = "^3.9"
   fastapi = "^0.110.0"
   uvicorn = "^0.28.0"
   langchain = "^0.1.14"
   langchain-openai = "^0.0.8"
   python-dotenv = "^1.0.1"
   pydantic = "^2.6.1"
   mangum = "^0.17.0"
   boto3 = "^1.34.21"

   [build-system]
   requires = ["poetry-core>=1.0.0"]
   build-backend = "poetry.core.masonry.api"
   ```

3. **Create the Lambda function**:
   - Navigate to AWS Lambda
   - Create a new function
   - Choose Python 3.9+ as the runtime
   - Create a new role with basic Lambda permissions

4. **Deploy the code using Poetry**:
   - Package the code with Poetry:
     ```bash
     # Export dependencies to requirements.txt
     poetry export -f requirements.txt --output requirements.txt --without-hashes
     
     # Create a deployment package
     mkdir -p package
     pip install -r requirements.txt --target ./package
     cp main.py ./package/
     cd package
     zip -r ../deployment-package.zip .
     ```
   
   - Alternative approach with Poetry's virtual environment:
     ```bash
     # Use Poetry to install dependencies in a virtual environment
     poetry install
     
     # Create a deployment package from the virtual environment
     mkdir -p package
     cp main.py package/
     cp -r $(poetry env info -p)/lib/python*/site-packages/* package/
     cd package
     zip -r ../deployment-package.zip .
     ```
   
   - Upload the deployment package to Lambda

5. **Add required permissions to Lambda role**:
   - Add SSM parameter read permissions to access the API key
   - Go to the Lambda function > Configuration > Permissions
   - Click on the role name to go to IAM
   - Attach policy: AmazonSSMReadOnlyAccess or create a custom policy with GetParameter permissions

6. **Configure API Gateway**:
   - Create a new API Gateway (HTTP API)
   - Add routes:
     - POST /api/chat -> Your Lambda function
     - GET /api/health -> Your Lambda function
   - Enable CORS for your Amplify domain

7. **Store secrets**:
   - In AWS Systems Manager Parameter Store:
     - Create a secure string parameter `/chatbot/OPENAI_API_KEY` with your OpenAI API key

**Special backend package for AWS Lambda**:
- Mangum: Adapter for running ASGI applications like FastAPI in AWS Lambda

## Monitoring and Debugging

1. **Check CloudWatch Logs**:
   - Lambda logs will be in CloudWatch
   - Enable detailed logging by setting appropriate log levels

2. **Set up CloudWatch Alarms**:
   - Monitor Lambda errors and latency
   - Create alarms for when error rates exceed thresholds

## Further Optimizations

1. **Add CloudFront CDN**:
   - Automatically configured with Amplify

2. **Consider Cognito Authentication**:
   - Add user authentication if needed
   - Update CORS settings accordingly

3. **Optimize Lambda Cold Starts**:
   - Use Provisioned Concurrency for the Lambda function
   - Minimize dependencies in the deployment package