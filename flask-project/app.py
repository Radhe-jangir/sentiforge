from flask import Flask, render_template, request, jsonify, send_file, make_response
import io
import csv
from datetime import datetime

from database import init_db, save_analysis, get_history, delete_history
from sentiment_analyzer import extract_sentiment_report

# Initialize Flask application
app = Flask(__name__)
app.config['SECRET_KEY'] = 'sentiment-analysis-secure-secret-key-007'

# Initialize the SQLite database on startup
with app.app_context():
    init_db()

@app.route('/')
def index():
    """Renders the main single-page web dashboard application."""
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_sentiment():
    """
    Core API endpoint to analyze text sentiment.
    Parses incoming JSON or Form Data, runs TextBlob NLP, saves results to SQLite DB,
    and returns a fully populated JSON response.
    """
    text = ""
    if request.is_json:
        data = request.get_json()
        text = data.get('text', '')
    else:
        text = request.form.get('text', '')

    text = text.strip()
    if not text:
        return jsonify({'error': 'Input text cannot be blank.'}), 400

    # Execute text analysis using the TextBlob pipeline
    results = extract_sentiment_report(text)

    # Persist the output in the SQLite Database
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
    """Retrieves previous analyses from database for analytics visualization."""
    limit = request.args.get('limit', default=50, type=int)
    history_list = get_history(limit=limit)
    return jsonify(history_list)

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    """Removes all stored sentiment histories in the SQLite database."""
    success = delete_history()
    if success:
        return jsonify({'status': 'success', 'message': 'All history successfully deleted.'})
    else:
        return jsonify({'status': 'error', 'message': 'Failed to delete database logs.'}), 500

@app.route('/api/export-csv', methods=['GET'])
def export_csv():
    """
    Queries past sqlite database analysis records, generates an in-memory 
    CSV sheet, and triggers a download stream response.
    """
    history_records = get_history(limit=2000) # Fetch ample history for the user's records
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Header row
    writer.writerow(['Record ID', 'Input Text', 'Polarity (-1 to 1)', 'Subjectivity (0 to 1)', 'Classification', 'Confidence (%)', 'Analyzed Time (UTC)'])
    
    # Write Row outputs
    for row in history_records:
        writer.writerow([
            row['id'],
            row['text'],
            row['polarity'],
            row['subjectivity'],
            row['classification'],
            row['confidence'],
            row['timestamp']
        ])
    
    # Prepare HTTP headers
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename=sentiment_history_export_{datetime.now().strftime('%Y%m%d%H%M')}.csv"
    response.headers["Content-type"] = "text/csv"
    return response

@app.route('/api/export-pdf', methods=['POST'])
def export_pdf():
    """
    Builds and downloads a highly-polished sentiment analysis PDF report
    on the analyzed sentence, using the ReportLab module.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
    except ImportError:
        return jsonify({'error': 'ReportLab is not installed. Add reportlab to requirements.txt.'}), 500
        
    data = request.get_json() or {}
    text = data.get('text', 'No content analyzed')
    polarity = data.get('polarity', 0.0)
    subjectivity = data.get('subjectivity', 0.0)
    classification = data.get('classification', 'Neutral')
    confidence = data.get('confidence', 100.0)
    timestamp = data.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    # Setup PDF bytes buffer
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom elegant styles for the document
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1E293B'), # Slate 800
        spaceAfter=15,
        alignment=1 # Centered
    )
    
    h2_style = ParagraphStyle(
        'HeaderSecondary',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#0F172A'), # Slate 900
        spaceBefore=15,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569'), # Slate 600
        leading=14
    )
    
    # Document Header
    story.append(Paragraph("SENTIMENT ANALYSIS REPORT", title_style))
    story.append(Paragraph(f"Generated on {timestamp} UTC", ParagraphStyle('Sub', parent=body_style, alignment=1)))
    story.append(Spacer(1, 20))
    
    # Analyzed Text Section
    story.append(Paragraph("Analyzed Text Statement", h2_style))
    story.append(Paragraph(f'"{text}"', ParagraphStyle('Quotes', parent=body_style, fontName='Helvetica-Oblique', fontSize=11, leading=16, textColor=colors.HexColor('#334155'))))
    story.append(Spacer(1, 15))
    
    # Results Metrics Grid Table
    story.append(Paragraph("Sentiment Analysis Metrics", h2_style))
    
    # Determine result color representation
    sentiment_color = colors.HexColor('#6B7280') # gray
    if classification == 'Positive':
        sentiment_color = colors.HexColor('#10B981') # emerald
    elif classification == 'Negative':
        sentiment_color = colors.HexColor('#EF4444') # red
        
    table_data = [
        [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Score / Value</b>", body_style), Paragraph("<b>Interpretation</b>", body_style)],
        [Paragraph("Classification Rating", body_style), Paragraph(f"<font color='{sentiment_color}'><b>{classification}</b></font>", body_style), Paragraph(f"Main emotional tone is {classification.lower()}", body_style)],
        [Paragraph("Polarity Score", body_style), Paragraph(f"<b>{polarity}</b>", body_style), Paragraph("Range [-1.0, 1.0] where 1.0 is highly positive and -1.0 is highly negative", body_style)],
        [Paragraph("Subjectivity Score", body_style), Paragraph(f"<b>{subjectivity}</b>", body_style), Paragraph("Range [0.0, 1.0] where 1.0 is opinion-based and 0.0 is purely objective", body_style)],
        [Paragraph("Confidence Percentage", body_style), Paragraph(f"<b>{confidence}%</b>", body_style), Paragraph("Statistical rating of class certainty", body_style)]
    ]
    
    t = Table(table_data, colWidths=[150, 120, 250])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(t)
    story.append(Spacer(1, 25))
    
    # Explanatory footer
    story.append(Paragraph("Understanding Sentimental Polarity and Subjectivity", h2_style))
    story.append(Paragraph("<b>Polarity Score</b>: Indicates whether the statement sentiment is positive, negative or neutral. Polarities above +0.05 are classified positive, below -0.05 are negative, and any score in between are deemed objective or neutral.", body_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Subjectivity Score</b>: Quantifies how opinionated or subjective the analyzed text is. High values close to 1.0 indicate strong usage of personal adjectives, opinions, feelings, or speculations, whereas scores near 0.0 indicate high factual density, statements of truth or factual assertions.", body_style))
    story.append(Spacer(1, 40))
    
    # Signature/Brand layout
    story.append(Paragraph("Report issued by - Python-Flask Sentiment Engine SDK", ParagraphStyle('FooterBrand', parent=body_style, fontSize=8, alignment=1)))
    
    # Build Document
    doc.build(story)
    
    pdf_buffer.seek(0)
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"sentiment_report_{datetime.now().strftime('%Y%m%d%H%M')}.pdf",
        mimetype='application/pdf'
    )

if __name__ == '__main__':
    # Bind server to port 5000 or local setting, the React fullstack runs alongside on port 3000
    app.run(host='0.0.0.0', port=5000, debug=True)
