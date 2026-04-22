# Patient Profiler 🏥

Patient Profiler is a professional, enterprise-grade clinical dashboard designed to securely manage, analyze, and interact with patient medical records locally. Leveraging cutting-edge local AI technologies, it allows medical professionals to upload patient histories, extract structured data from medical documents, maintain a "living summary", and seamlessly chat with patient records—all without sending sensitive health data to the cloud.

## ✨ Key Features

- **Local AI-Powered Document Analysis:** Upload medical PDFs or images and automatically extract structured medical history using local Multimodal LLMs (e.g., Gemma).
- **Living Summary:** Automatically maintains and updates a concise "living summary" of a patient's health based on newly uploaded documents and chat interactions.
- **RAG Chat Interface:** Chat directly with your patient's historical records using Retrieval-Augmented Generation (ChromaDB + Local LLM) to instantly find critical medical information. Multilingual support included.
- **Enterprise-Grade UI/UX:** An optimized edge-to-edge layout maximizing screen real estate, featuring dynamic data visualization, accordion-style history segments, and real-time backend/LLM connection status indicators.
- **Privacy First:** 100% local processing. No patient data leaves your machine.

## 🛠️ Technology Stack

**Frontend:**
- React 19 (via Vite)
- React Router DOM for routing
- Lucide React for professional iconography
- Axios for API communication

**Backend:**
- Python 3 & FastAPI
- SQLite (built-in database for structured patient profiles)
- ChromaDB (vector database for RAG)
- PyMuPDF (for PDF text extraction)
- OpenAI Python SDK (used to interface with local LM Studio instance)

## 🚀 Getting Started

Follow these step-by-step instructions to get the project running locally.

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Python 3** (v3.10 or higher recommended)
3. **LM Studio**: Download and install [LM Studio](https://lmstudio.ai/).
   - Download a local model (e.g., Gemma Multimodal model or Llama 3) within LM Studio.
   - Start the Local Inference Server on port **1234** (the default).

### 1. Backend Setup

Open a terminal and navigate to the project root, then proceed to the backend directory:

```bash
cd backend
```

Create and activate a Python virtual environment:

**Windows:**
```bash
python -m venv venv
.\venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

Install the required Python packages:
```bash
pip install fastapi uvicorn pydantic chromadb pymupdf openai python-multipart
```
*(Note: `python-multipart` is required for FastAPI to handle file uploads)*

Start the FastAPI server:
```bash
uvicorn main:app --reload
```
The backend API will be running at `http://localhost:8000` (or whichever port uvicorn uses, default is 8000).

### 2. Frontend Setup

Open a **new** terminal, navigate to the project root, then proceed to the frontend directory:

```bash
cd frontend
```

Install the Node dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The frontend application will be running at `http://localhost:5173`. 

### 3. Usage

1. Open your browser and go to `http://localhost:5173`.
2. Ensure LM Studio is running on port `1234` and the local server is active.
3. Check the real-time status indicators in the dashboard header to confirm the Database and LLM are connected.
4. Add a new patient and start uploading medical documents!

## 📂 Project Structure

- `/frontend` - The React application, components, and UI logic.
- `/backend` - The FastAPI server, handling API requests.
  - `/database` - SQLite DB setup and query functions.
  - `/services` - Core business logic for LLM extraction (`llm_extractor.py`), OCR processing (`ocr_service.py`), and RAG operations (`rag_service.py`).
  - `/uploads` - Locally stored patient profile images and documents.
  - `/chroma_db` - Vector embeddings storage for the RAG system.
