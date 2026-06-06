import { useState } from "react";
import { showToast } from "@/stores/toastStore";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      showToast("Please enter username and password", "error");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/rest/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
        localStorage.setItem("refresh_token", data.refreshToken);
        showToast("Login successful", "success");
        window.location.reload();
      } else {
        showToast(data.error || "Invalid credentials", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "var(--bg-base, #0d1117)" }}
    >
      {/* Grid bg */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-xl p-8"
        style={{
          background: "var(--bg-elevated, #161b22)",
          border: "1px solid var(--border, #30363d)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div
            className="text-xl font-bold tracking-wider"
            style={{ color: "var(--text-primary)" }}
          >
            RAOSS<span style={{ color: "var(--accent, #58a6ff)" }}>HUB</span>
          </div>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Project Management Platform
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="text-[10px] font-medium mb-1 block"
              style={{ color: "var(--text-secondary)" }}
            >
              Email / Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="admin@raoss.com"
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-lg text-xs"
              style={{
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          <div>
            <label
              className="text-[10px] font-medium mb-1 block"
              style={{ color: "var(--text-secondary)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 pr-10 rounded-lg text-xs"
                style={{
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]"
                style={{ color: "var(--text-muted)" }}
                type="button"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
            style={{
              background: "var(--accent, #238636)",
              color: "#fff",
            }}
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <div
          className="mt-6 pt-4 text-center text-[10px]"
          style={{
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          &copy; 2026 RAOSS HK COMPANY LIMITED
        </div>
      </div>
    </div>
  );
}
