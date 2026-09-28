# EduGenie — Google Gemini Powered Learning Assistant

A polished FastAPI + Google Gemini learning assistant with five study modes:

- Ask anything
- Explain a concept
- Generate quiz
- Summarize
- Learning path

## Run locally

1. Install Python 3.10+.
2. Create a virtual environment.
3. Install dependencies:
   `pip install -r requirements.txt`
4. Copy `.env.example` to `.env`.
5. Add your Gemini API key to `.env`.
6. Start:
   `uvicorn main:app --reload`
7. Open `http://127.0.0.1:8000`

## Deployment

The included `render.yaml` is ready for a Render web service. Add `GEMINI_API_KEY` as a secret environment variable in the hosting dashboard.

Never commit the real `.env` file or API key to GitHub.
