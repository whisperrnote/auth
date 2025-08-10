import { useState, useEffect } from "react";
import { Search } from "lucide-react";

export default function SearchBar({
  onSearch,
}: {
  onSearch: (term: string) => void;
}) {
  const [value, setValue] = useState("");
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(value);
    }, 200); // lightning fast debounce
    return () => clearTimeout(timeout);
  }, [value, onSearch]);

  return (
    <div className="rounded-full overflow-hidden shadow-sm border border-border bg-card flex items-center h-11 px-4">
      <Search className="text-primary w-5 h-5" />
      <input
        className="flex-1 ml-2 bg-transparent outline-none text-base placeholder:text-muted-foreground"
        placeholder="Search passwords, usernames..."
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </div>
  );
}
