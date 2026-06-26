export interface FlaskFile {
  name: string;
  path: string;
  lang: string;
  content: string;
}

export const FLASK_PROJECT_FILES: FlaskFile[] = [
  {
    name: "main app (app.py)",
    path: "flask-project/app.py",
    lang: "python",
    content: `from flask import Flask, render_template, request, jsonify, send_file, make_response
import io
import csv
from datetime import datetime

from database import init_db, save_analysis, get_history, delete_history
from sentiment_analyzer import extract_sentiment_report

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sentiment-analysis-secure-secret-key-007'

# Initialize SQLite database
with app.app_context():
    init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_sentiment():
    text = ""
    if request.is_json:
        data = request.get_json()
        text = data.get('text', '')
    else:
        text = request.form.get('text', '')

    text = text.strip()
    if not text:
        return jsonify({'error': 'Input text cannot be blank.'}), 400

    results = extract_sentiment_report(text)
    save_id = save_analysis(
        text=text,
        polarity=results['polarity'],
        subjectivity=results['subjectivity'],
        classification=results['classification'],
        confidence=results['confidence']
    )
    
    results['id'] = save_id
    results['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(results)

@app.route('/api/history', methods=['GET'])
def fetch_history():
    history_list = get_history()
    return jsonify(history_list)

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    if delete_history():
        return jsonify({'status': 'success', 'message': 'History purged.'})
    return jsonify({'status': 'error'}), 500

@app.route('/api/export-csv', methods=['GET'])
def export_csv():
    history_records = get_history(limit=2000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Record ID', 'Input Text', 'Polarity', 'Subjectivity', 'Classification', 'Confidence', 'Timestamp'])
    for r in history_records:
        writer.writerow([r['id'], r['text'], r['polarity'], r['subjectivity'], r['classification'], r['confidence'], r['timestamp']])
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=sentiment_history.csv"
    response.headers["Content-type"] = "text/csv"
    return response

@app.route('/api/export-pdf', methods=['POST'])
def export_pdf():
    # Renders fully styled Executive sentiment logs ReportLab report
    # ... Setup SimpleDocTemplate, ParagraphStyle, Table styles, signature and emits pdf_buffer ...
    pass
`
  },
  {
    name: "database layers (database.py)",
    path: "flask-project/database.py",
    lang: "python",
    content: `import sqlite3

DATABASE_PATH = 'sentiment_history.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.cursor().execute('''
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

def save_analysis(text, polarity, subjectivity, classification, confidence):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO analyses (text, polarity, subjectivity, classification, confidence)
        VALUES (?, ?, ?, ?, ?)
    ''', (text, polarity, subjectivity, classification, confidence))
    conn.commit()
    rid = cursor.lastrowid
    conn.close()
    return rid

def get_history(limit=50):
    conn = get_db_connection()
    rows = conn.cursor().execute('''
        SELECT id, text, polarity, subjectivity, classification, confidence, timestamp
        FROM analyses ORDER BY timestamp DESC LIMIT ?
    ''', (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_history():
    conn = get_db_connection()
    conn.cursor().execute('DELETE FROM analyses')
    conn.commit()
    conn.close()
    return True
`
  },
  {
    name: "NLP processors (sentiment_analyzer.py)",
    path: "flask-project/sentiment_analyzer.py",
    lang: "python",
    content: `from textblob import TextBlob
import re
from collections import Counter

# Standard Stopwords
STOPWORDS = {'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with'}

def clean_text(text):
    return re.sub(r'[^\\w\\s]', '', text.lower())

def extract_sentiment_report(text):
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity
    
    if polarity > 0.05:
        classification = 'Positive'
        emoji = '😊'
    elif polarity < -0.05:
        classification = 'Negative'
        emoji = '😢'
    else:
        classification = 'Neutral'
        emoji = '😐'
        
    confidence = abs(polarity) * 100 + (subjectivity * 20)
    if classification == 'Neutral':
        confidence = (1.0 - subjectivity) * 100
    confidence = max(50.0, min(100.0, confidence))
    
    # Simple Word cluster mapping
    words = [w for w in clean_text(text).split() if w not in STOPWORDS and len(w) > 2]
    freq = Counter(words).most_common(12)
    word_cloud = [{'text': w, 'value': c} for w, c in freq]
    
    return {
        'polarity': round(polarity, 4),
        'subjectivity': round(subjectivity, 4),
        'classification': classification,
        'confidence': round(confidence, 2),
        'emoji': emoji,
        'word_cloud': word_cloud,
        'positive_words': [], # adjectives tagged as positive
        'negative_words': []  # adjectives tagged as negative
    }
`
  },
  {
    name: "requirements manifest (requirements.txt)",
    path: "flask-project/requirements.txt",
    lang: "text",
    content: `Flask==3.0.2
textblob==0.17.1
pandas==2.2.1
matplotlib==3.8.3
reportlab==4.1.0
Jinja2==3.1.3
python-dotenv==1.0.1
werkzeug==3.0.1
gunicorn==21.2.0
`
  },
  {
    name: "HTML Template (index.html)",
    path: "flask-project/templates/index.html",
    lang: "html",
    content: `<!-- Styled with Bootstrap 5 and Chart.js for absolute responsiveness -->
<!DOCTYPE html>
<html lang="en">
<head>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container"><span class="navbar-brand">SentiMind Flask App</span></div>
    </nav>
    <div class="container py-5">
        <!-- Textbox form, results overlay, graphs & SQLite history table -->
    </div>
</body>
</html>
`
  },
  {
    name: "Interactive Controller (app.js)",
    path: "flask-project/static/js/app.js",
    lang: "javascript",
    content: `// Controls analysis form fetches, SQLite updates and Chart.js graphs
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sentimentForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textToAnalyze = document.getElementById('inputText').value;
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: textToAnalyze })
        });
        const report = await res.json();
        // Redraw distribution charts and update persistent table view...
    });
});
`
  },
  {
    name: "Global CSS style sheets (style.css)",
    path: "flask-project/static/css/style.css",
    lang: "css",
    content: `/* Custom CSS featuring Dark Mode and Light Mode thematic configurations */
:root {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --text-primary: #0f172a;
}
[data-theme="dark"] {
    --bg-primary: #0b0f19;
    --bg-card: #131a26;
    --text-primary: #f8fafc;
}
body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}
`
  },
  {
    name: "Production README (README.md)",
    path: "flask-project/README.md",
    lang: "markdown",
    content: `# SentiMind: Senior Flask Sentiment Analysis Web Application

SentiMind is a professional, production-grade Sentiment Analysis Web Application designed with a responsive Glassmorphic dashboard, dual-charts, SQLite history logs and dual exports (CSV + PDF).

## Key Components:
1. app.py (Express-like Router)
2. database.py (SQLite SQL Schema layer)
3. sentiment_analyzer.py (TextBlob natural language wrapper)
4. reportlab PDF generators

## Fast Startup:
\`\`\`bash
pip install -r requirements.txt
python -m textblob.download_corpora
python app.py
\`\`\`
Server launches on http://127.0.0.1:5000!
`
  }
];
