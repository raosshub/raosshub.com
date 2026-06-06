interface PdfViewerProps {
  teamId: string;
}

export default function PdfViewer({ teamId }: PdfViewerProps) {
  return (
    <div className="text-center py-12">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        PDF Review — Team: {teamId}
      </p>
      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
        Upload PDFs via the file upload endpoint
      </p>
    </div>
  );
}
