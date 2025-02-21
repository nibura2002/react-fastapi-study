import asyncio
from langchain.callbacks.base import AsyncCallbackHandler

class QueueCallbackHandler(AsyncCallbackHandler):
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue

    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        # 新しいトークンをキューに追加
        await self.queue.put(token)

    async def on_llm_end(self, response, **kwargs) -> None:
        # 終了シグナルとして None を追加
        await self.queue.put(None)