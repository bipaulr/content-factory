import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def run_researcher(source_text: str) -> dict:
    # Step 1: Extract facts from source
    extraction_prompt = f"""
You are a research analyst. Read the following source document carefully and extract a structured fact sheet.

Return ONLY a valid JSON object with this exact structure:
{{
  "product_name": "name of the product or topic",
  "summary": "2-3 sentence summary of what this is about",
  "core_features": ["feature 1", "feature 2", "feature 3"],
  "technical_specs": ["spec 1", "spec 2"],
  "target_audience": "who this is for",
  "value_proposition": "the single most important benefit or selling point",
  "ambiguous_statements": ["any unclear or vague claims that could cause confusion"]
}}

Source Document:
{source_text}

Return only the JSON. No explanation, no markdown, no backticks.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": extraction_prompt}
        ],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()

    try:
        fact_sheet = json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Failed to parse response", "raw": raw}

    # Step 2: Validate extracted facts against source
    fact_sheet = _validate_against_source(fact_sheet, source_text)
    
    return fact_sheet


def _validate_against_source(fact_sheet: dict, source_text: str) -> dict:
    """
    Validate each extracted claim appears in or is directly supported by the source text.
    Returns fact_sheet with verification_status and filtered fields.
    """
    
    # Build validation prompt
    validation_prompt = f"""
You are a strict fact-checker. I extracted a fact sheet from a source document. Your job is to verify that each claim is actually substantiated by concrete details in the source.

IMPORTANT: A claim is only VERIFIED if the source provides:
- Specific technical details or numbers
- Clear, explicit statements (not vague marketing language)
- Evidence that directly supports the claim

Vague claims (e.g., "quantum encryption" without details, "zero latency" without explanation, "blockchain AI" without specifics) are UNVERIFIED.

SOURCE DOCUMENT:
{source_text}

EXTRACTED FACT SHEET:
{json.dumps(fact_sheet, indent=2)}

For each claim, determine if it is SUBSTANTIATED with concrete evidence:
1. product_name: Does it match the source?
2. summary: Does it accurately reflect the source without marketing spin or unsupported claims?
3. core_features: For EACH feature, is it mentioned with enough detail to verify (vague mentions = unverified)?
4. technical_specs: For EACH spec, is it explicitly stated with numbers/details (vague claims = unverified)?
5. target_audience: Is it stated or clearly indicated?
6. value_proposition: Is it supported by specific claims in the source?

Return ONLY a valid JSON object with this exact structure:
{{
  "product_name_verified": true/false,
  "summary_verified": true/false,
  "core_features_verified": [true/false for each feature],
  "technical_specs_verified": [true/false for each spec],
  "target_audience_verified": true/false,
  "value_proposition_verified": true/false,
  "verification_notes": "brief explanation of which claims lack substantiation and why"
}}

Return only the JSON. No explanation, no markdown, no backticks.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": validation_prompt}
        ],
        temperature=0.2,
    )

    raw = response.choices[0].message.content.strip()

    try:
        verification = json.loads(raw)
    except json.JSONDecodeError:
        verification = {"error": "Failed to parse verification response"}

    # Build filtered fact sheet with only verified fields
    fact_sheet["verification_status"] = verification
    
    # Create filtered lists for features and specs (only verified items, empty if none verified)
    if "core_features_verified" in verification and isinstance(verification["core_features_verified"], list):
        verified_features = [
            feature for feature, verified in zip(
                fact_sheet.get("core_features", []), 
                verification["core_features_verified"]
            ) if verified
        ]
        fact_sheet["filtered_core_features"] = verified_features
    else:
        fact_sheet["filtered_core_features"] = []

    if "technical_specs_verified" in verification and isinstance(verification["technical_specs_verified"], list):
        verified_specs = [
            spec for spec, verified in zip(
                fact_sheet.get("technical_specs", []), 
                verification["technical_specs_verified"]
            ) if verified
        ]
        fact_sheet["filtered_technical_specs"] = verified_specs
    else:
        fact_sheet["filtered_technical_specs"] = []

    # Filter summary: if not verified, create a conservative one
    if verification.get("summary_verified"):
        fact_sheet["filtered_summary"] = fact_sheet.get("summary", "")
    else:
        product = fact_sheet.get("product_name", "this product")
        audience = fact_sheet.get("target_audience", "users")
        fact_sheet["filtered_summary"] = f"{product} is a solution for {audience}."

    # Filter value proposition: if not verified, create a conservative one
    if verification.get("value_proposition_verified"):
        fact_sheet["filtered_value_proposition"] = fact_sheet.get("value_proposition", "")
    else:
        fact_sheet["filtered_value_proposition"] = "A reliable solution for its intended audience."

    return fact_sheet