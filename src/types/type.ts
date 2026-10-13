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
  createdAt?: string;
  submissionsCount?: number;
  approvedCount?: number;
  sandbox?: TaskSandbox | null;
}

export interface SandboxCode {
  html: string;
  css: string;
  js: string;
}

export interface TaskSandbox {
  enabled: boolean;
  starter?: Partial<SandboxCode>;
  tests: { title: string; code: string }[];
}

export interface AiFeedback {
  score?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  checkedAt?: string;
  error?: string;
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
  reviewMethod?: "ai" | "mentor" | null;
  githubUrl?: string | null;
  liveDemoUrl?: string | null;
  notes?: string | null;
  /** Kod muhitida yozilgan yechim */
  code?: SandboxCode | null;
  testResults?: { passed: number; total: number; checkedAt?: string } | null;
  startedAt: string;
  dueAt: string;
  submittedAt?: string | null;
  finalizedAt?: string | null;
  reviewScore: number;
  earnedXP: number;
  try?: number;
  aiFeedback?: AiFeedback;
  mentorFeedback?: MentorFeedback;
  updatedAt?: string;
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
  checkImage: string;
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
