# main.py
import os
import json
import logging
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, AIMessage
import boto3
from mangum import Mangum

# Configure logging
logger = logging.getLogger("api")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)

# Load environment variables
load_dotenv()

# Determine environment
IS_LAMBDA = "AWS_LAMBDA_FUNCTION_NAME" in os.environ

# Get API key from environment or AWS SSM if in Lambda
if IS_LAMBDA:
    # Get parameter from AWS Systems Manager Parameter Store
    ssm = boto3.client('ssm')
    try:
        response = ssm.get_parameter(
            Name='/chatbot/OPENAI_API_KEY',
            WithDecryption=True
        )
        OPENAI_API_KEY = response['Parameter']['Value']
    except Exception as e:
        logger.error(f"Error retrieving parameter from SSM: {e}")
        OPENAI_API_KEY = None
else:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY environment variable is not set")

app = FastAPI()

# Configure CORS - update with your Amplify domain in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "https://*.amplifyapp.com",  # Wildcard for Amplify domains
        "https://your-domain-name.com"  # Add your custom domain if you have one
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

# Initialize the LangChain OpenAI client
def get_llm():
    try:
        return ChatOpenAI(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o",
            streaming=True,
            temperature=0.7
        )
    except Exception as e:
        logger.error(f"Error initializing OpenAI client: {e}")
        raise HTTPException(status_code=500, detail="Error initializing AI service")

async def generate_response_stream(messages: List[Message]):
    """Generate streaming response from OpenAI via LangChain"""
    llm = get_llm()
    
    # Convert messages to LangChain format
    langchain_messages = []
    for msg in messages:
        if msg.role == "user":
            langchain_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            langchain_messages.append(AIMessage(content=msg.content))
    
    # Create generator for streaming
    async def event_generator():
        try:
            async for chunk in llm.astream(langchain_messages):
                if hasattr(chunk, 'content'):
                    # Send the chunk in SSE format
                    yield f"data: {chunk.content}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            yield f"data: Error generating response: {str(e)}\n\n"
            yield "data: [DONE]\n\n"
    
    return event_generator()

@app.post("/api/chat")
async def create_chat_completion(request: ChatRequest):
    """Endpoint for chat completion with streaming"""
    try:
        logger.info(f"Received chat request with {len(request.messages)} messages")
        stream = await generate_response_stream(request.messages)
        return StreamingResponse(
            stream,
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Error in chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    try:
        # Verify OpenAI API key is available
        if not OPENAI_API_KEY:
            return {"status": "warning", "message": "OpenAI API key not configured"}
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "message": str(e)}

# Lambda handler
handler = Mangum(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)