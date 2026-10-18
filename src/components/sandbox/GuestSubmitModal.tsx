import { useNavigate } from "react-router-dom";
import { HiOutlineCheckCircle } from "react-icons/hi2";
import type { UserTask } from "../../types/type";
import { setTryReturn } from "../../lib/track";
import { Button, Modal } from "../ui";

/** Ro'yxatdan o'tmasdan sinayotgan foydalanuvchi "Yuborish"ni bossa: kod saqlanadi, ro'yxatdan o'tishga taklif */
export default function GuestSubmitModal({
  open,
  onClose,
  task,
  passed,
  total,
  tested,
}: {
  open: boolean;
  onClose: () => void;
  task: UserTask;
  passed: number;
  total: number;
  tested: boolean;
}) {
  const navigate = useNavigate();
  const go = (path: "/register" | "/login") => {
    setTryReturn(task._id, task.track);
    navigate(path);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yechimni tekshirishga yuborish"
      footer={
        <>
          <Button variant="secondary" onClick={() => go("/login")}>
            Hisobim bor — kirish
          </Button>
          <Button onClick={() => go("/register")}>Ro'yxatdan o'tish</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-[14px] text-ink-2 leading-relaxed">
        {tested && (
          <p className="flex items-center gap-2 font-semibold text-ink">
            <HiOutlineCheckCircle size={18} className={passed === total ? "text-emerald-600" : "text-brand"} />
            {passed === total ? `Barcha ${total} ta test o'tdi` : `${total} ta testdan ${passed} tasi o'tdi`}
          </p>
        )}
        <p>
          Kodingiz shu brauzerda saqlandi. Uni mentor yoki AI tekshirishi, XP va daraja olishingiz uchun ro'yxatdan o'ting — bu 1 daqiqa: ism, telefon va Telegram'da bitta tugma.
        </p>
        <p>Ro'yxatdan o'tgach shu task ochiladi va yozgan kodingiz o'z joyida bo'ladi.</p>
      </div>
    </Modal>
  );
}
