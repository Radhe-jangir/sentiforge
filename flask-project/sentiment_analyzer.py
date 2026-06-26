from textblob import TextBlob
import re
from collections import Counter

# Standard English stopwords to remove during word cloud calculations
STOPWORDS = set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
    'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
    'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
    'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
    'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
    'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll',
    'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we',
    'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while',
    'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
    'your', 'yours', 'yourself', 'yourselves'
])

# Quick dictionaries of high-signal emotional adjectives to isolate positive/negative indicators
POSITIVE_INDICATORS = {
    'great', 'excellent', 'wonderful', 'amazing', 'happy', 'good', 'love', 'best', 'fantastic', 'creative',
    'super', 'beautiful', 'outstanding', 'awesome', 'enjoy', 'perfect', 'glad', 'helpful', 'satisfied', 'thrilled',
    'brilliant', 'delightful', 'cool', 'nice', 'pleasant', 'recommend', 'perfectly', 'love', 'liked', 'superb'
}

NEGATIVE_INDICATORS = {
    'bad', 'worst', 'terrible', 'awful', 'horrible', 'sad', 'hate', 'angry', 'poor', 'disappointed', 'disgusting',
    'annoying', 'useless', 'broken', 'waste', 'hate', 'stupid', 'difficult', 'pain', 'fail', 'failure', 'regret',
    'sucks', 'slow', 'crash', 'dirty', 'boring', 'unhappy', 'frustrated', 'unpleasant', 'rude', 'awfully'
}

def clean_text(text):
    """Utility to clean punctuation and structure for word extractions."""
    text_clean = re.sub(r'[^\w\s]', '', text.lower())
    return text_clean

def extract_sentiment_report(text):
    """
    Performs rich lexical sentiment analysis using TextBlob on the input text.
    
    Returns a comprehensive dictionary with results, confidence, key lists, and structures for visualizers.
    """
    if not text or not text.strip():
        return {
            'polarity': 0.0,
            'subjectivity': 0.0,
            'classification': 'Neutral',
            'confidence': 100.0,
            'emoji': '😐',
            'word_cloud': [],
            'positive_words': [],
            'negative_words': []
        }
    
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity
    
    # Classification logic based on polarity thresholding
    if polarity > 0.05:
        classification = 'Positive'
        emoji = '😊'
    elif polarity < -0.05:
        classification = 'Negative'
        emoji = '😢'
    else:
        classification = 'Neutral'
        emoji = '😐'
        
    # Calculate confidence based on polarity strength and presence of emotion indicators.
    # If polarity is near +1 or -1, confidence is 100%. If neutral, confidence is determined by 
    # subjectivity or lexical neutrality.
    polarity_abs = abs(polarity)
    base_confidence = polarity_abs * 100
    
    # Subjectivity contributes to emotion conviction
    confidence = base_confidence + (subjectivity * 20)
    # Ensure range bounds [50.0, 99.9] for general sentences, or 100.0 if highly Polar
    if classification == 'Neutral':
        confidence = (1.0 - subjectivity) * 100
    
    confidence = max(50.0, min(100.0, confidence))
    
    # Clean text to parse words for word clouds and frequent adjective extractions
    cleaned_words = clean_text(text).split()
    
    # 1. Filter out stopwords and count word frequencies for Word Cloud
    words_filtered = [w for w in cleaned_words if w not in STOPWORDS and len(w) > 2]
    word_freq = Counter(words_filtered).most_common(15)
    
    # Structure word cloud data as a list of dictionaries with [{text: "word", value: count}, ...]
    word_cloud_data = [{'text': word, 'value': count} for word, count in word_freq]
    
    # 2. Extract most frequent positive and negative keywords
    pos_extracted = []
    neg_extracted = []
    
    for word in words_filtered:
        if word in POSITIVE_INDICATORS:
            pos_extracted.append(word)
        elif word in NEGATIVE_INDICATORS:
            neg_extracted.append(word)
            
    # Count totals for these indicators
    pos_count = Counter(pos_extracted).most_common(5)
    neg_count = Counter(neg_extracted).most_common(5)
    
    return {
        'polarity': round(polarity, 4),
        'subjectivity': round(subjectivity, 4),
        'classification': classification,
        'confidence': round(confidence, 2),
        'emoji': emoji,
        'word_cloud': word_cloud_data,
        'positive_words': [{'text': word, 'value': val} for word, val in pos_count],
        'negative_words': [{'text': word, 'value': val} for word, val in neg_count]
    }
