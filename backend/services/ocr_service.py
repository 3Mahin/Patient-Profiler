import fitz  # PyMuPDF
import base64
import os
from openai import OpenAI

# LM Studio local server endpoint
LM_STUDIO_BASE_URL = "http://localhost:1234/v1"
# API key is not required for LM Studio, but the client requires a string
client = OpenAI(base_url=LM_STUDIO_BASE_URL, api_key="lm-studio")

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts text from a PDF file using PyMuPDF."""
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
    return text

def extract_text_from_image(image_path: str) -> str:
    """
    Extracts text from an image by sending it to the local Gemma 4 multimodal model 
    via LM Studio's Vision API. Explicitly requests Bengali and English OCR.
    """
    try:
        # Read and base64 encode the image
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Determine mime type based on extension
        ext = os.path.splitext(image_path)[1].lower()
        mime_type = "image/jpeg" if ext in ['.jpg', '.jpeg'] else "image/png"
        
        response = client.chat.completions.create(
            model="local-model", # LM Studio maps this to whatever model is currently loaded
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical OCR assistant. Your job is to extract all text exactly as it appears in the image. The text may contain a mix of English and Bengali. Transcribe both languages accurately."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Please extract all the text from this medical document."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.1, # Low temp for factual transcription
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return f"[Image OCR Failed: {e}]"

def process_file(file_path: str) -> str:
    """Determines file type and extracts text accordingly."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext in ['.png', '.jpg', '.jpeg']:
        return extract_text_from_image(file_path)
    else:
        # Fallback for text files
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except:
            return "Unsupported file format."
