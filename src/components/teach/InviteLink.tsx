import { useState } from "react";
import { HiOutlineArrowPath, HiOutlineCheck, HiOutlineLink } from "react-icons/hi2";
import { copyText } from "../../lib/clipboard";
import { Button, ConfirmModal, Toggle, cx } from "../ui";
import { useToast } from "../ui/toast";

const inviteUrl = (code: string) => `${window.location.origin}/join/${code}`;

/** Guruhga taklif havolasi: nusxalash, yangilash va vaqtincha yopish */
export default function InviteLink({
  code,
  open,
  compact,
  onToggle,
  onReset,
}: {
  code: string;
  open: boolean;
  compact?: boolean;
  onToggle?: (open: boolean) => Promise<void> | void;
  onReset?: () => Promise<void> | void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = inviteUrl(code);

  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      toast.success("Havola nusxalandi");
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={copy}
        className={cx("inline-flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer", open ? "text-brand hover:underline" : "text-muted line-through")}
        title={open ? url : "Havola yopiq"}
      >
        {copied ? <HiOutlineCheck size={15} /> : <HiOutlineLink size={15} />} {copied ? "Nusxalandi" : "Taklif havolasi"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div
          className={cx(
            "flex-1 min-w-0 flex items-center gap-2 h-11 px-3.5 rounded-xl border font-mono text-[14px]",
            open ? "border-brand/30 bg-brand-tint text-ink" : "border-line bg-mist text-muted",
          )}
        >
          <HiOutlineLink className="shrink-0 text-brand" size={17} />
          <span className="truncate select-all" data-testid="invite-url">
            {url}
          </span>
        </div>
        <Button onClick={copy} disabled={!open} className="h-11 sm:w-36">
          {copied ? <HiOutlineCheck size={17} /> : null} {copied ? "Nusxalandi" : "Nusxalash"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onToggle && (
          <Toggle
            checked={open}
            onChange={async (v) => {
              setBusy(true);
              try {
                await onToggle(v);
              } finally {
                setBusy(false);
              }
            }}
            label={<span className={cx("text-[13px]", busy && "opacity-60")}>{open ? "Havola ochiq — talabalar qo'shila oladi" : "Havola yopiq — yangi talaba qo'shilmaydi"}</span>}
          />
        )}
        {onReset && (
          <button type="button" onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink cursor-pointer">
            <HiOutlineArrowPath size={15} /> Yangi havola yaratish
          </button>
        )}
      </div>
      <ConfirmModal
        open={confirmReset}
        title="Yangi havola yaratilsinmi?"
        text="Eski havola ishlamay qoladi. Guruhdagi talabalar o'z joyida qoladi — faqat yangi qo'shiladiganlar uchun yangi havolani yuborasiz."
        confirmLabel="Yangilash"
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await onReset?.();
            setConfirmReset(false);
          } finally {
            setBusy(false);
          }
        }}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  );
}
