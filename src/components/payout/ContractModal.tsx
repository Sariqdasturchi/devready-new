import { useEffect, useState } from "react";
import { HiOutlineDocumentCheck } from "react-icons/hi2";
import { earningApi, errorMessage } from "../../api/api";
import type { MentorContract } from "../../types/type";
import { getStoredUser } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { invalidateCache } from "../../hooks/useCachedQuery";
import { Alert, Button, ErrorState, Field, Input, Modal, PageLoader } from "../ui";
import { useToast } from "../ui/toast";

/** Mentorlik shartnomasi: o'qish, ism bilan tasdiqlash yoki tasdiqlangan versiyani ko'rish */
export default function ContractModal({ open, onClose, onAccepted }: { open: boolean; onClose: () => void; onAccepted?: () => void }) {
  const toast = useToast();
  const user = getStoredUser();
  const [contract, setContract] = useState<MentorContract | null>(null);
  const [error, setError] = useState("");
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    earningApi
      .contract()
      .then(setContract)
      .catch((e) => setError(errorMessage(e)));
  }, [open]);

  const accept = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      await earningApi.acceptContract(contract.version, name);
      toast.success("Shartnoma tasdiqlandi");
      invalidateCache("mentor:contract", "mentor:earnings");
      onAccepted?.();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const signed = contract?.accepted;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={contract ? `Mentorlik shartnomasi · v${contract.version}` : "Mentorlik shartnomasi"}
      footer={
        contract && !signed ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Keyinroq
            </Button>
            <Button onClick={accept} loading={saving} disabled={!agree || name.trim().length < 3}>
              <HiOutlineDocumentCheck size={18} /> Shartnomani qabul qilaman
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Yopish
          </Button>
        )
      }
    >
      {error ? (
        <ErrorState message={error} />
      ) : !contract ? (
        <PageLoader label="Shartnoma yuklanmoqda..." />
      ) : (
        <div className="flex flex-col gap-4">
          {signed ? (
            <Alert tone="success">Siz bu versiyani {formatDate(contract.acceptedAt, true)} da tasdiqlagansiz.</Alert>
          ) : contract.acceptedVersion ? (
            <Alert tone="warning">
              Shartnoma yangilandi (v{contract.acceptedVersion} → v{contract.version}). Tekshiruvlarni davom ettirish uchun yangi matnni o'qib, tasdiqlang.
            </Alert>
          ) : null}
          <div className="max-h-[46dvh] overflow-y-auto rounded-xl border border-line bg-paper p-4 sm:p-5 text-[14px] leading-relaxed text-ink-2 whitespace-pre-line">
            {contract.text}
          </div>
          {!signed && (
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand" />
                Shartnomani to'liq o'qidim va barcha shartlariga roziman
              </label>
              <Field label="Tasdiqlash uchun to'liq ismingizni yozing" hint={`Profildagidek: ${user?.fullName || ""}. Tasdiq vaqti va qurilma ma'lumoti saqlanadi.`}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={user?.fullName || "Ism Familiya"} autoComplete="off" />
              </Field>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
