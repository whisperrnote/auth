"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  width?: string;
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "right",
  width = "200px",
  className = "",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger element wrapped with button for accessibility */}
      <div
        onClick={toggleDropdown}
        className="cursor-pointer inline-block"
        aria-haspopup="true"
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            toggleDropdown();
            e.preventDefault();
          }
        }}
      >
        {trigger}
      </div>

      {/* Dropdown content */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 ${
            align === "right" ? "right-0" : "left-0"
          } bg-popover border border-border rounded-md shadow-md overflow-hidden`}
          style={{ width }}
          role="menu"
        >
          <div className="py-1 text-popover-foreground">{children}</div>
        </div>
      )}
    </div>
  );
}

// Export a menu item component for convenience
export function DropdownMenuItem({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`px-4 py-2 cursor-pointer hover:bg-accent text-sm ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      onClick={disabled ? undefined : onClick}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled && onClick) {
          onClick();
          e.preventDefault();
        }
      }}
    >
      {children}
    </div>
  );
}

// Export a separator component for convenience
export function DropdownMenuSeparator() {
  return <hr className="my-1 border-border" role="separator" />;
}
