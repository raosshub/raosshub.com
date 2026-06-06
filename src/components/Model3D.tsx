interface Model3DProps {
  modelPath?: string;
}

export default function Model3D({ modelPath }: Model3DProps) {
  if (!modelPath) {
    return (
      <div
        className="rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]"
        style={{
          background: "var(--bg-elevated, #161b22)",
          border: "1px solid var(--border, #30363d)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No 3D model configured
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          Upload a .glb file in Admin → Project Identity
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden min-h-[300px]"
      style={{
        background: "var(--bg-elevated, #161b22)",
        border: "1px solid var(--border, #30363d)",
      }}
    >
      {/* @ts-ignore */}
      <model-viewer
        src={modelPath}
        auto-rotate
        camera-controls
        shadow-intensity="1"
        exposure="1"
        style={{ width: "100%", height: "350px", background: "transparent" }}
      >
        <div
          slot="poster"
          className="flex items-center justify-center h-full"
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Loading 3D model…
          </p>
        </div>
        {/* @ts-ignore */}
      </model-viewer>
    </div>
  );
}
