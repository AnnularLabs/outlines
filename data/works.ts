import type { Work } from "@/lib/types";

function createWork(id: string, image: string, year: string): Work {
  const filename = image.split("/").pop() ?? image;
  const stem = filename.replace(/\.[^.]+$/, "");
  const thumbnailRoot = `/thumbnails/${stem}`;

  return {
    id,
    image,
    year,
    thumbnails: {
      small: `${thumbnailRoot}/320.webp`,
      medium: `${thumbnailRoot}/640.webp`,
      large: `${thumbnailRoot}/960.webp`,
    },
  };
}

export const works: Work[] = [
  createWork("0711_1", "/photos/DSC_0560.jpg", "2026"),
  createWork("0711_2", "/photos/DSC_0571.jpg", "2026"),
  createWork("0711_3", "/photos/DSC_0597.jpg", "2026"),
  createWork("0711_4", "/photos/DSC_0632.jpg", "2026"),
  createWork("0711_5", "/photos/DSC_0697.jpg", "2026"),
  createWork("0711_6", "/photos/DSC_0615.jpg", "2026"),
  createWork("0620_1", "/photos/DSC_0060.JPG", "2026"),
  createWork("0620_2", "/photos/DSC_0082.JPG", "2026"),
  createWork("0620_3", "/photos/DSC_0243.JPG", "2026"),
  createWork("0620_4", "/photos/DSC_0311.JPG", "2026"),
  createWork("0620_5", "/photos/DSC_0461.JPG", "2026"),
  createWork("0620_6", "/photos/DSC_0309.jpeg", "2026"),
  createWork("0620_7", "/photos/DSC_0345.JPG", "2026"),
  createWork("0620_8", "/photos/DSC_0278.JPG", "2026"),
  createWork("0620_9", "/photos/DSC_0492.JPG", "2026"),
  createWork("0326_1", "/photos/DSC_2536.JPG", "2026"),
  createWork("0219_1", "/photos/DSC_2225.JPG", "2026"),
  createWork("hk", "/photos/DSC_2265.JPG", "2026"),
  createWork("dalian-threshold", "/photos/DSC_1391.JPG", "2025"),
];
