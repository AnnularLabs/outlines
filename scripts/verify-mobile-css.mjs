import { readFileSync } from "node:fs";

const galleryCss = readFileSync("components/Gallery.module.css", "utf8");
const panelCss = readFileSync("components/PhotoPanel.module.css", "utf8");

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function assertMediaRule(source, mediaQuery, needle, message) {
  const index = source.indexOf(mediaQuery);
  if (index === -1) {
    throw new Error(`Missing media query: ${mediaQuery}`);
  }

  const nextMedia = source.indexOf("@media", index + mediaQuery.length);
  const block = source.slice(index, nextMedia === -1 ? source.length : nextMedia);
  assertIncludes(block, needle, message);
}

assertMediaRule(
  galleryCss,
  "@media (max-width: 768px)",
  "max-width: calc(100vw - 48px);",
  "Mobile lightbox image wrapper must be constrained to the viewport width.",
);

assertMediaRule(
  galleryCss,
  "@media (max-width: 768px)",
  "max-height: calc(55dvh - 56px);",
  "Mobile lightbox image must leave room for controls and the metadata panel.",
);

assertMediaRule(
  galleryCss,
  "@media (max-width: 480px)",
  "grid-template-columns: 1fr;",
  "Very narrow screens should use a single gallery column.",
);

assertMediaRule(
  panelCss,
  "@media (max-width: 768px)",
  "width: 100%;",
  "Mobile photo metadata panel must take the full viewport width.",
);

assertMediaRule(
  panelCss,
  "@media (max-width: 768px)",
  "max-height: 45dvh;",
  "Mobile photo metadata panel must have bounded height and scroll internally.",
);

assertMediaRule(
  panelCss,
  "@media (max-width: 768px)",
  "border-top: 1px solid var(--border);",
  "Mobile photo metadata panel should separate from the photo stage vertically.",
);

console.log("Mobile responsive CSS checks passed.");
