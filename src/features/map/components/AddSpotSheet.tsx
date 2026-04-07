"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";
import { getAuthHeaders } from "@/lib/supabase/client-auth";
import type { Spot } from "@/types/spot";

const formSchema = z.object({
  name: z.string().min(1, "请填写店名"),
  address: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export type AddSpotInitial = {
  name?: string;
  address?: string;
  phone?: string;
  placeId?: string;
  businessHours?: string;
  gaodeRating?: string;
  avgPrice?: string;
  categories?: string[];
};

type AddSpotSheetProps = {
  lat: number;
  lng: number;
  initial?: AddSpotInitial | null;
  variant?: "pin" | "poi";
  withLinkedPref?: boolean;
  className?: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  onSpotCreated?: (spot: Spot) => void;
};

export function AddSpotSheet({ lat, lng, initial = null, variant = "pin", withLinkedPref: withLinkedPrefProp, className, onClose, onSuccess, onSpotCreated }: AddSpotSheetProps) {
  const { user } = useAuth();
  const linkPref = withLinkedPrefProp ?? initial == null;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myOverall, setMyOverall] = useState(4);
  const [myNote, setMyNote] = useState("");
  const extrasRef = useRef<{ placeId?: string; phone?: string; businessHours?: string; gaodeRating?: string; avgPrice?: string; categories: string[] }>({ categories: [] });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", address: "" },
  });

  useEffect(() => {
    if (initial) {
      reset({ name: initial.name ?? "", address: initial.address ?? "" });
      extrasRef.current = {
        placeId: initial.placeId,
        phone: initial.phone,
        businessHours: initial.businessHours,
        gaodeRating: initial.gaodeRating,
        avgPrice: initial.avgPrice,
        categories: initial.categories ?? [],
      };
    } else {
      reset({ name: "", address: "" });
      extrasRef.current = { categories: [] };
    }
    setMyOverall(4);
    setMyNote("");
  }, [initial, reset, lat, lng]);

  const title = variant === "poi" || initial ? "添加搜到的店铺" : "在此位置添加店铺";

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSubmitting(true);
    const x = extrasRef.current;
    try {
      const spotHeaders = { "Content-Type": "application/json; charset=utf-8", ...(await getAuthHeaders()) };
      const res = await fetch("/api/spots", {
        method: "POST",
        headers: spotHeaders,
        body: JSON.stringify({
          name: values.name.trim(),
          address: values.address?.trim() ?? "",
          lat,
          lng,
          createdBy: user?.id ?? "self",
          placeId: x.placeId,
          phone: x.phone,
          businessHours: x.businessHours,
          gaodeRating: x.gaodeRating,
          avgPrice: x.avgPrice,
          categories: x.categories.length ? x.categories : undefined,
        }),
      });
      const data = (await res.json()) as { error?: unknown; spot?: Spot };
      if (!res.ok) {
        setSubmitError(typeof data.error === "string" ? data.error : "保存失败");
        return;
      }

      const spot = data.spot;
      if (!spot?.id) {
        await onSuccess();
        onClose();
        return;
      }

      if (linkPref) {
        const prefHeaders = { "Content-Type": "application/json; charset=utf-8", ...(await getAuthHeaders()) };
        const prefRes = await fetch(`/api/spots/${spot.id}/prefs`, {
          method: "POST",
          headers: prefHeaders,
          body: JSON.stringify({ overall: myOverall, note: myNote.trim() || undefined }),
        });
        if (!prefRes.ok) {
          const prefData = (await prefRes.json()) as { error?: unknown };
          setSubmitError(`店铺已保存。喜爱值未写入：${typeof prefData.error === "string" ? prefData.error : "失败"}`);
        }
      }

      await onSuccess();
      onSpotCreated?.(spot);
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className={cn("spot-bottom-card pointer-events-auto w-full overflow-hidden rounded-t-2xl border border-zinc-200/80 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-zinc-900", className)}>
      <div className="flex justify-center pb-1 pt-2"><span className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" /></div>
      <div className="flex items-center justify-between gap-2 px-4 pb-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <button type="button" onClick={() => !submitting && onClose()} className="rounded-full px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">取消</button>
      </div>
      <p className="px-4 pb-2 text-xs text-zinc-500">坐标：{lat.toFixed(5)}, {lng.toFixed(5)}</p>

      <form onSubmit={onSubmit} className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div>
          <input {...register("name")} placeholder="店名" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
          {errors.name ? <p className="mt-1 text-xs text-red-500">{errors.name.message}</p> : null}
        </div>
        <input {...register("address")} placeholder="地址（可选）" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />

        {linkPref ? (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-3 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">我的喜爱值</p>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setMyOverall(n)} className={cn("rounded-lg p-1", myOverall >= n ? "text-amber-500" : "text-zinc-300 dark:text-zinc-600") }>
                  <Star className={cn("h-7 w-7", myOverall >= n ? "fill-amber-400" : "")} />
                </button>
              ))}
              <span className="ml-1 text-sm text-zinc-600 dark:text-zinc-400">{myOverall} 分</span>
            </div>
            <textarea value={myNote} onChange={(e) => setMyNote(e.target.value)} rows={2} placeholder="一句话短评（可选）" className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>
        ) : null}

        {submitError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{submitError}</p> : null}
        <button type="submit" disabled={submitting} className="mt-1 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60">
          {submitting ? "保存中…" : linkPref ? "保存店铺与喜爱值" : "保存到地图"}
        </button>
      </form>
    </div>
  );
}
