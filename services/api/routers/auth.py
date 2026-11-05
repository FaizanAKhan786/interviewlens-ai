from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from services.api.core.database import get_db
from services.api.core.security import hash_password, verify_password, create_access_token
from services.api.core.deps import get_current_user
from services.api.models.entities import User, UserProfile, gen_uuid
from services.api.schemas.user import UserCreate, UserLogin, UserOut, UserProfileUpdate, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
    
    new_user = User(
        id=gen_uuid(),
        email=user_in.email.lower(),
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role="candidate"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize profile
    profile = UserProfile(
        id=gen_uuid(),
        user_id=new_user.id,
        target_role="AI/ML Engineer",
        experience_level="mid"
    )
    db.add(profile)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email})
    return TokenResponse(access_token=token, user=new_user)

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email.lower()).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token, user=user)

@router.post("/demo-login", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    demo_email = "demo.candidate@interviewlens.ai"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            id=gen_uuid(),
            email=demo_email,
            full_name="Alex Mercer (Demo)",
            hashed_password=hash_password("DemoPassword2026!"),
            role="candidate"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        profile = UserProfile(
            id=gen_uuid(),
            user_id=user.id,
            target_role="Senior AI/ML Engineer",
            target_company="OpenAI / Anthropic",
            experience_level="senior",
            bio="Senior engineer specializing in distributed LLM architectures, RAG systems, and high-throughput vector search pipelines."
        )
        db.add(profile)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token, user=user)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserOut)
def update_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = current_user.profile
    if not profile:
        profile = UserProfile(id=gen_uuid(), user_id=current_user.id)
        db.add(profile)

    if profile_in.target_role is not None:
        profile.target_role = profile_in.target_role
    if profile_in.target_company is not None:
        profile.target_company = profile_in.target_company
    if profile_in.experience_level is not None:
        profile.experience_level = profile_in.experience_level
    if profile_in.bio is not None:
        profile.bio = profile_in.bio
    if profile_in.resume_text is not None:
        profile.resume_text = profile_in.resume_text
    if profile_in.preferred_language is not None:
        profile.preferred_language = profile_in.preferred_language

    db.commit()
    db.refresh(current_user)
    return current_user
