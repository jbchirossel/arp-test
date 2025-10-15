"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
};

type HamburgerMenuProps = {
  items: MenuItem[];
  className?: string;
};

export default function HamburgerMenu({ items, className }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = !!containerRef.current && containerRef.current.contains(target);
      const insidePanel = !!panelRef.current && panelRef.current.contains(target);
      if (insideButton || insidePanel) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div ref={containerRef} className={`fixed top-4 left-4 z-[2147483647] ${className || ""}`}>
      {!open && (
      <button
        aria-label="Ouvrir le menu"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur text-gray-800 dark:text-white hover:bg-white/20 transition"
      >
        <span className="sr-only">Menu</span>
        <div className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-6 bg-current"></span>
          <span className="block h-0.5 w-6 bg-current"></span>
          <span className="block h-0.5 w-6 bg-current"></span>
        </div>
      </button>
      )}

      {mounted && open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[2147483645] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav ref={panelRef} className="fixed top-0 left-0 z-[2147483646] h-screen w-72 border-r border-white/20 bg-white/10 backdrop-blur p-4 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Navigation</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-gray-700 dark:text-gray-200 hover:bg-white/20"
                aria-label="Fermer le menu"
              >
                Fermer
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-white/20 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      router.push(item.href);
                      setOpen(false);
                    }}
                  >
                    {item.icon && <span className="text-gray-700 dark:text-gray-200">{item.icon}</span>}
                    <div className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="text-[11px] text-gray-600 dark:text-gray-400">{item.description}</span>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
            <div className="pt-2 text-[11px] text-gray-600 dark:text-gray-400">© ARP</div>
          </nav>
        </>,
        document.body
      )}
    </div>
  );
}


