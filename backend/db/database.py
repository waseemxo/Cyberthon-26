import aiosqlite
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lucid.db")


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    db = await get_db()
    try:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_hash TEXT NOT NULL,
                overall_verdict TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                risk_level TEXT NOT NULL,
                analysis_breakdown TEXT NOT NULL,
                model_fingerprint TEXT,
                provenance_gaps TEXT NOT NULL,
                forensic_summary TEXT NOT NULL,
                analyzed_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_reports_session
            ON reports(session_id)
        """)
        await db.commit()
    finally:
        await db.close()
