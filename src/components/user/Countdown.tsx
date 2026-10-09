import { useEffect, useState } from "react";
import { formatCountdown } from "../../lib/format";

/** Server vaqti bilan farqni hisobga olgan holda teskari sanoq */
// eslint-disable-next-line react-refresh/only-export-components
export function useCountdown(to: string | null | undefined, serverOffsetMs = 0, onEnd?: () => void) {
  const target = to ? new Date(to).getTime() : 0;
  const calc = () => Math.max(0, Math.floor((target - (Date.now() + serverOffsetMs)) / 1000));
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    if (!target) return;
    setLeft(calc());
    const t = setInterval(() => {
      const v = calc();
      setLeft(v);
      if (v <= 0) {
        clearInterval(t);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, serverOffsetMs]);

  return left;
}

export default function Countdown({ to }: { to: string }) {
  const left = useCountdown(to);
  return <>{left > 0 ? formatCountdown(left) : "Vaqt tugadi"}</>;
}
