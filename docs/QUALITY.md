# InterviewLens AI | Quality & reproducibility

> **Status rule:** Check the [live GitHub Actions history](https://github.com/FaizanAKhan786/interviewlens-ai/actions) for real workflow conclusions. This document does not invent benchmark scores or imply every feature was tested.

## Automated verification

Pytest backend suite on Python 3.12 in GitHub Actions. Unit tests cover local deterministic processing and security-related flows.

- [View the CI workflow](https://github.com/FaizanAKhan786/interviewlens-ai/actions/workflows/ci.yml)
- Any failing run is an unresolved result until corrected; a green syntax/unit-check workflow is not proof of deployment readiness.

## Reproduce the checks

Run these commands from the **repository root**, unless the commands change directories:

```bash
pip install -r requirements.txt
python -m pytest tests/test_backend.py -c pytest.ini --rootdir . -v
```

## How to interpret the results

**Relevant metrics:** Test status for authentication, authorization, interview pipeline, report export and practice-plan logic.

**Requirements and limitations:** Local demo feedback is deterministic. No external speech, body-language or model-accuracy metrics are claimed; obtain consent before analyzing recordings.

Before comparing results, save the commit SHA, command, dataset and split (including seed), model revision, dependency environment, hardware/CPU/GPU, and the raw result file. Use the same evaluation set for all compared runs and distinguish **synthetic tests** from **real-world measurements**.

## Publication policy

Only publish numeric scores alongside the run configuration and raw evidence. A threshold, code assertion or example report must **not** be presented as a measured production result.

[Project README](../README.md) · [GitHub Actions](https://github.com/FaizanAKhan786/interviewlens-ai/actions)
