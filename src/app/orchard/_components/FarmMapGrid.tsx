'use client';

import type { TreeProfile, DurianFruitRecord } from '@/lib/firebase';

const DEFAULT_ROWS = 11;
const DEFAULT_COLS = 9;
// default blocked: R1C1-R1C8 (ตรงกับ FarmMapClient)
const DEFAULT_BLOCKED = ['1,1', '1,2', '1,3', '1,4', '1,5', '1,6', '1,7', '1,8'];

type Status = 'normal' | 'watch' | 'seedling';

const STATUS_META: Record<Status, { bg: string; bgDark: string; icon: string }> = {
  normal:   { bg: 'bg-emerald-100', bgDark: 'dark:bg-emerald-900/40', icon: '🌳' },
  watch:    { bg: 'bg-rose-100',    bgDark: 'dark:bg-rose-900/40',    icon: '🌲' },
  seedling: { bg: 'bg-sky-100',     bgDark: 'dark:bg-sky-900/40',     icon: '🌴' },
};

function defaultTreeNumber(row: number, col: number): string {
  return `R${row}C${col}`;
}

type Props = {
  trees: TreeProfile[];
  fruitRecords?: DurianFruitRecord[];
  /** set ของ treeId ที่เลือกอยู่ */
  selectedTreeIds?: Set<string>;
  /** callback เมื่อกดต้น (toggle) */
  onToggleTree?: (tree: TreeProfile) => void;
  /** config ผังสวน (ตรงกับหน้า farm-map) */
  rows?: number;
  cols?: number;
  /** "row,col" ของ cell ที่ไม่มีต้น */
  blockedCells?: Set<string>;
};

export default function FarmMapGrid({
  trees,
  fruitRecords = [],
  selectedTreeIds = new Set(),
  onToggleTree,
  rows = DEFAULT_ROWS,
  cols = DEFAULT_COLS,
  blockedCells = new Set(DEFAULT_BLOCKED),
}: Props) {
  const hasTree = (row: number, col: number) => !blockedCells.has(`${row},${col}`);

  // index trees by row,col
  const treeMap = new Map<string, TreeProfile>();
  for (const t of trees) treeMap.set(`${t.row},${t.col}`, t);

  // index fruit records by treeId → latest batch
  const fruitMap = new Map<string, DurianFruitRecord>();
  for (const r of fruitRecords) {
    const existing = fruitMap.get(r.treeId);
    if (!existing || r.createdAt > existing.createdAt) fruitMap.set(r.treeId, r);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700">
      {/* Column labels */}
      <div className="grid mb-0.5" style={{ gridTemplateColumns: `20px repeat(${cols}, 1fr)`, gap: '2px' }}>
        <div />
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400 h-5">
            C{i + 1}
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }, (_, rIdx) => {
        const row = rIdx + 1;
        return (
          <div key={row} className="grid mb-0.5" style={{ gridTemplateColumns: `20px repeat(${cols}, 1fr)`, gap: '2px' }}>
            <div className="flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400">
              R{row}
            </div>
            {Array.from({ length: cols }, (_, cIdx) => {
              const col = cIdx + 1;
              if (!hasTree(row, col)) {
                return (
                  <div key={col} className="rounded-md bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 aspect-square" />
                );
              }

              const t = treeMap.get(`${row},${col}`);
              const status: Status = t?.status ?? 'normal';
              const meta = STATUS_META[status];
              const treeNumber = t?.treeNumber ?? defaultTreeNumber(row, col);
              const shortCode = treeNumber.length > 5 ? treeNumber.slice(0, 5) : treeNumber;
              const isSelected = t ? selectedTreeIds.has(t.id) : false;
              const fruitRecord = t ? fruitMap.get(t.id) : undefined;

              return (
                <button
                  key={col}
                  onClick={() => t && onToggleTree?.(t)}
                  title={`${treeNumber}${t?.variety ? ` · ${t.variety}` : ''}`}
                  className={`relative rounded-md ${meta.bg} ${meta.bgDark} border-2 transition-all duration-150 flex flex-col items-center justify-center aspect-square w-full ${
                    isSelected
                      ? 'border-lime-400 scale-[1.18] z-20 shadow-[0_0_10px_2px_rgba(132,204,22,0.7)]'
                      : 'border-slate-200 dark:border-slate-700 hover:border-lime-300 hover:scale-[1.05]'
                  }`}
                >
                  <span className={`leading-none transition-all ${isSelected ? 'text-sm sm:text-lg' : 'text-[10px] sm:text-sm'}`}>
                    {meta.icon}
                  </span>
                  <span className={`font-bold text-slate-700 dark:text-slate-200 leading-tight mt-0.5 w-full text-center px-0.5 truncate transition-all ${isSelected ? 'text-[7px] sm:text-[9px]' : 'text-[6px] sm:text-[8px]'}`}>
                    {shortCode}
                  </span>
                  {/* Badge รุ่น */}
                  {fruitRecord && (
                    <span className="absolute -top-1 -right-1 text-[7px] font-extrabold bg-lime-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none z-10">
                      {fruitRecord.batch?.replace('รุ่นที่ ', '') ?? '1'}
                    </span>
                  )}
                  {/* Check mark เมื่อเลือก */}
                  {isSelected && (
                    <span className="absolute -bottom-1 -right-1 text-[8px] font-extrabold bg-lime-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none z-10">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex gap-3 mt-2 px-1">
        {(Object.entries(STATUS_META) as [Status, typeof STATUS_META[Status]][]).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${v.bg} ${v.bgDark} inline-block`} />
            <span className="text-[9px] text-slate-500 dark:text-slate-400">{v.icon}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <span className="w-3.5 h-3.5 rounded-full bg-lime-500 inline-block" />
          <span className="text-[9px] text-slate-500 dark:text-slate-400">กำลังทำลูก</span>
        </div>
      </div>
    </div>
  );
}
