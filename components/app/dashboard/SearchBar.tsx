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
    <div className="rounded-full overflow-hidden backdrop-blur-md shadow-sm border border-[rgba(191,174,153,0.4)] bg-white/45 flex items-center h-11 px-4">
      <Search className="text-[rgb(141,103,72)] w-5 h-5" />
      <input
        className="flex-1 ml-2 bg-transparent outline-none text-base placeholder:text-[rgb(191,174,153)]"
        placeholder="Search passwords, usernames..."
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </div>
  );
}
