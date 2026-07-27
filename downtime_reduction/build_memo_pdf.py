"""
Generate a professional one-page PDF version of the project memo.

The script formats the project summary into a clean report that can
be shared during presentations or submitted as part of the hackathon
deliverables.

Run: python build_memo_pdf.py
Output: memo.pdf
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

# Create the styles used throughout the PDF report

styles = getSampleStyleSheet()


# Define the colours used to keep the report consistent
INK = HexColor("#1a1a1a")
ACCENT = HexColor("#185fa5")
MUTED = HexColor("#52514e")

# Define the text styles for headings, body text, and labels

title_style = ParagraphStyle("TitleStyle", parent=styles["Title"], fontSize=17, leading=21,
                              textColor=INK, spaceAfter=2, alignment=TA_LEFT)
subtitle_style = ParagraphStyle("SubtitleStyle", parent=styles["Normal"], fontSize=9.5,
                                 textColor=MUTED, spaceAfter=10)
h2_style = ParagraphStyle("H2Style", parent=styles["Heading2"], fontSize=11.5, leading=14,
                           textColor=ACCENT, spaceBefore=10, spaceAfter=4)
body_style = ParagraphStyle("BodyStyle", parent=styles["Normal"], fontSize=9.3, leading=13,
                             textColor=INK, spaceAfter=6)
bold_label = ParagraphStyle("BoldLabel", parent=body_style, fontName="Helvetica-Bold")


# Configure the PDF page layout and margins


doc = SimpleDocTemplate(
    "memo.pdf", pagesize=letter,
    topMargin=0.55 * inch, bottomMargin=0.5 * inch,
    leftMargin=0.65 * inch, rightMargin=0.65 * inch,
)


# Store all report sections before generating the PDF

story = []

# Add the report title and project details
story.append(Paragraph("Problem-Framing Memo: Downtime Reduction Through Scheduler/API Integration", title_style))
story.append(Paragraph(
    "Domain B — Predictive Maintenance &amp; Equipment Reliability &nbsp;|&nbsp; Problem 4: Downtime Reduction "
    "&nbsp;|&nbsp; Stage 1, Inuka Hackathon &nbsp;|&nbsp; 24 July 2026",
    subtitle_style
))
story.append(HRFlowable(width="100%", thickness=0.75, color=HexColor("#d8d7d0"), spaceAfter=6))

# Explain the business problem the project is solving

story.append(Paragraph("The KPC Problem", h2_style))
story.append(Paragraph(
    "KPC's pipeline maintenance workflow is largely manual: field issues get reported, but there is no "
    "automated, auditable path from &ldquo;an asset needs attention&rdquo; to &ldquo;a ticket exists in the "
    "maintenance system with the right priority.&rdquo; This creates two costs: <b>delay</b> between an issue "
    "being known and a technician being dispatched, and <b>invisibility</b> &mdash; no structured record "
    "connecting maintenance events to downtime hours, so the true cost of delay is never quantified. Problem 4 "
    "asks us to close that gap with automation, and prove the automation itself is reliable.",
    body_style
))
# Summarise the key findings from the cleaned maintenance data
story.append(Paragraph("What the Data Already Tells Us", h2_style))
story.append(Paragraph(
    "Our Stage 1 pipeline cleaned 600 work orders across 24 pump/valve assets in three depot zones "
    "(Mombasa, Nairobi, Kisumu), resolving three inconsistent date formats, 17 status-string variants, and "
    "a small number of physically impossible timestamps. Beyond cleaning, two automated checks already "
    "surface operational findings a downtime-reduction program should act on:",
    body_style
))

# Create a table highlighting the most important operational findings
findings_data = [
    ["Finding", "Result", "Why it matters"],
    ["Chronic-failure assets", "6 of 24 assets (25%) at\n\u2265 1.2\u00d7 fleet-average ticket volume",
     "Priority list for condition-based\nmaintenance rollout"],
    ["Technician double-bookings", "4 genuine scheduling\nconflicts detected",
     "Direct cause of avoidable\ndispatch delay"],
]
findings_table = Table(findings_data, colWidths=[1.75 * inch, 2.1 * inch, 2.1 * inch])

# Apply formatting to improve readability of the findings table

findings_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#f0efe9")),
    ("TEXTCOLOR", (0, 0), (-1, 0), INK),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8.7),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d8d7d0")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
]))
story.append(findings_table)
story.append(Spacer(1, 8))

# Describe how the solution was designed and implemented

story.append(Paragraph("Our Approach", h2_style))
story.append(Paragraph(
    "<b>1. ETL foundation (this stage):</b> extract \u2192 clean \u2192 quality-gate \u2192 load into SQLite/MySQL, "
    "with structured logging and a 10-check automated quality gate enforced as a CI gate on every commit "
    "&mdash; currently passing 10/10.",
    body_style
))
story.append(Paragraph(
    "<b>2. Scheduler + API integration:</b> a Cron-style scheduler reads the cleaned data, applies a priority "
    "rule set to open/overdue work orders, and creates tickets via a mock CMMS API (standing in for KPC's real "
    "ticketing system) &mdash; with retry logic and full performance monitoring (latency, success rate, retry "
    "counts) logged per run. Latest run: 264/264 tickets created, 181.7ms average latency.",
    body_style
))
story.append(Paragraph(
    "<b>3. Stage 2/3 direction:</b> replace the mock API with real KPC access once granted; add a predictive "
    "layer forecasting which assets are <i>likely</i> to need attention soon, not just which already do &mdash; "
    "moving from reactive automation to genuinely proactive scheduling.",
    body_style
))


# Explain the value the solution provides to the business

story.append(Paragraph("Why This Matters", h2_style))
story.append(Paragraph(
    "If scheduler-driven ticket creation replaces manual reporting even partially, KPC gains an auditable, "
    "timestamped record of every maintenance trigger &mdash; the foundation needed to later quantify, and "
    "reduce, downtime hours with real evidence instead of estimates.",
    body_style
))


# Generate the final PDF report

doc.build(story)
print("memo.pdf built")
