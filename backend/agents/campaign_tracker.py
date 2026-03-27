import json
import uuid
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path


class CampaignTracker:
    """Handles saving and loading campaign data to/from JSON files"""
    
    def __init__(self, campaign_id: str, source_text: str):
        self.campaign_id = campaign_id
        self.source_text = source_text
        self.campaigns_dir = Path("campaigns")
        self.campaigns_dir.mkdir(exist_ok=True)
        
        # Initialize campaign data structure
        self.campaign_data = {
            "id": campaign_id,
            "created_at": datetime.now().isoformat(),
            "source_text": source_text,
            "fact_sheet": None,
            "content": None,
            "review": None,
            "status": "in_progress",
            "feedback_history": [
                {
                    "timestamp": datetime.now().isoformat(),
                    "agent": "system",
                    "event": "campaign_started",
                    "message": "Campaign processing started"
                }
            ]
        }
        
        self.save()
    
    def update_fact_sheet(self, fact_sheet: Dict):
        """Update campaign with fact sheet data"""
        self.campaign_data["fact_sheet"] = fact_sheet
        self.save()
    
    def update_content(self, content: Dict):
        """Update campaign with generated content"""
        self.campaign_data["content"] = content
        self.save()
    
    def update_review(self, review: Dict):
        """Update campaign with editor review"""
        self.campaign_data["review"] = review
        self.save()
    
    def mark_complete(self):
        """Mark campaign as complete"""
        self.campaign_data["status"] = "completed"
        self.campaign_data["completed_at"] = datetime.now().isoformat()
        self.save()
    
    def mark_failed(self, error: str):
        """Mark campaign as failed"""
        self.campaign_data["status"] = "failed"
        self.campaign_data["error"] = error
        self.save()
    
    def log_feedback(self, agent: str, event: str, message: str, details: Dict = None):
        """Log feedback from an agent"""
        # Ensure feedback_history exists
        if "feedback_history" not in self.campaign_data:
            self.campaign_data["feedback_history"] = []
        
        feedback_entry = {
            "timestamp": datetime.now().isoformat(),
            "agent": agent,
            "event": event,
            "message": message
        }
        if details:
            feedback_entry["details"] = details
        
        self.campaign_data["feedback_history"].append(feedback_entry)
        self.save()
    
    def log_researcher_complete(self):
        """Log when researcher phase is complete"""
        self.log_feedback(
            agent="researcher",
            event="phase_complete",
            message="Researcher extracted and validated facts from source material"
        )
    
    def log_researcher_start(self):
        """Log when researcher phase starts"""
        self.log_feedback(
            agent="researcher",
            event="phase_start",
            message=" Researcher analyzing source material and extracting key facts..."
        )
    
    def log_copywriter_start(self):
        """Log when copywriter phase starts"""
        self.log_feedback(
            agent="copywriter",
            event="phase_start",
            message=" Copywriter generating content (Blog Post, Social Media, Email Teaser)..."
        )
    
    def log_copywriter_complete(self):
        """Log when copywriter phase is complete"""
        self.log_feedback(
            agent="copywriter",
            event="phase_complete",
            message=" Copywriter generated initial content across all formats"
        )
    
    def log_editor_start(self):
        """Log when editor phase starts"""
        self.log_feedback(
            agent="editor",
            event="phase_start",
            message=" Editor reviewing content for quality and accuracy..."
        )
    
    def log_editor_feedback(self, status: str, feedback: str = None):
        """Log editor review feedback"""
        if status == "approved":
            self.log_feedback(
                agent="editor",
                event="approved",
                message="Editor approved content. Campaign complete!"
            )
        elif status == "needs_revision":
            self.log_feedback(
                agent="editor",
                event="needs_revision",
                message=f"Editor suggested revisions: {feedback or 'See review for details'}",
                details={"feedback": feedback}
            )
    
    def log_regeneration(self, attempt: int):
        """Log content regeneration attempt"""
        self.log_feedback(
            agent="copywriter",
            event="regeneration",
            message=f"Copywriter regenerating content (Attempt {attempt}/3)"
        )
    
    def save(self):
        """Save campaign data to JSON file"""
        campaign_file = self.campaigns_dir / f"{self.campaign_id}.json"
        try:
            with open(campaign_file, "w") as f:
                json.dump(self.campaign_data, f, indent=2, default=str)
                f.flush()  # Ensure data is written
        except Exception as e:
            print(f"Error saving campaign {self.campaign_id}: {e}")
            raise
    
    @staticmethod
    def load(campaign_id: str) -> Optional["CampaignTracker"]:
        """Load a campaign from file by ID"""
        campaign_file = Path("campaigns") / f"{campaign_id}.json"
        
        if not campaign_file.exists():
            return None
        
        with open(campaign_file, "r") as f:
            data = json.load(f)
        
        # Reconstruct tracker object
        tracker = CampaignTracker.__new__(CampaignTracker)
        tracker.campaign_id = campaign_id
        tracker.source_text = data["source_text"]
        tracker.campaigns_dir = Path("campaigns")
        tracker.campaign_data = data
        return tracker
    
    @staticmethod
    def list_all(limit: int = None) -> list:
        """List all campaigns, newest first"""
        campaigns_dir = Path("campaigns")
        if not campaigns_dir.exists():
            return []
        
        campaigns = []
        campaign_files = sorted(campaigns_dir.glob("*.json"), reverse=True)
        if limit:
            campaign_files = campaign_files[:limit]
            
        for campaign_file in campaign_files:
            with open(campaign_file, "r") as f:
                data = json.load(f)
                campaigns.append(data)
        
        return campaigns


def generate_campaign_id() -> str:
    """Generate a short, unique campaign ID"""
    return str(uuid.uuid4())[:8]
