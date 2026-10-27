import axios, { AxiosError } from "axios";
import type { AiHealth,
  AdminContest,
  Contest,
  ContestStandings,
  AdminStats,
  Blogs,
  Mentor,
  MentorStats,
  MyPlan,
  Notification,
  Overview,
  Pagination,
  Payment,
  PaymentInfo,
  Plan,
  Question,
  SandboxCode,
  DesignImage,
  PayoutSettings,
  MentorContract,
  ContractStatus,
  MentorEarningsOverview,
  PayoutSummary,
  MentorPayout,
  FeedbackWindow,
  StudentFeedback,
  ComplaintItem,
  PromoCode,
  PromoCheck,
  Submission,
  Task,
  User,
  ProfileLinks,
  PublicProfile,
  PublicWork,
  UserTask,
  LevelInfo,
  LeaderboardResponse,
  AdminOrg,
  CatalogTask,
  GroupView,
  JoinPreview,
  OrgBrief,
  OrgDetail,
  OrgMember,
  ReviewMode,
  StaffSubmission,
  StudentGroup,
} from "../types/type";

// VITE_API_URL=https://api.devready.uz/api (productionda .env orqali beriladi)
const RAW_API_URL = import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000/api";
// "https://" yozilmay qolsa ham ishlaydi (aks holda so'rov frontend domeniga ketib qoladi)
export const API_URL = (/^https?:\/\//.test(RAW_API_URL) ? RAW_API_URL : `https://${RAW_API_URL}`).replace(/\/$/, "");
export const API_ORIGIN = API_URL.replace(/\/api$/, "");

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ code?: string }>) => {
    const status = err.response?.status;
    const isAuthCall = err.config?.url?.startsWith("/auth/");
    // Token eskirgan yoki hisob bloklangan bo'lsa — sessiyani tozalab login sahifasiga
    if (!isAuthCall && (status === 401 || (status === 403 && err.response?.data?.code === "BLOCKED"))) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

/** Xatodan foydalanuvchiga ko'rsatiladigan matn */
export function errorMessage(err: unknown, fallback = "Xatolik yuz berdi. Qaytadan urinib ko'ring") {
  const e = err as AxiosError<{ message?: string }>;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.code === "ERR_NETWORK") return "Server bilan aloqa yo'q. Internetni tekshiring";
  return fallback;
}

export function errorCode(err: unknown): string | undefined {
  return (err as AxiosError<{ code?: string }>)?.response?.data?.code;
}

type Envelope<T> = { success: boolean; data: T; message?: string };
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

// ─── AUTH ─────────────────────────────────────────────────────────────────
type AuthResponse = { success: boolean; message: string; token: string; user: User };

export const authApi = {
  register: (body: { fullName: string; phone: string; anonId?: string; source?: string }) =>
    api.post<{ success: boolean; message: string; linkToken?: string }>("/auth/register", body).then((r) => r.data),
  /** Bir bosishda Telegram tasdiqlash holati */
  telegramLink: (token: string) =>
    api
      .get<{ success: boolean; status: "pending" | "linked" | "expired"; error?: string | null; token?: string; user?: User }>(`/auth/telegram-link/${token}`)
      .then((r) => r.data),
  sendOtp: (body: { phone: string; telegramId: string }) => api.post("/auth/send-otp", body).then((r) => r.data),
  verifyOtp: (body: { phone: string; code: string }) => api.post<AuthResponse>("/auth/verify-otp", body).then((r) => r.data),
  login: (body: { phone: string }) => api.post("/auth/login", body).then((r) => r.data),
  loginVerify: (body: { phone: string; code: string }) =>
    api.post<AuthResponse>("/auth/login/verify", body).then((r) => r.data),
  me: () => data<User>(api.get("/auth/me")),
};

export const quizApi = {
  questions: (direction: string) =>
    data<{ _id: string; q: string; options: string[]; correct: number }[]>(api.get("/quiz/questions", { params: { direction } })),
  saveResult: (body: { direction: string; level: string }) => data<User>(api.post("/quiz/save-result", body)),
  // superadmin
  list: (direction?: string) => data<Question[]>(api.get("/quiz", { params: { direction } })),
  create: (body: Omit<Question, "_id">) => data<Question>(api.post("/quiz", body)),
  update: (id: string, body: Omit<Question, "_id">) => data<Question>(api.put(`/quiz/${id}`, body)),
  remove: (id: string) => api.delete(`/quiz/${id}`).then((r) => r.data),
};

// ─── PROFILE / NOTIFICATIONS ─────────────────────────────────────────────
export const profileApi = {
  get: () => data<User>(api.get("/profile/me")),
  update: (
    body: Partial<{
      fullName: string;
      direction: string;
      bio: string;
      isAvailable: boolean;
      username: string;
      profilePublic: boolean;
      profileShowWork: boolean;
      links: ProfileLinks;
    }>,
  ) =>
    data<User>(api.put("/profile/update", body)),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return data<{ avatar: string }>(api.post("/profile/avatar", form));
  },
};

/** Ochiq profil — ro'yxatdan o'tmasdan */
export const publicProfileApi = {
  get: (username: string, count = false) => data<PublicProfile>(api.get(`/public/users/${encodeURIComponent(username)}`, { params: count ? { count: 1 } : undefined })),
  work: (username: string, id: string) => data<PublicWork>(api.get(`/public/users/${encodeURIComponent(username)}/work/${id}`)),
};

export const notificationApi = {
  list: () =>
    api.get<{ success: boolean; data: Notification[]; unread: number }>("/notifications").then((r) => r.data),
  read: (id: string) => api.patch(`/notifications/${id}/read`),
  readAll: () => api.patch("/notifications/read-all"),
};

// ─── USER: TASKS & SUBMISSIONS ────────────────────────────────────────────
export const taskApi = {
  my: () =>
    api.get<{ success: boolean; data: UserTask[]; needsDirection?: boolean; closedDirection?: string | null }>("/tasks/my").then((r) => r.data),
  get: (id: string) => data<UserTask>(api.get(`/tasks/${id}`)),
  /** Ochiq: ro'yxatdan o'tmasdan */
  publicList: (track?: string) => data<Task[]>(api.get("/tasks/public", { params: { track } })),
  publicGet: (id: string) => data<UserTask>(api.get(`/tasks/public/${id}`)),
  stats: () =>
    data<{
      completedTasks: number;
      totalPoints: number;
      level?: LevelInfo;
      averageScore: number;
      averageTime: number;
      categoryBreakdown: Record<string, number>;
      history: { id: string; taskId?: string; description: string; points: number; score: number; date: string }[];
    }>(api.get("/tasks/stats")),
  // superadmin / mentor
  all: (params?: Record<string, string>) => data<Task[]>(api.get("/tasks", { params })),
  create: (body: Partial<Task>) => data<Task>(api.post("/tasks", body)),
  update: (id: string, body: Partial<Task>) => data<Task>(api.patch(`/tasks/${id}`, body)),
  remove: (id: string) => api.delete(`/tasks/${id}`).then((r) => r.data),
};

export const submissionApi = {
  start: (taskId: string, timed = true) => data<Submission>(api.post("/submissions/start", { taskId, timed })),
  submit: (
    id: string,
    body: {
      githubUrl?: string;
      liveDemoUrl?: string;
      notes?: string;
      reviewMethod: "ai" | "mentor";
      mentorId?: string;
      code?: SandboxCode;
      testResults?: { passed: number; total: number };
    },
  ) => data<Submission>(api.post(`/submissions/${id}/submit`, body)),
  feedbackWindow: (id: string) => data<FeedbackWindow>(api.get(`/submissions/${id}/feedback-window`)),
  rate: (id: string, rating: "up" | "down") => data<StudentFeedback>(api.post(`/submissions/${id}/rate`, { rating })),
  complain: (id: string, text: string) => data<StudentFeedback>(api.post(`/submissions/${id}/complaint`, { text })),
  reassign: (id: string, mentorId: string) => data<Submission>(api.post(`/submissions/${id}/reassign`, { mentorId })),
  saveDraft: (id: string, code: SandboxCode) => data<{ savedAt: string }>(api.put(`/submissions/${id}/draft`, { code })),
  addDesignImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("images", f));
    return data<DesignImage[]>(api.post(`/submissions/${id}/design-images`, form));
  },
  removeDesignImage: (id: string, url: string) => data<DesignImage[]>(api.delete(`/submissions/${id}/design-images`, { data: { url } })),
  mine: () => data<Submission[]>(api.get("/submissions/me")),
  get: (id: string) => data<Submission>(api.get(`/submissions/${id}`)),
  retryAi: (id: string) => api.post(`/submissions/${id}/ai-check`).then((r) => r.data),
  toMentor: (id: string, mentorId: string) => data<Submission>(api.post(`/submissions/${id}/to-mentor`, { mentorId })),
  aiStatus: () => data<{ available: boolean }>(api.get("/submissions/ai-status")),
  /** Superadmin: har bir AI provayderini sinab ko'rish */
  aiHealth: () => data<AiHealth>(api.get("/submissions/ai-health")),
  review: (id: string, body: { status: "approved" | "rejected"; score: number; comment: string }) =>
    api
      .patch<{ data: Submission; earning: { amount: number; percent: number; rate: number } | null }>(`/submissions/${id}/review`, {
        status: body.status,
        mentorFeedback: { score: body.score, comment: body.comment },
      })
      .then((r) => ({ submission: r.data.data, earning: r.data.earning })),
};

export type FunnelStep = { key: string; label: string; group: string; count: number };
export type FunnelData = {
  days: number;
  source: string | null;
  steps: FunnelStep[];
  bySource: { source: string; visitors: number; registered: number; started: number; paid: number }[];
  daily: { date: string; visits: number; registrations: number }[];
  methods: { telegramLink: number; manualId: number; quizSkipped: number };
  tracking: boolean;
};

export const funnelApi = {
  get: (days: number, source?: string) => data<FunnelData>(api.get("/events/funnel", { params: { days, source: source || undefined } })),
};

export const analyticsApi = {
  overview: () => data<Overview>(api.get("/analytics/overview")),
  calendar: () => data<Record<string, number>>(api.get("/analytics/activity-calendar")),
  technologies: () => data<{ technology: string; count: number }[]>(api.get("/analytics/technology-stats")),
  recordVisit: () => api.post("/analytics/record-visit").catch(() => undefined),
};

export const leaderboardApi = {
  get: (type: "overall" | "weekly" | "monthly", track?: string, page: number | "me" = 1, limit = 20) =>
    api
      .get<LeaderboardResponse>(`/leaderboard/${type}`, { params: { page, limit, ...(track ? { track } : {}) } })
      .then((r) => r.data),
};

// ─── MENTORS ─────────────────────────────────────────────────────────────
export type MentorPayload = {
  fullName: string;
  phone: string;
  telegramId: string;
  direction: string;
  status?: string;
  bio?: string;
};

export const mentorApi = {
  list: (direction?: string) => data<Mentor[]>(api.get("/mentor/list", { params: direction ? { direction } : undefined })),
  submissions: (status: "pending" | "reviewed" | "all") => data<Submission[]>(api.get("/mentor/submissions", { params: { status } })),
  stats: () => data<MentorStats & { reviewedThisWeek: number; daily: { date: string; count: number }[] }>(api.get("/mentor/stats")),
  // superadmin
  all: () => data<Mentor[]>(api.get("/mentor")),
  create: (body: MentorPayload) => data<Mentor>(api.post("/mentor", body)),
  update: (id: string, body: Partial<MentorPayload> & { isAvailable?: boolean }) => data<Mentor>(api.put(`/mentor/${id}`, body)),
  remove: (id: string) => api.delete(`/mentor/${id}`).then((r) => r.data as { message: string }),
};

// ─── PROMOKODLAR (superadmin) ────────────────────────────────────────────
export type PromoPayload = {
  code: string;
  description?: string;
  discountType: "percent" | "fixed";
  value: number;
  plans: string[];
  maxUses: number | null;
  firstPurchaseOnly: boolean;
  validFrom: string | null;
  validUntil: string | null;
  active?: boolean;
};
export const promoApi = {
  list: () => data<PromoCode[]>(api.get("/admin/promos")),
  create: (body: PromoPayload) => data<PromoCode>(api.post("/admin/promos", body)),
  update: (id: string, body: Partial<PromoPayload>) => data<PromoCode>(api.patch(`/admin/promos/${id}`, body)),
  remove: (id: string) => api.delete<{ message: string; data: { deleted?: boolean; deactivated?: boolean } }>(`/admin/promos/${id}`).then((r) => r.data),
};

// ─── HAFTALIK MUSOBAQA ────────────────────────────────────────────────────
export type ContestPayload = { title: string; description: string; taskId: string; startAt: string; endAt: string; timeLimitMin: number; published: boolean };
export const contestApi = {
  list: () => data<{ current: Contest[]; past: Contest[]; serverTime: string }>(api.get("/contests")),
  get: (id: string) => data<Contest>(api.get(`/contests/${id}`)),
  leaderboard: (id: string) => data<ContestStandings>(api.get(`/contests/${id}/leaderboard`)),
  start: (id: string) => data<{ submissionId: string; taskId: string; dueAt: string }>(api.post(`/contests/${id}/start`)),
  // superadmin
  adminList: () => data<AdminContest[]>(api.get("/contests/admin/all")),
  create: (body: ContestPayload) => data<AdminContest>(api.post("/contests", body)),
  update: (id: string, body: Partial<ContestPayload>) => data<AdminContest>(api.put(`/contests/${id}`, body)),
  remove: (id: string) => api.delete<{ message: string }>(`/contests/${id}`).then((r) => r.data),
  disqualify: (id: string, userId: string, value: boolean) => api.post<{ message: string }>(`/contests/${id}/disqualify`, { userId, value }).then((r) => r.data),
  publishResults: (id: string) => api.post<{ message: string }>(`/contests/${id}/results`).then((r) => r.data),
};

// ─── O'QUV MARKAZLARI VA GURUHLAR ────────────────────────────────────────
export interface OrgPayload {
  name?: string;
  ownerPhone?: string;
  seats?: number;
  activeUntil?: string;
  status?: string;
  contactName?: string;
  contactPhone?: string;
  note?: string;
}
type Msg<T = null> = { message: string; data: T };
const msg = <T,>(p: Promise<{ data: Msg<T> }>) => p.then((r) => r.data);

export const orgApi = {
  // ega va o'qituvchi
  my: () => data<{ orgs: OrgBrief[]; studentGroups: number }>(api.get("/org/my")),
  detail: (orgId: string) => data<OrgDetail>(api.get(`/org/orgs/${orgId}`)),
  addTeacher: (orgId: string, phone: string) => msg<OrgMember>(api.post(`/org/orgs/${orgId}/teachers`, { phone })),
  removeMember: (orgId: string, userId: string) => msg(api.delete(`/org/orgs/${orgId}/members/${userId}`)),
  catalog: (params: { track?: string; difficulty?: string; search?: string } = {}) => data<CatalogTask[]>(api.get("/org/catalog", { params })),
  createGroup: (orgId: string, body: { name: string; description?: string }) => msg<{ id: string; inviteCode: string }>(api.post(`/org/orgs/${orgId}/groups`, body)),
  group: (groupId: string) => data<GroupView>(api.get(`/org/groups/${groupId}`)),
  updateGroup: (groupId: string, body: { name?: string; description?: string; inviteOpen?: boolean; archived?: boolean; teacherIds?: string[] }) =>
    msg(api.put(`/org/groups/${groupId}`, body)),
  resetInvite: (groupId: string) => msg<{ inviteCode: string }>(api.post(`/org/groups/${groupId}/invite`)),
  removeStudent: (groupId: string, userId: string) => msg(api.delete(`/org/groups/${groupId}/students/${userId}`)),
  assign: (groupId: string, body: { taskId: string; dueAt: string; reviewMode: ReviewMode; note?: string }) => msg<{ id: string }>(api.post(`/org/groups/${groupId}/assignments`, body)),
  updateAssignment: (id: string, body: { dueAt?: string; note?: string; reviewMode?: ReviewMode }) => msg(api.put(`/org/assignments/${id}`, body)),
  deleteAssignment: (id: string) => msg(api.delete(`/org/assignments/${id}`)),
  remind: (id: string) => data<{ sent: number }>(api.post(`/org/assignments/${id}/remind`)),
  submission: (id: string) => data<StaffSubmission>(api.get(`/org/submissions/${id}`)),
  review: (id: string, body: { status: "approved" | "rejected"; score: number; comment: string }) =>
    msg<{ status: string; reviewScore: number; earnedXP: number }>(api.post(`/org/submissions/${id}/review`, body)),
  comment: (id: string, text: string) => msg(api.post(`/org/submissions/${id}/comment`, { text })),
  // talaba
  joinPreview: (code: string) => data<JoinPreview>(api.get(`/org/join/${encodeURIComponent(code)}`)),
  join: (code: string) => msg<{ groupId: string; already: boolean }>(api.post(`/org/join/${encodeURIComponent(code)}`)),
  student: () => data<{ groups: StudentGroup[] }>(api.get("/org/student")),
  leave: (groupId: string) => msg(api.post(`/org/groups/${groupId}/leave`)),
  start: (assignmentId: string) => data<{ submissionId: string; taskId: string; dueAt: string; status: string }>(api.post(`/org/assignments/${assignmentId}/start`)),
  // superadmin
  adminList: () => data<AdminOrg[]>(api.get("/org/admin/orgs")),
  adminCreate: (body: OrgPayload) => msg<{ id: string }>(api.post("/org/admin/orgs", body)),
  adminUpdate: (id: string, body: OrgPayload) => msg<{ id: string }>(api.put(`/org/admin/orgs/${id}`, body)),
};

// ─── MENTOR TO'LOVLARI ───────────────────────────────────────────────────
export const earningApi = {
  mine: () => data<MentorEarningsOverview>(api.get("/mentor/earnings")),
  setCard: (body: { number: string; holder: string }) => data<{ number: string; holder: string; masked: string }>(api.put("/mentor/payout-card", body)),
  contract: () => data<MentorContract>(api.get("/mentor/contract")),
  acceptContract: (version: number, typedName: string) => data<ContractStatus>(api.post("/mentor/contract/accept", { version, typedName })),
  myReceipt: (payoutId: string) => api.get(`/mentor/payouts/${payoutId}/receipt`, { responseType: "blob" }).then((r) => URL.createObjectURL(r.data)),
};

export const payoutApi = {
  summary: () => data<PayoutSummary>(api.get("/admin/payouts/summary")),
  history: (mentorId?: string) => data<MentorPayout[]>(api.get("/admin/payouts/history", { params: mentorId ? { mentorId } : undefined })),
  settings: () => data<PayoutSettings>(api.get("/admin/payouts/settings")),
  saveSettings: (body: Partial<PayoutSettings>) =>
    api.put<{ data: PayoutSettings; message: string }>("/admin/payouts/settings", body).then((r) => r.data),
  contract: () =>
    data<{
      current: { version: number; text: string; updatedAt: string };
      versions: { version: number; createdAt: string }[];
      acceptances: { _id: string; mentorId: { _id: string; fullName: string; phone?: string } | null; version: number; typedName: string; ip: string; acceptedAt: string }[];
    }>(api.get("/admin/payouts/contract")),
  saveContract: (text: string, newVersion: boolean) =>
    api.put<{ data: { version: number }; message: string }>("/admin/payouts/contract", { text, newVersion }).then((r) => r.data),
  complaints: (status: "open" | "all") => data<ComplaintItem[]>(api.get("/admin/payouts/complaints", { params: { status } })),
  resolve: (submissionId: string, action: "accept" | "reject", resolution: string) =>
    data<StudentFeedback>(api.patch(`/admin/payouts/complaints/${submissionId}`, { action, resolution })),
  pay: (mentorId: string, body: { note?: string; force?: boolean; receipt?: File | null }) => {
    const form = new FormData();
    if (body.note) form.append("note", body.note);
    if (body.force) form.append("force", "true");
    if (body.receipt) form.append("check", body.receipt);
    return api.post<{ data: MentorPayout; message: string }>(`/admin/payouts/${mentorId}/pay`, form).then((r) => r.data);
  },
  receipt: (payoutId: string) => api.get(`/admin/payouts/${payoutId}/receipt`, { responseType: "blob" }).then((r) => URL.createObjectURL(r.data)),
};

// ─── PLANS & PAYMENTS ────────────────────────────────────────────────────
export const planApi = {
  active: () => data<Plan[]>(api.get("/plans/active")),
  mine: () => data<MyPlan>(api.get("/plans/me")),
  // superadmin
  all: () => data<Plan[]>(api.get("/plans")),
  create: (body: Partial<Plan>) => data<Plan>(api.post("/plans", body)),
  update: (id: string, body: Partial<Plan>) => data<Plan>(api.put(`/plans/${id}`, body)),
  remove: (id: string) => api.delete(`/plans/${id}`).then((r) => r.data),
};

export const paymentApi = {
  info: () => data<PaymentInfo>(api.get("/payments/info")),
  mine: () => data<Payment[]>(api.get("/payments/my")),
  create: (planId: string, check: File | null, promoCode?: string) => {
    const form = new FormData();
    form.append("planId", planId);
    if (check) form.append("check", check);
    if (promoCode) form.append("promoCode", promoCode);
    return api.post<{ data: Payment; message: string }>("/payments", form).then((r) => r.data);
  },
  checkPromo: (code: string, planId: string) => data<PromoCheck>(api.post("/payments/promo-check", { code, planId })),
  // superadmin
  all: (status?: string) =>
    api
      .get<{ success: boolean; data: Payment[]; stats: { pending: number; approved: number; revenue: number } }>("/payments", {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data),
  checkImage: (id: string) => api.get(`/payments/${id}/check`, { responseType: "blob" }).then((r) => URL.createObjectURL(r.data)),
  approve: (id: string) => data<Payment>(api.patch(`/payments/${id}/approve`)),
  reject: (id: string, reason: string) => data<Payment>(api.patch(`/payments/${id}/reject`, { reason })),
};

// ─── SUPERADMIN ──────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => data<AdminStats>(api.get("/admin/dashboard/statistics")),
  newUsers: () => data<User[]>(api.get("/admin/dashboard/new-users")),
  users: (params: Record<string, string | number>) =>
    data<{ users: User[]; pagination: Pagination }>(api.get("/admin/users", { params })),
  user: (id: string) => data<User & { submissions: Submission[]; payments: Payment[] }>(api.get(`/admin/${id}`)),
  updateUser: (id: string, body: Partial<Pick<User, "fullName" | "phone" | "direction" | "degree" | "status">>) =>
    data<User>(api.patch(`/admin/${id}`, body)),
  setStatus: (id: string, status: "active" | "blocked") => data<User>(api.patch(`/admin/${id}/status`, { status })),
  setPlan: (id: string, planId: string | null) => data<User>(api.patch(`/admin/${id}/plan`, { planId })),
  deleteUser: (id: string) => api.delete(`/admin/${id}`).then((r) => r.data),
  submissions: (status?: string) => data<Submission[]>(api.get("/admin/submission", { params: status ? { status } : undefined })),
  submissionStats: () =>
    data<{ total: number; approved: number; rejected: number; pending: number; expired: number; inProgress: number; averageScore: number }>(
      api.get("/admin/submission/infos"),
    ),
};

// ─── BLOGS ───────────────────────────────────────────────────────────────
export type BlogPayload = { title: string; text: string; tags: string[]; published: boolean; slug?: string; excerpt?: string; image?: File | null; removeImage?: boolean };

const blogForm = (body: Partial<BlogPayload>) => {
  const form = new FormData();
  if (body.title !== undefined) form.append("title", body.title);
  if (body.text !== undefined) form.append("text", body.text);
  if (body.slug !== undefined) form.append("slug", body.slug);
  if (body.excerpt !== undefined) form.append("excerpt", body.excerpt);
  if (body.tags !== undefined) form.append("tags", body.tags.join(","));
  if (body.published !== undefined) form.append("published", String(body.published));
  if (body.image) form.append("image", body.image);
  if (body.removeImage) form.append("removeImage", "true");
  return form;
};

export const blogApi = {
  list: () => data<Blogs[]>(api.get("/blogs")),
  get: (id: string) => data<Blogs>(api.get(`/blogs/${id}`)),
  all: () => data<Blogs[]>(api.get("/blogs/admin/all")),
  create: (body: BlogPayload) => data<Blogs>(api.post("/blogs", blogForm(body))),
  update: (id: string, body: Partial<BlogPayload>) => data<Blogs>(api.put(`/blogs/${id}`, blogForm(body))),
  remove: (id: string) => api.delete(`/blogs/${id}`).then((r) => r.data),
};

// Landing sahifalari uchun (eski nom)
export const getAllBlogs = () => blogApi.list();

export default api;
