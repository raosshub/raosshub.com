import "dotenv/config";
import { db } from "./connection";
import { users, projects, languages, locales, teams } from "./schema";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seed() {
  console.log("Seeding database...");

  // Read locale files
  const enPath = path.join(process.cwd(), "public/locales/en.json");
  const zhPath = path.join(process.cwd(), "public/locales/zh.json");
  const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  const zhData = fs.existsSync(zhPath) ? JSON.parse(fs.readFileSync(zhPath, "utf-8")) : null;

  // ─── Languages ───
  await db.insert(languages).values({
    code: "en", name: "English", nativeName: "English", isActive: true, isDefault: true, isRtl: false,
  }).onConflictDoNothing();

  await db.insert(languages).values({
    code: "zh", name: "Chinese", nativeName: "中文", isActive: true, isDefault: false, isRtl: false,
  }).onConflictDoNothing();

  await db.insert(languages).values({
    code: "ar", name: "Arabic", nativeName: "العربية", isActive: true, isDefault: false, isRtl: true,
  }).onConflictDoNothing();

  console.log("Languages seeded");

  // ─── Default Project: QR114i ───
  const projectRows = await db.insert(projects).values({
    slug: "qr114i",
    name: "QR114i Salaam Stream",
    description: "AC792N Architecture - Smart Islamic Prayer Device",
    version: "1.0",
    status: "active",
    isDefault: true,
    logoPath: "assets/images/logo.png",
    faviconPath: "assets/images/favicon.ico",
    threeDPath: "assets/3D/qr114i.glb",
    config: {
      chip: { name: "AC792N", fullName: "JeiLi AC792N", package: "AC7926A QFN", sdk: "JL_SDK" },
      display: { size: "7\"", resolution: "1280x800", interface: "RGB888", fps: "30+", pixelClock: "~40MHz" },
      battery: "22,000mAh",
      router: "Habolink AF007",
    },
  }).onConflictDoNothing().returning();

  const projectId = projectRows[0]?.id || 1;
  console.log("Project seeded:", projectId);

  // ─── Default Admin User ───
  const passwordHash = await hashPassword("Admin123**");
  await db.insert(users).values({
    username: "admin@raoss.com",
    name: "Super Admin",
    role: "superadmin",
    passwordHash,
    ndaAccepted: false,
    canUseAi: true,
    canViewActivity: true,
  }).onConflictDoUpdate({
    target: users.username,
    set: { ndaAccepted: false, canUseAi: true },
  });

  await db.insert(users).values([
    { username: "pcba@raoss.com", name: "PCBA Lead", role: "user", passwordHash: await hashPassword("Pc123456**"), ndaAccepted: true },
    { username: "firmware@raoss.com", name: "Firmware Lead", role: "user", passwordHash: await hashPassword("Fw123456**"), ndaAccepted: true },
    { username: "react@raoss.com", name: "React Native Dev", role: "user", passwordHash: await hashPassword("Rn123456**"), ndaAccepted: true },
  ]).onConflictDoNothing();

  console.log("Users seeded");

  // ─── Teams ───
  const teamData = [
    { teamId: "react", nameEn: "Mobile APP", nameZh: "移动应用", icon: "react", color: "#1e3a5f", textColor: "#58a6ff", sortOrder: 0 },
    { teamId: "pcba", nameEn: "PCBA", nameZh: "PCBA", icon: "pcba", color: "#2d1b4e", textColor: "#bc8cff", sortOrder: 1 },
    { teamId: "firmware", nameEn: "Firmware", nameZh: "固件", icon: "firmware", color: "#0d2818", textColor: "#3fb950", sortOrder: 2 },
    { teamId: "tft", nameEn: "TFT Screen", nameZh: "TFT 屏幕", icon: "tft", color: "#3d2000", textColor: "#d29922", sortOrder: 3 },
    { teamId: "router", nameEn: "Router", nameZh: "路由器", icon: "router", color: "#0d2626", textColor: "#56d3ba", sortOrder: 4 },
    { teamId: "charger", nameEn: "Charger", nameZh: "充电器", icon: "charger", color: "#3d0d0d", textColor: "#f85149", sortOrder: 5 },
    { teamId: "shell", nameEn: "Enclosure", nameZh: "外壳", icon: "shell", color: "#1e1a14", textColor: "#8b949e", sortOrder: 6 },
  ];

  for (const t of teamData) {
    await db.insert(teams).values({
      ...t,
      projectId,
      tabs: ["overview", "deliverables", "collaboration", "files", "pdf", "gallery"],
    }).onConflictDoNothing();
  }
  console.log("Teams seeded");

  // ─── Locales (EN) ───
  for (const [key, value] of Object.entries(enData)) {
    if (typeof value === "object" && value !== null) {
      await db.insert(locales).values({
        projectId, lang: "en", sectionKey: key,
        content: JSON.stringify(value),
      }).onConflictDoNothing();
    }
  }
  console.log("EN locales seeded");

  // ─── Locales (ZH) ───
  if (zhData) {
    for (const [key, value] of Object.entries(zhData)) {
      if (typeof value === "object" && value !== null) {
        await db.insert(locales).values({
          projectId, lang: "zh", sectionKey: key,
          content: JSON.stringify(value),
        }).onConflictDoNothing();
      }
    }
    console.log("ZH locales seeded");
  }

  // ─── Login UI Strings ───
  await db.insert(locales).values({
    projectId, lang: "en", sectionKey: "ui.login",
    content: JSON.stringify({
      title: "Sign in", subtitle: "Sign in to continue to RAOSS Hub",
      email: "Email", password: "Password", signIn: "Sign in",
      register: "Create Account", noAccount: "No account? Register",
      hasAccount: "Have an account? Sign in", fillFields: "Please fill in all fields",
      invalidCreds: "Invalid email or password", pwdShort: "Password must be at least 8 characters",
      name: "Name", loggingIn: "Signing in...", error: "Login failed",
    }),
  }).onConflictDoNothing();

  await db.insert(locales).values({
    projectId, lang: "zh", sectionKey: "ui.login",
    content: JSON.stringify({
      title: "登录", subtitle: "继续访问 RAOSS Hub",
      email: "邮箱", password: "密码", signIn: "登录",
      register: "创建账户", noAccount: "没有账户？注册",
      hasAccount: "已有账户？登录", fillFields: "请填写所有字段",
      invalidCreds: "邮箱或密码错误", pwdShort: "密码至少8个字符",
      name: "姓名", loggingIn: "登录中...", error: "登录失败",
    }),
  }).onConflictDoNothing();

  await db.insert(locales).values({
    projectId, lang: "ar", sectionKey: "ui.login",
    content: JSON.stringify({
      title: "تسجيل الدخول", subtitle: "تسجيل الدخول إلى RAOSS Hub",
      email: "البريد الإلكتروني", password: "كلمة المرور", signIn: "تسجيل الدخول",
      register: "إنشاء حساب", noAccount: "ليس لديك حساب؟ سجل",
      hasAccount: "لديك حساب؟ سجل الدخول", fillFields: "يرجى ملء جميع الحقول",
      invalidCreds: "بريد أو كلمة مرور غير صحيحة", pwdShort: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
      name: "الاسم", loggingIn: "جاري تسجيل الدخول...", error: "فشل تسجيل الدخول",
    }),
  }).onConflictDoNothing();

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => { console.error("Seed error:", e); process.exit(1); });
