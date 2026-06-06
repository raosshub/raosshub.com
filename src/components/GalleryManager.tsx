interface GalleryManagerProps {
  teamId: string;
}

export default function GalleryManager({ teamId }: GalleryManagerProps) {
  return (
    <div className="text-center py-12">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Gallery — Team: {teamId}
      </p>
      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
        Upload images via the file upload endpoint
      </p>
    </div>
  );
}
