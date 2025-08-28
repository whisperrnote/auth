import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export default function SearchBar({
  onSearch,
  delay = 150,
}: {
  onSearch: (term: string) => void;
  delay?: number;
}) {
  const [value, setValue] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const handleChange = (v: string) => {
    setValue(v);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch(v), delay);
  };

  return (
    <div className="rounded-full overflow-hidden shadow-sm border border-border bg-card flex items-center h-11 px-4">
      <Search className="text-primary w-5 h-5" />
      <input
        className="flex-1 ml-2 bg-transparent outline-none text-base placeholder:text-muted-foreground"
        placeholder="Search passwords, usernames..."
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        aria-label="Search credentials"
      />
    </div>
  );
}
