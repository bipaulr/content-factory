import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def run_editor(fact_sheet: dict, content: dict) -> dict:
    product = fact_sheet.get("product_name", "the product")
    features = "\n".join(fact_sheet.get("core_features", []))
    specs = "\n".join(fact_sheet.get("technical_specs", []))
    value_prop = fact_sheet.get("value_proposition", "")
    summary = fact_sheet.get("summary", "")

    blog = content.get("blog_post", "")
    social = content.get("social_thread", "")
    email = content.get("email_teaser", "")

    prompt = f"""
You are a strict editor-in-chief. Your job is to review marketing content and check it against a fact sheet.

FACT SHEET (the only source of truth):
- Product: {product}
- Summary: {summary}
- Core Features: {features}
- Technical Specs: {specs}
- Value Proposition: {value_prop}

CONTENT TO REVIEW:
Blog Post:
{blog}

Social Thread:
{social}

Email Teaser:
{email}

Your job:
1. HALLUCINATION CHECK: Does any content mention facts, features, prices, or claims NOT in the fact sheet? If yes, that is a hallucination.
2. TONE CHECK: Is the blog post professional and trustworthy? Is the social thread engaging and punchy? Is the email formal and persuasive? Flag if too salesy or robotic.
3. DECISION: For each piece, decide "approved" or "rejected".
4. CORRECTION NOTES: For every rejected piece, write a specific 1-2 sentence correction note explaining exactly what to fix.

Return ONLY a valid JSON object with this exact structure:
{{
  "blog_post": {{
    "status": "approved" or "rejected",
    "correction_note": "specific correction note if rejected, empty string if approved"
  }},
  "social_thread": {{
    "status": "approved" or "rejected",
    "correction_note": "specific correction note if rejected, empty string if approved"
  }},
  "email_teaser": {{
    "status": "approved" or "rejected",
    "correction_note": "specific correction note if rejected, empty string if approved"
  }},
  "overall_status": "approved" or "needs_revision"
}}

Return only the JSON. No explanation, no markdown, no backticks.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
    )

    raw = response.choices[0].message.content.strip()

    try:
        review = json.loads(raw)
    except json.JSONDecodeError:
        review = {"error": "Failed to parse response", "raw": raw}

    return review