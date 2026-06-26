import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from "url";
import { createServer as createViteServer } from 'vite';

const __dirname = process.cwd();

const DB_FILE = path.join(
  process.env.TEMP || process.env.TMPDIR || __dirname,
  "sentiment-db.json"
);

// Interface definition for DB Records
interface AnalysisRecord {
  id: number;
  text: string;
  polarity: number;
  subjectivity: number;
  classification: string;
  confidence: number;
  emoji: string;
  timestamp: string;
  positive_words: { text: string; value: number }[];
  negative_words: { text: string; value: number }[];
  word_cloud: { text: string; value: number }[];
}

interface UserRecord {
  id: number;
  username: string;
  passwordHash: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  history: (AnalysisRecord & { username?: string })[];
}

// Ensure local JSON Database exists and migrate gracefully
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], history: [] }, null, 2));
  } else {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], history: parsed }, null, 2));
      }
    } catch (e) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], history: [] }, null, 2));
    }
  }
}
initDb();

function readDb(): DatabaseSchema {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && parsed.users && parsed.history) {
      return parsed;
    }
    return { users: [], history: [] };
  } catch (err) {
    return { users: [], history: [] };
  }
}

function writeDb(db: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function readHistory(username?: string): AnalysisRecord[] {
  const db = readDb();
  if (!username) {
    return db.history.filter(item => !item.username);
  }
  return db.history.filter(item => item.username === username);
}

function writeHistory(history: AnalysisRecord[]) {
  // Backwards compatibility endpoint fallback (writes as anonymous records)
  const db = readDb();
  db.history = history;
  writeDb(db);
}

// Lexicon dictionaries for sentiment & subjectivity calculations matching TextBlob PatternAnalyzer
const POS_DICT: Record<string, { pol: number; sub: number }> = {
  great: { pol: 0.8, sub: 0.6 },
  excellent: { pol: 0.85, sub: 0.7 },
  wonderful: { pol: 0.8, sub: 0.8 },
  amazing: { pol: 0.9, sub: 0.9 },
  good: { pol: 0.5, sub: 0.4 },
  happy: { pol: 0.7, sub: 0.6 },
  love: { pol: 0.8, sub: 0.9 },
  best: { pol: 0.85, sub: 0.7 },
  fantastic: { pol: 0.9, sub: 0.85 },
  awesome: { pol: 0.85, sub: 0.8 },
  perfect: { pol: 0.95, sub: 0.8 },
  creative: { pol: 0.5, sub: 0.5 },
  super: { pol: 0.6, sub: 0.7 },
  beautiful: { pol: 0.75, sub: 0.8 },
  outstanding: { pol: 0.9, sub: 0.75 },
  enjoy: { pol: 0.6, sub: 0.5 },
  glad: { pol: 0.5, sub: 0.6 },
  helpful: { pol: 0.6, sub: 0.5 },
  satisfied: { pol: 0.6, sub: 0.5 },
  thrilled: { pol: 0.85, sub: 0.85 },
  brilliant: { pol: 0.85, sub: 0.75 },
  delightful: { pol: 0.8, sub: 0.8 },
  cool: { pol: 0.4, sub: 0.5 },
  nice: { pol: 0.4, sub: 0.4 },
  pleasant: { pol: 0.5, sub: 0.5 },
  superb: { pol: 0.9, sub: 0.8 },
  fine: { pol: 0.3, sub: 0.3 },
  recommend: { pol: 0.5, sub: 0.5 },
  ideal: { pol: 0.8, sub: 0.6 },
};

const NEG_DICT: Record<string, { pol: number; sub: number }> = {
  bad: { pol: -0.5, sub: 0.5 },
  worst: { pol: -0.85, sub: 0.7 },
  terrible: { pol: -0.8, sub: 0.8 },
  awful: { pol: -0.8, sub: 0.8 },
  horrible: { pol: -0.85, sub: 0.85 },
  sad: { pol: -0.5, sub: 0.6 },
  hate: { pol: -0.75, sub: 0.9 },
  angry: { pol: -0.6, sub: 0.8 },
  poor: { pol: -0.4, sub: 0.4 },
  disappointed: { pol: -0.6, sub: 0.8 },
  disgusting: { pol: -0.8, sub: 0.9 },
  annoying: { pol: -0.5, sub: 0.7 },
  useless: { pol: -0.65, sub: 0.8 },
  broken: { pol: -0.4, sub: 0.3 },
  waste: { pol: -0.6, sub: 0.7 },
  stupid: { pol: -0.6, sub: 0.8 },
  difficult: { pol: -0.3, sub: 0.4 },
  pain: { pol: -0.5, sub: 0.6 },
  fail: { pol: -0.5, sub: 0.5 },
  failure: { pol: -0.6, sub: 0.6 },
  regret: { pol: -0.5, sub: 0.7 },
  sucks: { pol: -0.7, sub: 0.8 },
  slow: { pol: -0.3, sub: 0.4 },
  crash: { pol: -0.4, sub: 0.4 },
  dirty: { pol: -0.4, sub: 0.5 },
  boring: { pol: -0.4, sub: 0.6 },
  unhappy: { pol: -0.5, sub: 0.65 },
  frustrated: { pol: -0.6, sub: 0.8 },
  unpleasant: { pol: -0.5, sub: 0.6 },
  rude: { pol: -0.5, sub: 0.7 },
  ugly: { pol: -0.5, sub: 0.6 },
  annoyed: { pol: -0.55, sub: 0.75 },
};

const NEGATIONS = new Set(["not", "no", "never", "dont", "cant", "wont", "didnt", "isnt", "arent", "wasnt", "werent", "without"]);

const INTENSIFIERS: Record<string, number> = {
  very: 1.5,
  extremely: 2.0,
  highly: 1.8,
  so: 1.3,
  super: 1.5,
  incredibly: 2.0,
  slightly: 0.6,
  partially: 0.5,
  bit: 0.7,
  somewhat: 0.8,
};

const STOPWORDS = new Set([
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
]);

// NLP Lexical analysis implementation mapping TextBlob's behaviour
function runSentimentAnalysis(text: string) {
  if (!text || !text.trim()) {
    return {
      polarity: 0.0,
      subjectivity: 0.0,
      classification: 'Neutral',
      confidence: 100.0,
      emoji: '😐',
      clean_words: [],
      word_cloud: [],
      positive_words: [],
      negative_words: []
    };
  }

  const cleanedText = text.toLowerCase().replace(/[^\w\s]/g, '');
  const words = cleanedText.split(/\s+/).filter(Boolean);

  let totalPolarity = 0.0;
  let totalSubjectivity = 0.1; // Default low-level background subjectivity
  let sentimentBearingCount = 0;
  let wordCountObj: Record<string, number> = {};

  const positiveWordsExtracted: Record<string, number> = {};
  const negativeWordsExtracted: Record<string, number> = {};

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Filter stopwords for cloud counting
    if (!STOPWORDS.has(word) && word.length > 2) {
      wordCountObj[word] = (wordCountObj[word] || 0) + 1;
    }

    let wordPolarity = 0.0;
    let wordSubjectivity = 0.0;
    let matchingRecord: { pol: number; sub: number } | null = null;

    if (POS_DICT[word]) {
      matchingRecord = POS_DICT[word];
      positiveWordsExtracted[word] = (positiveWordsExtracted[word] || 0) + 1;
    } else if (NEG_DICT[word]) {
      matchingRecord = NEG_DICT[word];
      negativeWordsExtracted[word] = (negativeWordsExtracted[word] || 0) + 1;
    }

    if (matchingRecord) {
      wordPolarity = matchingRecord.pol;
      wordSubjectivity = matchingRecord.sub;

      // Check for intensity multipliers in preceding 2 words
      let multiplier = 1.0;
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const precedingWord = words[j];
        if (INTENSIFIERS[precedingWord]) {
          multiplier *= INTENSIFIERS[precedingWord];
        }
      }
      wordPolarity *= multiplier;

      // Check for negation words in preceding 2 words
      let negated = false;
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const precedingWord = words[j];
        if (NEGATIONS.has(precedingWord)) {
          negated = true;
        }
      }
      if (negated) {
        wordPolarity *= -0.8; // invert and dampen polarity
      }

      totalPolarity += wordPolarity;
      totalSubjectivity += wordSubjectivity;
      sentimentBearingCount++;
    }
  }

  // Calculate final indexes
  let finalPolarity = 0.0;
  if (sentimentBearingCount > 0) {
    finalPolarity = totalPolarity / Math.sqrt(sentimentBearingCount);
  }
  // Clamp boundaries between [-1.0, 1.0]
  finalPolarity = Math.max(-1.0, Math.min(1.0, finalPolarity));

  // Determine subjectivity index
  let finalSubjectivity = totalSubjectivity / (sentimentBearingCount > 0 ? Math.sqrt(sentimentBearingCount) : 1);
  // Add scaling based on adjective density
  if (words.length > 0) {
    finalSubjectivity += (sentimentBearingCount / words.length) * 0.3;
  }
  finalSubjectivity = Math.max(0.0, Math.min(1.0, finalSubjectivity));

  // If text is extremely short and has no qualifiers, reduce subjectivity or default polarity
  if (sentimentBearingCount === 0) {
    finalPolarity = 0.0;
    finalSubjectivity = Math.max(0.05, 0.15 - (words.length * 0.01));
  }

  // Classify Sentiment
  let classification = 'Neutral';
  let emoji = '😐';
  if (finalPolarity > 0.05) {
    classification = 'Positive';
    emoji = '😊';
  } else if (finalPolarity < -0.05) {
    classification = 'Negative';
    emoji = '😢';
  }

  // Confidence calculation
  const polarityAbs = Math.abs(finalPolarity);
  let baseConfidence = polarityAbs * 100;
  let finalConfidence = baseConfidence + (finalSubjectivity * 20);

  if (classification === 'Neutral') {
    finalConfidence = (1.0 - finalSubjectivity) * 100;
  }
  finalConfidence = Math.max(50.0, Math.min(100.0, finalConfidence));

  // Map Word Cloud list sorted by occurrence
  const sortedWordCloud = Object.entries(wordCountObj)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const sortedPosList = Object.entries(positiveWordsExtracted)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const sortedNegList = Object.entries(negativeWordsExtracted)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    polarity: parseFloat(finalPolarity.toFixed(4)),
    subjectivity: parseFloat(finalSubjectivity.toFixed(4)),
    classification,
    confidence: parseFloat(finalConfidence.toFixed(2)),
    emoji,
    word_cloud: sortedWordCloud,
    positive_words: sortedPosList,
    negative_words: sortedNegList
  };
}

// Active live session engine map (Token -> Username)
const SESSIONS = new Map<string, string>();

function getUsernameFromReq(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return SESSIONS.get(match[1]) || null;
}

// REST Express application setup
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- REST ENDPOINTS ---

  // Standard API health report
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // --- AUTH ENDPOINTS ---
  app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || !username.trim() || !password.trim()) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const db = readDb();
    const exists = db.users.some(u => u.username === cleanUsername);
    if (exists) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
    const user: UserRecord = {
      id: newId,
      username: cleanUsername,
      passwordHash: hashPassword(password)
    };
    db.users.push(user);
    writeDb(db);

    const token = crypto.randomBytes(32).toString('hex');
    SESSIONS.set(token, cleanUsername);

    res.json({ status: 'success', token, username: cleanUsername });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find(u => u.username === cleanUsername);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    SESSIONS.set(token, cleanUsername);

    res.json({ status: 'success', token, username: cleanUsername });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        SESSIONS.delete(match[1]);
      }
    }
    res.json({ status: 'success', message: 'Successfully logged out.' });
  });

  app.get('/api/auth/user', (req, res) => {
    const username = getUsernameFromReq(req);
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.json({ username });
  });

  // Sentiment Analysis routing endpoint
  app.post('/api/analyze', (req, res) => {
    const text = (req.body.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Text content to evaluate cannot be blank.' });
    }

    const nlpData = runSentimentAnalysis(text);
    const username = getUsernameFromReq(req);
    const db = readDb();
    const history = db.history;
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newId = history.length > 0 ? Math.max(...history.map(item => item.id)) + 1 : 1;

    const record: AnalysisRecord & { username?: string } = {
      id: newId,
      text,
      ...nlpData,
      timestamp,
      username: username || undefined
    };

    db.history.push(record);
    writeDb(db);

    res.json(record);
  });

  // History query retrieval endpoint (Restricted to logged-in users)
  app.get('/api/history', (req, res) => {
    const username = getUsernameFromReq(req);
    if (!username) {
      return res.status(401).json({ error: 'Authentication required. Please login first.' });
    }
    const userHistory = readHistory(username);
    const sortedDesc = [...userHistory].sort((a, b) => b.id - a.id);
    res.json(sortedDesc.slice(0, 100));
  });

  // Clear sqlite history log emulation (Restricted to logged-in user)
  app.post('/api/history/clear', (req, res) => {
    const username = getUsernameFromReq(req);
    if (!username) {
      return res.status(401).json({ error: 'Authentication required. Please login first.' });
    }
    const db = readDb();
    db.history = db.history.filter(item => item.username !== username);
    writeDb(db);
    res.json({ status: 'success', message: 'Your personal database evaluation history was successfully purged.' });
  });

  // Download CSV export files (Restricted to logged-in user)
  app.get('/api/export-csv', (req, res) => {
    let username = getUsernameFromReq(req);
    if (!username && req.query.token) {
      username = SESSIONS.get(req.query.token as string) || null;
    }
    if (!username) {
      return res.status(401).send('Authentication required. Please login first.');
    }
    const userHistory = readHistory(username);
    const sortedDesc = [...userHistory].sort((a, b) => b.id - a.id);

    let csvContent = "Record ID,Input Text,Polarity,Subjectivity,Classification,Confidence (%),Analyzed UTC Time\n";
    
    sortedDesc.forEach(item => {
      const escapedText = `"${item.text.replace(/"/g, '""')}"`;
      csvContent += `${item.id},${escapedText},${item.polarity},${item.subjectivity},${item.classification},${item.confidence},${item.timestamp}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sentiment_history_export_${new Date().toISOString().replace(/\D/g, '').slice(0, 12)}.csv"`);
    res.status(200).send(csvContent);
  });

  // Download Report PDF endpoint
  app.post('/api/export-pdf', (req, res) => {
    res.json({ status: 'success', message: 'API mirroring active.' });
  });

  // Serve static assets based on environment setups
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Full-stack server actively listening on http://localhost:${PORT}`);
  });
}

startServer();
