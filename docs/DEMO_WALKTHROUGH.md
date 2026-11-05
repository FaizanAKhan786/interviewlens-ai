# InterviewLens AI | Reproducible browser demo

This walkthrough uses the repository's **actual FastAPI server, JavaScript interface and seeded synthetic-data interview**. It is not an AI-generated UI concept or a recorded real person's interview.

## Run locally

```bash
git clone https://github.com/FaizanAKhan786/interviewlens-ai.git
cd interviewlens-ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AI_PROVIDER=local
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
uvicorn services.api.main:app --host 127.0.0.1 --port 8765
```

On Windows, activate the virtual environment using `.venv\Scripts\activate` and configure `SECRET_KEY` in your shell. The default local database is SQLite.

Open `http://127.0.0.1:8765` in a browser and follow these steps:

1. Review the landing page. Its static preview scores are labeled **illustrative** and must not be described as measured outcomes.
2. Select **Try Interactive Demo Report** to create an **isolated, randomly generated demo account**. No previous visitor's interview records should be shared.
3. The server creates a synthetic sample interview and produces the report via the local deterministic analysis provider.
4. Examine the question timeline, technical feedback and study suggestions. These represent seeded demonstration content, not an independently evaluated real interview.
5. Explore the **Practice Studio**. The backend enforces private question ownership, and an isolated demo user cannot submit attempts against another account's private questions.
6. Export the report to PDF and JSON. Both use stored evaluation data. Unevaluated real interviews show **Not evaluated**, not a hard-coded score.

## Reproduce genuine visual evidence

After running the API server, in another shell:

```bash
pip install playwright
python -m playwright install chromium
python scripts/capture_demo.py
```

The script asserts a non-empty rendered landing page, checks the CSS, clicks the demo action, waits for a successful API-backed report, checks for JavaScript exceptions, then captures images and a Playwright browser-recorded video. The real-browser workflow is defined in [`.github/workflows/screenshots.yml`](../.github/workflows/screenshots.yml). Images are published **only if verification succeeds**.

## Verification limits

- The automated demo exercises a **synthetic** interview and local provider. No real person, uploaded private video, remote Gemini/OpenAI model or external speech recognizer is tested.
- No real-world interview grading, speaking speed, eye contact or job-prediction accuracy figures are claimed.
- This repository is not a regulated hiring assessment tool. The posture module is descriptive and should never be treated as a competence measure.
- Demo accounts are isolated but persist in the development database until cleaned. Configure a retention/cleanup policy before using this application in a public multi-user environment.
- The current standalone frontend uses external CSS/JS CDN assets. For resilient production use, bundle and pin these assets and audit their CSP behavior.
- An unauthenticated public demo is not equivalent to a secure production user onboarding flow.
