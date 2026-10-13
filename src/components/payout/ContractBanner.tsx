import { useState } from "react";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { earningApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Button } from "../ui";
import ContractModal from "./ContractModal";

/** Mentor shartnomani tasdiqlamagan bo'lsa — sahifa tepasida ogohlantirish */
export default function ContractBanner() {
  const q = useCachedQuery("mentor:contract", earningApi.contract, { staleTime: 60_000 });
  const [open, setOpen] = useState(false);
  if (!q.data || q.data.accepted) return null;
  const updated = !!q.data.acceptedVersion;
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <HiOutlineDocumentText size={22} className="text-amber-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">{updated ? "Mentorlik shartnomasi yangilandi" : "Mentorlik shartnomasini tasdiqlang"}</p>
          <p className="text-[13px] text-amber-800">
            {updated ? "Yangi versiyani tasdiqlamaguncha tekshiruvlar yopiq." : "Tekshiruvlar va ular uchun to'lov shartnoma tasdiqlangandan keyin boshlanadi."}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Shartnomani ochish
        </Button>
      </div>
      <ContractModal open={open} onClose={() => setOpen(false)} onAccepted={q.refetch} />
    </>
  );
}
