import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
import os
import json

# Ensure ChromaDB uses a local directory for persistence
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
os.makedirs(DB_DIR, exist_ok=True)

# Using the Default Embedding Function for Chroma (all-MiniLM-L6-v2)
# This will download the embedding model on first run.
chroma_client = chromadb.PersistentClient(path=DB_DIR)

# Get or create a collection
collection = chroma_client.get_or_create_collection(name="patient_records")

# LM Studio endpoint for generating responses
LM_STUDIO_BASE_URL = "http://localhost:1234/v1"
llm_client = OpenAI(base_url=LM_STUDIO_BASE_URL, api_key="lm-studio")

def index_document(patient_id: int, text: str, source: str):
    """Chunks the text and adds it to the Chroma vector database."""
    # Simple chunking strategy: split by paragraphs
    chunks = [chunk.strip() for chunk in text.split("\n\n") if len(chunk.strip()) > 20]
    
    if not chunks:
        return
        
    ids = [f"{patient_id}_{source}_{i}" for i in range(len(chunks))]
    metadatas = [{"patient_id": patient_id, "source": source} for _ in chunks]
    
    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )

def chat_with_records(patient_id: int, query: str, language: str = "English", structured_history: dict = None) -> str:
    """Retrieves relevant chunks from ChromaDB and asks the local LLM to answer the query."""
    # Retrieve relevant documents
    results = collection.query(
        query_texts=[query],
        n_results=3,
        where={"patient_id": patient_id}
    )
    
    context_chunks = results['documents'][0] if results['documents'] else []
    context = "\n---\n".join(context_chunks)
    
    history_context = ""
    if structured_history:
        history_context = f"\nLATEST STRUCTURED MEDICAL HISTORY (Highest Priority):\n{json.dumps(structured_history, indent=2)}\n"
    
    system_prompt = f"""
    You are a helpful and knowledgeable medical assistant chatbot. 
    A doctor is asking you a question about a patient's medical records.
    Use ONLY the provided context to answer the doctor's question. 
    If the context does not contain the answer, say "I cannot find the answer to this in the patient's records."
    The context might contain a mix of English and Bengali.
    
    IMPORTANT INSTRUCTION: You MUST reply entirely in {language}. Do not use any other language for your response.
    {history_context}
    DOCUMENT CONTEXT:
    {context}
    """
    
    try:
        response = llm_client.chat.completions.create(
            model="local-model",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error communicating with LLM during chat: {e}")
        return "Sorry, I am unable to connect to the local LLM to answer your question."
