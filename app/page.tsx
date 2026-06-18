import { Gallery } from "@/components/Gallery";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <div className={styles.intro}>
        <p className={styles.tagline}>Only the outlines.</p>
      </div>
      <Gallery />
    </>
  );
}
