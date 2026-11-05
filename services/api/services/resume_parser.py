import os
import re
import pymupdf
from typing import Dict, List, Any

# Common technical taxonomy for skill discovery
TECH_SKILL_PATTERNS = [
    r'\bpython\b', r'\bpytorch\b', r'\btensorflow\b', r'\bkeras\b', r'\bkubernetes\b',
    r'\bdocker\b', r'\bkafka\b', r'\brabbitmq\b', r'\bredis\b', r'\bpostgresql\b',
    r'\bmysql\b', r'\bmongodb\b', r'\baws\b', r'\bgcp\b', r'\bazure\b', r'\brag\b',
    r'\bllm\b', r'\btransformers\b', r'\bembeddings\b', r'\bvector\b', r'\bfaiss\b',
    r'\bpinecone\b', r'\bchroma\b', r'\bweaviate\b', r'\bspark\b', r'\bhadoop\b',
    r'\bairflow\b', r'\bci/cd\b', r'\bgraphql\b', r'\brest\b', r'\bgrpc\b', r'\bgo\b',
    r'\brust\b', r'\bjava\b', r'\bc\+\+\b', r'\btypescript\b', r'\bjavascript\b',
    r'\breact\b', r'\bnext\.js\b', r'\bnode\.js\b', r'\bfastapi\b', r'\bflask\b',
    r'\bdistributed systems\b', r'\bmicroservices\b', r'\bmlops\b', r'\bterraform\b'
]

class ResumeParserService:
    @staticmethod
    def extract_text_from_pdf(pdf_path: str) -> str:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Resume file not found at {pdf_path}")
        
        doc = pymupdf.open(pdf_path)
        full_text = []
        for page in doc:
            full_text.append(page.get_text())
        return "\n".join(full_text)

    @staticmethod
    def extract_skills(text: str) -> List[str]:
        lower = text.lower()
        extracted = []
        for pat in TECH_SKILL_PATTERNS:
            matches = re.findall(pat, lower)
            if matches:
                # Clean and title case skill
                skill_name = matches[0].strip().replace('\\b', '')
                if skill_name not in extracted:
                    extracted.append(skill_name.upper() if len(skill_name) <= 3 else skill_name.title())
        return sorted(list(set(extracted)))

    @classmethod
    def analyze_resume_alignment(
        cls, 
        resume_text: str, 
        job_description: str, 
        interview_answers: List[str]
    ) -> Dict[str, Any]:
        resume_skills = cls.extract_skills(resume_text)
        jd_skills = cls.extract_skills(job_description) if job_description else []
        combined_answers = " ".join(interview_answers).lower()

        # Skills mentioned on resume that candidate failed to showcase during interview
        neglected_resume_skills = []
        showcased_resume_skills = []

        for skill in resume_skills:
            if skill.lower() in combined_answers:
                showcased_resume_skills.append(skill)
            else:
                neglected_resume_skills.append(skill)

        # High priority skills from Job Description missing from both resume and interview
        unaddressed_jd_skills = [
            s for s in jd_skills 
            if s.lower() not in resume_text.lower() and s.lower() not in combined_answers
        ]

        alignment_score = 80
        if resume_skills:
            showcase_ratio = len(showcased_resume_skills) / len(resume_skills)
            alignment_score = int(60 + (showcase_ratio * 35))

        return {
            "alignment_score": alignment_score,
            "detected_resume_skills": resume_skills,
            "showcased_in_interview": showcased_resume_skills[:8],
            "neglected_resume_skills": neglected_resume_skills[:6],
            "unaddressed_jd_requirements": unaddressed_jd_skills[:5],
            "coaching_advice": (
                f"You demonstrated strong proficiency with {', '.join(showcased_resume_skills[:3]) if showcased_resume_skills else 'core competencies'}. "
                f"However, your resume lists {', '.join(neglected_resume_skills[:3]) if neglected_resume_skills else 'advanced tools'}, "
                f"which you did not proactively weave into your architectural answers. In future interviews, connect your past experience directly to these strengths."
            )
        }
