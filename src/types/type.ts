// ─── Umumiy turlar (backend javoblariga mos) ─────────────────────────────

export type Role = "user" | "mentor" | "superadmin" | "admin";

export type SubmissionStatus =
  | "in_progress"
  | "pending"
  | "ai_checking"
  | "ai_checked"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired";

export type TaskStatus = SubmissionStatus | "not_started";

export type Difficulty = "oson" | "orta" | "qiyin";

export interface PlanRef {
  _id: string;
  name: string;
  price: number;
  duration?: number;
  taskLimit?: number;
  mentorReviewsIncluded?: number;
  aiReviewEnabled?: boolean;
}

export interface User {
  _id: string;
  id?: string;
  fullName: string;
  phone: string;
  telegramId?: string | null;
  role: Role;
  direction?: string | null;
  degree?: string | null;
  status: "active" | "blocked";
  avatar?: string | null;
  bio?: string;
  isAvailable?: boolean;
  totalScore?: number;
  completedTasks?: number;
  streak?: number;
  plan?: PlanRef | string | null;
  activePlan?: PlanRef | null;
  planStartDate?: string | null;
  planExpireDate?: string | null;
  createdAt?: string;
  lastActiveDate?: string | null;
  // Ochiq profil
  username?: string | null;
  profilePublic?: boolean;
  profileShowWork?: boolean;
  profileViews?: number;
  links?: ProfileLinks;
}

export interface ProfileLinks {
  github?: string;
  linkedin?: string;
  telegram?: string;
}

/** devready.uz/u/<username> — ish beruvchiga ko'rsatiladigan profil */
export interface PublicProfileItem {
  id: string;
  task: { id: string; title: string; track: string; difficulty: Difficulty; tags: string[]; kind: "job" | "interview" | null };
  score: number;
  xp: number;
  reviewedBy: "mentor" | "teacher" | "ai";
  review: string;
  strengths: string[];
  tests: { passed: number; total: number } | null;
  language: string | null;
  date: string;
  workType: "code" | "design" | "repo" | null;
  canOpen: boolean;
  githubUrl: string | null;
  liveDemoUrl: string | null;
}

export interface PublicProfile {
  username: string;
  fullName: string;
  avatar: string | null;
  direction: string | null;
  level: string;
  bio: string;
  links: ProfileLinks;
  joinedAt: string;
  xp: number;
  showWork: boolean;
  stats: {
    approved: number;
    interview: number;
    job: number;
    avgScore: number | null;
    byDifficulty: { difficulty: Difficulty; count: number }[];
  };
  skills: { name: string; count: number }[];
  items: PublicProfileItem[];
  /** Haftalik musobaqada sovrinli o'rinlar */
  contestWins?: { id: string; title: string; place: number | null; date: string }[];
}

export interface PublicWork {
  id: string;
  task: { id: string; title: string; track: string; difficulty: Difficulty; deliverable?: string; sandbox: TaskSandbox | null };
  code: SandboxCode | null;
  designImages: { url: string; name?: string }[];
  testResults: { passed: number; total: number } | null;
  githubUrl: string | null;
  liveDemoUrl: string | null;
  author: string;
}

export interface DesignTemplate {
  _id?: string;
  title: string;
  url: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  content?: string;
  track: string;
  difficulty: Difficulty;
  estimatedTime: number;
  xp: number;
  requirements?: string[];
  exampleLink?: string | null;
  designTemplates?: DesignTemplate[];
  tags?: string[];
  isActive: boolean;
  /** contest — musobaqa tugaguncha katalogda ko'rinmaydi */
  visibility?: "public" | "contest";
  createdAt?: string;
  submissionsCount?: number;
  approvedCount?: number;
  sandbox?: TaskSandbox | null;
  /** Sandbox bo'lmagan tasklar: repozitoriy havolasi yoki dizayn (Figma + rasmlar) */
  deliverable?: "repo" | "design";
}

export type SandboxKind = "web" | "code" | "sql" | "config" | "qa";
export type CodeLanguage = "javascript" | "typescript" | "python";

/** Kod muhitidagi yechim: web — html/css/js(+server); code/sql/qa — language + main; config — files */
export interface SandboxCode {
  html?: string;
  css?: string;
  js?: string;
  server?: string;
  language?: string;
  main?: string;
  files?: { name: string; content: string }[];
}

export type CodeMatch = "equal" | "subset" | "approx" | "throws" | "unordered";
export interface CodeCaseStep {
  call?: string;
  args?: unknown[];
  expect?: unknown;
  match?: CodeMatch;
}
export interface CodeCase {
  title: string;
  steps: CodeCaseStep[];
}
export interface SqlCheckDef {
  title: string;
  sql: string;
  expected: unknown[][];
  ordered?: boolean;
}

export interface TaskSandbox {
  enabled: boolean;
  kind?: SandboxKind;
  // web
  starter?: { html?: string; css?: string; js?: string; server?: string };
  viewport?: "desktop" | "mobile";
  // web (DOM) va config testlari
  tests?: { title: string; code: string }[];
  // code
  languages?: CodeLanguage[];
  entry?: string;
  starters?: Partial<Record<CodeLanguage | "sql", string>>;
  cases?: CodeCase[];
  // sql
  setup?: string;
  checks?: SqlCheckDef[];
  // config
  files?: { name: string; lang: string; starter: string }[];
  // qa
  target?: string;
  names?: string[];
  mutants?: { title: string; code: string }[];
  minTests?: number;
}

export interface AiCriteria {
  requirements?: number;
  functionality?: number;
  quality?: number;
  structure?: number;
}

export interface AiRequirementCheck {
  text: string;
  status: "met" | "partial" | "missing";
  note?: string;
}

export interface DesignImage {
  url: string;
  name?: string;
}

export interface AiFeedback {
  score?: number;
  /** "design" bo'lsa mezon nomlari dizayn uchun ko'rsatiladi */
  rubric?: "code" | "design";
  summary?: string;
  criteria?: AiCriteria;
  requirements?: AiRequirementCheck[];
  provider?: string;
  model?: string;
  truncated?: boolean;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  checkedAt?: string;
  error?: string;
  /** Texnik sabab (superadmin uchun) */
  errorDetail?: string;
}

export interface MentorFeedback {
  score?: number;
  comment?: string;
  reviewedAt?: string;
}

type Ref<T> = T | string | null;

export interface Submission {
  _id: string;
  userId: Ref<Pick<User, "_id" | "fullName" | "phone" | "direction" | "avatar" | "degree">>;
  taskId: Ref<Partial<Task> & { _id: string; title: string }>;
  mentorId?: Ref<Pick<User, "_id" | "fullName" | "direction">>;
  reviewedBy?: Ref<Pick<User, "_id" | "fullName" | "role">>;
  status: SubmissionStatus;
  reviewMethod?: "ai" | "mentor" | "teacher" | null;
  githubUrl?: string | null;
  liveDemoUrl?: string | null;
  notes?: string | null;
  /** Kod muhitida yozilgan yechim */
  code?: SandboxCode | null;
  testResults?: { passed: number; total: number; checkedAt?: string } | null;
  /** Dizayn tasklari: yuklangan maket rasmlari */
  designImages?: DesignImage[];
  studentFeedback?: StudentFeedback | null;
  assignedAt?: string | null;
  startedAt: string;
  dueAt: string;
  submittedAt?: string | null;
  finalizedAt?: string | null;
  reviewScore: number;
  earnedXP: number;
  try?: number;
  /** false — erkin rejim (7 kun), true — taymerli */
  timed?: boolean;
  aiFeedback?: AiFeedback;
  mentorFeedback?: MentorFeedback;
  /** Guruh topshirig'i urinishi bo'lsa — topshiriq id si */
  assignmentId?: string | null;
  /** O'qituvchining qo'shimcha izohi (AI baholagan guruh yechimiga) */
  teacherComment?: { text: string; at: string; by?: Ref<{ _id: string; fullName: string }> } | null;
  updatedAt?: string;
  /** AI tekshiruvi urinishlari soni va joriy urinish boshlangan vaqt */
  aiAttempts?: number;
  aiStartedAt?: string | null;
}

/** GET /submissions/ai-health — superadmin diagnostikasi */
export interface AiHealth {
  configured: boolean;
  providers: { provider: string; configured: boolean; ok: boolean; model?: string; ms?: number; status?: number | null; error?: string }[];
}

/** /tasks/my va /tasks/:id javobi — task + foydalanuvchi holati */
export interface UserTask extends Task {
  status: TaskStatus;
  submissionId: string | null;
  startedAt: string | null;
  dueAt: string | null;
  submittedAt: string | null;
  reviewScore: number;
  earnedXP: number;
  tries: number;
  /** Musobaqa urinishi bo'lsa — musobaqa id si (AI avtomatik tekshiradi) */
  contestId?: string | null;
  /** Guruh topshirig'i urinishi: muddat va tekshiruvni o'qituvchi belgilaydi */
  assignmentId?: string | null;
  reviewMethod?: "ai" | "mentor" | "teacher" | null;
  assignment?: { id: string; dueAt: string; reviewMode: ReviewMode; note: string; groupName: string } | null;
  submission?: Submission | null;
  serverTime?: string;
}

export interface MentorStats {
  pending: number;
  reviewed: number;
  approved: number;
  avgScore: number;
}

export interface Mentor extends User {
  stats: MentorStats;
}

export interface Plan {
  _id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  features?: string[];
  active: boolean;
  isPopular?: boolean;
  taskLimit: number;
  mentorReviewsIncluded: number;
  aiReviewEnabled: boolean;
  usersCount?: number;
}

export interface MyPlan extends Plan {
  isFree?: boolean;
  usedTasks: number;
  usedMentorReviews: number;
  remainingTasks: number | null;
  remainingMentorReviews: number | null;
  expiresAt: string | null;
}

export interface Payment {
  _id: string;
  user: Ref<Pick<User, "_id" | "fullName" | "phone" | "telegramId">>;
  plan: Ref<Pick<Plan, "_id" | "name" | "price" | "duration">>;
  admin?: Ref<Pick<User, "_id" | "fullName">>;
  amount: number;
  originalAmount?: number | null;
  discount?: number;
  promoCodeText?: string | null;
  checkImage: string | null;
  source: "web" | "telegram";
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface PaymentInfo {
  cardNumber: string;
  cardOwner: string;
  botUsername: string;
  plans: Plan[];
  pendingPayment: (Payment & { plan: Pick<Plan, "_id" | "name" | "price"> }) | null;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  fullName: string;
  avatar?: string | null;
  level: string;
  direction?: string | null;
  completedTasks: number;
  points: number;
}

export interface LevelInfo {
  level: string;
  next: string | null;
  nextXp: number | null;
  xpToNext: number;
}

export interface LeaderboardResponse {
  success: boolean;
  top: LeaderboardRow[];
  data: LeaderboardRow[];
  me: (LeaderboardRow & { page: number }) | null;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface PeriodStats {
  started: number;
  submitted: number;
  approved: number;
  rejected: number;
  expired: number;
  xp: number;
  activeDays: number;
}

export interface Overview {
  user: { fullName: string; direction?: string | null; degree?: string | null; avatar?: string | null };
  totalScore: number;
  completedTasks: number;
  averageDegree: string;
  xpLevel: string;
  levelInfo?: LevelInfo;
  streak: number;
  rank: number | null;
  statusCounts: { inProgress: number; inReview: number; approved: number; rejected: number; expired: number };
  periods: { daily: PeriodStats; weekly: PeriodStats; monthly: PeriodStats };
  chart: { date: string; xp: number; completed: number; visits: number }[];
  plan: {
    name: string;
    isFree?: boolean;
    taskLimit: number;
    usedTasks: number;
    remainingTasks: number | null;
    expiresAt: string | null;
  };
  recent: {
    _id: string;
    taskId?: string;
    title: string;
    track?: string;
    status: SubmissionStatus;
    reviewScore: number;
    earnedXP: number;
    updatedAt: string;
  }[];
}

export interface AdminStats {
  users: { total: number; blocked: number; newToday: number; newWeek: number; newMonth: number; activeToday: number; activeWeek: number; paid: number };
  mentors: number;
  tasks: { total: number; active: number };
  submissions: { total: number; inProgress: number; needCheck: number; approved: number; rejected: number; expired: number; averageScore: number };
  payments: { pending: number; revenue: number; revenueMonth: number };
  tracks: { track: string; count: number }[];
  series: { registrations: { date: string; count: number }[]; submissions: { date: string; count: number }[] };
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Question {
  _id: string;
  direction: string;
  q: string;
  options: string[];
  correct: number;
}

export interface Blogs {
  _id: string;
  title: string;
  /** SEO manzil: /blogs/<slug> */
  slug?: string;
  /** Qidiruv natijasi va preview uchun qisqa tavsif */
  excerpt?: string;
  text: string;
  image: string;
  tags: string[];
  published: boolean;
  views: number;
  createdAt: string;
  updatedAt?: string;
}

// ─── Mentor to'lovlari ────────────────────────────────────────────────────
export type Difficulty3 = "oson" | "orta" | "qiyin";

export interface PayoutSettings {
  rates: Record<Difficulty3, number>;
  minCommentLength: number;
  slaHours: number;
  lateRatePct: number;
  reassignHours: number;
  holdDays: number;
  minPayout: number;
  payoutDay: number;
  bonusPct: number;
  bonusThresholdPct: number;
  bonusMinRatings: number;
}

export interface ContractStatus {
  version: number;
  accepted: boolean;
  acceptedVersion: number | null;
  acceptedAt: string | null;
}

export interface MentorContract extends ContractStatus {
  text: string;
  updatedAt?: string;
  settings: PayoutSettings;
}

export type EarningStatus = "pending" | "approved" | "paid" | "void";

export interface MentorEarning {
  _id: string;
  submissionId: string;
  task?: { _id: string; title: string; track: string; difficulty: string } | null;
  student?: { fullName: string } | null;
  difficulty: Difficulty3;
  rate: number;
  percent: number;
  amount: number;
  reviewHours: number;
  reviewedAt: string;
  availableAt: string;
  status: EarningStatus;
  voidReason?: string;
  rating?: "up" | "down" | null;
  complaintOpen?: boolean;
}

export interface MentorPayout {
  _id: string;
  mentorId: string | { _id: string; fullName: string; phone?: string };
  reviews: number;
  amount: number;
  bonus: number;
  total: number;
  rating: { up: number; down: number };
  card: { number: string; holder: string };
  receipt?: string | null;
  note?: string;
  paidBy?: { fullName: string } | string | null;
  paidAt: string;
}

export interface BonusInfo {
  eligible: boolean;
  share: number;
  rated: number;
  bonus: number;
}

export interface MentorEarningsOverview {
  summary: { pending: number; approved: number; paid: number; void: number; thisMonth: number; thisMonthCount: number; bonus: BonusInfo };
  settings: PayoutSettings;
  card: { number: string; holder: string; masked: string } | null;
  contract: ContractStatus;
  items: MentorEarning[];
  payouts: MentorPayout[];
}

export interface PayoutSummaryRow {
  mentor: { _id: string; fullName: string; phone?: string; direction?: string; avatar?: string | null; status?: string };
  card: { number: string; holder: string } | null;
  contract: { accepted: boolean; version: number | null; acceptedAt: string | null };
  pending: number;
  approved: number;
  approvedCount: number;
  paid: number;
  bonus: BonusInfo;
  payable: number;
  lastPayout: { paidAt: string; total: number } | null;
}

export interface PayoutSummary {
  rows: PayoutSummaryRow[];
  totals: { payable: number; pending: number; paid: number };
  settings: PayoutSettings;
  contractVersion: number;
}

export interface StudentFeedback {
  rating?: "up" | "down" | null;
  ratedAt?: string;
  complaint?: { text: string; createdAt: string; status: "open" | "accepted" | "rejected"; resolution?: string; resolvedAt?: string };
}

export interface FeedbackWindow {
  canRate: boolean;
  canComplain: boolean;
  complaintUntil: string | null;
  reassignAt: string | null;
  reassignHours: number;
  feedback: StudentFeedback | null;
}

export interface ComplaintItem extends Omit<Submission, "studentFeedback"> {
  studentFeedback: StudentFeedback;
  earning: (MentorEarning & { mentorId: string }) | null;
}

// ─── Promokodlar ─────────────────────────────────────────────────────────
export interface PromoCode {
  _id: string;
  code: string;
  description?: string;
  discountType: "percent" | "fixed";
  value: number;
  plans: { _id: string; name: string; price: number }[];
  maxUses: number | null;
  firstPurchaseOnly: boolean;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
  usage: { approved: number; pending: number; rejected: number; revenue: number; discount: number };
}

export interface PromoCheck {
  code: string;
  description?: string;
  price: number;
  discount: number;
  amount: number;
}

// ─── Haftalik musobaqa ─────────────────────────────────────────────────────
export type ContestStatus = "draft" | "upcoming" | "live" | "ended" | "finished";

export interface ContestWinner {
  place: number;
  name: string;
  username: string | null;
  passed: number;
  total: number;
  durationMin: number;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  timeLimitMin: number;
  status: ContestStatus;
  participants: number;
  task: { id: string; title: string; track: string; difficulty: Difficulty; xp: number } | null;
  myEntry: { submissionId: string; status: TaskStatus; startedAt: string; dueAt: string; submittedAt: string | null; testResults: { passed: number; total: number } | null } | null;
  resultsPublishedAt: string | null;
  winners: ContestWinner[];
  serverTime?: string;
}

export interface ContestRow {
  place: number | null;
  userId: string;
  name: string;
  username: string | null;
  avatar: string | null;
  passed: number;
  total: number;
  durationMin: number;
  // faqat superadmin
  submissionId?: string;
  status?: TaskStatus;
  aiScore?: number | null;
  disqualified?: boolean;
}

export interface ContestStandings {
  started: number;
  submitted: number;
  rows: ContestRow[];
}

export interface AdminContest {
  _id: string;
  title: string;
  description: string;
  taskId: string | null;
  task: { id: string; title: string; track: string; difficulty: Difficulty } | null;
  startAt: string;
  endAt: string;
  timeLimitMin: number;
  published: boolean;
  status: ContestStatus;
  started: number;
  submitted: number;
  resultsPublishedAt: string | null;
  disqualified: string[];
}

// ─── O'quv markazlari va guruhlar ────────────────────────────────────────
export type ReviewMode = "ai" | "teacher";
export type OrgRole = "owner" | "teacher";
export type OrgStatus = "pilot" | "active" | "suspended";

export interface OrgBrief {
  id: string;
  name: string;
  status: OrgStatus;
  activeUntil: string;
  active: boolean;
  seats: number;
  usedSeats?: number;
  role?: OrgRole;
  groups?: number;
}

export interface OrgMember {
  userId: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  role: OrgRole;
  addedAt?: string;
  groups?: number;
}

export interface OrgGroupSummary {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  inviteOpen: boolean;
  archived: boolean;
  students: number;
  teachers: { id: string; name: string }[];
  assignments: number;
  openAssignments: number;
  toReview: number;
  createdAt: string;
}

export interface OrgDetail {
  org: OrgBrief;
  members: OrgMember[];
  groups: OrgGroupSummary[];
}

export interface TaskBrief {
  id: string;
  title: string;
  track: string;
  difficulty: Difficulty;
  xp: number;
  estimatedTime: number;
  kind: string;
}

export interface CatalogTask extends TaskBrief {
  description: string;
  tags: string[];
}

/** Nazorat jadvalidagi katak: talabaning shu topshiriq bo'yicha eng muhim urinishi */
export type CellStatus = "not_started" | "missed" | "in_progress" | "checking" | "review" | "approved" | "rejected" | "expired";
export interface ProgressCell {
  status: CellStatus;
  submissionId?: string;
  score?: number | null;
  passed?: number | null;
  total?: number | null;
  startedAt?: string;
  submittedAt?: string | null;
  tries?: number;
  reviewMethod?: "ai" | "mentor" | "teacher" | null;
  needsTeacher?: boolean;
  hasDraft?: boolean;
}

export interface GroupAssignment {
  id: string;
  task: TaskBrief;
  dueAt: string;
  reviewMode: ReviewMode;
  note: string;
  createdAt: string;
  remindedAt: string | null;
  open: boolean;
  stats: { students: number; started: number; submitted: number; approved: number; toReview: number; avgScore: number | null; avgTests: number | null };
}

export interface GroupStudent {
  id: string;
  name: string;
  avatar: string | null;
  username: string | null;
  direction: string | null;
  joinedAt: string;
  lastActiveDate: string | null;
}

export interface GroupView {
  group: {
    id: string;
    name: string;
    description: string;
    inviteCode: string;
    inviteOpen: boolean;
    archived: boolean;
    teachers: { id: string; name: string; avatar: string | null }[];
    createdAt: string;
  };
  org: OrgBrief;
  role: OrgRole;
  students: GroupStudent[];
  assignments: GroupAssignment[];
  cells: Record<string, Record<string, ProgressCell>>;
  studentStats: Record<string, { approved: number; submitted: number; missed: number; avgScore: number | null; lastActivity: string | null }>;
}

export interface StaffSubmission {
  submission: Submission & { reviewedBy?: Ref<{ _id: string; fullName: string; role: Role }> };
  assignment: { id: string; dueAt: string; reviewMode: ReviewMode; note: string };
  group: { id: string; name: string };
  history: { id: string; status: SubmissionStatus; score: number; startedAt: string; submittedAt: string | null; try: number; testResults: { passed: number; total: number } | null }[];
}

export interface StudentAssignment {
  id: string;
  task: TaskBrief;
  dueAt: string;
  reviewMode: ReviewMode;
  note: string;
  open: boolean;
  my: ProgressCell;
}

export interface StudentGroup {
  id: string;
  name: string;
  description: string;
  org: { name: string; active: boolean };
  teachers: string[];
  assignments: StudentAssignment[];
}

export interface JoinPreview {
  group: { id: string; name: string; description: string; students: number };
  org: { name: string };
  teachers: string[];
  member: boolean;
  open: boolean;
  reason: "ORG_INACTIVE" | "INVITE_CLOSED" | null;
}

export interface AdminOrg extends OrgBrief {
  type: "school" | "company";
  contactName: string;
  contactPhone: string;
  note: string;
  createdAt: string;
  members: { userId: string; name: string; phone: string | null; role: OrgRole }[];
  stats: { groups: number; assignments: number; submissions: number; weekSubmissions: number };
}
