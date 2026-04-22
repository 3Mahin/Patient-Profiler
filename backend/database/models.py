import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'patients.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    # Create patients table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dob TEXT,
            image_path TEXT,
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Safely migrate existing databases
    try:
        cursor.execute('ALTER TABLE patients ADD COLUMN image_path TEXT')
    except sqlite3.OperationalError:
        pass # Column already exists
        
    try:
        cursor.execute('ALTER TABLE patients ADD COLUMN summary TEXT')
    except sqlite3.OperationalError:
        pass # Column already exists

    # Create records table for extracted history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            extracted_data TEXT, -- JSON string containing medications, surgeries, tests
            source_file TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patient_id) REFERENCES patients(id)
        )
    ''')
    conn.commit()
    conn.close()

def add_patient(name: str, dob: str = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO patients (name, dob) VALUES (?, ?)', (name, dob))
    patient_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return patient_id

def get_patients():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM patients ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_patient_image(patient_id: int, image_path: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE patients SET image_path = ? WHERE id = ?', (image_path, patient_id))
    conn.commit()
    conn.close()

def update_patient_summary(patient_id: int, summary: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE patients SET summary = ? WHERE id = ?', (summary, patient_id))
    conn.commit()
    conn.close()

def save_patient_history(patient_id: int, extracted_data: dict, source_file: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO patient_history (patient_id, extracted_data, source_file)
        VALUES (?, ?, ?)
    ''', (patient_id, json.dumps(extracted_data), source_file))
    conn.commit()
    conn.close()

def get_patient_history(patient_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Fetch patient's master summary
    cursor.execute('SELECT summary FROM patients WHERE id = ?', (patient_id,))
    patient_row = cursor.fetchone()
    master_summary = patient_row['summary'] if patient_row and patient_row['summary'] else ""
    
    cursor.execute('SELECT * FROM patient_history WHERE patient_id = ? ORDER BY created_at ASC', (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    
    # Merge histories from multiple files
    merged_history = {"summary": master_summary, "medications": [], "surgeries": [], "tests": []}
    for row in rows:
        try:
            data = json.loads(row['extracted_data'])
                
            for key in ["medications", "surgeries", "tests"]:
                if key in data and isinstance(data[key], list):
                    merged_history[key].extend(data[key])
        except Exception:
            pass
            
    # Deduplicate based on name
    for key in ["medications", "surgeries", "tests"]:
        unique_items = []
        seen_names = set()
        # Process in reverse so we keep the most recently added items (e.g. latest date) when deduplicating
        for item in reversed(merged_history[key]):
            if isinstance(item, dict) and "name" in item:
                name = item["name"].lower().strip()
                if name not in seen_names:
                    seen_names.add(name)
                    unique_items.append(item)
            elif isinstance(item, str):
                name = item.lower().strip()
                if name not in seen_names:
                    seen_names.add(name)
                    unique_items.append({"name": item, "date": "Date not available"})
        # Reverse back to maintain chronological order
        unique_items.reverse()
        merged_history[key] = unique_items
        
    return merged_history

# Initialize the db on import
init_db()
