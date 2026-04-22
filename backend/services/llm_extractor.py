import json
from openai import OpenAI

# LM Studio local server endpoint
LM_STUDIO_BASE_URL = "http://localhost:1234/v1"
client = OpenAI(base_url=LM_STUDIO_BASE_URL, api_key="lm-studio")

def extract_medical_history(raw_text: str, existing_summary: str = "") -> dict:
    """
    Takes raw OCR text (potentially mixed Bengali/English) and uses the local LLM 
    to extract structured medical history.
    """
    system_prompt = f"""
    You are an expert medical data extraction assistant. 
    You will be provided with raw text from a patient's new medical records. The text may be in English, Bengali, or a mix of both.
    Your task is to extract all mentions of:
    1. A brief summary of the patient's chief complaints and current assessment.
    2. Medications (including dosage and frequency if available)
    3. Surgeries/Procedures
    4. Medical Tests/Investigations (and their results if available)
    
    If an existing summary is provided, you must intelligently merge the new findings into the existing summary to create a comprehensive living summary. Do not lose old information.
    EXISTING SUMMARY: {existing_summary}
    
    Output the extracted information ONLY as a valid JSON object with the following structure:
    {{
        "summary": "A comprehensive 2-4 sentence summary combining old and new information.",
        "medications": [{{"name": "medication 1", "date": "most recent date or 'Date not available'"}}],
        "surgeries": [{{"name": "surgery 1", "date": "most recent date or 'Date not available'"}}],
        "tests": [{{"name": "test 1", "date": "most recent date or 'Date not available'"}}]
    }}
    Translate any Bengali medical terms into English in the final JSON output. If you cannot find information for a category, use an empty list. Do not include markdown formatting like ```json ... ```, just the raw JSON string.
    """

    try:
        response = client.chat.completions.create(
            model="local-model",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the new medical record text:\n\n{raw_text}"}
            ],
            temperature=0.1
        )
        
        output_text = response.choices[0].message.content.strip()
        
        # Clean up in case the LLM wrapped it in markdown
        if output_text.startswith("```json"):
            output_text = output_text[7:]
        if output_text.startswith("```"):
            output_text = output_text[3:]
        if output_text.endswith("```"):
            output_text = output_text[:-3]
            
        return json.loads(output_text.strip())
    except Exception as e:
        print(f"Error extracting history via LLM: {e}")
        return {"summary": existing_summary, "medications": [], "surgeries": [], "tests": []}

def update_summary_from_chat(existing_summary: str, query: str, response: str) -> str:
    """
    Evaluates a chat conversation to determine if new medical facts were revealed.
    If so, updates the patient summary.
    """
    system_prompt = f"""
    You are an expert medical summarizer. 
    You have a patient's current medical summary:
    EXISTING SUMMARY: {existing_summary}
    
    A doctor just asked a question, and the medical assistant answered:
    DOCTOR QUERY: {query}
    ASSISTANT RESPONSE: {response}
    
    Task: If the conversation reveals new, important medical facts that are NOT in the existing summary, write an updated summary that incorporates these new facts. Keep it concise (2-4 sentences).
    If no new facts were revealed, simply output the EXACT EXISTING SUMMARY without any changes.
    Output ONLY the summary text, nothing else.
    """
    try:
        completion = client.chat.completions.create(
            model="local-model",
            messages=[
                {"role": "system", "content": system_prompt}
            ],
            temperature=0.1
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error updating summary from chat: {e}")
        return existing_summary
