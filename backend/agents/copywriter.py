import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def run_copywriter(fact_sheet: dict) -> dict:
    product = fact_sheet.get("product_name", "the product")
    # Use filtered versions if available (verified), otherwise fall back to original
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features = "\n".join(core_features)
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    # Blog Post Prompt
    blog_prompt = f"""
You are a professional content writer. Write a 500-word blog post about {product}.

Use this information only — do not invent anything:
- Summary: {summary}
- Core Features: {features}
- Target Audience: {audience}
- Value Proposition: {value_prop}

Tone: Professional and trustworthy.
The value proposition must be the hero of the post.
Return only the blog post text, no titles or headers.
"""

    # Social Media Thread Prompt
    social_prompt = f"""
You are a social media copywriter. Write a 5-post Twitter/X thread about {product}.

Use this information only — do not invent anything:
- Summary: {summary}
- Core Features: {features}
- Target Audience: {audience}
- Value Proposition: {value_prop}

Tone: Engaging and punchy.
Format each post as:
1/ [post content]
2/ [post content]
...and so on.
Return only the thread, nothing else.
"""

    # Email Teaser Prompt
    email_prompt = f"""
You are an email marketing specialist. Write a 1-paragraph email teaser about {product}.

Use this information only — do not invent anything:
- Summary: {summary}
- Core Features: {features}
- Target Audience: {audience}
- Value Proposition: {value_prop}

Tone: Formal and persuasive.
Keep it under 100 words.
Return only the paragraph, nothing else.
"""

    blog = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": blog_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=1000
    ).choices[0].message.content

    social = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": social_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=500
    ).choices[0].message.content

    email = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": email_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=200
    ).choices[0].message.content

    return {
        "blog_post": blog,
        "social_thread": social,
        "email_teaser": email
    }
def run_copywriter_with_feedback(fact_sheet: dict, previous_content: dict, review: dict) -> dict:
    product = fact_sheet.get("product_name", "the product")
    # Use filtered versions if available (verified), otherwise fall back to original
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features = "\n".join(core_features)
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    # Build correction notes
    corrections = []
    for piece in ["blog_post", "social_thread", "email_teaser"]:
        if review.get(piece, {}).get("status") == "rejected":
            note = review[piece].get("correction_note", "")
            corrections.append(f"{piece}: {note}")
    
    corrections_text = "\n".join(corrections)

    prompt = f"""
You are a creative marketing copywriter. Your previous content was rejected by the editor.

Fact Sheet:
- Product: {product}
- Summary: {summary}
- Core Features: {features}
- Target Audience: {audience}
- Value Proposition: {value_prop}

Previous content that was rejected:
Blog Post: {previous_content.get("blog_post", "")}
Social Thread: {previous_content.get("social_thread", "")}
Email Teaser: {previous_content.get("email_teaser", "")}

Editor's correction notes:
{corrections_text}

Fix the rejected pieces based on the correction notes. Keep approved pieces exactly as they were.

Return ONLY a valid JSON object:
{{
  "blog_post": "fixed or original blog post",
  "social_thread": "fixed or original social thread",
  "email_teaser": "fixed or original email teaser"
}}

Return only the JSON. No markdown, no backticks, no explanation.
"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()

    try:
        content = json.loads(raw)
    except json.JSONDecodeError:
        content = {"error": "Failed to parse response", "raw": raw}

    return content


def run_copywriter_blog_only(fact_sheet: dict) -> str:
    """Generate only the blog post"""
    product = fact_sheet.get("product_name", "the product")
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features = "\n".join(core_features)
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    blog_prompt = f"""
You are a professional content writer. Write a 500-word blog post about {product}.

Use this information only — do not invent anything:
- Summary: {summary}
- Core Features: {features}
- Target Audience: {audience}
- Value Proposition: {value_prop}

Tone: Professional and trustworthy.
The value proposition must be the hero of the post.
Return only the blog post text, no titles or headers.
"""

    blog = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": blog_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=1000
    ).choices[0].message.content

    return blog


def run_copywriter_social_only(fact_sheet: dict) -> str:
    """Generate only the social media thread"""
    product = fact_sheet.get("product_name", "the product")
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features = "\n".join(core_features)
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    social_prompt = f"""
You are a social media copywriter. Write a 5-post Twitter/X thread about {product}.

Use this information only — do not invent anything:
- Summary: {summary}
- Core Features: {features}
- Target Audience: {audience}
- Value Proposition: {value_prop}

Tone: Engaging and punchy.
Format each post as:
1/ [post content]
2/ [post content]
...and so on.
Return only the thread, nothing else.
"""

    social = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": social_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=500
    ).choices[0].message.content

    return social


def run_copywriter_email_only(fact_sheet: dict) -> str:
    """Generate only the email teaser"""
    product = fact_sheet.get("product_name", "the product")
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features = "\n".join(core_features)
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    email_prompt = f"""
You are an email marketing specialist. Write a 1-paragraph email teaser about {product}.

Use this information only — do not invent anything:
- Summary: {summary}
- Core Features: {features}
- Target Audience: {audience}
- Value Proposition: {value_prop}

Tone: Formal and persuasive.
Keep it under 100 words.
Return only the paragraph, nothing else.
"""

    email = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": email_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=200
    ).choices[0].message.content

    return email