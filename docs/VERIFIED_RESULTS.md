# InterviewLens AI | Verified test evidence

This is a traceable summary of checks that **actually ran**. Scores from the seeded sample interview are **not** estimates of a real candidate's competence.

**Source:** [GitHub Actions run #42125718237](https://github.com/FaizanAKhan786/interviewlens-ai/actions/runs/42125718237)  
**Commit:** `776311b728060ec5e6a9bc1461fcd094daef95bd`  
**Execution:** 2026-11-05, Python 3.12 on a GitHub Linux runner.

| Check | Verified outcome |
| --- | --- |
| Backend test suite | **17 passed in 5.13 seconds** |
| Browser JavaScript syntax | **Passed** via `node --check services/api/static/app.js` |
| Authorization tests | Cross-user interview isolation and private practice-question access tests passed |
| PDF/JSON exporters | Existing export tests passed; scores now derive from stored evaluations instead of a hardcoded number |
| Demo isolation | Two separate demo logins produce different session accounts in the regression test |
| Real speech-model accuracy | **Not evaluated** |
| Real interview score validity | **Not evaluated** |

## What the test results demonstrate

The 17 tests cover password hashing, JWT parsing, profile actions, consent enforcement, cross-user isolation, deterministic analysis pipeline behavior, speech/transcript-related data models, study plans, practice attempts, exports, résumé alignment and deletion. They **do not** establish accuracy of actual recorded-interview transcription or independent model-based critique.

The application's demo uses seeded synthetic interview content. Both the main report API and PDF export now show scores derived from stored AnswerEvaluation rows and show **Not evaluated** where no score exists. The landing preview explicitly labels illustrative scores.

## Browser walkthrough

[Reproduction instructions](DEMO_WALKTHROUGH.md) and [real-browser workflow](../.github/workflows/screenshots.yml). The browser run must start the live FastAPI server, create a demo account, confirm an API-backed report and check JavaScript error logs before images or video can be accepted as evidence. A running workflow is **not** proof of a completed capture.

## Limits

These checks do not validate production security or safety at scale. The source app needs a managed demo-account retention policy, environment-configured signing key, fully pinned external frontend assets, abuse controls, and real provider/recording evaluations before accepting real interviews. See [the latest Actions results](https://github.com/FaizanAKhan786/interviewlens-ai/actions) for subsequent runs.
