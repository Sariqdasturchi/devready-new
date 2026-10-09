import { useNavigate } from "react-router-dom";
import { HiOutlineRocketLaunch } from "react-icons/hi2";
import { Button, Modal } from "../ui";

/** Tarif limiti tugaganda chiqadigan taklif */
export default function UpgradeModal({ open, message, onClose }: { open: boolean; message?: string; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tarifni yangilash vaqti keldi"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keyinroq
          </Button>
          <Button onClick={() => navigate("/dashboard/plans")}>Tariflarni ko'rish</Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <span className="w-14 h-14 rounded-2xl bg-brand-tint border border-brand/30 text-brand flex items-center justify-center">
          <HiOutlineRocketLaunch size={28} />
        </span>
        <p className="text-sm text-ink-2">{message || "Joriy tarifingiz limiti tugadi."}</p>
        <p className="text-xs text-muted">Pullik tarifga o'tib, ko'proq task bajaring va mentorlar tekshiruvidan foydalaning.</p>
      </div>
    </Modal>
  );
}
