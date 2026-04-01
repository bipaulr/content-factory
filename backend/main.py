from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from agents.researcher import run_researcher
from agents.copywriter import run_copywriter, run_copywriter_with_feedback, run_copywriter_blog_only, run_copywriter_social_only, run_copywriter_email_only
from agents.editor import run_editor
from agents.campaign_tracker import CampaignTracker, generate_campaign_id
import requests
from bs4 import BeautifulSoup
import json
import asyncio
import zipfile
import io

app = FastAPI(title="Content Factory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
def run_pipeline_async(input: SourceInput, background_tasks: BackgroundTasks):
    """Run pipeline in background and return campaign_id immediately"""
    # Generate unique campaign ID
    campaign_id = generate_campaign_id()
    
    # Create tracker and initialize campaign
    tracker = CampaignTracker(campaign_id, input.text)
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
async def run_pipeline_async_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Run pipeline asynchronously with uploaded file"""
    try:
        contents = await file.read()
        text = contents.decode("utf-8")
        
        # Generate unique campaign ID
        campaign_id = generate_campaign_id()
        
        # Create tracker and initialize campaign
        tracker = CampaignTracker(campaign_id, text)
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
def run_pipeline_async_url(input: UrlInput, background_tasks: BackgroundTasks):
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
        
        # Create tracker and initialize campaign
        tracker = CampaignTracker(campaign_id, text)
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
def get_campaigns():
    """Get list of all campaigns"""
    campaigns_data = CampaignTracker.list_all()
    
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
def get_campaign(campaign_id: str):
    """Get a specific campaign by ID"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
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
def get_feedback_history(campaign_id: str):
    """Get the feedback/chat history for a campaign"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
    feedback_history = tracker.campaign_data.get("feedback_history", [])
    
    return {
        "campaign_id": campaign_id,
        "feedback_history": feedback_history
    }


@app.post("/api/campaigns/{campaign_id}/regenerate-blog")
def regenerate_blog(campaign_id: str):
    """Regenerate only the blog post"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
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
def regenerate_social(campaign_id: str):
    """Regenerate only the social media thread"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
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
def regenerate_email(campaign_id: str):
    """Regenerate only the email teaser"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
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
def export_clipboard(campaign_id: str):
    """Get campaign data formatted for clipboard"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
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
def export_zip(campaign_id: str):
    """Download campaign data as ZIP file"""
    tracker = CampaignTracker.load(campaign_id)
    
    if not tracker:
        return {"error": "Campaign not found"}, 404
    
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
