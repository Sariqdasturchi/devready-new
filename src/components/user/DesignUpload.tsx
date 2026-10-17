import { useRef, useState } from "react";
import { HiOutlinePhoto, HiOutlineXMark } from "react-icons/hi2";
import { errorMessage, submissionApi } from "../../api/api";
import type { DesignImage } from "../../types/type";
import { mediaUrl } from "../../lib/format";
import { cx } from "../ui";
import { useToast } from "../ui/toast";

const MAX = 8;
const MAX_MB = 5;

/** Dizayn maketlarini (PNG/JPG/WEBP) yuklash — AI va mentor aynan shu rasmlarni ko'radi */
export default function DesignUpload({
  submissionId,
  images,
  onChange,
  disabled,
}: {
  submissionId: string;
  images: DesignImage[];
  onChange: (list: DesignImage[]) => void;
  disabled?: boolean;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (list: FileList | File[]) => {
    const files = [...list].filter((f) => /^image\/(png|jpe?g|webp)$/.test(f.type));
    if (!files.length) return toast.error("Faqat PNG, JPG yoki WEBP rasm yuklang");
    const big = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (big) return toast.error(`"${big.name}" ${MAX_MB} MB dan katta. Figma'da 1x masshtabda eksport qiling`);
    if (images.length + files.length > MAX) return toast.error(`Ko'pi bilan ${MAX} ta rasm`);
    setBusy(true);
    try {
      onChange(await submissionApi.addDesignImages(submissionId, files));
    } catch (e) {
      toast.error(errorMessage(e, "Rasm yuklanmadi"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (url: string) => {
    try {
      onChange(await submissionApi.removeDesignImage(submissionId, url));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!!images.length && (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((im) => (
            <li key={im.url} className="relative rounded-xl overflow-hidden border border-line bg-mist">
              <img src={mediaUrl(im.url) || im.url} alt={im.name || "Maket"} className="w-full h-24 object-cover object-top" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(im.url)}
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-surface/90 text-ink inline-flex items-center justify-center cursor-pointer hover:bg-surface"
                  aria-label={`${im.name || "Rasm"}ni o'chirish`}
                >
                  <HiOutlineXMark size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {images.length < MAX && !disabled && (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files);
          }}
          className={cx(
            "rounded-xl border border-dashed p-4 flex flex-col items-center gap-1 text-center cursor-pointer transition-colors",
            drag ? "border-brand bg-brand-tint" : "border-line hover:border-brand/50",
            busy && "opacity-60 cursor-wait",
          )}
        >
          <HiOutlinePhoto size={22} className="text-brand" />
          <span className="text-[13px] font-semibold text-ink">{busy ? "Yuklanmoqda..." : "Maket rasmlarini yuklash"}</span>
          <span className="text-[11px] text-muted">
            PNG, JPG yoki WEBP · har biri {MAX_MB} MB gacha · {images.length}/{MAX}
          </span>
        </button>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
    </div>
  );
}
