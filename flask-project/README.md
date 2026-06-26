# SentiMind: Senior Flask Sentiment Analysis Web Application

SentiMind is a professional, production-grade Sentiment Analysis Web Application designed with a highly responsive glassmorphic dashboard interface, interactive analytical charts, and localized persistence. Built using Python, Flask (v3), TextBlob NLP, and SQLite, this project represents an internship-level, resume-worthy asset perfect for showcasing on GitHub, portfolios, or LinkedIn.

---

## 🚀 Key Features

*   **Real-time Sentiment Diagnostics**: Instant evaluation of text statements to output polarity, subjectivity, classification (Positive, Negative, Neutral), and confidence scores.
*   **Vocabulary Indicator Clusters (Word Cloud)**: Dynamic extraction of high-frequency words, highlighting emotional emphasis for user analysis.
*   **Dual-Chart Interactive Analytics Dashboard**:
    1.  *Tone Categorization Doughnut*: Breakdowns of positive vs. negative vs. neutral content logs.
    2.  *Polarity Scoring Bar Distribution*: Detailed categorization index charts displaying sentiment severity variations.
*   **Full Database History Registry (SQLite3)**: Persistent structured history of all analyzed statements complete with sorting records and precise timestamps.
*   **Dual Format Result Exporting**:
    *   **CSV Spreadsheet**: Complete session data logs downloadable in standard sheet formats.
    *   **PDF Diagnostic Report**: Structured executive reports auto-compiled on the fly via `reportlab` featuring clean custom typography grids.
*   **State-of-the-art Dark/Light Mode Engine**: Seamless theme switching saved persistently inside the browser's local cache.

---

## 🗄️ Database Schema & Architecture

The application uses **SQLite3** for durable local persistence, requiring zero separate setup. 

### Table Definition: `analyses`
```sql
CREATE TABLE analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    polarity REAL NOT NULL,
    subjectivity REAL NOT NULL,
    classification TEXT NOT NULL,
    confidence REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Script & Directory Layout
```filepath
/flask-project/
├── app.py                       # Core Flask Router & API Endpoints
├── database.py                  # SQLite Connection & Helper Operations
├── sentiment_analyzer.py        # TextBlob NLP Engine & stopword filters
├── requirements.txt             # Unified Dependency Manifest
├── README.md                    # Installation & Deployment Guide
├── templates/
│   └── index.html               # Frontend Bootstrap Layout Dashboard
└── static/
    ├── css/
    │   └── style.css            # Dark/Light theme styles
    └── js/
        └── app.js               # Client controller (Chart.js & Form fetches)
```

---

## 🛠️ Step-by-Step Installation

### Prerequisites
Make sure you have **Python 3.9+** and `pip` installed on your machine.

### 1. Clone the repository / Unpack ZIP
```bash
git clone https://github.com/your-username/flask-sentiment-analyzer.git
cd flask-sentiment-analyzer/flask-project
```

### 2. Create and Activate a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Download NLTK Corpora Required by TextBlob
TextBlob relies on certain corpora data paths for parsing. Execute the following in your terminal to seed NLP models:
```bash
python -m textblob.download_corpora
```

### 5. Run the Server
```bash
python app.py
```
Your local server will boot on **`http://127.0.0.1:5000`**. Open this address inside your preferred web browser to run the live dashboard.

---

## 🛡️ Input Validation & Error Handling

*   **Empty inputs**: Standard frontend validation constraints prevent empty form submissions. Backend verifies empty payloads, throwing a clean standard `400 Bad Request` API wrapper instead of crashing.
*   **Special characters**: Regular expressions parse text safely before text processing triggers to prevent lexical matching errors.
*   **SQLite exceptions**: All database transactions are structured inside standard python `try-except` blocks, logging errors gracefully.

---

## ☁️ Deployment Instructions

### Option 1: Deploying to Render (Free Tier Hosting)

Render provides direct seamless hosting for Python Flask repositories. Follow these quick steps:

1.  Push the project code block to your personal **GitHub** repository.
2.  Log in to the [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
3.  Connect your GitHub repository to Render.
4.  Configure the settings on the Creation form:
    *   **Name**: `sentiment-analysis-dashboard`
    *   **Environment**: `Python`
    *   **Region**: Select a region closest to your users.
    *   **Branch**: `main`
    *   **Build Command**: `pip install -r requirements.txt && python -m textblob.download_corpora`
    *   **Start Command**: `gunicorn app:app` (Note: `gunicorn` package is pre-included in the `requirements.txt`).
5.  Click **Deploy Web Service**. Render will compile package hooks and activate your live URL!

### Option 2: Deploying to GitHub Pages (Client Side Static Wrapper)
*Note: GitHub Pages can only host client-side assets and cannot run the Python Flask backend directly. Keep the codebase open-source on GitHub to showcase full-stack code blocks directly in your portfolio!*

---

## 📊 Sample Visualizations Layout

```text
+-----------------------------------+----------------------------------+
|      [ SentiMind Navbar ]         |  Theme Change: [ Light / Dark ]  |
+-----------------------------------+----------------------------------+
|                                                                      |
|  [ Input Box ]                    |  [ Live Outputs ]                |
|  "This product is outstanding!"   |  Rating: positive 😊              |
|                                   |  Certainty: 95.2%                |
|  [ Analyze Button ]               |  Sentiment: +0.80                |
|                                   |                                  |
+-----------------------------------+----------------------------------+
|                                                                      |
|                       ANALYTICS DASHBOARD                            |
|                                                                      |
|  Total Analyses: 15               |  Avg Polarity: +0.47             |
|                                                                      |
|  [ Tone Doughnut Chart ]          |   [ Polarity Bar Chart ]         |
|  [### Emerald: Positive (70%) ]   |   [-1.0 ................. +1.0]  |
|  [### Red: Negative   (20%) ]     |   [      ||||||||||||     ]  |
|                                   |                                  |
+-----------------------------------+----------------------------------+
```

---

*This project is completely modular, enabling high scalability. Feel free to clone, star, or submit pull requests for additional visualizations!*
