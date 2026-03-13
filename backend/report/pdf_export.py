"""PDF export for forensic reports using reportlab."""

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

from models.schemas import ForensicReport


# Color palette
CLR_BG = HexColor("#0a0e14")
CLR_PRIMARY = HexColor("#00ff88")
CLR_DANGER = HexColor("#ef4444")
CLR_WARNING = HexColor("#f59e0b")
CLR_SUCCESS = HexColor("#10b981")
CLR_TEXT = HexColor("#1e293b")
CLR_TEXT_LIGHT = HexColor("#64748b")
CLR_BORDER = HexColor("#e2e8f0")
CLR_WHITE = HexColor("#ffffff")


def _score_color(score: float) -> HexColor:
    if score >= 0.8:
        return CLR_DANGER
    if score >= 0.6:
        return HexColor("#f97316")
    if score >= 0.4:
        return CLR_WARNING
    return CLR_SUCCESS


def _result_color(result: str) -> HexColor:
    if result == "SUSPICIOUS":
        return CLR_DANGER
    if result == "INCONCLUSIVE":
        return CLR_WARNING
    return CLR_SUCCESS


def generate_pdf(report: ForensicReport) -> bytes:
    """Generate a professional forensic report PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=CLR_PRIMARY,
        spaceAfter=4 * mm,
    ))
    styles.add(ParagraphStyle(
        "SectionHead",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=CLR_PRIMARY,
        spaceBefore=6 * mm,
        spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        "BodyGray",
        parent=styles["Normal"],
        fontSize=10,
        textColor=CLR_TEXT_LIGHT,
    ))
    styles.add(ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontSize=10,
        textColor=CLR_TEXT,
        leading=14,
    ))

    elements = []

    # Title
    elements.append(Paragraph("LUCID Forensic Report", styles["ReportTitle"]))
    elements.append(Paragraph(
        "AI-Generated Content Forensic Analysis",
        styles["BodyGray"],
    ))
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=CLR_BORDER))
    elements.append(Spacer(1, 4 * mm))

    # File info table
    score_pct = f"{round(report.confidence_score * 100)}%"
    info_data = [
        ["File Name", report.file_name],
        ["File Type", report.file_type.value.upper()],
        ["File Size", f"{report.file_size:,} bytes"],
        ["SHA-256 Hash", report.file_hash],
        ["Analysis Date", report.analyzed_at],
    ]

    info_table = Table(info_data, colWidths=[45 * mm, 120 * mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), CLR_TEXT_LIGHT),
        ("TEXTCOLOR", (1, 0), (1, -1), CLR_TEXT),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 4 * mm))

    # Verdict banner
    verdict_color = _score_color(report.confidence_score)
    elements.append(Paragraph(
        f'<b>VERDICT:</b> {report.overall_verdict.value} '
        f'&nbsp;&nbsp;|&nbsp;&nbsp; '
        f'<b>CONFIDENCE:</b> {score_pct} '
        f'&nbsp;&nbsp;|&nbsp;&nbsp; '
        f'<b>RISK:</b> {report.risk_level.value}',
        ParagraphStyle(
            "Verdict",
            parent=styles["Normal"],
            fontSize=12,
            textColor=verdict_color,
            backColor=HexColor("#fef2f2") if report.confidence_score >= 0.6 else HexColor("#f0fdf4"),
            borderPadding=(3 * mm, 4 * mm, 3 * mm, 4 * mm),
            borderColor=verdict_color,
            borderWidth=1,
            borderRadius=2,
        ),
    ))

    # Analysis Breakdown
    elements.append(Paragraph("Analysis Breakdown", styles["SectionHead"]))

    table_data = [["Technique", "Result", "Score", "Explanation"]]
    for t in report.analysis_breakdown:
        table_data.append([
            t.technique,
            t.result.upper(),
            f"{round(t.score * 100)}%",
            t.explanation[:120] + ("..." if len(t.explanation) > 120 else ""),
        ])

    breakdown_table = Table(
        table_data,
        colWidths=[40 * mm, 22 * mm, 16 * mm, 87 * mm],
    )

    table_style_commands = [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, 0), CLR_WHITE),
        ("BACKGROUND", (0, 0), (-1, 0), CLR_PRIMARY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("GRID", (0, 0), (-1, -1), 0.5, CLR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("WORDWRAP", (3, 1), (3, -1), True),
    ]

    # Color the result cells
    for i, t in enumerate(report.analysis_breakdown, start=1):
        color = _result_color(t.result)
        table_style_commands.append(("TEXTCOLOR", (1, i), (1, i), color))
        table_style_commands.append(("FONTNAME", (1, i), (1, i), "Helvetica-Bold"))

    breakdown_table.setStyle(TableStyle(table_style_commands))
    elements.append(breakdown_table)

    # Model fingerprint
    if report.model_fingerprint:
        elements.append(Paragraph("Model Fingerprint", styles["SectionHead"]))
        elements.append(Paragraph(report.model_fingerprint, styles["BodyDark"]))

    # Provenance gaps
    if report.provenance_gaps:
        elements.append(Paragraph("Provenance Gaps", styles["SectionHead"]))
        for gap in report.provenance_gaps:
            elements.append(Paragraph(f"&bull; {gap}", styles["BodyDark"]))

    # Forensic summary
    elements.append(Paragraph("Forensic Summary", styles["SectionHead"]))
    elements.append(Paragraph(report.forensic_summary, styles["BodyDark"]))

    # Footer
    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=CLR_BORDER))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        "Generated by LUCID — Layered Unforgable Content Integrity Detection",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=CLR_TEXT_LIGHT),
    ))

    doc.build(elements)
    return buffer.getvalue()
