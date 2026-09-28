import json
import os
import re
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI(
    title="EduGenie",
    description="Google Gemini Powered Learning Assistant",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")


class RequestBody(BaseModel):
    task: str
    text: str


def get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. "
            "Please add your Gemini API key to the .env file."
        )
    return genai.Client(api_key=api_key)


def ask_gemini(prompt: str) -> str:
    import time

    client = get_client()
    max_retries = 3

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt
            )
            return (response.text or "").strip()
        except Exception as exc:
            error_text = str(exc)
            if "503" in error_text or "UNAVAILABLE" in error_text:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
            raise


def clean_json(text: str) -> Any:
    text = text.strip()
    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def build_prompt(task: str, text: str) -> str:
    base_prompt = """
You are EduGenie, a friendly AI educational assistant.

Your goal is to help students understand subjects clearly.

Give accurate, student-friendly answers.

Use simple language, clear headings and short paragraphs.

Do not make up facts.
"""

    if task == "qa":
        return base_prompt + f"""
Answer the student's question clearly and concisely.

Question:
{text}
"""

    if task == "explain":
        return base_prompt + f"""
Explain the following concept to a student
who is learning it for the first time.

Include:

1. Simple definition
2. Key idea
3. Small example
4. Three important takeaways

Topic:
{text}
"""

    if task == "summarize":
        return base_prompt + f"""
Summarize the following educational text
for quick revision.

Keep the important facts and concepts.

Use bullet points where helpful.

Text:
{text}
"""

    if task == "learn":
        return base_prompt + f"""
Create a practical learning path for the
following topic.

Organize it into:

Beginner
Intermediate
Advanced

For each stage include:

- Topics to learn
- Suggested time frame
- Practice activity
- Useful resource types such as documentation,
  textbooks, videos or exercises

Do not invent specific URLs.

Topic:
{text}
"""

    if task == "quiz":
        return f"""
You are EduGenie, an educational quiz generator.

Create exactly 5 multiple-choice questions
from the topic or text below.

Each question must contain exactly 4 options.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "questions": [
        {{
            "question": "Question text",
            "options": [
                "Option A",
                "Option B",
                "Option C",
                "Option D"
            ],
            "answer": 0,
            "explanation": "Short explanation"
        }}
    ]
}}

The answer field must contain the zero-based
index of the correct option.

For example:

0 = first option
1 = second option
2 = third option
3 = fourth option

Topic/Text:
{text}
"""

    raise ValueError("Unsupported task.")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "EduGenie"
    }


@app.post("/api/assist")
async def assist(body: RequestBody):
    try:
        if not body.text.strip():
            return JSONResponse(
                {"error": "Please enter a topic or question."},
                status_code=400
            )

        if body.task == "quiz":
            ai_response = ask_gemini(
                build_prompt(body.task, body.text)
            )
            result = clean_json(ai_response)
        else:
            result = ask_gemini(
                build_prompt(body.task, body.text)
            )

        return {
            "task": body.task,
            "result": result
        }

    except Exception as exc:
        return JSONResponse(
            {"error": str(exc)},
            status_code=500
        )
