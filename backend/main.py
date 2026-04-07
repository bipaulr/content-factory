from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from agents.researcher import run_researcher
from agents.copywriter import run_copywriter, run_copywriter_with_feedback, run_copywriter_blog_only, run_copywriter_social_only, run_copywriter_email_only
from agents.editor import run_editor
from agents.campaign_tracker import CampaignTracker, generate_campaign_id
from models.user import UserDatabase
from auth import AuthManager
import requests
from bs4 import BeautifulSoup
import json
import asyncio
import zipfile
import io
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Content Factory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
def get_current_user(authorization: Optional[str] = Header(None)):
    """Verify JWT token and return current user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    payload = AuthManager.verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = UserDatabase.get_user_by_id(payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

class SourceInput(BaseModel):
    text: str

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Content Factory API is running"}

@app.post("/api/research")
def research(input: SourceInput):
    result = run_researcher(input.text)
    return result

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    text = contents.decode("utf-8")
    result = run_researcher(text)
    return result

class UrlInput(BaseModel):
    url: str

@app.post("/api/research-url")
def research_url(input: UrlInput):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(input.url, timeout=10, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        
        for tag in soup(["script", "style"]):
            tag.decompose()
        
        text = soup.get_text(separator=" ", strip=True)
        
        text = text[:3000]
        
        result = run_researcher(text)
        return result
    except Exception as e:
        return {"error": f"Failed to fetch URL: {str(e)}"}
    
@app.post("/api/copywrite")
def copywrite(input: SourceInput):
    fact_sheet = run_researcher(input.text)
    content = run_copywriter(fact_sheet)
    return content

@app.post("/api/run-pipeline")
def run_pipeline(input: SourceInput):
    # Generate unique campaign ID
    campaign_id = generate_campaign_id()
    tracker = CampaignTracker(campaign_id, input.text)
    
    try:
        # Researcher phase
        fact_sheet = run_researcher(input.text)
        tracker.update_fact_sheet(fact_sheet)
        tracker.log_researcher_complete()
        
        # Copywriter phase
        tracker.log_copywriter_start()
        content = run_copywriter(fact_sheet)
        tracker.update_content(content)
        tracker.log_copywriter_complete()
        
        # Editor phase - with feedback loop
        review = run_editor(fact_sheet, content)
        tracker.update_review(review)
        
        attempts = 1
        if review.get("overall_status") == "approved":
            tracker.log_editor_feedback("approved")
        
        while review.get("overall_status") == "needs_revision" and attempts < 3:
            attempts += 1
            tracker.log_regeneration(attempts)
            corrected_content = run_copywriter_with_feedback(fact_sheet, content, review)
            content = corrected_content
            tracker.update_content(content)
            
            review = run_editor(fact_sheet, content)
            tracker.update_review(review)
            
            if review.get("overall_status") == "approved":
                tracker.log_editor_feedback("approved")
            elif attempts < 3:
                feedback_msg = review.get("feedback", "Please revise the content")
                tracker.log_editor_feedback("needs_revision", feedback_msg)
        
        # Mark campaign as complete
        tracker.mark_complete()
        
        return {
            "campaign_id": campaign_id,
            "fact_sheet": fact_sheet,
            "content": content,
            "review": review,
            "attempts": attempts
        }
    
    except Exception as e:
        tracker.mark_failed(str(e))
        return {
            "campaign_id": campaign_id,
            "error": str(e),
            "fact_sheet": tracker.campaign_data.get("fact_sheet"),
            "content": tracker.campaign_data.get("content"),
            "review": tracker.campaign_data.get("review")
        }


def run_pipeline_background(campaign_id: str, source_text: str):
    """Background task that runs the pipeline asynchronously"""
    tracker = CampaignTracker.load(campaign_id)
    
    try:
        # Researcher phase
        tracker.log_researcher_start()
        fact_sheet = run_researcher(source_text)
        tracker.update_fact_sheet(fact_sheet)
        tracker.log_researcher_complete()
        
        # Copywriter phase
        tracker.log_copywriter_start()
        content = run_copywriter(fact_sheet)
        tracker.update_content(content)
        tracker.log_copywriter_complete()
        
        # Editor phase - with feedback loop
        tracker.log_editor_start()
        review = run_editor(fact_sheet, content)
        tracker.update_review(review)
        
        attempts = 1
        if review.get("overall_status") == "approved":
            tracker.log_editor_feedback("approved")
        
        while review.get("overall_status") == "needs_revision" and attempts < 3:
            attempts += 1
            tracker.log_regeneration(attempts)
            corrected_content = run_copywriter_with_feedback(fact_sheet, content, review)
            content = corrected_content
            tracker.update_content(content)
            
            review = run_editor(fact_sheet, content)
            tracker.update_review(review)
            
            if review.get("overall_status") == "approved":
                tracker.log_editor_feedback("approved")
            elif attempts < 3:
                feedback_msg = review.get("feedback", "Please revise the content")
                tracker.log_editor_feedback("needs_revision", feedback_msg)
        
        # Mark campaign as complete
        tracker.mark_complete()
    
    except Exception as e:
        tracker.mark_failed(str(e))


@app.post("/api/run-pipeline-async")
def run_pipeline_async(input: SourceInput, background_tasks: BackgroundTasks, current_user = Depends(get_current_user)):
    """Run pipeline in background and return campaign_id immediately"""
    # Generate unique campaign ID
    campaign_id = generate_campaign_id()
    
    # Create tracker with user_id for campaign isolation
    tracker = CampaignTracker(campaign_id, input.text, user_id=current_user.user_id)
    tracker.save()  # Explicitly save
    
    # Start background task
    background_tasks.add_task(run_pipeline_background, campaign_id, input.text)
    
    # Return campaign_id immediately
    return {
        "campaign_id": campaign_id,
        "message": "Campaign processing started. Use /api/pipeline/stream/{campaign_id} to monitor progress.",
        "stream_url": f"/api/pipeline/stream/{campaign_id}"
    }


@app.post("/api/run-pipeline-async-file")
async def run_pipeline_async_file(background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user = Depends(get_current_user)):
    """Run pipeline asynchronously with uploaded file"""
    try:
        contents = await file.read()
        text = contents.decode("utf-8")
        
        # Generate unique campaign ID
        campaign_id = generate_campaign_id()
        
        # Create tracker with user_id for campaign isolation
        tracker = CampaignTracker(campaign_id, text, user_id=current_user.user_id)
        tracker.save()  # Explicitly save
        
        # Start background task
        background_tasks.add_task(run_pipeline_background, campaign_id, text)
        
        # Return campaign_id immediately
        return {
            "campaign_id": campaign_id,
            "message": "Campaign processing started. Use /api/pipeline/stream/{campaign_id} to monitor progress.",
            "stream_url": f"/api/pipeline/stream/{campaign_id}"
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be valid UTF-8 text")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")


@app.post("/api/run-pipeline-async-url")
def run_pipeline_async_url(input: UrlInput, background_tasks: BackgroundTasks, current_user = Depends(get_current_user)):
    """Run pipeline asynchronously with URL content"""
    try:
        # Fetch and parse URL with browser user agent to avoid 403 errors
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(input.url, timeout=10, verify=False, headers=headers)  # Disable SSL verification for dev
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        if not text or len(text) < 20:
            raise HTTPException(status_code=400, detail="Could not extract meaningful content from URL. Please check the URL.")
        
        # Generate unique campaign ID
        campaign_id = generate_campaign_id()
        
        # Create tracker with user_id for campaign isolation
        tracker = CampaignTracker(campaign_id, text, user_id=current_user.user_id)
        tracker.save()  # Explicitly save
        
        # Start background task
        background_tasks.add_task(run_pipeline_background, campaign_id, text)
        
        # Return campaign_id immediately
        return {
            "campaign_id": campaign_id,
            "message": "Campaign processing started. Use /api/pipeline/stream/{campaign_id} to monitor progress.",
            "stream_url": f"/api/pipeline/stream/{campaign_id}"
        }
    except HTTPException:
        raise
    except requests.exceptions.MissingSchema:
        raise HTTPException(status_code=400, detail="Invalid URL format. Please include http:// or https://")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=400, detail="Could not connect to URL. Please check if it's accessible.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")


@app.get("/api/campaigns")
def get_campaigns(current_user = Depends(get_current_user)):
    """Get list of all campaigns for current authenticated user"""
    # Get only campaigns for the current user
    campaigns_data = CampaignTracker.list_all(user_id=current_user.user_id)
    
    # Enrich campaign data with campaign_id and duration
    for campaign in campaigns_data:
        # Ensure campaign_id is set to id for frontend compatibility
        if "campaign_id" not in campaign:
            campaign["campaign_id"] = campaign.get("id")
        
        # Calculate duration if completed
        if campaign.get("completed_at") and campaign.get("created_at"):
            try:
                from datetime import datetime
                created = datetime.fromisoformat(campaign["created_at"])
                completed = datetime.fromisoformat(campaign["completed_at"])
                campaign["duration"] = int((completed - created).total_seconds())
            except:
                campaign["duration"] = None
    
    return campaigns_data


@app.get("/api/campaigns/{campaign_id}")
def get_campaign(campaign_id: str, current_user = Depends(get_current_user)):
    """Get a specific campaign by ID - only if it belongs to current user"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    # Verify ownership - campaign must belong to current user
    if tracker.campaign_data.get("user_id") != current_user.user_id:
        return {"error": "Access denied - campaign belongs to another user"}, 403
    
    campaign = tracker.campaign_data.copy()
    
    # Ensure campaign_id is set for frontend compatibility
    if "campaign_id" not in campaign:
        campaign["campaign_id"] = campaign.get("id")
    
    # Calculate duration if completed
    if campaign.get("completed_at") and campaign.get("created_at"):
        try:
            from datetime import datetime
            created = datetime.fromisoformat(campaign["created_at"])
            completed = datetime.fromisoformat(campaign["completed_at"])
            campaign["duration"] = int((completed - created).total_seconds())
        except:
            campaign["duration"] = None
    
    # Transform review data for frontend compatibility
    if campaign.get("review"):
        review = campaign["review"]
        # Extract overall status
        overall_status = review.get("overall_status", "unknown")
        status_display = "approved" if overall_status == "approved" else "needs_revision"
        
        # Compile feedback from all pieces
        feedback_parts = []
        if review.get("blog_post", {}).get("correction_note"):
            feedback_parts.append(f"Blog: {review['blog_post']['correction_note']}")
        if review.get("social_thread", {}).get("correction_note"):
            feedback_parts.append(f"Social: {review['social_thread']['correction_note']}")
        if review.get("email_teaser", {}).get("correction_note"):
            feedback_parts.append(f"Email: {review['email_teaser']['correction_note']}")
        
        feedback_text = " | ".join(feedback_parts) if feedback_parts else "All content approved!"
        
        campaign["review"] = {
            "status": status_display,
            "feedback": feedback_text,
            "details": review  # Keep original details for debugging
        }
    
    return campaign


@app.get("/api/campaigns/{campaign_id}/feedback-history")
def get_feedback_history(campaign_id: str, current_user = Depends(get_current_user)):
    """Get the feedback/chat history for a campaign - only if it belongs to current user"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    # Verify ownership
    if tracker.campaign_data.get("user_id") != current_user.user_id:
        return {"error": "Access denied - campaign belongs to another user"}, 403
    
    feedback_history = tracker.campaign_data.get("feedback_history", [])
    
    return {
        "campaign_id": campaign_id,
        "feedback_history": feedback_history
    }


@app.post("/api/campaigns/{campaign_id}/regenerate-blog")
def regenerate_blog(campaign_id: str, current_user = Depends(get_current_user)):
    """Regenerate only the blog post - only if campaign belongs to current user"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    # Verify ownership
    if tracker.campaign_data.get("user_id") != current_user.user_id:
        return {"error": "Access denied - campaign belongs to another user"}, 403
    
    fact_sheet = tracker.campaign_data.get("fact_sheet")
    if not fact_sheet:
        return {"error": "No fact sheet found for this campaign"}
    
    try:
        blog = run_copywriter_blog_only(fact_sheet)
        
        # Update only the blog post
        content = tracker.campaign_data.get("content", {})
        content["blog_post"] = blog
        tracker.update_content(content)
        tracker.log_feedback(
            agent="user",
            event="regenerate_blog",
            message="User regenerated blog post"
        )
        
        return {
            "campaign_id": campaign_id,
            "blog_post": blog
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/campaigns/{campaign_id}/regenerate-social")
def regenerate_social(campaign_id: str, current_user = Depends(get_current_user)):
    """Regenerate only the social media thread - only if campaign belongs to current user"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    # Verify ownership
    if tracker.campaign_data.get("user_id") != current_user.user_id:
        return {"error": "Access denied - campaign belongs to another user"}, 403
    
    fact_sheet = tracker.campaign_data.get("fact_sheet")
    if not fact_sheet:
        return {"error": "No fact sheet found for this campaign"}
    
    try:
        social = run_copywriter_social_only(fact_sheet)
        
        # Update only the social thread
        content = tracker.campaign_data.get("content", {})
        content["social_thread"] = social
        tracker.update_content(content)
        tracker.log_feedback(
            agent="user",
            event="regenerate_social",
            message="User regenerated social media thread"
        )
        
        return {
            "campaign_id": campaign_id,
            "social_thread": social
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/campaigns/{campaign_id}/regenerate-email")
def regenerate_email(campaign_id: str, current_user = Depends(get_current_user)):
    """Regenerate only the email teaser - only if campaign belongs to current user"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    # Verify ownership
    if tracker.campaign_data.get("user_id") != current_user.user_id:
        return {"error": "Access denied - campaign belongs to another user"}, 403
    
    fact_sheet = tracker.campaign_data.get("fact_sheet")
    if not fact_sheet:
        return {"error": "No fact sheet found for this campaign"}
    
    try:
        email = run_copywriter_email_only(fact_sheet)
        
        # Update only the email teaser
        content = tracker.campaign_data.get("content", {})
        content["email_teaser"] = email
        tracker.update_content(content)
        tracker.log_feedback(
            agent="user",
            event="regenerate_email",
            message="User regenerated email teaser"
        )
        
        return {
            "campaign_id": campaign_id,
            "email_teaser": email
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/campaigns/{campaign_id}/export-clipboard")
def export_clipboard(campaign_id: str, current_user = Depends(get_current_user)):
    """Get campaign data formatted for clipboard - only if campaign belongs to current user"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    # Verify ownership
    if tracker.campaign_data.get("user_id") != current_user.user_id:
        return {"error": "Access denied - campaign belongs to another user"}, 403
    
    campaign = tracker.campaign_data
    content = campaign.get("content", {})
    
    # Format as HTML for easy pasting into email, social, etc.
    html = f"""
    <h2>Blog Post</h2>
    <p>{content.get('blog_post', 'N/A')}</p>
    
    <h2>Social Media Thread</h2>
    <pre>{content.get('social_thread', 'N/A')}</pre>
    
    <h2>Email Teaser</h2>
    <p>{content.get('email_teaser', 'N/A')}</p>
    """
    
    return {"formatted_html": html}


@app.get("/api/campaigns/{campaign_id}/export-zip")
def export_zip(campaign_id: str, current_user = Depends(get_current_user)):
    """Download campaign data as ZIP file - only if campaign belongs to current user"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    # Verify ownership
    if tracker.campaign_data.get("user_id") != current_user.user_id:
        return {"error": "Access denied - campaign belongs to another user"}, 403
    
    # Create ZIP file in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add main campaign JSON
        campaign_json = json.dumps(tracker.campaign_data, indent=2)
        zip_file.writestr(f"campaign_{campaign_id}.json", campaign_json)
        
        # Add separate files for each content type
        content = tracker.campaign_data.get("content", {})
        if content.get("blog_post"):
            zip_file.writestr("blog_post.txt", content["blog_post"])
        if content.get("social_thread"):
            zip_file.writestr("social_thread.txt", content["social_thread"])
        if content.get("email_teaser"):
            zip_file.writestr("email_teaser.txt", content["email_teaser"])
        
        # Add fact sheet if available
        fact_sheet = tracker.campaign_data.get("fact_sheet")
        if fact_sheet:
            zip_file.writestr("fact_sheet.json", json.dumps(fact_sheet, indent=2))
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=campaign_{campaign_id}.zip"}
    )


# Global storage for SSE streaming events
campaign_events = {}


def generate_sse_message(event_type: str, data: dict):
    """Generate SSE formatted message"""
    return f"data: {json.dumps({'event': event_type, 'data': data})}\n\n"


@app.get("/api/pipeline/stream/{campaign_id}")
def stream_campaign_progress(campaign_id: str):
    """Stream real-time pipeline progress as Server-Sent Events"""
    
    def event_generator():
        """Generator function for SSE streaming"""
        # Check if campaign exists
        tracker = CampaignTracker.load(campaign_id)
        if not tracker:
            yield generate_sse_message("error", {"message": "Campaign not found"})
            return
        
        # Keep track of messages we've already sent
        sent_message_count = 0
        
        # Poll campaign status every 500ms for 5 minutes max
        max_polls = 600  # 600 * 0.5s = 300s = 5 minutes
        poll_count = 0
        last_status = None
        
        while poll_count < max_polls:
            tracker = CampaignTracker.load(campaign_id)
            if not tracker:
                yield generate_sse_message("error", {"message": "Campaign corrupted"})
                break
            
            current_status = tracker.campaign_data.get("status")
            feedback_history = tracker.campaign_data.get("feedback_history", [])
            
            # Emit any new feedback messages
            while sent_message_count < len(feedback_history):
                msg = feedback_history[sent_message_count]
                yield generate_sse_message("status_update", {
                    "agent": msg.get("agent", "system"),
                    "message": msg.get("message", ""),
                    "event": msg.get("event", ""),
                    "timestamp": msg.get("timestamp"),
                    "progress": int((sent_message_count / max(len(feedback_history), 1)) * 100)
                })
                sent_message_count += 1
            
            # Emit status update if changed
            if current_status != last_status:
                last_status = current_status
                
                if current_status == "completed":
                    yield generate_sse_message("campaign_complete", tracker.campaign_data)
                    break
                elif current_status == "failed":
                    yield generate_sse_message("error", {
                        "message": tracker.campaign_data.get("error", "Unknown error")
                    })
                    break
            
            poll_count += 1
            asyncio.run(asyncio.sleep(0.5))  # 500ms between polls
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/analytics")
def get_analytics():
    """Get analytics summary for all campaigns"""
    from datetime import datetime, timedelta
    
    campaigns = CampaignTracker.list_all()
    
    if not campaigns:
        return {
            "total_campaigns": 0,
            "completed_campaigns": 0,
            "failed_campaigns": 0,
            "success_rate": 0,
            "avg_completion_time_seconds": 0,
            "regenerations": {
                "blog": 0,
                "social": 0,
                "email": 0,
                "total": 0
            },
            "avg_revisions": 0,
            "content": []
        }
    
    total = len(campaigns)
    completed = sum(1 for c in campaigns if c.get("status") == "completed")
    failed = sum(1 for c in campaigns if c.get("status") == "failed")
    success_rate = (completed / total * 100) if total > 0 else 0
    
    # Calculate average completion time
    completion_times = []
    for campaign in campaigns:
        if campaign.get("status") == "completed":
            try:
                created = datetime.fromisoformat(campaign.get("created_at", ""))
                completed_at = datetime.fromisoformat(campaign.get("completed_at", ""))
                duration = (completed_at - created).total_seconds()
                completion_times.append(duration)
            except:
                pass
    
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
    
    # Count regenerations from feedback history
    regenerations = {"blog": 0, "social": 0, "email": 0, "total": 0}
    for campaign in campaigns:
        feedback = campaign.get("feedback_history", [])
        for entry in feedback:
            if entry.get("event") == "regenerate_blog":
                regenerations["blog"] += 1
                regenerations["total"] += 1
            elif entry.get("event") == "regenerate_social":
                regenerations["social"] += 1
                regenerations["total"] += 1
            elif entry.get("event") == "regenerate_email":
                regenerations["email"] += 1
                regenerations["total"] += 1
    
    # Calculate average revisions
    revision_counts = []
    for campaign in campaigns:
        feedback = campaign.get("feedback_history", [])
        revisions = sum(1 for entry in feedback if entry.get("event") == "regeneration")
        revision_counts.append(revisions)
    
    avg_revisions = sum(revision_counts) / len(revision_counts) if revision_counts else 0
    
    return {
        "total_campaigns": total,
        "completed_campaigns": completed,
        "failed_campaigns": failed,
        "success_rate": round(success_rate, 2),
        "avg_completion_time_seconds": round(avg_completion_time, 2),
        "regenerations": regenerations,
        "avg_revisions": round(avg_revisions, 2),
        "campaigns": campaigns
    }


# ==================== AUTHENTICATION ENDPOINTS ====================

class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str

class UserSignupRequest(BaseModel):
    email: str
    password: str
    fullName: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserGoogleAuthRequest(BaseModel):
    email: str
    name: str
    google_id: str
    image_url: Optional[str] = None  # Google profile picture URL

# ==================== EMAIL/PASSWORD AUTHENTICATION ====================

@app.post("/api/auth/signup")
def signup(request: UserSignupRequest):
    """Register a new user with email and password"""
    try:
        email = request.email.strip().lower()
        password = request.password.strip()
        full_name = request.fullName.strip()
        
        # Validate inputs are not empty
        if not email or not password or not full_name:
            raise HTTPException(status_code=400, detail="All fields are required")
        
        if len(full_name) > 100:
            raise HTTPException(status_code=400, detail="Name is too long")
        
        # Create user with validation
        user, error = UserDatabase.create_user_with_email(email, full_name, password)
        
        if error:
            # Return 400 for validation errors, don't expose specific details to prevent user enumeration
            raise HTTPException(status_code=400, detail=error)
        
        # Create JWT token
        jwt_token = AuthManager.create_token(user.user_id)
        
        return {
            "token": jwt_token,
            "user": user.to_dict(),
            "expiresIn": 24 * 60 * 60
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Signup failed")


@app.post("/api/auth/login")
def login(request: UserLoginRequest):
    """Login with email and password"""
    try:
        email = request.email.strip().lower()
        password = request.password.strip()
        
        if not email or not password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Get user by email
        user = UserDatabase.get_user_by_email(email)
        
        if not user or not user.password_hash:
            # Don't reveal if user exists (prevent user enumeration)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not user.verify_password(password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Update last login
        UserDatabase.update_last_login(user.user_id)
        
        # Create JWT token
        jwt_token = AuthManager.create_token(user.user_id)
        
        return {
            "token": jwt_token,
            "user": user.to_dict(),
            "expiresIn": 24 * 60 * 60
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


# ==================== GOOGLE AUTHENTICATION ====================

@app.post("/api/auth/google-callback")
def google_callback(request: UserGoogleAuthRequest):
    """Handle user creation/login after Google OAuth with profile picture"""
    try:
        # Try MongoDB first if available
        try:
            from config.database import USE_MONGODB
            from models.mongodb_user import MongoUser
            
            if USE_MONGODB:
                user_obj = MongoUser.create_or_update_from_google(
                    google_id=request.google_id,
                    email=request.email,
                    name=request.name,
                    profile_picture_url=request.image_url
                )
                user_data = user_obj.to_dict()
                user_id = user_obj.user_id
            else:
                raise ImportError("Not using MongoDB")
        except (ImportError, Exception):
            # Fall back to SQLite
            user = UserDatabase.create_or_update_user(
                google_id=request.google_id,
                email=request.email,
                name=request.name,
                image_url=request.image_url
            )
            user_data = user.to_dict()
            user_id = user.user_id
        
        # Create JWT token for the user
        jwt_token = AuthManager.create_token(user_id)
        
        return {
            "token": jwt_token,
            "user": user_data,
            "expiresIn": 24 * 60 * 60  # 24 hours in seconds
        }
    
    except Exception as e:
        print(f"Google callback error: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@app.post("/api/auth/google")
def google_auth(request: GoogleAuthRequest):
    """Handle Google OAuth callback and create/update user (legacy endpoint)"""
    try:
        # Exchange authorization code for tokens
        token_data = AuthManager.exchange_code_for_token(request.code, request.redirect_uri)
        
        if not token_data:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
        
        # Get user info from Google using access token
        access_token = token_data.get("access_token")
        user_info = AuthManager.get_user_info_from_google_token(access_token)
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user information from Google")
        
        # Create or update user in database
        user = UserDatabase.create_or_update_user(
            google_id=user_info.get("google_id"),
            email=user_info.get("email"),
            name=user_info.get("name"),
            image_url=user_info.get("image_url")
        )
        
        # Create JWT token for the user
        jwt_token = AuthManager.create_token(user.user_id)
        
        return {
            "token": jwt_token,
            "user": user.to_dict(),
            "expiresIn": 24 * 60 * 60  # 24 hours in seconds
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@app.get("/api/auth/me")
def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current authenticated user info"""
    return current_user.to_dict()


@app.post("/api/auth/logout")
def logout():
    """Logout endpoint (mostly for frontend to clear tokens)"""
    return {"message": "Logged out successfully"}


@app.get("/api/auth/verify")
def verify_token(current_user = Depends(get_current_user)):
    """Verify if the current token is valid"""
    return {
        "valid": True,
        "user": current_user.to_dict()
    }


@app.get("/api/auth/user/{user_id}")
def get_user(user_id: str):
    """Get user data by ID (includes profile picture and other metadata)"""
    try:
        # Try MongoDB first if available
        try:
            from config.database import USE_MONGODB
            from models.mongodb_user import MongoUser
            
            if USE_MONGODB:
                user = MongoUser.get_by_id(user_id)
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                return user.to_dict()
        except (ImportError, Exception):
            pass
        
        # Fall back to SQLite
        user = UserDatabase.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")
