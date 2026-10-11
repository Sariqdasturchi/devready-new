import axios, { AxiosError } from "axios";
import type {
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
  Submission,
  Task,
  User,
  UserTask,
  LevelInfo,
  LeaderboardResponse,
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
  register: (body: { fullName: string; phone: string }) => api.post("/auth/register", body).then((r) => r.data),
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
  update: (body: Partial<{ fullName: string; direction: string; bio: string; isAvailable: boolean }>) =>
    data<User>(api.put("/profile/update", body)),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return data<{ avatar: string }>(api.post("/profile/avatar", form));
  },
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
    api.get<{ success: boolean; data: UserTask[]; needsDirection?: boolean }>("/tasks/my").then((r) => r.data),
  get: (id: string) => data<UserTask>(api.get(`/tasks/${id}`)),
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
  start: (taskId: string) => data<Submission>(api.post("/submissions/start", { taskId })),
  submit: (
    id: string,
    body: { githubUrl: string; liveDemoUrl?: string; notes?: string; reviewMethod: "ai" | "mentor"; mentorId?: string },
  ) => data<Submission>(api.post(`/submissions/${id}/submit`, body)),
  mine: () => data<Submission[]>(api.get("/submissions/me")),
  get: (id: string) => data<Submission>(api.get(`/submissions/${id}`)),
  retryAi: (id: string) => api.post(`/submissions/${id}/ai-check`).then((r) => r.data),
  toMentor: (id: string, mentorId: string) => data<Submission>(api.post(`/submissions/${id}/to-mentor`, { mentorId })),
  aiStatus: () => data<{ available: boolean }>(api.get("/submissions/ai-status")),
  review: (id: string, body: { status: "approved" | "rejected"; score: number; comment: string }) =>
    data<Submission>(
      api.patch(`/submissions/${id}/review`, {
        status: body.status,
        mentorFeedback: { score: body.score, comment: body.comment },
      }),
    ),
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
  create: (planId: string, check: File) => {
    const form = new FormData();
    form.append("planId", planId);
    form.append("check", check);
    return data<Payment>(api.post("/payments", form));
  },
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
export type BlogPayload = { title: string; text: string; tags: string[]; published: boolean; image?: File | null; removeImage?: boolean };

const blogForm = (body: Partial<BlogPayload>) => {
  const form = new FormData();
  if (body.title !== undefined) form.append("title", body.title);
  if (body.text !== undefined) form.append("text", body.text);
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
