import sqlite3
import os

DATABASE_PATH = 'sentiment_history.db'

def get_db_connection():
    """Establishes a connection to the SQLite database with row factory enabled."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database and creates the analysis history table if it doesn't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            polarity REAL NOT NULL,
            subjectivity REAL NOT NULL,
            classification TEXT NOT NULL,
            confidence REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def save_analysis(text, polarity, subjectivity, classification, confidence):
    """
    Saves an individual sentiment analysis record into the SQLite database.
    
    Parameters:
    - text (str): The input text analyzed.
    - polarity (float): Polarity score between -1.0 and 1.0.
    - subjectivity (float): Subjectivity score between 0.0 and 1.0.
    - classification (str): Positive, Negative, or Neutral.
    - confidence (float): Percentage confidence value based on emotion indicators.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO analyses (text, polarity, subjectivity, classification, confidence)
            VALUES (?, ?, ?, ?, ?)
        ''', (text, polarity, subjectivity, classification, confidence))
        conn.commit()
        inserted_id = cursor.lastrowid
        conn.close()
        return inserted_id
    except Exception as e:
        print(f"Error saving analysis to DB: {e}")
        return None

def get_history(limit=50):
    """
    Retrieves previous sentiment analyses from the database, ordered by latest first.
    
    Parameters:
    - limit (int): Maximum number of records to fetch.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, text, polarity, subjectivity, classification, confidence, timestamp
            FROM analyses
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        # Convert sqlite3.Row objects to full dictionaries
        history = []
        for row in rows:
            history.append({
                'id': row['id'],
                'text': row['text'],
                'polarity': round(row['polarity'], 4),
                'subjectivity': round(row['subjectivity'], 4),
                'classification': row['classification'],
                'confidence': round(row['confidence'], 2),
                'timestamp': row['timestamp']
            })
        return history
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []

def delete_history():
    """Deletes all items from the analyses table to clear history."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM analyses')
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error deleting history: {e}")
        return False
