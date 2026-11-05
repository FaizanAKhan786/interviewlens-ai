# Privacy, Security & Ethical AI Guidelines

## 1. Candidate Consent & Authority
Interview recordings represent sensitive, personal career data. InterviewLens AI enforces mandatory explicit consent (`consent_given=True`) before any recording can be uploaded or processed.

## 2. Audio & Video Data Retention
- Recordings are saved to private isolated storage paths indexed by random UUIDs.
- Other authenticated candidates cannot guess or access recordings or reports belonging to another user.
- Candidates have immediate full self-serve deletion authority: deleting an interview permanently unlinks all transcript segments, rubric evaluations, and erases the raw media file from disk.
- Optional 30-day auto-purge removes raw video and audio streams while preserving coaching notes and study roadmaps.

## 3. Ethical Boundaries for Speech & Video Analysis
- **Camera-Directed Gaze vs Eye Contact**: The system explicitly notes that camera engagement does not measure true eye contact, interest, or cognitive competence.
- **Zero Personality or Employability Inference**: The platform strictly prohibits and never generates hiring predictions, emotion classifications, deception scoring, or cultural bias judgments.
- **Supportive Coaching Tone**: Communication metrics (such as pace in WPM or filler words) are framed strictly as constructive coaching techniques, not candidate incompetence.
- **No Third-Party Foundation Model Training**: Candidate recordings and transcripts are never contributed to public training datasets.
