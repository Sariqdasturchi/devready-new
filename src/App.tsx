import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { getStoredUser, getToken, homeForRole } from "./lib/auth";
import { PageLoader } from "./components/ui";
import Seo from "./components/Seo";

const LandingLayout = lazy(() => import("./components/layout/landingLayout"));
const Home = lazy(() => import("./pages/landing/Home"));
const Pricing = lazy(() => import("./pages/landing/Pricing"));
const BecomeMentor = lazy(() => import("./pages/landing/BecomeMentor"));
const BlogPage = lazy(() => import("./pages/landing/Blog"));
const BlogView = lazy(() => import("./pages/landing/BlogView"));
const NotFound = lazy(() => import("./pages/landing/NotFound"));
const Register = lazy(() => import("./pages/auth/Register"));
const Login = lazy(() => import("./pages/auth/Login"));

// Talaba
const UserDashboardLayout = lazy(() => import("./pages/userDashboard/UserDashboardLayout"));
const Dashboard = lazy(() => import("./pages/userDashboard/Dashboard"));
const UserTasks = lazy(() => import("./pages/userDashboard/Task"));
const TaskDetails = lazy(() => import("./components/user/TaskDetails"));
const CompletedTasks = lazy(() => import("./pages/userDashboard/CompletedTasks"));
const MyPoints = lazy(() => import("./pages/userDashboard/MyPoints"));
const Leaderboard = lazy(() => import("./pages/userDashboard/Leaderboard"));
const Achievements = lazy(() => import("./pages/userDashboard/Achievements"));
const UserPlans = lazy(() => import("./pages/userDashboard/Plans"));
const UserSettings = lazy(() => import("./pages/userDashboard/Settings"));

// Mentor
const MentorDashboardLayout = lazy(() => import("./pages/mentorDashboard/MentorDashboardLayout"));
const MentorDashboard = lazy(() => import("./pages/mentorDashboard/Dashboard"));
const MentorSubmissions = lazy(() => import("./pages/mentorDashboard/Submissions"));
const MentorTasks = lazy(() => import("./pages/mentorDashboard/Tasks"));
const MentorSettings = lazy(() => import("./pages/mentorDashboard/Settings"));

// Superadmin
const SuperadminDashboardLayout = lazy(() => import("./pages/superadminDashboard/SuperadminDashboardLayout"));
const SuperadminDashboard = lazy(() => import("./pages/superadminDashboard/Dashboard"));
const SuperadminUsers = lazy(() => import("./pages/superadminDashboard/Users"));
const SuperadminMentors = lazy(() => import("./pages/superadminDashboard/SuperadminMentors"));
const SuperadminTasks = lazy(() => import("./pages/superadminDashboard/Tasks"));
const SuperadminSubmissions = lazy(() => import("./pages/superadminDashboard/Submissions"));
const SuperadminPayments = lazy(() => import("./pages/superadminDashboard/Payments"));
const SuperadminPlans = lazy(() => import("./pages/superadminDashboard/Plans"));
const SuperadminBlogs = lazy(() => import("./pages/superadminDashboard/Blogs"));
const SuperadminQuestions = lazy(() => import("./pages/superadminDashboard/Questions"));
const SuperadminSettings = lazy(() => import("./pages/superadminDashboard/Settings"));

type AppRole = "user" | "mentor" | "superadmin";

function ProtectedRoute({ roles }: { roles: AppRole[] }) {
  const user = getStoredUser();
  if (!getToken() || !user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role as AppRole)) {
    const home = homeForRole(user.role);
    return user.role === "admin" ? <Navigate to="/login" replace /> : <Navigate to={home} replace />;
  }
  // Kabinet sahifalari qidiruv tizimlariga yopiq
  return (
    <>
      <Seo title="Kabinet" noindex />
      <Outlet />
    </>
  );
}

/** Tizimga kirgan foydalanuvchi login/register sahifasiga kirsa — o'z kabinetiga */
function GuestOnly() {
  const user = getStoredUser();
  const { pathname } = useLocation();
  if (getToken() && user && user.role !== "admin") return <Navigate to={homeForRole(user.role)} replace />;
  const register = pathname.startsWith("/register");
  return (
    <>
      {register ? (
        <Seo
          title="Ro'yxatdan o'tish"
          description="DevReady'da bepul ro'yxatdan o'ting: yo'nalishingizni tanlang, darajangizni aniqlovchi testdan o'ting va birinchi amaliy taskni boshlang."
        />
      ) : (
        <Seo title="Kirish" noindex />
      )}
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="page-loader" role="status"><span /></div>}>
        <Routes>
          <Route element={<LandingLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/mentors" element={<BecomeMentor />} />
            <Route path="/blogs" element={<BlogPage />} />
            <Route path="/blogs/:id" element={<BlogView />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute roles={["user"]} />}>
            <Route element={<UserDashboardLayout />}>
              <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="/dashboard/tasks" element={<Suspense fallback={<PageLoader />}><UserTasks /></Suspense>} />
              <Route path="/dashboard/tasks/:id" element={<Suspense fallback={<PageLoader />}><TaskDetails /></Suspense>} />
              <Route path="/dashboard/completed" element={<Suspense fallback={<PageLoader />}><CompletedTasks /></Suspense>} />
              <Route path="/dashboard/points" element={<Suspense fallback={<PageLoader />}><MyPoints /></Suspense>} />
              <Route path="/dashboard/leaderboard" element={<Suspense fallback={<PageLoader />}><Leaderboard /></Suspense>} />
              <Route path="/dashboard/achievements" element={<Suspense fallback={<PageLoader />}><Achievements /></Suspense>} />
              <Route path="/dashboard/plans" element={<Suspense fallback={<PageLoader />}><UserPlans /></Suspense>} />
              <Route path="/dashboard/settings" element={<Suspense fallback={<PageLoader />}><UserSettings /></Suspense>} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["mentor"]} />}>
            <Route element={<MentorDashboardLayout />}>
              <Route path="/mentor/dashboard" element={<Suspense fallback={<PageLoader />}><MentorDashboard /></Suspense>} />
              <Route path="/mentor/dashboard/submissions" element={<Suspense fallback={<PageLoader />}><MentorSubmissions /></Suspense>} />
              <Route path="/mentor/dashboard/tasks" element={<Suspense fallback={<PageLoader />}><MentorTasks /></Suspense>} />
              <Route path="/mentor/dashboard/settings" element={<Suspense fallback={<PageLoader />}><MentorSettings /></Suspense>} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["superadmin"]} />}>
            <Route element={<SuperadminDashboardLayout />}>
              <Route path="/superadmin/dashboard" element={<Suspense fallback={<PageLoader />}><SuperadminDashboard /></Suspense>} />
              <Route path="/superadmin/dashboard/users" element={<Suspense fallback={<PageLoader />}><SuperadminUsers /></Suspense>} />
              <Route path="/superadmin/dashboard/mentors" element={<Suspense fallback={<PageLoader />}><SuperadminMentors /></Suspense>} />
              <Route path="/superadmin/dashboard/tasks" element={<Suspense fallback={<PageLoader />}><SuperadminTasks /></Suspense>} />
              <Route path="/superadmin/dashboard/submissions" element={<Suspense fallback={<PageLoader />}><SuperadminSubmissions /></Suspense>} />
              <Route path="/superadmin/dashboard/payments" element={<Suspense fallback={<PageLoader />}><SuperadminPayments /></Suspense>} />
              <Route path="/superadmin/dashboard/plans" element={<Suspense fallback={<PageLoader />}><SuperadminPlans /></Suspense>} />
              <Route path="/superadmin/dashboard/blogs" element={<Suspense fallback={<PageLoader />}><SuperadminBlogs /></Suspense>} />
              <Route path="/superadmin/dashboard/questions" element={<Suspense fallback={<PageLoader />}><SuperadminQuestions /></Suspense>} />
              <Route path="/superadmin/dashboard/settings" element={<Suspense fallback={<PageLoader />}><SuperadminSettings /></Suspense>} />
            </Route>
          </Route>

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
