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
    features_list = "\n".join([f"{i+1}. {f}" for i, f in enumerate(core_features)])
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    # Blog Post Prompt - More structured
    blog_prompt = f"""
You are a professional content writer. Write a 500-word blog post about {product}.

FACT SHEET (ONLY source of truth - do NOT invent):
Product: {product}
Summary: {summary}
Target Audience: {audience}
Value Proposition: {value_prop}

Core Features (reference by number, e.g., "Feature 1", "Feature 2"):
{features_list}

RULES:
- ONLY mention features 1-{len(core_features)} from the list above
- NEVER add features, specs, or prices not listed
- NEVER claim capabilities not in the fact sheet
- Structure: Introduction → Feature highlights (reference by number) → Conclusion on value proposition
- Tone: Professional, trustworthy, informative
- Focus: Why the value proposition matters to the {audience}

Return ONLY the blog post text (no title, no metadata).
"""

    # Social Media Thread Prompt - More prescriptive
    social_prompt = f"""
You are a social media copywriter. Write a 5-post Twitter/X thread about {product}.

FACT SHEET (ONLY source of truth):
Product: {product}
Summary: {summary}
Target Audience: {audience}
Value Proposition: {value_prop}

Core Features (reference by number):
{features_list}

RULES:
- Post 1: Hook about the value proposition for {audience}
- Posts 2-4: Each post highlights ONE feature (e.g., "Feature 1 is...", "Feature 3 helps...")
- Post 5: Call-to-action based on value proposition
- NEVER mention features not in the list above
- Keep each post under 280 characters
- Use 1-2 relevant emojis per post
- Tone: Engaging, punchy, conversational

Format as:
1/ [post 1]
2/ [post 2]
3/ [post 3]
4/ [post 4]
5/ [post 5]

Return ONLY the formatted thread.
"""

    # Email Teaser Prompt - Stricter constraints
    email_prompt = f"""
You are an email marketing specialist. Write a compelling email teaser for {product}.

FACT SHEET (ONLY source of truth):
Product: {product}
Summary: {summary}
Target Audience: {audience}
Value Proposition: {value_prop}

Core Features:
{features_list}

RULES:
- 1 paragraph only, max 100 words
- Must include the value proposition
- Must appeal to {audience}
- NEVER add claims not in the fact sheet
- Tone: Formal, persuasive, benefit-focused
- Goal: Make them want to learn more

Return ONLY the email paragraph (no subject line, no signature).
"""

    blog = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": blog_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,  # Much lower for consistency
        max_tokens=1000
    ).choices[0].message.content

    social = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": social_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=500
    ).choices[0].message.content

    email = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": email_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
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
    features_list = "\n".join([f"{i+1}. {f}" for i, f in enumerate(core_features)])
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    # Build specific correction instructions
    corrections = []
    approved_pieces = []
    
    for piece in ["blog_post", "social_thread", "email_teaser"]:
        if review.get(piece, {}).get("status") == "rejected":
            note = review[piece].get("correction_note", "")
            piece_display = piece.replace("_", " ").title()
            corrections.append(f"- {piece_display}: {note}")
        else:
            approved_pieces.append(piece)

    corrections_text = "\n".join(corrections) if corrections else "No corrections needed"
    approved_text = ", ".join(p.replace("_", " ").title() for p in approved_pieces)

    prompt = f"""
You are an expert marketing copywriter. Your previous content needs fixes based on editor feedback.

FACT SHEET (PRIMARY TRUTH):
Product: {product}
Summary: {summary}
Target Audience: {audience}
Value Proposition: {value_prop}

Core Features (reference by number only):
{features_list}

PREVIOUS CONTENT:
Blog Post: {previous_content.get("blog_post", "")}
Social Thread: {previous_content.get("social_thread", "")}
Email Teaser: {previous_content.get("email_teaser", "")}

EDITOR FEEDBACK TO FIX:
{corrections_text}

APPROVED PIECES (keep exactly as-is):
{approved_text if approved_text else "None"}

CRITICAL RULES:
1. NEVER mention any features, specs, claims, or facts NOT in the numbered list above
2. ONLY reference features by their number (e.g., "Feature 1", "Feature 3")
3. Keep all approved pieces exactly unchanged
4. Fix ONLY the rejected pieces based on the specific feedback
5. Ensure value proposition is central to all content
6. Do NOT add pricing, availability, or unverified claims

Return ONLY valid JSON:
{{
  "blog_post": "blog post text",
  "social_thread": "social thread text",
  "email_teaser": "email teaser text"
}}

No markdown, no backticks, no explanation.
"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,  # Even lower for focused fixes
    )

    raw = response.choices[0].message.content.strip()

    try:
        content = json.loads(raw)
    except json.JSONDecodeError:
        # If JSON parsing fails, return the previous content to avoid breaking
        content = previous_content

    return content


def run_copywriter_blog_only(fact_sheet: dict) -> str:
    """Generate only the blog post"""
    product = fact_sheet.get("product_name", "the product")
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features_list = "\n".join([f"{i+1}. {f}" for i, f in enumerate(core_features)])
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    blog_prompt = f"""
You are a professional content writer. Write a 500-word blog post about {product}.

FACT SHEET (ONLY source of truth - do NOT invent):
Product: {product}
Summary: {summary}
Target Audience: {audience}
Value Proposition: {value_prop}

Core Features (reference by number):
{features_list}

RULES:
- ONLY mention features 1-{len(core_features)} from the list above
- NEVER add features, specs, or prices not listed
- Structure: Introduction → Feature highlights (reference by number) → Conclusion on value proposition
- Tone: Professional, trustworthy, informative
- Focus: Why the value proposition matters to the {audience}

Return ONLY the blog post text (no title, no metadata).
"""

    blog = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": blog_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=1000
    ).choices[0].message.content

    return blog


def run_copywriter_social_only(fact_sheet: dict) -> str:
    """Generate only the social media thread"""
    product = fact_sheet.get("product_name", "the product")
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features_list = "\n".join([f"{i+1}. {f}" for i, f in enumerate(core_features)])
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    social_prompt = f"""
You are a social media copywriter. Write a 5-post Twitter/X thread about {product}.

FACT SHEET (ONLY source of truth):
Product: {product}
Summary: {summary}
Target Audience: {audience}
Value Proposition: {value_prop}

Core Features (reference by number):
{features_list}

RULES:
- Post 1: Hook about the value proposition for {audience}
- Posts 2-4: Each post highlights ONE feature (e.g., "Feature 1 is...", "Feature 3 helps...")
- Post 5: Call-to-action based on value proposition
- NEVER mention features not in the list above
- Keep each post under 280 characters
- Use 1-2 relevant emojis per post
- Tone: Engaging, punchy, conversational

Format as:
1/ [post 1]
2/ [post 2]
3/ [post 3]
4/ [post 4]
5/ [post 5]

Return ONLY the formatted thread.
"""

    social = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": social_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=500
    ).choices[0].message.content

    return social


def run_copywriter_email_only(fact_sheet: dict) -> str:
    """Generate only the email teaser"""
    product = fact_sheet.get("product_name", "the product")
    value_prop = fact_sheet.get("filtered_value_proposition", fact_sheet.get("value_proposition", ""))
    core_features = fact_sheet.get("filtered_core_features", fact_sheet.get("core_features", []))
    features_list = "\n".join([f"{i+1}. {f}" for i, f in enumerate(core_features)])
    audience = fact_sheet.get("target_audience", "")
    summary = fact_sheet.get("filtered_summary", fact_sheet.get("summary", ""))

    email_prompt = f"""
You are an email marketing specialist. Write a compelling email teaser for {product}.

FACT SHEET (ONLY source of truth):
Product: {product}
Summary: {summary}
Target Audience: {audience}
Value Proposition: {value_prop}

Core Features:
{features_list}

RULES:
- 1 paragraph only, max 100 words
- Must include the value proposition
- Must appeal to {audience}
- NEVER add claims not in the fact sheet
- Tone: Formal, persuasive, benefit-focused
- Goal: Make them want to learn more

Return ONLY the email paragraph (no subject line, no signature).
"""

    email = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": email_prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=200
    ).choices[0].message.content

    return email