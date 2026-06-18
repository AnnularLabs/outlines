import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>Outlines · {new Date().getFullYear()}</span>
    </footer>
  );
}
