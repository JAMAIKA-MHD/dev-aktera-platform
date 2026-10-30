import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export interface PixelDiff {
  size: boolean; // the two images have the same size
  exact: number; // share of pixels that differ at all
  visible: number; // share of pixels that differ by more than 48 (R+G+B)
}

// Two screenshots compared pixel by pixel, in the browser (no image library).
export async function diffPixels(
  page: Page,
  a: string,
  b: string,
): Promise<PixelDiff> {
  const data = (path: string) =>
    `data:image/png;base64,${readFileSync(path).toString("base64")}`;
  return page.evaluate(
    async ([first, second]) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((done) => {
          const image = new Image();
          image.onload = () => done(image);
          image.src = src;
        });
      const [x, y] = await Promise.all([load(first), load(second)]);
      if (x.width !== y.width || x.height !== y.height)
        return { size: false, exact: 1, visible: 1 };
      const pixels = (image: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const p = pixels(x);
      const q = pixels(y);
      let exact = 0;
      let visible = 0;
      for (let i = 0; i < p.length; i += 4) {
        const delta =
          Math.abs(p[i] - q[i]) +
          Math.abs(p[i + 1] - q[i + 1]) +
          Math.abs(p[i + 2] - q[i + 2]) +
          Math.abs(p[i + 3] - q[i + 3]);
        if (delta > 0) exact += 1;
        if (delta > 48) visible += 1;
      }
      const total = p.length / 4;
      return { size: true, exact: exact / total, visible: visible / total };
    },
    [data(a), data(b)] as const,
  );
}
