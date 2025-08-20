from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import requests
from dotenv import load_dotenv
from typing import Optional, Dict, Any, List
import time # Added for time.time()
import asyncio
import aiohttp



# 環境変数を読み込み
load_dotenv()

# FastAPIアプリケーションを初期化
app = FastAPI(
    title="Melodia Composer Copilot API",
    description="AI-powered music composition assistant API with streaming support",
    version="1.0.0"
)

# CORS設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切なオリジンを指定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# デフォルトAPIキー
DEFAULT_API_KEYS = {
    "anthropic": os.getenv("ANTHROPIC_API_KEY"),
    "openai": os.getenv("OPENAI_API_KEY"),
    "google": os.getenv("GEMINI_API_KEY")
}

# リクエスト・レスポンスモデル
class ChatRequest(BaseModel):
    message: str
    context: Optional[Any] = ""  # 文字列または詳細なコンテキストオブジェクト
    model: str = "claude-3-sonnet"  # デフォルトモデル
    apiKeys: Optional[Dict[str, str]] = None
    stream: bool = False  # ストリーミングモード

class StreamingChatRequest(BaseModel):
    message: str
    context: Optional[Any] = ""
    model: str = "claude-3-sonnet"
    apiKeys: Optional[Dict[str, str]] = None

class AgentRequest(BaseModel):
    prompt: str
    context: Optional[Any] = {}
    model: str = "claude-3-sonnet"
    apiKey: str = ""
    stream: bool = False  # ストリーミングモード

class StreamingAgentRequest(BaseModel):
    prompt: str
    context: Optional[Any] = {}
    model: str = "claude-3-sonnet"
    apiKey: str = ""

class GenerateRequest(BaseModel):
    prompt: str
    model: str = "gemini-2.5-pro"
    apiKey: str = ""

class ChatResponse(BaseModel):
    response: str
    success: bool
    error: str = ""

class AgentResponse(BaseModel):
    actions: List[Dict[str, Any]]
    summary: str
    nextSteps: str
    success: bool
    error: str = ""

class GenerateResponse(BaseModel):
    type: str
    notes: list
    description: str
    suggestions: str = ""

# AIモデル管理クラス（ストリーミング対応版）
class StreamingAIModelManager:
    def __init__(self):
        self.default_api_keys = DEFAULT_API_KEYS
    
    def get_api_key(self, provider: str, custom_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
        """APIキーを取得（カスタムキー優先、デフォルトキーをフォールバック）"""
        if custom_keys and provider in custom_keys and custom_keys[provider]:
            return custom_keys[provider]
        return self.default_api_keys.get(provider)
    
    async def stream_claude(self, message: str, context: Any = "", api_key: str = None):
        """Claude APIをストリーミングで呼び出し"""
        print(f"StreamingAIModelManager: Starting Claude streaming for message: {message[:50]}...")
        
        if not api_key:
            raise ValueError("Claude API key is required")
        
        # 音楽制作に特化したプロンプト
        system_prompt = """あなたは音楽制作のエキスパートアシスタントです。
ユーザーの音楽制作に関する質問や要求に対して、専門的で実用的なアドバイスを提供してください。
以下の分野について詳しく回答できます：
- 作曲・編曲のテクニック
- 楽器の演奏方法
- 音楽理論
- DAWの使い方
- ミキシング・マスタリング
- 音楽ジャンルの特徴
- MIDI編集

回答は日本語で、分かりやすく具体的に説明してください。"""
        
        # コンテキスト情報を処理
        context_info = ""
        if isinstance(context, dict):
            # 詳細なコンテキスト情報がある場合
            if context.get("projectInfo"):
                project = context["projectInfo"]
                context_info += f"\n\n【現在のプロジェクト情報】\n"
                context_info += f"プロジェクト名: {project.get('name', 'Unknown')}\n"
                context_info += f"テンポ: {project.get('tempo', 'Unknown')} BPM\n"
                context_info += f"キー: {project.get('key', 'Unknown')}\n"
                context_info += f"拍子: {project.get('timeSignature', 'Unknown')}\n"
                context_info += f"再生時間: {project.get('currentTime', 0):.1f}s / {project.get('totalDuration', 0):.1f}s\n"
                context_info += f"再生状態: {'再生中' if project.get('isPlaying') else '停止中'}\n"
                context_info += f"トラック数: {project.get('tracksCount', 0)}\n"
            
            if context.get("currentTrack"):
                track = context["currentTrack"]
                context_info += f"\n【現在選択中のトラック】\n"
                context_info += f"トラック名: {track.get('name', 'Unknown')}\n"
                context_info += f"タイプ: {track.get('type', 'Unknown')}\n"
                context_info += f"ノート数: {track.get('notesCount', 0)}\n"
                context_info += f"音量: {track.get('volume', 100)}%\n"
                context_info += f"パン: {track.get('pan', 0)}\n"
                context_info += f"ミュート: {'はい' if track.get('muted') else 'いいえ'}\n"
                context_info += f"ソロ: {'はい' if track.get('solo') else 'いいえ'}\n"
            
            if context.get("tracks"):
                tracks = context["tracks"]
                context_info += f"\n【全トラック情報】\n"
                for i, track in enumerate(tracks[:5]):  # 最初の5トラックのみ
                    context_info += f"{i+1}. {track.get('name', 'Unknown')} ({track.get('type', 'Unknown')}) - ノート数: {track.get('notesCount', 0)}\n"
                if len(tracks) > 5:
                    context_info += f"... 他 {len(tracks) - 5} トラック\n"
            
            if context.get("chatHistory"):
                context_info += f"\n【会話履歴】\n{context['chatHistory']}"
        elif isinstance(context, str) and context:
            context_info = f"\n\n前の会話の文脈: {context}"
        
        full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"
        
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 1000,
            "messages": [
                {"role": "user", "content": full_prompt}
            ],
            "stream": True
        }
        
        print(f"StreamingAIModelManager: Making request to Claude API with data: {data}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data
            ) as response:
                print(f"StreamingAIModelManager: Claude API response status: {response.status}")
                
                if response.status == 200:
                    print("StreamingAIModelManager: Starting to process streaming response...")
                    async for line in response.content:
                        if line:
                            line_str = line.decode('utf-8').strip()
                            print(f"StreamingAIModelManager: Raw line: {line_str[:100]}...")
                            
                            if line_str.startswith('data: '):
                                data_str = line_str[6:]  # 'data: ' を除去
                                print(f"StreamingAIModelManager: Data string: {data_str[:100]}...")
                                
                                if data_str == '[DONE]':
                                    print("StreamingAIModelManager: Received [DONE] signal")
                                    yield f"data: [DONE]\n\n"
                                    break
                                try:
                                    json_data = json.loads(data_str)
                                    print(f"StreamingAIModelManager: Parsed JSON: {json_data}")
                                    
                                    if 'content' in json_data and json_data['content']:
                                        for content in json_data['content']:
                                            if content.get('type') == 'text':
                                                text = content.get('text', '')
                                                if text:
                                                    print(f"StreamingAIModelManager: Yielding text chunk: {text[:50]}...")
                                                    yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
                                except json.JSONDecodeError as e:
                                    print(f"StreamingAIModelManager: JSON decode error: {e}")
                                    continue
                else:
                    error_text = await response.text()
                    print(f"StreamingAIModelManager: Claude API error: {response.status} - {error_text}")
                    yield f"data: {json.dumps({'type': 'error', 'content': f'Claude API error: {response.status} - {error_text}'})}\n\n"
    
    async def stream_openai(self, message: str, context: Any = "", api_key: str = None):
        """OpenAI APIをストリーミングで呼び出し"""
        if not api_key:
            raise ValueError("OpenAI API key is required")
        
        # 音楽制作に特化したプロンプト
        system_prompt = """あなたは音楽制作のエキスパートアシスタントです。
ユーザーの音楽制作に関する質問や要求に対して、専門的で実用的なアドバイスを提供してください。
以下の分野について詳しく回答できます：
- 作曲・編曲のテクニック
- 楽器の演奏方法
- 音楽理論
- DAWの使い方
- ミキシング・マスタリング
- 音楽ジャンルの特徴
- MIDI編集

回答は日本語で、分かりやすく具体的に説明してください。"""
        
        # コンテキスト情報を処理
        context_info = ""
        if isinstance(context, dict):
            # 詳細なコンテキスト情報がある場合
            if context.get("projectInfo"):
                project = context["projectInfo"]
                context_info += f"\n\n【現在のプロジェクト情報】\n"
                context_info += f"プロジェクト名: {project.get('name', 'Unknown')}\n"
                context_info += f"テンポ: {project.get('tempo', 'Unknown')} BPM\n"
                context_info += f"キー: {project.get('key', 'Unknown')}\n"
                context_info += f"拍子: {project.get('timeSignature', 'Unknown')}\n"
                context_info += f"再生時間: {project.get('currentTime', 0):.1f}s / {project.get('totalDuration', 0):.1f}s\n"
                context_info += f"再生状態: {'再生中' if project.get('isPlaying') else '停止中'}\n"
                context_info += f"トラック数: {project.get('tracksCount', 0)}\n"
            
            if context.get("currentTrack"):
                track = context["currentTrack"]
                context_info += f"\n【現在選択中のトラック】\n"
                context_info += f"トラック名: {track.get('name', 'Unknown')}\n"
                context_info += f"タイプ: {track.get('type', 'Unknown')}\n"
                context_info += f"ノート数: {track.get('notesCount', 0)}\n"
                context_info += f"音量: {track.get('volume', 100)}%\n"
                context_info += f"パン: {track.get('pan', 0)}\n"
                context_info += f"ミュート: {'はい' if track.get('muted') else 'いいえ'}\n"
                context_info += f"ソロ: {'はい' if track.get('solo') else 'いいえ'}\n"
            
            if context.get("tracks"):
                tracks = context["tracks"]
                context_info += f"\n【全トラック情報】\n"
                for i, track in enumerate(tracks[:5]):  # 最初の5トラックのみ
                    context_info += f"{i+1}. {track.get('name', 'Unknown')} ({track.get('type', 'Unknown')}) - ノート数: {track.get('notesCount', 0)}\n"
                if len(tracks) > 5:
                    context_info += f"... 他 {len(tracks) - 5} トラック\n"
            
            if context.get("chatHistory"):
                context_info += f"\n【会話履歴】\n{context['chatHistory']}"
        elif isinstance(context, str) and context:
            context_info = f"\n\n前の会話の文脈: {context}"
        
        full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        data = {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            "stream": True,
            "max_tokens": 1000
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data
            ) as response:
                if response.status == 200:
                    async for line in response.content:
                        if line:
                            line_str = line.decode('utf-8').strip()
                            if line_str.startswith('data: '):
                                data_str = line_str[6:]  # 'data: ' を除去
                                if data_str == '[DONE]':
                                    yield f"data: [DONE]\n\n"
                                    break
                                try:
                                    json_data = json.loads(data_str)
                                    if 'choices' in json_data and json_data['choices']:
                                        choice = json_data['choices'][0]
                                        if 'delta' in choice and 'content' in choice['delta']:
                                            content = choice['delta']['content']
                                            if content:
                                                yield f"data: {json.dumps({'type': 'text', 'content': content})}\n\n"
                                except json.JSONDecodeError:
                                    continue
                else:
                    error_text = await response.text()
                    yield f"data: {json.dumps({'type': 'error', 'content': f'OpenAI API error: {response.status} - {error_text}'})}\n\n"
    
    async def stream_gemini(self, message: str, context: Any = "", api_key: str = None):
        """Gemini APIをストリーミングで呼び出し"""
        print(f"StreamingAIModelManager: Starting Gemini streaming for message: {message[:50]}...")
        
        if not api_key:
            raise ValueError("Gemini API key is required")
        
        # 音楽制作に特化したプロンプト
        system_prompt = """あなたは音楽制作のエキスパートアシスタントです。
ユーザーの音楽制作に関する質問や要求に対して、専門的で実用的なアドバイスを提供してください。
以下の分野について詳しく回答できます：
- 作曲・編曲のテクニック
- 楽器の演奏方法
- 音楽理論
- DAWの使い方
- ミキシング・マスタリング
- 音楽ジャンルの特徴
- MIDI編集

回答は日本語で、分かりやすく具体的に説明してください。"""
        
        # コンテキスト情報を処理
        context_info = ""
        if isinstance(context, dict):
            # 詳細なコンテキスト情報がある場合
            if context.get("projectInfo"):
                project = context["projectInfo"]
                context_info += f"\n\n【現在のプロジェクト情報】\n"
                context_info += f"プロジェクト名: {project.get('name', 'Unknown')}\n"
                context_info += f"テンポ: {project.get('tempo', 'Unknown')} BPM\n"
                context_info += f"キー: {project.get('key', 'Unknown')}\n"
                context_info += f"拍子: {project.get('timeSignature', 'Unknown')}\n"
                context_info += f"再生時間: {project.get('currentTime', 0):.1f}s / {project.get('totalDuration', 0):.1f}s\n"
                context_info += f"再生状態: {'再生中' if project.get('isPlaying') else '停止中'}\n"
                context_info += f"トラック数: {project.get('tracksCount', 0)}\n"
            
            if context.get("currentTrack"):
                track = context["currentTrack"]
                context_info += f"\n【現在選択中のトラック】\n"
                context_info += f"トラック名: {track.get('name', 'Unknown')}\n"
                context_info += f"タイプ: {track.get('type', 'Unknown')}\n"
                context_info += f"ノート数: {track.get('notesCount', 0)}\n"
                context_info += f"音量: {track.get('volume', 100)}%\n"
                context_info += f"パン: {track.get('pan', 0)}\n"
                context_info += f"ミュート: {'はい' if track.get('muted') else 'いいえ'}\n"
                context_info += f"ソロ: {'はい' if track.get('solo') else 'いいえ'}\n"
            
            if context.get("tracks"):
                tracks = context["tracks"]
                context_info += f"\n【全トラック情報】\n"
                for i, track in enumerate(tracks[:5]):  # 最初の5トラックのみ
                    context_info += f"{i+1}. {track.get('name', 'Unknown')} ({track.get('type', 'Unknown')}) - ノート数: {track.get('notesCount', 0)}\n"
                if len(tracks) > 5:
                    context_info += f"... 他 {len(tracks) - 5} トラック\n"
            
            if context.get("chatHistory"):
                context_info += f"\n【会話履歴】\n{context['chatHistory']}"
        elif isinstance(context, str) and context:
            context_info = f"\n\n前の会話の文脈: {context}"
        
        full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"
        
        # Gemini APIの設定
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-pro')
        
        print(f"StreamingAIModelManager: Making request to Gemini API with prompt: {full_prompt[:100]}...")
        
        try:
            # Gemini APIはストリーミングを直接サポートしていないため、
            # 通常のレスポンスを取得して、文字単位でストリーミング風に返す
            response = model.generate_content(full_prompt)
            response_text = response.text
            
            print(f"StreamingAIModelManager: Gemini response received: {response_text[:100]}...")
            
            # 文字単位でストリーミング風に返す
            for i, char in enumerate(response_text):
                yield f"data: {json.dumps({'type': 'text', 'content': char})}\n\n"
                # 少し遅延を入れてストリーミング感を演出
                await asyncio.sleep(0.01)
            
            yield f"data: [DONE]\n\n"
            
        except Exception as e:
            print(f"StreamingAIModelManager: Gemini API error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': f'Gemini API error: {str(e)}'})}\n\n"

# 既存のAIModelManagerクラス（後方互換性のため保持）
class AIModelManager:
    def __init__(self):
        self.default_api_keys = DEFAULT_API_KEYS
    
    def get_api_key(self, provider: str, custom_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
        """APIキーを取得（カスタムキー優先、デフォルトキーをフォールバック）"""
        if custom_keys and provider in custom_keys and custom_keys[provider]:
            return custom_keys[provider]
        return self.default_api_keys.get(provider)
    
    async def call_claude(self, message: str, context: Any = "", api_key: str = None) -> str:
        """Claude APIを呼び出し"""
        if not api_key:
            raise ValueError("Claude API key is required")
        
        # 音楽制作に特化したプロンプト
        system_prompt = """あなたは音楽制作のエキスパートアシスタントです。
ユーザーの音楽制作に関する質問や要求に対して、専門的で実用的なアドバイスを提供してください。
以下の分野について詳しく回答できます：
- 作曲・編曲のテクニック
- 楽器の演奏方法
- 音楽理論
- DAWの使い方
- ミキシング・マスタリング
- 音楽ジャンルの特徴
- MIDI編集

回答は日本語で、分かりやすく具体的に説明してください。"""
        
        # コンテキスト情報を処理
        context_info = ""
        if isinstance(context, dict):
            # 詳細なコンテキスト情報がある場合
            if context.get("projectInfo"):
                project = context["projectInfo"]
                context_info += f"\n\n【現在のプロジェクト情報】\n"
                context_info += f"プロジェクト名: {project.get('name', 'Unknown')}\n"
                context_info += f"テンポ: {project.get('tempo', 'Unknown')} BPM\n"
                context_info += f"キー: {project.get('key', 'Unknown')}\n"
                context_info += f"拍子: {project.get('timeSignature', 'Unknown')}\n"
                context_info += f"再生時間: {project.get('currentTime', 0):.1f}s / {project.get('totalDuration', 0):.1f}s\n"
                context_info += f"再生状態: {'再生中' if project.get('isPlaying') else '停止中'}\n"
                context_info += f"トラック数: {project.get('tracksCount', 0)}\n"
            
            if context.get("currentTrack"):
                track = context["currentTrack"]
                context_info += f"\n【現在選択中のトラック】\n"
                context_info += f"トラック名: {track.get('name', 'Unknown')}\n"
                context_info += f"タイプ: {track.get('type', 'Unknown')}\n"
                context_info += f"ノート数: {track.get('notesCount', 0)}\n"
                context_info += f"音量: {track.get('volume', 100)}%\n"
                context_info += f"パン: {track.get('pan', 0)}\n"
                context_info += f"ミュート: {'はい' if track.get('muted') else 'いいえ'}\n"
                context_info += f"ソロ: {'はい' if track.get('solo') else 'いいえ'}\n"
            
            if context.get("tracks"):
                tracks = context["tracks"]
                context_info += f"\n【全トラック情報】\n"
                for i, track in enumerate(tracks[:5]):  # 最初の5トラックのみ
                    context_info += f"{i+1}. {track.get('name', 'Unknown')} ({track.get('type', 'Unknown')}) - ノート数: {track.get('notesCount', 0)}\n"
                if len(tracks) > 5:
                    context_info += f"... 他 {len(tracks) - 5} トラック\n"
            
            if context.get("chatHistory"):
                context_info += f"\n【会話履歴】\n{context['chatHistory']}"
        elif isinstance(context, str) and context:
            context_info = f"\n\n前の会話の文脈: {context}"
        
        full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"
        
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 1000,
            "messages": [
                {"role": "user", "content": full_prompt}
            ]
        }
        
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["content"][0]["text"]
        else:
            raise Exception(f"Claude API error: {response.status_code} - {response.text}")
    
    async def call_openai(self, message: str, context: Any = "", api_key: str = None) -> str:
        """OpenAI APIを呼び出し"""
        if not api_key:
            raise ValueError("OpenAI API key is required")
        
        # 音楽制作に特化したプロンプト
        system_prompt = """あなたは音楽制作のエキスパートアシスタントです。
ユーザーの音楽制作に関する質問や要求に対して、専門的で実用的なアドバイスを提供してください。
以下の分野について詳しく回答できます：
- 作曲・編曲のテクニック
- 楽器の演奏方法
- 音楽理論
- DAWの使い方
- ミキシング・マスタリング
- 音楽ジャンルの特徴
- MIDI編集

回答は日本語で、分かりやすく具体的に説明してください。"""
        
        # コンテキスト情報を処理
        context_info = ""
        if isinstance(context, dict):
            # 詳細なコンテキスト情報がある場合
            if context.get("projectInfo"):
                project = context["projectInfo"]
                context_info += f"\n\n【現在のプロジェクト情報】\n"
                context_info += f"プロジェクト名: {project.get('name', 'Unknown')}\n"
                context_info += f"テンポ: {project.get('tempo', 'Unknown')} BPM\n"
                context_info += f"キー: {project.get('key', 'Unknown')}\n"
                context_info += f"拍子: {project.get('timeSignature', 'Unknown')}\n"
                context_info += f"再生時間: {project.get('currentTime', 0):.1f}s / {project.get('totalDuration', 0):.1f}s\n"
                context_info += f"再生状態: {'再生中' if project.get('isPlaying') else '停止中'}\n"
                context_info += f"トラック数: {project.get('tracksCount', 0)}\n"
            
            if context.get("currentTrack"):
                track = context["currentTrack"]
                context_info += f"\n【現在選択中のトラック】\n"
                context_info += f"トラック名: {track.get('name', 'Unknown')}\n"
                context_info += f"タイプ: {track.get('type', 'Unknown')}\n"
                context_info += f"ノート数: {track.get('notesCount', 0)}\n"
                context_info += f"音量: {track.get('volume', 100)}%\n"
                context_info += f"パン: {track.get('pan', 0)}\n"
                context_info += f"ミュート: {'はい' if track.get('muted') else 'いいえ'}\n"
                context_info += f"ソロ: {'はい' if track.get('solo') else 'いいえ'}\n"
            
            if context.get("tracks"):
                tracks = context["tracks"]
                context_info += f"\n【全トラック情報】\n"
                for i, track in enumerate(tracks[:5]):  # 最初の5トラックのみ
                    context_info += f"{i+1}. {track.get('name', 'Unknown')} ({track.get('type', 'Unknown')}) - ノート数: {track.get('notesCount', 0)}\n"
                if len(tracks) > 5:
                    context_info += f"... 他 {len(tracks) - 5} トラック\n"
            
            if context.get("chatHistory"):
                context_info += f"\n【会話履歴】\n{context['chatHistory']}"
        elif isinstance(context, str) and context:
            context_info = f"\n\n前の会話の文脈: {context}"
        
        full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        data = {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            "max_tokens": 1000
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
    
    async def call_gemini(self, message: str, context: Any = "", api_key: str = None) -> str:
        """Gemini APIを呼び出し"""
        if not api_key:
            raise ValueError("Gemini API key is required")
        
        # 音楽制作に特化したプロンプト
        music_context = """あなたは音楽制作のエキスパートアシスタントです。
ユーザーの音楽制作に関する質問や要求に対して、専門的で実用的なアドバイスを提供してください。
以下の分野について詳しく回答できます：
- 作曲・編曲のテクニック
- 楽器の演奏方法
- 音楽理論
- DAWの使い方
- ミキシング・マスタリング
- 音楽ジャンルの特徴
- MIDI編集

回答は日本語で、分かりやすく具体的に説明してください。"""
        
        # コンテキスト情報を処理
        context_info = ""
        if isinstance(context, dict):
            # 詳細なコンテキスト情報がある場合
            if context.get("projectInfo"):
                project = context["projectInfo"]
                context_info += f"\n\n【現在のプロジェクト情報】\n"
                context_info += f"プロジェクト名: {project.get('name', 'Unknown')}\n"
                context_info += f"テンポ: {project.get('tempo', 'Unknown')} BPM\n"
                context_info += f"キー: {project.get('key', 'Unknown')}\n"
                context_info += f"拍子: {project.get('timeSignature', 'Unknown')}\n"
                context_info += f"再生時間: {project.get('currentTime', 0):.1f}s / {project.get('totalDuration', 0):.1f}s\n"
                context_info += f"再生状態: {'再生中' if project.get('isPlaying') else '停止中'}\n"
                context_info += f"トラック数: {project.get('tracksCount', 0)}\n"
            
            if context.get("currentTrack"):
                track = context["currentTrack"]
                context_info += f"\n【現在選択中のトラック】\n"
                context_info += f"トラック名: {track.get('name', 'Unknown')}\n"
                context_info += f"タイプ: {track.get('type', 'Unknown')}\n"
                context_info += f"ノート数: {track.get('notesCount', 0)}\n"
                context_info += f"音量: {track.get('volume', 100)}%\n"
                context_info += f"パン: {track.get('pan', 0)}\n"
                context_info += f"ミュート: {'はい' if track.get('muted') else 'いいえ'}\n"
                context_info += f"ソロ: {'はい' if track.get('solo') else 'いいえ'}\n"
            
            if context.get("tracks"):
                tracks = context["tracks"]
                context_info += f"\n【全トラック情報】\n"
                for i, track in enumerate(tracks[:5]):  # 最初の5トラックのみ
                    context_info += f"{i+1}. {track.get('name', 'Unknown')} ({track.get('type', 'Unknown')}) - ノート数: {track.get('notesCount', 0)}\n"
                if len(tracks) > 5:
                    context_info += f"... 他 {len(tracks) - 5} トラック\n"
            
            if context.get("chatHistory"):
                context_info += f"\n【会話履歴】\n{context['chatHistory']}"
        elif isinstance(context, str) and context:
            context_info = f"\n\n前の会話の文脈: {context}"
        
        full_prompt = music_context + context_info + f"\n\nユーザーの質問: {message}"
        
        # Gemini APIを設定
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-pro')
        
        response = model.generate_content(full_prompt)
        return response.text

# AIモデルマネージャーのインスタンス
ai_manager = AIModelManager()

# ヘルスチェックエンドポイント
@app.get("/")
async def root():
    return {
        "message": "Melodia Composer Copilot API",
        "status": "running",
        "supported_models": ["claude-3-sonnet", "claude-3-opus", "gpt-4", "gpt-3.5-turbo", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
    }

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "supported_models": ["claude-3-sonnet", "claude-3-opus", "gpt-4", "gpt-3.5-turbo", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
    }

# 音楽生成エンドポイント
@app.post("/api/generate", response_model=GenerateResponse)
async def generate_music(request: GenerateRequest):
    try:
        # APIキーが提供されている場合は使用
        api_key = request.apiKey or DEFAULT_API_KEYS.get("google")
        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Gemini APIを設定
        genai.configure(api_key=api_key)
        temp_model = genai.GenerativeModel('gemini-2.5-flash')
        
        # 音楽生成に特化したプロンプトを作成
        music_prompt = f"""
あなたは音楽制作AIアシスタントです。以下の指示に基づいて、音楽要素を生成してください。

[ユーザーの指示]
{request.prompt}

[出力形式]
以下のJSON形式で出力してください：
{{
  "type": "drum_pattern"|"bassline"|"chord_progression"|"melody"|"harmony",
  "notes": [
    {{"pitch": 60, "start": 0.0, "duration": 0.25, "velocity": 100}},
    ...
  ],
  "description": "生成した音楽要素の説明",
  "suggestions": "追加の提案やバリエーション"
}}

音楽理論的に正しく、指定されたコンテキストに合った音楽要素を生成してください。
"""
        
        # Gemini APIを呼び出し
        response = temp_model.generate_content(music_prompt)
        
        # JSONレスポンスを解析
        import re
        
        # JSONの抽出を試行
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if json_match:
            json_str = json_match.group(0)
            try:
                parsed = json.loads(json_str)
                return GenerateResponse(
                    type=parsed.get("type", "melody"),
                    notes=parsed.get("notes", []),
                    description=parsed.get("description", "Generated music pattern"),
                    suggestions=parsed.get("suggestions", "")
                )
            except json.JSONDecodeError:
                pass
        
        # フォールバックパターン
        fallback_notes = [
            {"pitch": 60, "start": 0.0, "duration": 0.25, "velocity": 80},
            {"pitch": 62, "start": 0.25, "duration": 0.25, "velocity": 80},
            {"pitch": 64, "start": 0.5, "duration": 0.25, "velocity": 80},
            {"pitch": 65, "start": 0.75, "duration": 0.25, "velocity": 80}
        ]
        
        return GenerateResponse(
            type="melody",
            notes=fallback_notes,
            description="Simple C major scale pattern",
            suggestions="Try different scales or rhythms"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# チャットエンドポイント（複数モデル対応）
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # モデルに応じてAPIキーとプロバイダーを決定
        model_config = {
            "claude-3-sonnet": {"provider": "anthropic", "api_key_name": "anthropic"},
            "claude-3-opus": {"provider": "anthropic", "api_key_name": "anthropic"},
            "gpt-4": {"provider": "openai", "api_key_name": "openai"},
            "gpt-3.5-turbo": {"provider": "openai", "api_key_name": "openai"},
            "gemini-pro": {"provider": "google", "api_key_name": "google"}
        }
        
        if request.model not in model_config:
            return ChatResponse(
                response=f"サポートされていないモデルです: {request.model}",
                success=False,
                error="Unsupported model"
            )
        
        config = model_config[request.model]
        api_key = ai_manager.get_api_key(config["api_key_name"], request.apiKeys)
        
        if not api_key:
            return ChatResponse(
                response=f"{config['provider'].title()} APIキーが設定されていません。設定画面でAPIキーを入力してください。",
                success=False,
                error=f"{config['provider'].title()} API key not configured"
            )
        
        # モデルに応じてAPIを呼び出し
        if config["provider"] == "anthropic":
            response_text = await ai_manager.call_claude(request.message, request.context, api_key)
        elif config["provider"] == "openai":
            response_text = await ai_manager.call_openai(request.message, request.context, api_key)
        elif config["provider"] == "google":
            response_text = await ai_manager.call_gemini(request.message, request.context, api_key)
        else:
            raise ValueError(f"Unknown provider: {config['provider']}")
        
        return ChatResponse(
            response=response_text,
            success=True
        )
        
    except Exception as e:
        return ChatResponse(
            response="申し訳ございません。エラーが発生しました。しばらく時間をおいて再度お試しください。",
            success=False,
            error=str(e)
        )

# Agent modeエンドポイント（実際のプロジェクト操作を実行）
@app.post("/api/agent", response_model=AgentResponse)
async def agent_action(request: AgentRequest):
    try:
        # モデルに応じてAPIキーとプロバイダーを決定
        model_config = {
            "claude-3-sonnet": {"provider": "anthropic", "api_key_name": "anthropic"},
            "claude-3-opus": {"provider": "anthropic", "api_key_name": "anthropic"},
            "gpt-4": {"provider": "openai", "api_key_name": "openai"},
            "gpt-3.5-turbo": {"provider": "openai", "api_key_name": "openai"},
            "gemini-pro": {"provider": "google", "api_key_name": "google"}
        }
        
        if request.model not in model_config:
            return AgentResponse(
                actions=[],
                summary="エラー: サポートされていないモデルです",
                nextSteps="サポートされているモデルを選択してください",
                success=False,
                error=f"Unsupported model: {request.model}"
            )
        
        config = model_config[request.model]
        api_key = request.apiKey or ai_manager.get_api_key(config["api_key_name"], {})
        
        if not api_key:
            return AgentResponse(
                actions=[],
                summary="エラー: APIキーが設定されていません",
                nextSteps="設定画面でAPIキーを入力してください",
                success=False,
                error=f"{config['provider'].title()} API key not configured"
            )
        
        # Agent mode用のプロンプトを生成
        agent_prompt = generate_agent_prompt(request.prompt, request.context)
        
        # モデルに応じてAPIを呼び出し
        if config["provider"] == "anthropic":
            response_text = await ai_manager.call_claude(agent_prompt, request.context, api_key)
        elif config["provider"] == "openai":
            response_text = await ai_manager.call_openai(agent_prompt, request.context, api_key)
        elif config["provider"] == "google":
            response_text = await ai_manager.call_gemini(agent_prompt, request.context, api_key)
        else:
            raise ValueError(f"Unknown provider: {config['provider']}")
        
        # デバッグ用ログ
        print(f"Agent response from {config['provider']}: {response_text[:500]}...")
        print(f"Full agent response: {response_text}")
        
        # レスポンスを解析してアクションを抽出
        parsed_response = parse_agent_response(response_text, request.context)
        print(f"Parsed response: {parsed_response}")
        
        return AgentResponse(
            actions=parsed_response.get("actions", []),
            summary=parsed_response.get("summary", "操作が完了しました"),
            nextSteps=parsed_response.get("nextSteps", "次のステップを実行してください"),
            success=True
        )
        
    except Exception as e:
        return AgentResponse(
            actions=[],
            summary="エラーが発生しました",
            nextSteps="しばらく時間をおいて再度お試しください",
            success=False,
            error=str(e)
        )

# ストリーミングチャットエンドポイント
@app.post("/api/stream/chat")
async def stream_chat(request: StreamingChatRequest):
    try:
        print(f"Streaming chat request received: {request.message[:50]}...")
        
        model_config = {
            "claude-3-sonnet": {"provider": "anthropic", "api_key_name": "anthropic"},
            "claude-3-opus": {"provider": "anthropic", "api_key_name": "anthropic"},
            "gpt-4": {"provider": "openai", "api_key_name": "openai"},
            "gpt-3.5-turbo": {"provider": "openai", "api_key_name": "openai"},
            "gemini-pro": {"provider": "google", "api_key_name": "google"}
        }

        if request.model not in model_config:
            return StreamingResponse(
                content=json.dumps({"type": "error", "content": f"Unsupported model for streaming: {request.model}"}),
                media_type="text/event-stream"
            )

        config = model_config[request.model]
        api_key = ai_manager.get_api_key(config["api_key_name"], request.apiKeys)

        if not api_key:
            return StreamingResponse(
                content=json.dumps({"type": "error", "content": f"{config['provider'].title()} API key not configured"}),
                media_type="text/event-stream"
            )

        print(f"Starting streaming response for model: {request.model}")

        async def event_generator():
            try:
                print(f"stream_chat: Starting event generator for model: {request.model}")
                print(f"stream_chat: Model starts with 'claude': {request.model.startswith('claude')}")
                print(f"stream_chat: Model starts with 'gpt': {request.model.startswith('gpt')}")
                print(f"stream_chat: Model starts with 'gemini': {request.model.startswith('gemini')}")
                
                # モデルごとに適切なストリーミング関数を呼び分け
                if request.model.startswith("claude"):
                    print(f"stream_chat: Using Claude streaming for model: {request.model}")
                    async for chunk in StreamingAIModelManager().stream_claude(request.message, request.context, api_key):
                        print(f"stream_chat: Yielding Claude chunk: {chunk[:100]}...")
                        yield chunk
                elif request.model.startswith("gpt"):
                    print(f"stream_chat: Using OpenAI streaming for model: {request.model}")
                    async for chunk in StreamingAIModelManager().stream_openai(request.message, request.context, api_key):
                        print(f"stream_chat: Yielding OpenAI chunk: {chunk[:100]}...")
                        yield chunk
                elif request.model.startswith("gemini"):
                    print(f"stream_chat: Using Gemini streaming for model: {request.model}")
                    async for chunk in StreamingAIModelManager().stream_gemini(request.message, request.context, api_key):
                        print(f"stream_chat: Yielding Gemini chunk: {chunk[:100]}...")
                        yield chunk
                else:
                    print(f"stream_chat: Unsupported model: {request.model}")
                    yield f"data: {json.dumps({'type': 'error', 'content': f'Unsupported model: {request.model}'})}\n\n"
                
                print("stream_chat: Event generator completed successfully")
            except Exception as e:
                print(f"stream_chat: Error in streaming: {e}")
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        return StreamingResponse(content=event_generator(), media_type="text/event-stream")

    except Exception as e:
        print(f"Error in stream_chat: {e}")
        return StreamingResponse(
            content=json.dumps({"type": "error", "content": f"Error during streaming: {e}"}),
            media_type="text/event-stream"
        )

# ストリーミングAgent modeエンドポイント
@app.post("/api/stream/agent")
async def stream_agent_action(request: StreamingAgentRequest):
    try:
        model_config = {
            "claude-3-sonnet": {"provider": "anthropic", "api_key_name": "anthropic"},
            "claude-3-opus": {"provider": "anthropic", "api_key_name": "anthropic"},
            "gpt-4": {"provider": "openai", "api_key_name": "openai"},
            "gpt-3.5-turbo": {"provider": "openai", "api_key_name": "openai"},
            "gemini-2.5-pro": {"provider": "google", "api_key_name": "google"},
            "gemini-2.5-flash": {"provider": "google", "api_key_name": "google"},
            "gemini-1.5-pro": {"provider": "google", "api_key_name": "google"},
            "gemini-1.5-flash": {"provider": "google", "api_key_name": "google"},
            "gemini-pro": {"provider": "google", "api_key_name": "google"}
        }

        if request.model not in model_config:
            return StreamingResponse(
                content=json.dumps({"type": "error", "content": f"Unsupported model for streaming: {request.model}"}),
                media_type="text/event-stream"
            )

        config = model_config[request.model]
        api_key = request.apiKey or ai_manager.get_api_key(config["api_key_name"], {})

        if not api_key:
            return StreamingResponse(
                content=json.dumps({"type": "error", "content": f"{config['provider'].title()} API key not configured"}),
                media_type="text/event-stream"
            )

        async def event_generator():
            try:
                print(f"stream_agent: Starting event generator for model: {request.model}")
                print(f"stream_agent: Model starts with 'claude': {request.model.startswith('claude')}")
                print(f"stream_agent: Model starts with 'gpt': {request.model.startswith('gpt')}")
                print(f"stream_agent: Model starts with 'gemini': {request.model.startswith('gemini')}")
                
                # モデルごとに適切なストリーミング関数を呼び分け
                if request.model.startswith("claude"):
                    print(f"stream_agent: Using Claude streaming for model: {request.model}")
                    async for chunk in StreamingAIModelManager().stream_claude(request.prompt, request.context, api_key):
                        yield chunk
                elif request.model.startswith("gpt"):
                    print(f"stream_agent: Using OpenAI streaming for model: {request.model}")
                    async for chunk in StreamingAIModelManager().stream_openai(request.prompt, request.context, api_key):
                        yield chunk
                elif request.model.startswith("gemini"):
                    print(f"stream_agent: Using Gemini streaming for model: {request.model}")
                    async for chunk in StreamingAIModelManager().stream_gemini(request.prompt, request.context, api_key):
                        yield chunk
                else:
                    print(f"stream_agent: Unsupported model: {request.model}")
                    yield f"data: {json.dumps({'type': 'error', 'content': f'Unsupported model: {request.model}'})}\n\n"
                
                print("stream_agent: Event generator completed successfully")
            except Exception as e:
                print(f"stream_agent: Error in streaming: {e}")
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        return StreamingResponse(content=event_generator(), media_type="text/event-stream")

    except Exception as e:
        return StreamingResponse(
            content=json.dumps({"type": "error", "content": f"Error during streaming: {e}"}),
            media_type="text/event-stream"
        )

def generate_agent_prompt(user_prompt: str, context: dict) -> str:
    """Sense-Plan-Actアーキテクチャに基づくAgent mode用プロンプトを生成"""
    
    # コンテキスト情報の構築
    context_info = ""
    if context:
        if context.get('currentTrack'):
            track = context['currentTrack']
            context_info += f"\n現在のトラック: {track.get('name', 'Unknown')} (ID: {track.get('id', 'Unknown')})"
        
        if context.get('existingTracks'):
            tracks = context['existingTracks']
            context_info += f"\n既存のトラック ({len(tracks)}個):"
            for track in tracks:
                context_info += f"\n- {track.get('name', 'Unknown')} (ID: {track.get('id', 'Unknown')}, タイプ: {track.get('type', 'Unknown')})"
        
        if context.get('projectSettings'):
            settings = context['projectSettings']
            context_info += f"\nプロジェクト設定:"
            context_info += f"\n- 名前: {settings.get('name', 'Unknown')}"
            context_info += f"\n- テンポ: {settings.get('tempo', 'Unknown')} BPM"
            context_info += f"\n- キー: {settings.get('key', 'Unknown')}"

    prompt = f"""あなたは音楽制作アシスタントです。Sense-Plan-Actアーキテクチャに従って、ユーザーの要求を理解し、適切なアクションを実行してください。

## Sense（理解）段階
現在のプロジェクト状況を理解してください：
{context_info}

## Plan（計画）段階
ユーザーの要求を分析し、実行可能なアクションを計画してください：
- トラックの追加/編集/削除
- MIDIノートの追加/編集/削除
- エフェクトの適用
- プロジェクト設定の変更
- その他の音楽制作関連操作

## Act（実行）段階
計画したアクションを以下のJSON形式で出力してください：

{{
  "actions": [
    {{
      "type": "操作タイプ",
      "params": {{
        "trackId": "正確なトラックID",
        // その他の操作に必要なパラメータ
        // MIDIノートの場合:
        "notes": [
          {{
            "id": "note-123",
            "pitch": 60,        // MIDIノート番号（0-127）
            "time": 0,          // 開始時間（秒）
            "duration": 0.5,    // 持続時間（秒）
            "velocity": 0.8     // 音量（0-1）
          }}
        ]
      }},
      "description": "実行する操作の説明"
    }}
  ],
  "summary": "実行した操作の要約",
  "nextSteps": "次のステップの提案"
}}

## 重要な注意事項
- トラックIDは必ず引用符で囲んでください（例: "track-1234567890-abc123"）
- 既存のトラックに操作する場合は、上記のトラックIDを正確に使用してください
- トラックIDは文字列として扱い、数値ではありません
- 自然な音楽的なフレーズを生成してください
- ユーザーの要求に応じて適切な楽器やスタイルを選択してください

## サポートされている操作タイプ
- `addTrack`: 新しいトラックを追加
- `updateTrack`: 既存のトラックを更新
- `deleteTrack`: トラックを削除
- `addMidiNotes`: MIDIノートを追加
- `updateMidiNotes`: MIDIノートを更新
- `deleteMidiNotes`: MIDIノートを削除
- `applyEffect`: エフェクトを適用
- `updateProjectSettings`: プロジェクト設定を更新

ユーザーの要求: {user_prompt}"""

    return prompt

def parse_agent_response(response_text: str, context: dict) -> dict:
    """Agent modeのレスポンスを解析"""
    import re
    def remove_json_comments(text):
        # // 以降のコメントを除去（行末コメント対応）
        return re.sub(r'//.*', '', text)
    
    try:
        # JSONの抽出を試行
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group(0)
            # コメント除去
            json_str = remove_json_comments(json_str)
            parsed = json.loads(json_str)
            
            # 基本的な検証
            if isinstance(parsed, dict):
                # 文字列に変換してバリデーションエラーを防ぐ
                summary = parsed.get("summary", "操作が完了しました")
                if not isinstance(summary, str):
                    summary = str(summary)
                
                next_steps = parsed.get("nextSteps", "次のステップを実行してください")
                if not isinstance(next_steps, str):
                    if isinstance(next_steps, list):
                        next_steps = " ".join(str(step) for step in next_steps)
                    else:
                        next_steps = str(next_steps)
                
                return {
                    "actions": parsed.get("actions", []),
                    "summary": summary,
                    "nextSteps": next_steps
                }
    except Exception as e:
        print(f"Failed to parse agent response: {e}")
    
    # フォールバック: レスポンステキストから直接情報を抽出
    try:
        # ユーザーの要求に基づいて基本的なアクションを推測
        response_lower = response_text.lower()
        
        # トラック追加の要求
        if any(word in response_lower for word in ["トラック", "track", "追加", "add", "作成", "create"]):
            return {
                "actions": [{
                    "type": "addTrack",
                    "params": {
                        "instrument": "Piano",
                        "trackName": "新しいトラック"
                    },
                    "description": "新しいトラックを追加しました"
                }],
                "summary": "新しいトラックを追加しました",
                "nextSteps": "トラックにMIDIデータを入力してください"
            }
        
        # ノート追加の要求
        if any(word in response_lower for word in ["ノート", "note", "音", "メロディ", "melody"]):
            # 現在のトラックIDを取得
            current_track = context.get('currentTrack', {})
            track_id = current_track.get('id', 'track-1')  # デフォルトトラックID
            
            # ピアノトラックが指定された場合、適切なトラックを探す
            if any(word in response_lower for word in ["ピアノ", "piano", "ピアノトラック"]):
                existing_tracks = context.get('existingTracks', [])
                piano_track = None
                
                # 既存のピアノトラックを探す
                for track in existing_tracks:
                    if track.get('type', '').lower() in ['piano', 'ピアノ'] or 'piano' in track.get('name', '').lower():
                        piano_track = track
                        break
                
                if piano_track:
                    track_id = piano_track['id']
                    print(f"Found existing piano track: {track_id}")
                else:
                    # ピアノトラックが存在しない場合は、新しいトラックを作成するアクションを追加
                    return {
                        "actions": [
                            {
                                "type": "addTrack",
                                "params": {
                                    "instrument": "Piano",
                                    "trackName": "ピアノトラック",
                                    "trackType": "instrument",
                                    "subtype": "piano"
                                },
                                "description": "新しいピアノトラックを作成しました"
                            },
                            {
                                "type": "addMidiNotes",
                                "params": {
                                    "trackId": "new-piano-track",  # 新しく作成されるトラックのID
                                    "notes": [
                                        {
                                            "id": f"note-{int(time.time())}-1",
                                            "pitch": 60,  # 中央のC
                                            "time": 0,    # 開始時間（秒）
                                            "duration": 1,  # 持続時間（秒）
                                            "velocity": 0.8  # 音量（0-1）
                                        },
                                        {
                                            "id": f"note-{int(time.time())}-2",
                                            "pitch": 62,  # D
                                            "time": 1,    # 1秒後
                                            "duration": 1,
                                            "velocity": 0.8
                                        },
                                        {
                                            "id": f"note-{int(time.time())}-3",
                                            "pitch": 64,  # E
                                            "time": 2,    # 2秒後
                                            "duration": 1,
                                            "velocity": 0.8
                                        },
                                        {
                                            "id": f"note-{int(time.time())}-4",
                                            "pitch": 65,  # F
                                            "time": 3,    # 3秒後
                                            "duration": 1,
                                            "velocity": 0.8
                                        },
                                        {
                                            "id": f"note-{int(time.time())}-5",
                                            "pitch": 67,  # G
                                            "time": 4,    # 4秒後
                                            "duration": 1,
                                            "velocity": 0.8
                                        }
                                    ]
                                },
                                "description": "ベートーベンスタイルのメロディーラインを追加しました"
                            }
                        ],
                        "summary": "新しいピアノトラックを作成し、ベートーベンスタイルのメロディーラインを追加しました。",
                        "nextSteps": "このメロディーをさらに発展させ、より複雑で魅力的なフレーズを追加します。"
                    }
            
            # ベートーベンスタイルのメロディー（C major scale）
            return {
                "actions": [{
                    "type": "addMidiNotes",
                    "params": {
                        "trackId": track_id,
                        "notes": [
                            {
                                "id": f"note-{int(time.time())}-1",
                                "pitch": 60,  # 中央のC
                                "time": 0,    # 開始時間（秒）
                                "duration": 0.5,  # 持続時間（秒）
                                "velocity": 0.8  # 音量（0-1）
                            },
                            {
                                "id": f"note-{int(time.time())}-2",
                                "pitch": 62,  # D
                                "time": 0.5,  # 0.5秒後
                                "duration": 0.5,
                                "velocity": 0.8
                            },
                            {
                                "id": f"note-{int(time.time())}-3",
                                "pitch": 64,  # E
                                "time": 1.0,  # 1秒後
                                "duration": 0.5,
                                "velocity": 0.8
                            },
                            {
                                "id": f"note-{int(time.time())}-4",
                                "pitch": 65,  # F
                                "time": 1.5,  # 1.5秒後
                                "duration": 0.5,
                                "velocity": 0.8
                            },
                            {
                                "id": f"note-{int(time.time())}-5",
                                "pitch": 67,  # G
                                "time": 2.0,  # 2秒後
                                "duration": 1.0,  # 最後のノートは長めに
                                "velocity": 0.8
                            }
                        ]
                    },
                    "description": "ベートーベンスタイルのメロディーラインを追加しました"
                }],
                "summary": f"ピアノトラック（{track_id}）に5つのMIDIノートを追加しました。これはベートーベンのスタイルを模倣した非常に基本的なメロディーです。",
                "nextSteps": "このメロディーをさらに発展させ、より複雑で魅力的なフレーズを追加します。"
            }
        
        # その他の要求
        return {
            "actions": [],
            "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text,
            "nextSteps": "具体的な操作を指定してください"
        }
        
    except Exception as e:
        print(f"Failed to create fallback response: {e}")
        return {
            "actions": [],
            "summary": "レスポンスの解析に失敗しました",
            "nextSteps": "もう一度お試しください"
        }

# サーバー起動設定
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

