# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import asyncio

from mangum import Mangum

# LangChain 関連
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.callbacks.manager import AsyncCallbackManager

# カスタムコールバックハンドラ
from callback_handler import QueueCallbackHandler

# .env ファイルから環境変数を読み込み
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY が設定されていません。.env を確認してください。")

app = FastAPI()

# ローカルテスト用に全オリジン許可（本番では適宜制限してください）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# リクエストボディ用のスキーマ
class ChatRequest(BaseModel):
    message: str

# プロンプトテンプレートの設定
chat_prompt_template = PromptTemplate(
    input_variables=["user_message"],
    template="チャットボットとして、以下のメッセージに返答してください：{user_message}"
)

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    # 非同期キューの生成
    token_queue = asyncio.Queue()

    # カスタムコールバックハンドラを作成
    handler = QueueCallbackHandler(token_queue)
    callback_manager = AsyncCallbackManager([handler])

    # ChatOpenAI を streaming=True で初期化（async 対応）
    llm = ChatOpenAI(
        model_name="gpt-4o",
        openai_api_key=OPENAI_API_KEY,
        streaming=True,
        callback_manager=callback_manager
    )

    # ストリーミング用のチェーンを作成
    chain = LLMChain(llm=llm, prompt=chat_prompt_template)

    # 非同期タスクでチェーンを実行（生成中、トークンはコールバック経由でキューに追加される）
    asyncio.create_task(chain.arun(user_message=request.message))

    # キューからトークンを取り出してストリームとして返すジェネレータ関数
    async def token_generator():
        while True:
            token = await token_queue.get()
            if token is None:
                break
            yield token  # 必要に応じて、改行や区切り文字を追加可能

    # StreamingResponse として返却（media_type は適宜調整）
    return StreamingResponse(token_generator(), media_type="text/plain")

# AWS Lambda 用ハンドラ
handler = Mangum(app)