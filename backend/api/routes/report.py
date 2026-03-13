"""GET /api/report/{id} and /api/report/{id}/pdf — report retrieval and PDF export."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

from models.schemas import ForensicReport
from db.session_store import get_report
from report.pdf_export import generate_pdf

router = APIRouter()


@router.get("/report/{report_id}", response_model=ForensicReport)
async def get_report_by_id(report_id: str):
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/report/{report_id}/pdf")
async def get_report_pdf(report_id: str):
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = generate_pdf(report)

    safe_name = report.file_name.replace('"', "'")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="DeepTrace_Report_{safe_name}.pdf"',
        },
    )
