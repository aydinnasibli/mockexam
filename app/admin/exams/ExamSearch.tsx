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
    <div className="relative mb-5">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute" aria-hidden />
      <input
        type="search"
        placeholder="İmtahan axtar (ID, başlıq, növ)..."
        value={value}
        onChange={handleChange}
        aria-label="İmtahan axtar"
        className="input-new pl-11!"
      />
    </div>
  );
}
