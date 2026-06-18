"use client";

import { useEffect, useState } from "react";
import styles from "./Header.module.css";

export function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand}>
          Outlines
        </a>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          <span className={`${styles.dot} ${styles.hollow}`} />
          <span className={`${styles.dot} ${styles.solid} ${theme === "dark" ? styles.active : ""}`} />
        </button>
      </div>
    </header>
  );
}
