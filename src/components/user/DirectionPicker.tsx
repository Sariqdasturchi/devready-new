import { useState } from "react";
import { errorMessage, profileApi } from "../../api/api";
import { updateStoredUser } from "../../lib/auth";
import { TRACKS } from "../../lib/constants";
import { Card } from "../ui";
import { useToast } from "../ui/toast";

/** Yo'nalish tanlanmagan foydalanuvchi uchun */
export default function DirectionPicker({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const choose = async (direction: string) => {
    setSaving(direction);
    try {
      const user = await profileApi.update({ direction });
      updateStoredUser(user);
      toast.success(`Yo'nalish: ${direction}`);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="p-6 sm:p-8 text-center max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-ink">Avval yo'nalishingizni tanlang</h2>
      <p className="text-sm text-muted mt-1">Tasklar tanlangan yo'nalish bo'yicha beriladi</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
        {TRACKS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={!!saving}
            onClick={() => choose(t)}
            className="p-3.5 rounded-xl border border-line bg-mist hover:border-brand hover:bg-brand-tint text-sm font-semibold text-ink cursor-pointer disabled:opacity-50"
          >
            {saving === t ? "Saqlanmoqda..." : t}
          </button>
        ))}
      </div>
    </Card>
  );
}
