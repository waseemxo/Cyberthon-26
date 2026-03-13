import json
from db.database import get_db
from models.schemas import ForensicReport, SessionHistoryItem


async def save_report(session_id: str, report: ForensicReport):
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO reports
               (id, session_id, file_name, file_type, file_size, file_hash,
                overall_verdict, confidence_score, risk_level,
                analysis_breakdown, model_fingerprint, provenance_gaps,
                forensic_summary, analyzed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                report.id,
                session_id,
                report.file_name,
                report.file_type.value,
                report.file_size,
                report.file_hash,
                report.overall_verdict.value,
                report.confidence_score,
                report.risk_level.value,
                json.dumps([t.model_dump() for t in report.analysis_breakdown]),
                report.model_fingerprint,
                json.dumps(report.provenance_gaps),
                report.forensic_summary,
                report.analyzed_at,
            ),
        )
        await db.commit()
    finally:
        await db.close()


async def get_report(report_id: str) -> ForensicReport | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM reports WHERE id = ?", (report_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return _row_to_report(row)
    finally:
        await db.close()


async def get_session_history(session_id: str) -> list[SessionHistoryItem]:
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, file_name, file_type, confidence_score,
                      overall_verdict, risk_level, analyzed_at
               FROM reports WHERE session_id = ?
               ORDER BY analyzed_at DESC""",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [
            SessionHistoryItem(
                id=row["id"],
                file_name=row["file_name"],
                file_type=row["file_type"],
                confidence_score=row["confidence_score"],
                overall_verdict=row["overall_verdict"],
                risk_level=row["risk_level"],
                analyzed_at=row["analyzed_at"],
            )
            for row in rows
        ]
    finally:
        await db.close()


def _row_to_report(row) -> ForensicReport:
    return ForensicReport(
        id=row["id"],
        file_name=row["file_name"],
        file_type=row["file_type"],
        file_size=row["file_size"],
        file_hash=row["file_hash"],
        overall_verdict=row["overall_verdict"],
        confidence_score=row["confidence_score"],
        risk_level=row["risk_level"],
        analysis_breakdown=json.loads(row["analysis_breakdown"]),
        model_fingerprint=row["model_fingerprint"],
        provenance_gaps=json.loads(row["provenance_gaps"]),
        forensic_summary=row["forensic_summary"],
        analyzed_at=row["analyzed_at"],
    )
