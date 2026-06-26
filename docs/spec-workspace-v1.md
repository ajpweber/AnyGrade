# AnyGrade Workspace — Product Spec v1

**Status:** Approved for implementation  
**Date:** 2026-06-23  
**Covers:** AnyQuiz · AnyGrade · AnySubject — all three modes in one spec  
**Done signal:** Looks and works like `anygrade-workspace.html` in the browser (Next.js app)

---

## 1. Context

Teachers at Philippine higher education institutions use AnyGrade to generate quizzes, grade student answer sheets, and deliver per-student performance feedback. This spec describes the primary workspace — a full-screen, single-page interface that is the main (and only) working surface of the app.

---

## 2. Scope

### In scope

- Route `/workspace` — new top-level page, full-screen, post-login landing page
- Sidebar: mode tabs + class accordion navigator
- AnyQuiz panel — quiz builder → exports MS Word file
- AnyGrade panel — scan upload + grading
- AnySubject panel — insights + email feedback delivery

### Out of scope (this spec)

- Multi-subject classes (junction table) — one subject per class is the current model
- Scanner hardware integration beyond API polling — scanner status card shows real API data when available, placeholder text when not
- Quiz persistence to DB — AnyQuiz generates and exports only; no assessment record created

---

## 3. Technical assumptions

| # | Assumption | Status |
|---|-----------|--------|
| A1 | Workspace lives at `/workspace`, outside any existing layout wrapper | Confirmed |
| A2 | One subject per class. `classes.syllabus_id → school_syllabi` is the source of subject code, title, and topics. If `syllabus_id` is null, topic dropdown is empty and shows "No syllabus linked". | Confirmed |
| A3 | AnyQuiz does not write to DB — generates and downloads an MS Word (.docx) file | Confirmed |
| A4 | Student answer sheets and answer key both use file input, but are stored at different paths: answer sheets → `scans/{user_id}/{assessment_id}/{n}.ext`; answer key → `scans/{user_id}/{assessment_id}/answer-key.ext` | Confirmed |
| A5 | AnySubject email send IS in scope. Requires a new server action. | Confirmed |
| A6 | After login, `/` redirects to `/workspace` | Confirmed |

---

## 4. Route and layout

### 4.1 New route

```
apps/web/src/app/workspace/
  page.tsx              — server component: auth check, fetch classes + syllabi
  WorkspaceShell.tsx    — client component: all interactive state
  WorkspaceSidebar.tsx  — sidebar: mode tabs + class accordion
  modes/
    AnyQuizPanel.tsx
    AnyGradePanel.tsx
    AnySubjectPanel.tsx
  components/
    QuizTypeRow.tsx       — single toggle row in the quiz type stack
    FileRow.tsx           — single row in the answer sheets list
    TierBlock.tsx         — one tier block in the feedback overlay
    ClassResultsCard.tsx  — collapsible stats card
  types.ts              — shared TypeScript types
```

Auth guard: `supabase.auth.getUser()` → redirect to `/login` if null.

No top bar. Mode identity lives only in the active sidebar tab. No context chip in the header area.

### 4.2 Entry point

`apps/web/src/app/page.tsx` — change redirect from `/dashboard` to `/workspace`.

### 4.3 Shell layout

```
html, body { height: 100%; margin: 0; overflow: hidden; }

.workspace {
  display: flex;
  height: 100vh;
  background: #111;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

.sidebar { width: 220px; flex-shrink: 0; border-right: 1px solid #222; display: flex; flex-direction: column; }
.main    { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.panel   { flex: 1; overflow-y: auto; }
```

---

## 5. Sidebar

Three sections, top to bottom:

1. **App header** — "AnyGrade" wordmark
2. **Mode tabs** — AnyQuiz / AnyGrade / AnySubject
3. **Classes section** — expandable class accordion

### 5.1 App header

```tsx
<div style={{ padding: '16px 18px', borderBottom: '1px solid #222', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
  AnyGrade
</div>
```

### 5.2 Mode tabs

```tsx
type Mode = 'quiz' | 'grade' | 'subject'

const MODES = [
  { id: 'quiz',    label: 'AnyQuiz',    icon: <QuizIcon /> },
  { id: 'grade',   label: 'AnyGrade',   icon: <GradeIcon /> },
  { id: 'subject', label: 'AnySubject', icon: <SubjectIcon /> },
]
```

Active tab: white text + 2px left accent bar (`#4DB832`).  
Inactive: `#888`, no bar.

```css
.mode-tab {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px; cursor: pointer; color: #888; font-size: 13px;
  border-left: 2px solid transparent; user-select: none;
}
.mode-tab:hover { color: #ccc; background: #161616; }
.mode-tab.active { color: #fff; border-left-color: #4DB832; background: #161616; }
```

Icons: inline SVG, stroke-based, 18×18. No emoji.

```tsx
// QuizIcon
<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
  <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5z"/>
  <path d="M14.2 5.3l1-1a.7.7 0 0 1 1 0l1 1a.7.7 0 0 1 0 1l-1 1-2-2z"/>
</svg>

// GradeIcon
<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
  <rect x="3" y="2" width="14" height="16" rx="2"/>
  <path d="M7 10l2 2 4-4"/>
</svg>

// SubjectIcon
<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
  <path d="M3 17h2v-6H3v6zm4 0h2V8H7v9zm4 0h2V5h-2v12z"/>
</svg>
```

### 5.3 Classes section

```tsx
<div className="section-label">
  CLASSES
  <span className={`nudge-dot ${nudgeActive ? 'on' : ''}`} />
</div>
```

Section label CSS:

```css
.section-label {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .1em; color: #666;
  padding: 14px 18px 8px;
  display: flex; align-items: center; gap: 8px;
}
.nudge-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #4DB832; display: none;
}
.nudge-dot.on { display: block; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .4; transform: scale(.7); }
}
```

Nudge dot fires only in AnyQuiz mode, when topic + at least one question type is set but no class is selected. Disappears once a class is selected.

#### Class accordion

Server query:

```ts
const { data: classes } = await supabase
  .from('classes')
  .select('id, name, school_syllabi ( subject_code, subject_title, topics )')
  .eq('teacher_id', user.id)
  .order('name')
```

Data shape:

```ts
type ClassItem = {
  id: string
  name: string
  school_syllabi: {
    subject_code: string
    subject_title: string
    topics: string[] // parsed from Json
  } | null
}
```

**Accordion behavior:**

- Click class → expand subjects inline; collapse previously open class
- One subject per class (current model): auto-select on click
- `syllabus` is null → show "No syllabus linked"; do not auto-select

```tsx
{classes.map(cls => (
  <div key={cls.id}>
    <div
      className={`cls-item ${openClass === cls.id ? 'open' : ''}`}
      onClick={() => toggleClass(cls.id)}
    >
      <span className="cls-arrow">{openClass === cls.id ? '▾' : '▸'}</span>
      {cls.name}
    </div>

    {openClass === cls.id && (
      <div className="cls-subjects">
        {cls.school_syllabi ? (
          <div
            className={`sub-item ${activeSyllabus?.subject_code === cls.school_syllabi.subject_code ? 'active' : ''}`}
            onClick={() => selectSubject(cls)}
          >
            <span className="sub-code">{cls.school_syllabi.subject_code}</span>
            <span className="sub-name">{cls.school_syllabi.subject_title}</span>
          </div>
        ) : (
          <div className="sub-empty">No syllabus linked</div>
        )}
      </div>
    )}
  </div>
))}
```

```css
.cls-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 18px; font-size: 13px; color: #ccc;
  cursor: pointer; user-select: none;
}
.cls-item:hover { background: #1a1a1a; color: #fff; }
.cls-item.open  { color: #fff; }
.cls-arrow { font-size: 10px; color: #555; width: 10px; }

.cls-subjects { padding: 2px 0 6px; }
.sub-item {
  display: flex; align-items: baseline; gap: 8px;
  padding: 6px 18px 6px 30px; font-size: 12px; cursor: pointer;
}
.sub-item:hover  { background: #1a1a1a; }
.sub-item.active { background: rgba(77,184,50,.12); }
.sub-code { color: #4DB832; font-weight: 600; font-size: 11px; }
.sub-name { color: #aaa; }
.sub-empty { padding: 6px 18px 6px 30px; font-size: 12px; color: #555; font-style: italic; }
```

#### Sidebar footer

Sign-out button at the very bottom:

```tsx
<div style={{ marginTop: 'auto', padding: '12px 18px', borderTop: '1px solid #1c1c1c' }}>
  <div style={{ fontSize: 11, color: '#444', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {user.email}
  </div>
  <form action={signOut}>
    <button style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', padding: 0 }}>
      Sign out
    </button>
  </form>
</div>
```

---

## 6. AnyQuiz panel

### 6.1 Layout

Two columns:

- **Left (40%):** Assessment context — subject (auto-resolved) + topic + assessment type
- **Right (60%):** Question type stack + footer

```css
.quiz-panel { display: flex; height: 100%; }
.quiz-left  { width: 40%; padding: 28px 24px 0 32px; border-right: 1px solid #1c1c1c; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
.quiz-right { flex: 1; padding: 28px 32px 0 24px; display: flex; flex-direction: column; }
```

### 6.2 Left — Assessment context

#### Subject (auto-resolved from sidebar)

```tsx
{activeSyllabus ? (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 14px', background: '#1a1a1a', borderRadius: 8 }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: '#4DB832' }}>{activeSyllabus.subject_code}</span>
    <span style={{ fontSize: 12, color: '#aaa' }}>{activeSyllabus.subject_title}</span>
  </div>
) : (
  <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }}>Select a class from the left →</div>
)}
```

#### Topic dropdown

```tsx
<div className="field-group">
  <label className="field-lbl">TOPIC</label>
  <select
    className="field-select"
    value={quizState.topic}
    onChange={e => dispatch({ type: 'SET_TOPIC', topic: e.target.value })}
    disabled={!activeSyllabus}
  >
    <option value="">Select a topic…</option>
    {(activeSyllabus?.topics ?? []).map(t => (
      <option key={t} value={t}>{t}</option>
    ))}
  </select>
</div>
```

#### Assessment type dropdown

Default: `quiz`.

```tsx
const ASSESSMENT_TYPES = [
  { value: 'quiz',       label: 'Quiz' },
  { value: 'activity',   label: 'Activity' },
  { value: 'seatwork',   label: 'Seatwork' },
  { value: 'exam',       label: 'Exam' },
  { value: 'long_exam',  label: 'Long Exam' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'recitation', label: 'Recitation' },
  { value: 'project',    label: 'Project' },
]
```

```css
.field-lbl {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .1em; color: #666; margin-bottom: 6px; display: block;
}
.field-select {
  width: 100%; background: #1a1a1a; border: 1px solid #2a2a2a;
  border-radius: 8px; color: #fff; font-size: 13px; padding: 9px 12px;
  appearance: none; cursor: pointer;
}
.field-select:disabled { opacity: .4; cursor: default; }
.field-select:focus { outline: none; border-color: #4DB832; }
```

### 6.3 Right — Question type stack

All five question types are always visible as stacked toggle rows. Multiple Choice is ON (expanded) by default. All others are OFF (collapsed).

**Toggled OFF (collapsed):**

```tsx
<div className="qtype-row collapsed">
  <label className="sw">
    <input type="checkbox" checked={false} onChange={() => toggleType(qt.id)} />
    <span className="sw-track" />
  </label>
  <span className="qtype-label">{qt.label}</span>
</div>
```

**Toggled ON (expanded):**

```tsx
<div className="qtype-row expanded">
  <div className="qtype-row-header">
    <label className="sw">
      <input type="checkbox" checked={true} onChange={() => toggleType(qt.id)} />
      <span className="sw-track" />
    </label>
    <span className="qtype-label active">{qt.label}</span>
  </div>
  <div className="qtype-row-detail">
    <div className="qtype-field">
      <span className="qtype-field-lbl">Questions</span>
      <div className="stepper">
        <button onClick={() => changeQty(qt.id, row.qty - 1)} disabled={row.qty <= 1}>−</button>
        <span>{row.qty}</span>
        <button onClick={() => changeQty(qt.id, row.qty + 1)}>+</button>
      </div>
    </div>
    <div className="qtype-field">
      <span className="qtype-field-lbl">Pts / question</span>
      <div className="stepper">
        <button onClick={() => changePts(qt.id, row.pts - 1)} disabled={row.pts <= 1}>−</button>
        <span>{row.pts}</span>
        <button onClick={() => changePts(qt.id, row.pts + 1)}>+</button>
      </div>
    </div>
    <div className="qtype-field right">
      <span className="qtype-field-lbl">Subtotal</span>
      <span className="qtype-subtotal">{row.qty * row.pts} pts</span>
    </div>
  </div>
</div>
```

```css
.qtype-row {
  border-radius: 8px; background: #1a1a1a;
  padding: 12px 14px; margin-bottom: 4px;
}
.qtype-row.collapsed {
  display: flex; align-items: center; gap: 10px;
  opacity: .55;
}
.qtype-row.expanded { opacity: 1; }

.qtype-row-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.qtype-label { font-size: 13px; color: #888; }
.qtype-label.active { color: #fff; }

.qtype-row-detail {
  display: flex; align-items: center; gap: 16px;
  padding-left: 36px; /* indent past toggle */
}
.qtype-field { display: flex; flex-direction: column; gap: 4px; }
.qtype-field.right { margin-left: auto; text-align: right; }
.qtype-field-lbl { font-size: 10px; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
.qtype-subtotal { font-size: 15px; font-weight: 700; color: #fff; }

.stepper {
  display: flex; align-items: center; gap: 6px;
  background: #111; border-radius: 6px; padding: 4px 8px;
}
.stepper button {
  background: none; border: none; color: #aaa; font-size: 16px;
  cursor: pointer; padding: 0; line-height: 1; width: 18px;
}
.stepper button:hover { color: #fff; }
.stepper button:disabled { opacity: .3; cursor: default; }
.stepper span { font-size: 13px; color: #fff; min-width: 20px; text-align: center; }

/* Toggle switch */
.sw { position: relative; display: inline-block; width: 32px; height: 18px; flex-shrink: 0; }
.sw input { opacity: 0; width: 0; height: 0; }
.sw-track {
  position: absolute; inset: 0; background: #2a2a2a;
  border-radius: 18px; cursor: pointer; transition: .15s;
}
.sw input:checked + .sw-track { background: #4DB832; }
.sw-track::before {
  content: ''; position: absolute;
  width: 12px; height: 12px; left: 3px; top: 3px;
  background: #fff; border-radius: 50%; transition: .15s;
}
.sw input:checked + .sw-track::before { transform: translateX(14px); }
```

**State:**

```ts
type QuizState = {
  topic: string
  assessmentType: AssessmentType
  randomize: boolean
  personalize: boolean
  types: Record<string, { on: boolean; qty: number; pts: number }>
}

const Q_TYPES = [
  { id: 'mc', label: 'Multiple Choice', defaultQty: 10, defaultPts: 2,  timeMin: 1.5 },
  { id: 'tf', label: 'True or False',   defaultQty: 10, defaultPts: 1,  timeMin: 0.75 },
  { id: 'id', label: 'Identification',  defaultQty: 5,  defaultPts: 2,  timeMin: 2 },
  { id: 'es', label: 'Essay',           defaultQty: 2,  defaultPts: 10, timeMin: 8 },
  { id: 'ps', label: 'Problem Solving', defaultQty: 3,  defaultPts: 5,  timeMin: 8 },
] as const

// Initial state — MC on, others off
const initialQuizState: QuizState = {
  topic: '',
  assessmentType: 'quiz',
  randomize: false,
  personalize: false,
  types: {
    mc: { on: true,  qty: 10, pts: 2 },
    tf: { on: false, qty: 10, pts: 1 },
    id: { on: false, qty: 5,  pts: 2 },
    es: { on: false, qty: 2,  pts: 10 },
    ps: { on: false, qty: 3,  pts: 5 },
  },
}
```

Readiness logic (same as before, using `.on` flag):

```ts
const activeTypes = Object.entries(quizState.types).filter(([, v]) => v.on)

const isRightPanelReady = () => quizState.topic !== '' && activeTypes.length > 0

const isFullyReady = () => activeClass !== null && isRightPanelReady()
```

### 6.4 Footer

```tsx
<div className="panel-footer">
  <div className="footer-toggle">
    <label className="sw"><input type="checkbox" checked={quizState.randomize} onChange={...} /><span className="sw-track" /></label>
    <span className="ft-lbl">Randomize</span>
  </div>
  <div className="footer-toggle">
    <label className="sw"><input type="checkbox" checked={quizState.personalize} onChange={...} /><span className="sw-track" /></label>
    <span className="ft-lbl">Personalize</span>
  </div>

  <div className="footer-total">
    {isRightPanelReady() ? (
      <>
        <div className="total-pts">{totalPts} pts</div>
        <div className="total-time">~{totalMin} min</div>
      </>
    ) : (
      <div className="total-empty">Add question types above</div>
    )}
  </div>

  <button className="btn btn-primary" disabled={!isFullyReady()} onClick={handleGenerate}>
    Generate quiz →
  </button>
</div>
```

**Total computation:**

```ts
const totalPts = activeTypes.reduce((acc, [id, v]) => acc + v.qty * v.pts, 0)

const totalMin = activeTypes.reduce((acc, [id, v]) => {
  const qt = Q_TYPES.find(t => t.id === id)!
  return acc + v.qty * qt.timeMin
}, 0)
```

**Generate action:** Calls a server action (or client-side library like `docx`) to produce a `.docx` file and trigger a browser download. No DB write.

```css
.panel-footer {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 24px; border-top: 1px solid #1c1c1c; flex-shrink: 0;
}
.footer-toggle { display: flex; align-items: center; gap: 8px; }
.ft-lbl { font-size: 12px; color: #888; }
.footer-total { margin-left: auto; text-align: right; }
.total-pts  { font-size: 18px; font-weight: 700; color: #fff; }
.total-time { font-size: 11px; color: #666; margin-top: 2px; }
.total-empty { font-size: 12px; color: #444; font-style: italic; }
.btn { padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
.btn-primary { background: #4DB832; color: #fff; }
.btn-primary:hover { background: #3da027; }
.btn-primary:disabled { background: #2a2a2a; color: #555; cursor: default; }
```

---

## 7. AnyGrade panel

### 7.1 Layout

Two sections stacked vertically:

```css
.grade-panel { display: flex; flex-direction: column; height: 100%; }
.grade-section { flex: 1; padding: 24px 32px 0; min-height: 0; overflow-y: auto; }
.grade-sec-lbl {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .1em; color: #aaa; margin-bottom: 14px;
}
```

### 7.2 Student answer sheets section

Label: `STUDENT ANSWER SHEETS`

#### Drop zone (no files yet)

```tsx
<div
  className={`drop-zone ${dragActive ? 'active' : ''}`}
  onDragOver={e => { e.preventDefault(); setDragActive(true) }}
  onDragLeave={() => setDragActive(false)}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
>
  <input
    type="file" multiple
    accept=".jpg,.jpeg,.png,.heic,.pdf,.doc,.docx,.xls,.xlsx"
    style={{ display: 'none' }} ref={fileInputRef}
    onChange={handleFileChange}
  />
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#555" strokeWidth="1.5">
    <path d="M4 8a2 2 0 0 1 2-2h6l2 2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/>
    <path d="M16 14v8M13 17l3-3 3 3"/>
  </svg>
  <div className="drop-title">
    Drop student answer sheets here, or{' '}
    <button className="browse-link" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
      browse
    </button>
  </div>
  <div className="drop-sub">Individual sheets or full batches — JPG · PNG · HEIC · PDF · Word · Excel</div>
</div>
```

```css
.drop-zone {
  border: 1.5px dashed #2a2a2a; border-radius: 10px;
  padding: 28px; text-align: center; cursor: pointer; transition: border-color .15s;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.drop-zone:hover, .drop-zone.active { border-color: #4DB832; }
.drop-title  { font-size: 13px; color: #ccc; }
.browse-link { background: none; border: none; color: #4DB832; cursor: pointer; font-size: 13px; padding: 0; text-decoration: underline; }
.drop-sub    { font-size: 11px; color: #555; }
```

#### File list (files present)

No checkboxes. Each row shows filename + size + upload status + remove button.

```tsx
<div className="file-list">
  {files.map(file => (
    <div key={file.id} className="file-row">
      <span className="file-name">{file.name}</span>
      <span className="file-size">{formatBytes(file.size)}</span>
      <span className={`file-status ${file.status === 'ready' ? 'st-ready' : 'st-uploading'}`}>
        {file.status === 'ready' ? 'Ready' : 'Uploading…'}
      </span>
      <button className="file-x" onClick={() => removeFile(file.id)}>×</button>
    </div>
  ))}
  <button className="add-more-btn" onClick={() => fileInputRef.current?.click()}>
    + Add more sheets
  </button>
</div>
```

```css
.file-list { display: flex; flex-direction: column; gap: 4px; }
.file-row {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 14px; border-radius: 8px; background: #1a1a1a;
}
.file-name { flex: 1; font-size: 13px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-size { font-size: 11px; color: #555; flex-shrink: 0; }
.file-status { font-size: 11px; font-weight: 600; border-radius: 4px; padding: 2px 8px; flex-shrink: 0; }
.st-ready     { background: rgba(77,184,50,.18); color: #4DB832; }
.st-uploading { background: rgba(217,119,6,.14);  color: #D97706; }
.file-x { background: none; border: none; color: #555; font-size: 16px; cursor: pointer; padding: 0; line-height: 1; }
.file-x:hover { color: #e55; }
.add-more-btn {
  background: none; border: 1px dashed #2a2a2a; border-radius: 8px;
  color: #666; font-size: 12px; padding: 8px 14px; cursor: pointer; text-align: left; margin-top: 4px;
}
.add-more-btn:hover { border-color: #4DB832; color: #4DB832; }
```

### 7.3 Answer key section

Label: `ANSWER KEY / SOLUTION`

#### Four source cards

```tsx
const AK_SOURCES = [
  { id: 'quiz',  label: 'From AnyQuiz', icon: <QuizIcon /> },
  { id: 'file',  label: 'Upload file',  icon: <UploadIcon /> },
  { id: 'scan',  label: 'Scan key',     icon: <ScanIcon /> },
  { id: 'photo', label: 'Take photo',   icon: <PhoneIcon /> },
]
```

```css
.ak-cards { display: flex; gap: 8px; margin-bottom: 12px; }
.ak-card {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 12px 8px; background: #1a1a1a; border-radius: 8px;
  border: 1.5px solid transparent; cursor: pointer; font-size: 11px; color: #888;
}
.ak-card:hover { border-color: #333; color: #ccc; }
.ak-card.sel   { border-color: #4DB832; color: #fff; background: rgba(77,184,50,.08); }
```

#### From AnyQuiz

Clicking this card opens a **new browser window** — a separate Answer Key builder page (`/workspace/answer-key`). Does not expand inline. The card simply shows a "→ Open Answer Key" action label when selected.

#### Upload file (contextual expansion)

```tsx
{selectedAKSource === 'file' && (
  <div className="ak-context">
    <div className="drop-zone small" onClick={() => akFileRef.current?.click()}>
      <input type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} ref={akFileRef} onChange={handleAKFile} />
      <div className="drop-title">Drop answer key here, or <button className="browse-link">browse</button></div>
      <div className="drop-sub">JPG · PNG · PDF · Word · Excel</div>
    </div>
  </div>
)}
```

#### Scan key (contextual expansion)

Polls the scanner API on mount. Shows real device data when available; falls back to placeholder text.

```tsx
{selectedAKSource === 'scan' && (
  <div className="ak-context scanner-status">
    <div className="scan-row">
      <span className={`scan-dot ${scannerState.status}`} />
      <span className="scan-lbl">
        {scannerState.name ?? 'Waiting for scanner…'}
      </span>
    </div>
    {scannerState.name && (
      <div className="scan-detail">
        {[scannerState.connectionType, scannerState.statusLabel, scannerState.capability]
          .filter(Boolean).join(' · ')}
      </div>
    )}
    {!scannerState.name && (
      <div className="scan-hint">Connect a scanner and place the answer key face-down.</div>
    )}
  </div>
)}
```

Scanner state shape:

```ts
type ScannerState = {
  name: string | null              // e.g. "EPSON ES-400 II ADF" | null
  connectionType: string | null    // e.g. "USB" | "Wi-Fi"
  statusLabel: string | null       // e.g. "Ready to scan"
  capability: string | null        // e.g. "Grades each sheet in real time"
  status: 'waiting' | 'ready' | 'scanning' | 'error'
}
```

Placeholder when no scanner connected:

```
[amber dot]  Waiting for scanner…
             Connect a scanner and place the answer key face-down.
```

When scanner found:

```
[green dot]  EPSON ES-400 II ADF
             USB · Ready to scan · Grades each sheet in real time
```

```css
.scanner-status { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; background: #1a1a1a; border-radius: 8px; }
.scan-row  { display: flex; align-items: center; gap: 8px; }
.scan-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.scan-dot.waiting  { background: #D97706; animation: pulse 1.4s ease-in-out infinite; }
.scan-dot.ready    { background: #4DB832; }
.scan-dot.scanning { background: #4DB832; animation: pulse .8s ease-in-out infinite; }
.scan-dot.error    { background: #ef4444; }
.scan-lbl    { font-size: 13px; color: #ccc; font-weight: 500; }
.scan-detail { font-size: 11px; color: #555; }
.scan-hint   { font-size: 11px; color: #555; }
```

#### Take photo (contextual expansion)

```tsx
{selectedAKSource === 'photo' && (
  <div className="ak-context phone-pair">
    <div className="pair-instructions">
      <span className="pair-step">1</span>
      <span>Open AnyGrade on your phone</span>
    </div>
    <div className="pair-instructions">
      <span className="pair-step">2</span>
      <span>Tap <strong>Scan answer key</strong> and point at the key sheet</span>
    </div>
    <div className="pair-qr">
      <div className="qr-placeholder" /> {/* real QR code rendered here */}
      <span className="pair-code">Session: {sessionCode}</span>
    </div>
  </div>
)}
```

```css
.phone-pair { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; background: #1a1a1a; border-radius: 8px; }
.pair-instructions { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #ccc; }
.pair-step { width: 20px; height: 20px; border-radius: 50%; background: #2a2a2a; color: #888; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pair-qr   { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.qr-placeholder { width: 64px; height: 64px; background: #2a2a2a; border-radius: 6px; }
.pair-code { font-size: 12px; color: #555; font-family: monospace; }
```

### 7.4 AnyGrade footer

```tsx
<div className="panel-footer">
  <span style={{ fontSize: 12, color: '#555' }}>
    {files.length} files uploaded · answer key: {akStatus}
  </span>
  <button
    className="btn btn-primary"
    style={{ marginLeft: 'auto' }}
    disabled={!canGrade}
    onClick={handleGrade}
  >
    Grade {files.length} sheets
  </button>
</div>
```

`canGrade = files.length > 0 && answerKeyReady`

`akStatus` values: `'not set'` | `'file uploaded'` | `'from AnyQuiz'` | `'scanned'` | `'photo taken'`

**Grade action:** Uploads answer sheets to `scans/{user_id}/{assessment_id}/{n}.ext` and answer key to `scans/{user_id}/{assessment_id}/answer-key.ext` using the existing `uploadScans` server action. Creates an `assessments` record for the grading session. Redirects to `/dashboard/assessments/{id}` on success.

---

## 8. AnySubject panel

### 8.1 Layout

Two columns:

- **Left (35%):** Class context (auto from sidebar) + assessment picker
- **Right (65%):** Insights content

```css
.subject-panel { display: flex; height: 100%; }
.subject-left  { width: 35%; padding: 28px 20px 0 32px; border-right: 1px solid #1c1c1c; display: flex; flex-direction: column; gap: 16px; }
.subject-right { flex: 1; padding: 28px 32px 0 24px; overflow-y: auto; }
```

### 8.2 Left — context selectors

#### Class (auto-resolved)

Same read-only display as AnyQuiz — shows subject code + name from sidebar selection.

#### Assessment dropdown

```tsx
<div className="field-group">
  <label className="field-lbl">ASSESSMENT</label>
  <select
    className="field-select"
    value={selectedAssessmentId ?? ''}
    onChange={e => setSelectedAssessmentId(e.target.value)}
    disabled={!activeClass}
  >
    <option value="">Select an assessment…</option>
    {classAssessments.map(a => (
      <option key={a.id} value={a.id}>
        {a.title} — {new Date(a.conducted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
      </option>
    ))}
  </select>
</div>
```

`classAssessments` is fetched client-side when `activeClass` changes:

```ts
const { data } = await supabase
  .from('assessments')
  .select('id, title, conducted_at, max_score, total_items')
  .eq('class_id', activeClass.id)
  .order('conducted_at', { ascending: false })
```

### 8.3 Right — Insights

Shown only when `selectedAssessmentId` is set. Fetches:

```ts
const { data: submissions } = await supabase
  .from('submissions')
  .select('id, raw_score, students ( id, full_name, email )')
  .eq('assessment_id', selectedAssessmentId)
  .not('raw_score', 'is', null)
```

Tier classification:

```ts
const PASSING = 0.50

function classify(rawScore: number, maxScore: number): 'upper' | 'middle' | 'atrisk' {
  const pct = rawScore / maxScore
  if (pct >= 0.75) return 'upper'
  if (pct >= PASSING) return 'middle'
  return 'atrisk'
}
```

#### Class results card

Collapsible, sits at the top right. Shows mean, pass rate, highest, lowest.

```tsx
<div className="results-card">
  <div className="results-header" onClick={() => setExpanded(!expanded)}>
    <span>Class results</span>
    <span>{expanded ? '▲' : '▼'}</span>
  </div>
  {expanded && (
    <div className="results-body">
      {[
        { val: mean.toFixed(1), lbl: 'Mean' },
        { val: `${passRate}%`,  lbl: 'Passing' },
        { val: highest,         lbl: 'Highest' },
        { val: lowest,          lbl: 'Lowest' },
      ].map(s => (
        <div key={s.lbl} className="stat">
          <span className="stat-val">{s.val}</span>
          <span className="stat-lbl">{s.lbl}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

#### Findings

```tsx
type Finding = { severity: 'hi' | 'md' | 'lo'; text: string }
```

Findings are generated client-side from the submission data (e.g. "42% of students missed Question 3 — highest error rate"). Logic for generating findings is an engineering implementation detail; the spec defines only the rendering shape.

```tsx
<div className="findings">
  <div className="sec-lbl">FINDINGS</div>
  {findings.map((f, i) => (
    <div key={i} className="finding-row">
      <span className={`sev-badge sev-${f.severity}`}>
        {f.severity === 'hi' ? 'High' : f.severity === 'md' ? 'Medium' : 'Low'}
      </span>
      <span className="finding-text">{f.text}</span>
    </div>
  ))}
</div>
```

```css
.sev-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
.sev-hi { background: rgba(239,68,68,.15);  color: #ef4444; }
.sev-md { background: rgba(245,158,11,.15); color: #f59e0b; }
.sev-lo { background: rgba(99,102,241,.15); color: #818cf8; }
```

#### Three tier previews

```tsx
const TIERS = [
  { id: 'upper',  label: 'Upper',   range: '≥ 75%', color: '#4DB832', bg: 'rgba(77,184,50,.06)' },
  { id: 'middle', label: 'Middle',  range: '50–74%', color: '#f59e0b', bg: 'rgba(245,158,11,.06)' },
  { id: 'atrisk', label: 'At-risk', range: '< 50%',  color: '#ef4444', bg: 'rgba(239,68,68,.06)' },
]
```

Each tier preview card shows tier label + range + student count + first line of the default message.

```tsx
{TIERS.map(tier => {
  const count = submissions.filter(s => classify(s.raw_score, maxScore) === tier.id).length
  return (
    <div key={tier.id} className="tier-preview" style={{ borderColor: tier.color, background: tier.bg }}>
      <div className="tier-header">
        <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>
        <span className="tier-range">{tier.range}</span>
        <span className="tier-count">{count} students</span>
      </div>
      <div className="tier-msg-preview">{DEFAULT_MESSAGES[tier.id]}</div>
    </div>
  )
})}

<button className="btn btn-primary review-btn" onClick={() => setOverlayOpen(true)}>
  Review & send →
</button>
```

```css
.tier-preview { border: 1px solid; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; }
.tier-header  { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 13px; }
.tier-range   { font-size: 11px; color: #666; }
.tier-count   { margin-left: auto; font-size: 11px; color: #888; }
.tier-msg-preview { font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.review-btn { margin-top: 16px; width: 100%; }
```

### 8.4 Feedback overlay

Full-panel slide-up overlay. Opens on "Review & send →".

```tsx
<div className="feedback-overlay">
  <div className="overlay-header">
    <span className="overlay-title">Send feedback</span>
    <button className="overlay-close" onClick={onClose}>×</button>
  </div>

  {TIERS.map(tier => (
    <TierBlock
      key={tier.id}
      tier={tier}
      students={submissions.filter(s => classify(s.raw_score, maxScore) === tier.id)}
      message={messages[tier.id]}
      onMessageChange={msg => setMessages(prev => ({ ...prev, [tier.id]: msg }))}
      approved={approvals[tier.id]}
      onApprove={() => setApprovals(prev => ({ ...prev, [tier.id]: !prev[tier.id] }))}
    />
  ))}

  <button
    className="btn btn-primary"
    disabled={!Object.values(approvals).every(Boolean)}
    onClick={handleSend}
  >
    Send to {submissions.length} students
  </button>
</div>
```

`TierBlock` contains:
- Tier label + color header
- Editable message textarea (pencil icon toggles edit mode; default is read-only preview)
- Student list rows — `full_name` only
- Approve toggle ("Approve this message") — must approve all three tiers to unlock Send

```css
.feedback-overlay {
  position: absolute; inset: 0; background: #111; z-index: 10;
  display: flex; flex-direction: column; padding: 28px 32px; overflow-y: auto;
}
.overlay-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.overlay-title  { font-size: 15px; font-weight: 700; color: #fff; }
.overlay-close  { background: none; border: none; color: #555; font-size: 22px; cursor: pointer; }
```

**Send server action:**

```ts
// apps/web/src/app/workspace/actions.ts
'use server'

export async function sendFeedback(formData: FormData) {
  // reads: assessment_id, tier messages, student emails
  // sends email via Resend (or configured email provider) to each student
  // marks submissions with email_sent_at timestamp
}
```

After send: updates `submissions.email_sent_at` for each student in the batch. Overlay shows a confirmation state.

---

## 9. State management

All interactive state in `WorkspaceShell`. Passed down as props.

```ts
// Global workspace
const [mode, setMode] = useState<Mode>('quiz')
const [openClass, setOpenClass] = useState<string | null>(null)
const [activeClass, setActiveClass] = useState<ClassItem | null>(null)
const [activeSyllabus, setActiveSyllabus] = useState<Syllabus | null>(null)

// AnyQuiz
const [quizState, dispatch] = useReducer(quizReducer, initialQuizState)

// AnyGrade
const [files, setFiles] = useState<UploadFile[]>([])
const [selectedAKSource, setSelectedAKSource] = useState<AKSource | null>(null)
const [answerKeyReady, setAnswerKeyReady] = useState(false)
const [scannerState, setScannerState] = useState<ScannerState>(initialScannerState)

// AnySubject
const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
const [classAssessments, setClassAssessments] = useState<Assessment[]>([])
const [overlayOpen, setOverlayOpen] = useState(false)
const [messages, setMessages] = useState(DEFAULT_MESSAGES)
const [approvals, setApprovals] = useState({ upper: false, middle: false, atrisk: false })
```

When `activeClass` changes: reset `activeSyllabus`, `selectedAssessmentId`, `classAssessments`, overlay state.

---

## 10. Styling approach

Tailwind for layout and spacing utilities. Inline `style` props for dark-theme hex values with no Tailwind equivalent. Two keyframe animations added to `globals.css`:

```css
/* globals.css additions */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .4; transform: scale(.7); }
}
```

---

## 11. Dark theme tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#111` | Workspace background |
| `--surface` | `#1a1a1a` | Cards, file rows, type rows |
| `--border` | `#222` | Sidebar border |
| `--border-subtle` | `#1c1c1c` | Panel dividers |
| `--text` | `#fff` | Primary text |
| `--text-secondary` | `#ccc` | Secondary text |
| `--text-muted` | `#888` | Labels, placeholders |
| `--text-faint` | `#555` | Hints, file sizes |
| `--accent` | `#4DB832` | Active state, primary CTA |
| `--accent-bg` | `rgba(77,184,50,.12)` | Active subject row |
| `--warning` | `#D97706` | Uploading / scanner waiting |
| `--danger` | `#ef4444` | At-risk tier |

---

## 12. Wording reference (verbatim — do not change)

| Location | String |
|----------|--------|
| Drop zone headline | `Drop student answer sheets here, or browse` |
| Drop zone subtext | `Individual sheets or full batches — JPG · PNG · HEIC · PDF · Word · Excel` |
| Answer sheets section label | `STUDENT ANSWER SHEETS` |
| Answer key section label | `ANSWER KEY / SOLUTION` |
| Generate button | `Generate quiz →` |
| Review button | `Review & send →` |
| Send button | `Send to {n} students` |
| Scanner waiting (no device) | `Waiting for scanner…` |
| Scanner hint (no device) | `Connect a scanner and place the answer key face-down.` |
| Phone pairing step 1 | `Open AnyGrade on your phone` |
| Phone pairing step 2 | `Tap Scan answer key and point at the key sheet` |
| Topic placeholder | `Select a topic…` |
| Assessment placeholder | `Select an assessment…` |
| Class placeholder | `Select a class from the left →` |
| No syllabus | `No syllabus linked` |
| Add more sheets | `+ Add more sheets` |

---

## 13. Open questions (deferred, not blocking)

1. **Answer Key window (`/workspace/answer-key`):** What does the "From AnyQuiz" answer key builder look like? Is it a simplified AnyQuiz interface where the teacher inputs correct answers per question? Spec this separately before implementing AnyGrade "From AnyQuiz".

2. **Scanner API:** Which scanner API standard does the app target? TWAIN, WIA (Windows), eSCL/AirScan (network scanners), or a specific SDK? This affects the polling implementation.

3. **Email provider for AnySubject send:** Resend, SendGrid, or another provider? Affects `sendFeedback` server action implementation.

4. **Findings logic:** What algorithm generates findings from submission data? (e.g., item analysis, topic clustering) Define separately before implementing AnySubject right panel.

5. **Multi-subject classes (v2):** When a teacher handles more than one subject under the same class section, what is the data model? Junction table `class_syllabi`? Out of scope now but worth scheduling.
