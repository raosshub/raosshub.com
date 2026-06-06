import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/stores/toastStore";
import { FileText, Upload, Download, Trash2 } from "lucide-react";

const ALLOWED_TYPES = [
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
const MAX_SIZE_MB = 50;

interface Props {
  teamId: string;
}

export default function FileManager({ teamId }: Props) {
  const { isSuperAdmin } = useAuth();
  const { data: files, refetch } = trpc.file.listTeamFiles.useQuery({ teamId });
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteMutation = trpc.file.deleteTeamFile.useMutation({
    onSuccess: () => { refetch(); showToast("File deleted", "success"); },
  });

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast("Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT", "error");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`File too large. Max ${MAX_SIZE_MB}MB`, "error");
      return;
    }

    // Upload to server
    const formData = new FormData();
    formData.append("file", file);
    formData.append("teamId", teamId);
    formData.append("notes", notes);

    try {
      const res = await fetch("/api/upload/file", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
      });
      if (res.ok) {
        showToast("File uploaded", "success");
        setNotes("");
        refetch();
      } else {
        showToast("Upload failed", "error");
      }
    } catch {
      showToast("Upload error", "error");
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer mb-4 transition-all"
        style={{
          borderColor: isDragging ? "var(--accent)" : "var(--border-subtle)",
          background: isDragging ? "var(--accent-dim)" : "var(--bg-base)",
        }}
      >
        <Upload size={20} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Drop file here or click to browse
        </div>
        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          PDF, DOC, DOCX, XLS, XLSX, TXT (max {MAX_SIZE_MB}MB)
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} accept={ALLOWED_TYPES.join(",")} />
      </div>

      {/* Notes */}
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add a note about this file (optional)..."
        className="hub-input text-xs mb-4"
      />

      {/* File List */}
      {files && files.length > 0 ? (
        <div className="space-y-2">
          {files.map((f: any) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
              <FileText size={16} style={{ color: "var(--accent)" }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.fileName}</div>
                <div className="flex gap-2">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatSize(f.fileSize)}</span>
                  {f.notes && <span className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{f.notes}</span>}
                </div>
              </div>
              <a href={f.filePath} download className="p-1.5 rounded" style={{ color: "var(--text-secondary)" }}>
                <Download size={14} />
              </a>
              {isSuperAdmin && (
                <button onClick={() => deleteMutation.mutate({ id: f.id })} className="p-1.5 rounded" style={{ color: "var(--red)" }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No files uploaded yet</div>
      )}
    </div>
  );
}
