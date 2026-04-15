'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition, useState } from 'react';
import { Search } from 'lucide-react';

export default function ExamSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    startTransition(() => {
      const params = new URLSearchParams();
      if (v) params.set('q', v);
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative mb-6">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      <input
        type="search"
        placeholder="İmtahan axtar (ID, başlıq, növ)..."
        value={value}
        onChange={handleChange}
        className="w-full pl-11 pr-4 py-3 bg-white border border-outline-variant/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 text-on-surface placeholder:text-on-surface-variant"
      />
    </div>
  );
}
