# RAOSS Hub v3 — Multi-Language Expansion Guide

## Current State

| Language | Code | Status | RTL |
|----------|------|--------|-----|
| English  | `en` | Active, Default | No |
| Chinese  | `zh` | Active | No |

## Adding a New Language (e.g., Arabic)

### Step 1: Register in Database

```sql
INSERT INTO languages (code, name, name_native, is_rtl, is_active, is_default)
VALUES ('ar', 'Arabic', 'العربية', true, true, false);
```

### Step 2: Copy UI Strings from English

Use HUB Assist or a script to translate all EN `ui_messages` to the new language:

```sql
INSERT INTO ui_messages (key, language_code, value)
SELECT key, 'ar', value FROM ui_messages WHERE language_code = 'en';
-- Then update the 'ar' values with proper translations
```

Or use HUB Assist with the prompt:
> "Translate all UI strings from English to Arabic. Here are the keys and English values: [paste]"

### Step 3: Translate Locale Content

```sql
INSERT INTO locale_content (language_code, section_path, content)
SELECT 'ar', section_path, content FROM locale_content WHERE language_code = 'en';
-- Then update JSONB content with Arabic translations
```

Or use HUB Assist:
> "Translate this project scope from English to Arabic: [paste JSON]"

### Step 4: Frontend Picks It Up Automatically

The language selector in Settings will show the new language immediately. The `useI18nStore` fetches UI strings and locale content dynamically. **Zero code changes needed.**

## Architecture

### UI Strings (`ui_messages` table)

Flat key-value pairs. The frontend loads all strings for the selected language at once:

```
key                    | language_code | value
-----------------------|---------------|------------------
login_title           | en            | Sign in
login_title           | zh            | 登录
login_title           | ar            | تسجيل الدخول
nav_overview          | en            | Overview
nav_overview          | zh            | 概览
nav_overview          | ar            | نظرة عامة
```

### Locale Content (`locale_content` table)

JSONB per section. Same structure across all languages:

```
language_code | section_path            | content (JSONB)
--------------|-------------------------|------------------
en            | sections.team_react.scope | {"name":"React","description":"..."}
zh            | sections.team_react.scope | {"name":"React","description":"..."}
ar            | sections.team_react.scope | {"name":"React","description":"..."}
```

### RTL Handling

When `language.is_rtl = true`:
- `<html dir="rtl">` is set automatically
- Text aligns right via CSS `[dir="rtl"] p, h1, h2, ... { text-align: right; }`
- Layout stays LTR (sidebar on left) per design decision
- Code blocks stay LTR

## Fallback Chain

1. Request `ui_strings` for selected language
2. If key missing, fallback to `defaultLang` (en)
3. If still missing, return the key itself

Same for locale content — if a section doesn't exist for the selected language, the UI shows empty/placeholder state.

## Batch Translation via HUB Assist

The HUB Assist AI can batch-translate content. Use the "Translate Content" action button or type:

> "Translate all team scopes from English to [language]"

The AI will output structured JSON that can be pasted into the database.
