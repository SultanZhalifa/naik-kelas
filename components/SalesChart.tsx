"use client";

// "Data di balik skormu": omzet QRIS per minggu (13 minggu) langsung dari
// daftar transaksi — bukti visual bahwa skor dihitung dari data nyata.

import { useEffect, useMemo, useState } from "react";
import type { Tx } from "@/lib/types";
import { formatRpShort } from "@/lib/format";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function SalesChart({ transactions }: { transactions: Tx[] }) {
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrow(true), 250);
    return () => clearTimeout(t);
  }, []);

  const weeks = useMemo(() => {
    const now = Date.now();
    const buckets = new Array<number>(13).fill(0);
    for (const tx of transactions) {
      if (tx.type !== "QRIS_IN") continue;
      const idx = Math.floor((now - tx.ts) / WEEK);
      if (idx >= 0 && idx < 13) buckets[12 - idx] += tx.amount; // kiri = terlama
    }
    return buckets;
  }, [transactions]);

  const max = Math.max(...weeks, 1);
  const best = weeks.indexOf(Math.max(...weeks));

  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {weeks.map((v, i) => (
          <div key={i} className="group relative flex-1">
            <div
              className={`w-full rounded-t-md ${
                i === best ? "bg-gradient-to-t from-deep to-teal" : "bg-teal/30"
              } ${i === 12 ? "ring-2 ring-gold/70" : ""}`}
              style={{
                height: grow ? `${Math.max(6, (v / max) * 96)}px` : "6px",
                transition: `height 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 45}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-slate-400">
        <span>13 minggu lalu</span>
        <span className="text-teal">
          terbaik {formatRpShort(weeks[best])}/mgg
        </span>
        <span>minggu ini</span>
      </div>
    </div>
  );
}
