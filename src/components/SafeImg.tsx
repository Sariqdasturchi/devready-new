import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";

/**
 * Rasm topilmasa (404, o'chirilgan fayl) singan belgi o'rniga fallback ko'rsatadi.
 * src bo'sh bo'lsa ham darhol fallback.
 */
export default function SafeImg({ src, fallback = null, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { fallback?: ReactNode }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) return <>{fallback}</>;
  return <img src={src} onError={() => setBroken(true)} {...rest} />;
}
