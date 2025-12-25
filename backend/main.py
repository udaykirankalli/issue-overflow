from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import sqlite3
import json
import re
import hashlib

app = FastAPI(title="IssueFlow API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect('issueflow.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY,
            raw_text TEXT NOT NULL,
            category TEXT NOT NULL,
            severity TEXT NOT NULL,
            entities TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()


class IssueInput(BaseModel):
    text: str

class Issue(BaseModel):
    id: str
    raw_text: str
    category: str
    severity: str
    entities: List[str]
    timestamp: str

class IssueClassifier:
    CATEGORIES = {
        'Equipment': [
            'motor', 'machine', 'equipment', 'pump', 'valve', 'sensor',
            'conveyor', 'robot', 'bearing', 'gear', 'axis', 'spindle',
            'overheating', 'vibration', 'noise', 'malfunction', 'breakdown'
        ],
        'Quality': [
            'qa', 'quality', 'defect', 'failure', 'reject', 'inspection',
            'test', 'pcb', 'board', 'solder', 'assembly', 'tolerance',
            'specification', 'standard', 'compliance', 'rework'
        ],
        'Supply Chain': [
            'vendor', 'supplier', 'shipment', 'delivery', 'delay', 'logistics',
            'procurement', 'purchase', 'order', 'material', 'component',
            'inventory', 'stock', 'shortage', 'lead time'
        ],
        'Technical': [
            'voltage', 'current', 'power', 'circuit', 'signal', 'firmware',
            'software', 'code', 'error', 'bug', 'crash', 'freeze',
            'network', 'connection', 'protocol', 'data', 'reading'
        ]
    }
    
    SEVERITY_KEYWORDS = {
        'critical': ['critical', 'urgent', 'emergency', 'severe', 'dangerous', 'failure', 'down', 'stopped'],
        'high': ['major', 'significant', 'serious', 'important', 'damaged', 'broken', 'failed'],
        'medium': ['moderate', 'noticeable', 'affecting', 'impacting', 'issue'],
        'low': ['minor', 'slight', 'small', 'observing', 'noted', 'monitoring']
    }
    
    @staticmethod
    def classify_category(text: str) -> str:
        text_lower = text.lower()
        scores = {}
        
        for category, keywords in IssueClassifier.CATEGORIES.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            scores[category] = score
        
        if all(score == 0 for score in scores.values()):
            return 'Other'
        
        return max(scores, key=scores.get)
    
    @staticmethod
    def detect_severity(text: str) -> str:
        text_lower = text.lower()
        
        for severity, keywords in IssueClassifier.SEVERITY_KEYWORDS.items():
            if any(keyword in text_lower for keyword in keywords):
                return severity
        
        # Default heuristics
        if '!' in text or 'failed' in text_lower or 'error' in text_lower:
            return 'high'
        elif '?' in text:
            return 'low'
        
        return 'medium'
    
    @staticmethod
    def extract_entities(text: str) -> List[str]:
        entities = []
        
        # Extract version numbers
        versions = re.findall(r'version\s+(\d+(?:\.\d+)*)', text, re.IGNORECASE)
        entities.extend([f"v{v}" for v in versions])
        
        # Extract vendor names
        vendors = re.findall(r'vendor\s+([A-Z][a-z]+)', text)
        entities.extend(vendors)
        
        # Extract component names
        components = re.findall(r'(\w+)\s+(?:board|motor|pump|sensor|valve)', text, re.IGNORECASE)
        entities.extend([c.upper() for c in components])
        
        # Extract node/location identifiers
        nodes = re.findall(r'node\s+([A-Z]\d*)', text, re.IGNORECASE)
        entities.extend([n.upper() for n in nodes])
        
        # Extract time periods
        times = re.findall(r'(\d+)\s+(hour|minute|day|week|month)', text, re.IGNORECASE)
        entities.extend([f"{num} {unit}" for num, unit in times])
        
        return list(set(entities))

@app.get("/")
async def root():
    return {
        "service": "IssueFlow API",
        "version": "1.0.0",
        "status": "operational",
        "message": "Welcome to IssueFlow! Visit /docs for API documentation"
    }

@app.post("/issues", response_model=Issue)
async def create_issue(issue_input: IssueInput):
    text = issue_input.text.strip()
    
    if not text:
        raise HTTPException(status_code=400, detail="Issue text cannot be empty")
    
    # Generate unique ID
    issue_id = hashlib.md5(f"{text}{datetime.now().isoformat()}".encode()).hexdigest()[:12]
    
    # Process the issue using our classification engine
    category = IssueClassifier.classify_category(text)
    severity = IssueClassifier.detect_severity(text)
    entities = IssueClassifier.extract_entities(text)
    timestamp = datetime.now().isoformat()
    
    # Store in database
    conn = sqlite3.connect('issueflow.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO issues (id, raw_text, category, severity, entities, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (issue_id, text, category, severity, json.dumps(entities), timestamp))
    conn.commit()
    conn.close()
    
    return Issue(
        id=issue_id,
        raw_text=text,
        category=category,
        severity=severity,
        entities=entities,
        timestamp=timestamp
    )

@app.get("/issues")
async def get_issues(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100
):
    conn = sqlite3.connect('issueflow.db')
    cursor = conn.cursor()
    
    query = "SELECT id, raw_text, category, severity, entities, timestamp FROM issues WHERE 1=1"
    params = []
    
    if category:
        query += " AND category = ?"
        params.append(category)
    
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    issues = []
    for row in rows:
        issues.append({
            'id': row[0],
            'raw_text': row[1],
            'category': row[2],
            'severity': row[3],
            'entities': json.loads(row[4]),
            'timestamp': row[5]
        })
    
    return {'issues': issues, 'count': len(issues)}

@app.get("/analytics")
async def get_analytics():
    conn = sqlite3.connect('issueflow.db')
    cursor = conn.cursor()
    
    
    cursor.execute("SELECT COUNT(*) FROM issues")
    total = cursor.fetchone()[0]
    
    
    cursor.execute("SELECT category, COUNT(*) FROM issues GROUP BY category")
    by_category = dict(cursor.fetchall())
    
   
    cursor.execute("SELECT severity, COUNT(*) FROM issues GROUP BY severity")
    by_severity = dict(cursor.fetchall())
    
 
    seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
    cursor.execute("""
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM issues
        WHERE timestamp >= ?
        GROUP BY DATE(timestamp)
        ORDER BY date
    """, (seven_days_ago,))
    trend_raw = cursor.fetchall()
    
    conn.close()
    
    
    trend = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=6-i)).strftime('%Y-%m-%d')
        count = next((c for d, c in trend_raw if d == date), 0)
        trend.append({'date': date, 'count': count})
    
    return {
        'total_issues': total,
        'by_category': by_category,
        'by_severity': by_severity,
        'trend': trend
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)