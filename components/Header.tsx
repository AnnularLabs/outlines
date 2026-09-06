"use client";

import { useEffect, useState } from "react";
import styles from "./Header.module.css";

export function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(initial);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  // Keep SSR markup stable; ThemeScript may already have set data-theme.
  const toggleLabel = mounted
    ? `Switch to ${theme === "light" ? "dark" : "light"} mode`
    : "Toggle theme";
  const solidClass = mounted && theme === "dark" ? styles.active : "";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand}>
          Outlines
        </a>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={toggleLabel}
        >
          <span className={`${styles.dot} ${styles.hollow}`} />
          <span className={`${styles.dot} ${styles.solid} ${solidClass}`} />
        </button>
      </div>
    </header>
  );
}
