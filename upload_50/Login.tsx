import { useState, useEffect } from "react";
import { IconSvg } from "@/lib/icons";

const FALLBACK: Record<string, Record<string, string>> = {
  en: { title: "Sign in", subtitle: "Sign in to continue to RAOSS Hub", email: "Email", password: "Password", signIn: "Sign in", register: "Create Account", noAccount: "No account? Register", hasAccount: "Have an account? Sign in", fillFields: "Please fill in all fields", invalidCreds: "Invalid email or password", pwdShort: "Password must be at least 8 characters", name: "Name", loggingIn: "Signing in...", error: "Login failed" },
  zh: { title: "登录", subtitle: "继续访问 RAOSS Hub", email: "邮箱", password: "密码", signIn: "登录", register: "创建账户", noAccount: "没有账户？注册", hasAccount: "已有账户？登录", fillFields: "请填写所有字段", invalidCreds: "邮箱或密码错误", pwdShort: "密码至少8个字符", name: "姓名", loggingIn: "登录中...", error: "登录失败" },
  ar: { title: "تسجيل الدخول", subtitle: "تسجيل الدخول إلى RAOSS Hub", email: "البريد الإلكتروني", password: "كلمة المرور", signIn: "تسجيل الدخول", register: "إنشاء حساب", noAccount: "ليس لديك حساب؟ سجل", hasAccount: "لديك حساب؟ سجل الدخول", fillFields: "يرجى ملء جميع الحقول", invalidCreds: "بريد أو كلمة مرور غير صحيحة", pwdShort: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", name: "الاسم", loggingIn: "جاري تسجيل الدخول...", error: "فشل تسجيل الدخول" },
};

function T(key: string, lang: string, strings: Record<string, string>) {
  return strings?.[key] || FALLBACK[lang]?.[key] || FALLBACK["en"]?.[key] || key;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [lang, setLang] = useState(() => localStorage.getItem("hub_lang") || "en");
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [availableLangs, setAvailableLangs] = useState<string[]>(["en", "zh", "ar"]);
  const [loading, setLoading] = useState(false);

  // Fetch login strings from API
  useEffect(() => {
    fetch(`/api/public/strings?lang=${lang}&section=ui.login`)
      .then((r) => r.json())
      .then((data) => { if (data && typeof data === "object") setStrings(data); })
      .catch(() => {});
  }, [lang]);

  // Fetch available languages
  useEffect(() => {
    fetch("/api/public/languages")
      .then((r) => r.json())
      .then((data: any[]) => { if (Array.isArray(data) && data.length > 0) setAvailableLangs(data.map((l) => l.code)); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError(T("fillFields", lang, strings)); return; }
    if (mode === "register" && password.length < 8) { setError(T("pwdShort", lang, strings)); return; }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/rest/login" : "/api/rest/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.toLowerCase(), password, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || T("invalidCreds", lang, strings)); setLoading(false); return; }
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      window.location.reload();
    } catch { setError(T("error", lang, strings)); setLoading(false); }
  };

  const toggleLang = () => {
    const idx = availableLangs.indexOf(lang);
    const next = availableLangs[(idx + 1) % availableLangs.length] || "en";
    setLang(next);
    localStorage.setItem("hub_lang", next);
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base, #0d1117)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--border, #30363d) 1px, transparent 1px), linear-gradient(90deg, var(--border, #30363d) 1px, transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 100%)", opacity: 0.2, pointerEvents: "none" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 400, margin: "0 16px" }}>
        <div style={{ background: "var(--bg-elevated, #161b22)", border: "1px solid var(--border, #30363d)", borderRadius: 10, padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <IconSvg name="shield" size={24} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary, #e6edf3)" }}>RAOSS<span style={{ color: "var(--accent, #3fb950)" }}>HUB</span></span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary, #e6edf3)", marginBottom: 4 }}>{T(mode === "login" ? "title" : "register", lang, strings)}</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary, #8b949e)", marginBottom: 24 }}>{T(mode === "login" ? "subtitle" : "register", lang, strings)}</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary, #8b949e)" }}>{T("name", lang, strings)}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={T("name", lang, strings)} style={inputStyle} />
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary, #8b949e)" }}>{T("email", lang, strings)}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@raoss.com" style={inputStyle} autoComplete="email" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary, #8b949e)" }}>{T("password", lang, strings)}</label>
              <div style={{ position: "relative" }}>
                <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={T("password", lang, strings)} style={{ ...inputStyle, paddingRight: 36 }} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted, #484f58)", cursor: "pointer", padding: 0 }}><IconSvg name={showPwd ? "eyeOff" : "eye"} size={16} /></button>
              </div>
            </div>
            {error && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 7, background: "rgba(248,81,73,0.12)", color: "var(--red, #f85149)" }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "10px 16px", borderRadius: 7, border: "none", background: "var(--accent, #3fb950)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading && <span style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />}
              {loading ? T("loggingIn", lang, strings) : T(mode === "login" ? "signIn" : "register", lang, strings)}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ fontSize: 12, color: "var(--accent, #3fb950)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              {mode === "login" ? T("noAccount", lang, strings) : T("hasAccount", lang, strings)}
            </button>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border, #30363d)", display: "flex", justifyContent: "center" }}>
            <button onClick={toggleLang} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border, #30363d)", background: "var(--bg-base, #0d1117)", color: "var(--text-secondary, #8b949e)", fontSize: 11, cursor: "pointer" }}>
              <IconSvg name="globe" size={12} />{lang === "zh" ? "English" : lang === "ar" ? "中文" : "العربية"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 5, border: "1px solid var(--border, #30363d)", background: "var(--bg-input, #21262d)", color: "var(--text-primary, #e6edf3)", fontSize: 13, outline: "none", boxSizing: "border-box" };
