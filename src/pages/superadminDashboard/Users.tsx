import { useEffect, useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlineUsers } from "react-icons/hi2";
import { adminApi, errorMessage, planApi } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  Select,
  StatusBadge,
  Table,
} from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { LEVELS, TRACKS } from "../../lib/constants";
import { formatDate, formatPrice } from "../../lib/format";
import type { Payment, Plan, Submission, User } from "../../types/type";

type Detail = User & { submissions: Submission[]; payments: Payment[] };

export default function SuperadminUsers() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [track, setTrack] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, track, status, plan, sort]);

  const params = { search: debounced, track, status, plan, sort, page, limit: 20 };
  const key = `admin:users:${JSON.stringify(params)}`;
  const query = useCachedQuery(key, () => adminApi.users(params), { staleTime: 10_000 });
  const plans = useCachedQuery<Plan[]>("admin:plans", planApi.all, { staleTime: 60_000 });

  const toggleBlock = async (u: User) => {
    try {
      await adminApi.setStatus(u._id, u.status === "blocked" ? "active" : "blocked");
      toast.success(u.status === "blocked" ? "Blokdan chiqarildi" : "Bloklandi");
      query.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const users = query.data?.users || [];
  const pg = query.data?.pagination;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Foydalanuvchilar" subtitle={pg ? `Jami ${pg.total} ta talaba` : undefined} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="relative lg:col-span-2">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism, telefon yoki Telegram ID" className="pl-9" />
        </div>
        <Select value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="">Barcha yo'nalishlar</option>
          {TRACKS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">Barcha tariflar</option>
          <option value="free">Free</option>
          {plans.data
            ?.filter((p) => p.price > 0)
            .map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
        </Select>
        <div className="flex gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Holat</option>
            <option value="active">Faol</option>
            <option value="blocked">Bloklangan</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Yangi</option>
            <option value="score">XP</option>
            <option value="name">Ism</option>
            <option value="oldest">Eski</option>
          </Select>
        </div>
      </div>

      <Card>
        {query.loading ? (
          <PageLoader />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.refetch} />
        ) : users.length === 0 ? (
          <EmptyState icon={<HiOutlineUsers />} title="Foydalanuvchi topilmadi" />
        ) : (
          <Table head={["Talaba", "Yo'nalish", "XP / Tasklar", "Tarif", "Holat", "Qo'shilgan", ""]}>
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-mist">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setOpenId(u._id)} className="flex items-center gap-3 text-left cursor-pointer">
                    <Avatar name={u.fullName} src={u.avatar} size={32} />
                    <span>
                      <span className="block font-semibold text-ink whitespace-nowrap">{u.fullName}</span>
                      <span className="block text-xs text-muted">{u.phone}</span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 text-ink-2 whitespace-nowrap">
                  {u.direction || "—"}
                  {u.degree && <span className="block text-[11px] text-muted">{u.degree}</span>}
                </td>
                <td className="px-4 py-3 text-ink-2 whitespace-nowrap">
                  <span className="text-brand font-semibold">{u.totalScore || 0}</span> / {u.completedTasks || 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {u.activePlan ? <Badge tone="success">{u.activePlan.name}</Badge> : <Badge>Free</Badge>}
                  {u.activePlan && u.planExpireDate && <span className="block text-[11px] text-muted mt-1">{formatDate(u.planExpireDate)} gacha</span>}
                </td>
                <td className="px-4 py-3">{u.status === "blocked" ? <Badge tone="danger">Bloklangan</Badge> : <Badge tone="success">Faol</Badge>}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(u._id)}>
                      Ko'rish
                    </Button>
                    <Button size="sm" variant={u.status === "blocked" ? "secondary" : "danger"} onClick={() => toggleBlock(u)}>
                      {u.status === "blocked" ? "Blokdan chiqarish" : "Bloklash"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {pg && pg.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-line text-xs text-muted">
            <span>
              {pg.page} / {pg.pages} sahifa
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Oldingi
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= pg.pages} onClick={() => setPage((p) => p + 1)}>
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </Card>

      <UserDetailModal
        id={openId}
        plans={plans.data || []}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          invalidateCache("admin:stats");
          query.refetch();
        }}
      />
    </div>
  );
}

function UserDetailModal({ id, plans, onClose, onChanged }: { id: string | null; plans: Plan[]; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [user, setUser] = useState<Detail | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", direction: "", degree: "" });
  const [planId, setPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return setUser(null);
    adminApi
      .user(id)
      .then((u) => {
        setUser(u);
        setForm({ fullName: u.fullName, phone: u.phone, direction: u.direction || "", degree: u.degree || "" });
        const p = typeof u.plan === "object" && u.plan ? u.plan._id : "";
        const active = p && (!u.planExpireDate || new Date(u.planExpireDate) > new Date());
        setPlanId(active ? p : "");
      })
      .catch((err) => {
        toast.error(errorMessage(err));
        onClose();
      });
  }, [id, onClose, toast]);

  if (!id) return null;

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await adminApi.updateUser(user._id, { fullName: form.fullName, phone: form.phone, direction: form.direction || null, degree: form.degree || null });
      const currentPlan = typeof user.plan === "object" && user.plan ? user.plan._id : "";
      if (planId !== currentPlan) await adminApi.setPlan(user._id, planId || null);
      toast.success("Saqlandi");
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!user) return;
    try {
      await adminApi.deleteUser(user._id);
      toast.success("Foydalanuvchi o'chirildi");
      setConfirmDelete(false);
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={user?.fullName || "Yuklanmoqda..."}
        footer={
          user && (
            <>
              <Button variant="danger" onClick={() => setConfirmDelete(true)} className="mr-auto">
                O'chirish
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Yopish
              </Button>
              <Button loading={saving} onClick={save}>
                Saqlash
              </Button>
            </>
          )
        }
      >
        {!user ? (
          <PageLoader />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { l: "XP", v: user.totalScore || 0 },
                { l: "Bajarilgan", v: user.completedTasks || 0 },
                { l: "Urinishlar", v: user.submissions.length },
                { l: "Telegram ID", v: user.telegramId || "—" },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-mist border border-line p-3">
                  <p className="text-[11px] text-muted">{x.l}</p>
                  <p className="text-sm font-bold text-ink mt-1 truncate">{x.v}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ism">
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </Field>
              <Field label="Telefon">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Yo'nalish">
                <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                  <option value="">Tanlanmagan</option>
                  {TRACKS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Daraja">
                <Select value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })}>
                  <option value="">—</option>
                  {LEVELS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tarif" hint="To'lovsiz tarif berish / Free ga qaytarish" className="sm:col-span-2">
                <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <option value="">Free</option>
                  {plans
                    .filter((p) => p.price > 0)
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} — {formatPrice(p.price)} / {p.duration} kun
                      </option>
                    ))}
                </Select>
              </Field>
            </div>

            <div>
              <h4 className="text-sm font-bold text-ink mb-2">So'nggi urinishlar</h4>
              {user.submissions.length === 0 ? (
                <p className="text-xs text-muted">Hali task boshlanmagan</p>
              ) : (
                <div className="rounded-xl border border-line divide-y divide-line max-h-64 overflow-y-auto">
                  {user.submissions.map((s) => (
                    <div key={s._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-ink-2 truncate">{typeof s.taskId === "object" && s.taskId ? s.taskId.title : "O'chirilgan task"}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {(s.status === "approved" || s.status === "rejected") && <span className="text-xs text-ink-2">{s.reviewScore}/100</span>}
                        <StatusBadge status={s.status} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user.payments.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-ink mb-2">To'lovlar</h4>
                <div className="rounded-xl border border-line divide-y divide-line">
                  {user.payments.map((p) => (
                    <div key={p._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-ink-2">
                        {typeof p.plan === "object" && p.plan ? p.plan.name : "—"} · {formatPrice(p.amount)}
                      </span>
                      <span className="text-xs text-muted">
                        {p.status} · {formatDate(p.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={confirmDelete}
        danger
        title="Foydalanuvchini o'chirish"
        text={
          <>
            <b>{user?.fullName}</b> va uning barcha urinishlari, to'lovlari butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi. Vaqtincha cheklash uchun
            "Bloklash"dan foydalaning.
          </>
        }
        confirmLabel="O'chirish"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
