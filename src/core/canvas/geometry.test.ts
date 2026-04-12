import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeDragRect,
  clampRectToCanvas,
  rectFromCornerDrag,
  anchorForCornerRect,
  dist2,
  MIN_MASK_PX,
  HANDLE_SLOP_DISPLAY,
} from "./geometry";
import {
  toImageRect,
  toImagePoint,
  hitSlopImage,
  hitTestMasks,
} from "@/lib/canvasCoords";
import type { MaskRect } from "@/types/mask";

// ── 輔助：建立測試用 canvas stub ──────────────────────────────────────────────
function makeCanvas(
  bitmapW: number,
  bitmapH: number,
  displayW = bitmapW,
  displayH = bitmapH,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bitmapW;
  canvas.height = bitmapH;
  // jsdom 的 getBoundingClientRect 預設回傳全零；手動覆寫
  canvas.getBoundingClientRect = () =>
    ({
      width: displayW,
      height: displayH,
      left: 0,
      top: 0,
      right: displayW,
      bottom: displayH,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return canvas;
}

function makeMask(overrides: Partial<MaskRect> = {}): MaskRect {
  return {
    id: "test-id",
    x: 10,
    y: 10,
    width: 80,
    height: 40,
    source: "manual",
    fillColor: "#000000",
    strokeColor: "#333333",
    ...overrides,
  };
}

// ── normalizeDragRect ────────────────────────────────────────────���────────────
describe("normalizeDragRect", () => {
  it("起點在左上時不變", () => {
    expect(normalizeDragRect(0, 0, 100, 50)).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  it("右下往左上拖曳時正規化", () => {
    expect(normalizeDragRect(100, 50, 0, 0)).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  it("相同點回傳零寬高", () => {
    expect(normalizeDragRect(5, 5, 5, 5)).toEqual({ x: 5, y: 5, width: 0, height: 0 });
  });
});

// ── dist2 ─────────────────────────────────────────────────────────────────────
describe("dist2", () => {
  it("相同點距離為 0", () => {
    expect(dist2(3, 4, 3, 4)).toBe(0);
  });

  it("3-4-5 直角三角形距離平方為 25", () => {
    expect(dist2(0, 0, 3, 4)).toBe(25);
  });
});

// ── clampRectToCanvas ─────────────────────────────────────────────────────────
describe("clampRectToCanvas", () => {
  it("在範圍內的矩形不變", () => {
    expect(clampRectToCanvas({ x: 10, y: 10, width: 50, height: 30 }, 200, 200)).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 30,
    });
  });

  it("超出右邊界時往左移", () => {
    const result = clampRectToCanvas({ x: 180, y: 0, width: 50, height: 20 }, 200, 200);
    expect(result.x + result.width).toBeLessThanOrEqual(200);
  });

  it("寬度小於 MIN_MASK_PX 時強制最小值", () => {
    const result = clampRectToCanvas({ x: 0, y: 0, width: 0, height: 0 }, 200, 200);
    expect(result.width).toBeGreaterThanOrEqual(MIN_MASK_PX);
    expect(result.height).toBeGreaterThanOrEqual(MIN_MASK_PX);
  });
});

// ── anchorForCornerRect ───────────────────────────────────────────────────────
describe("anchorForCornerRect", () => {
  const r = { x: 10, y: 20, width: 100, height: 60 };

  it("nw 拖曳時錨點在右下角", () => {
    expect(anchorForCornerRect(r, "nw")).toEqual({ x: 110, y: 80 });
  });

  it("se 拖曳時錨點在左上角", () => {
    expect(anchorForCornerRect(r, "se")).toEqual({ x: 10, y: 20 });
  });

  it("ne 拖曳時錨點在左下角", () => {
    expect(anchorForCornerRect(r, "ne")).toEqual({ x: 10, y: 80 });
  });

  it("sw 拖曳時錨點在右上角", () => {
    expect(anchorForCornerRect(r, "sw")).toEqual({ x: 110, y: 20 });
  });
});

// ── rectFromCornerDrag ────────────────────────────────────────────────────────
describe("rectFromCornerDrag", () => {
  it("nw 拖曳產生正規化矩形", () => {
    // 錨點 (100, 80)，指標拖到 (20, 30)
    const result = rectFromCornerDrag("nw", 100, 80, 20, 30);
    expect(result).toEqual({ x: 20, y: 30, width: 80, height: 50 });
  });

  it("se 拖曳產生正規化矩形", () => {
    // 錨點 (10, 20)，指標拖到 (90, 70)
    const result = rectFromCornerDrag("se", 10, 20, 90, 70);
    expect(result).toEqual({ x: 10, y: 20, width: 80, height: 50 });
  });
});

// ── toImageRect / toImagePoint ────────────────────────────────────────────────
describe("toImageRect", () => {
  it("1:1 比例時座標不變", () => {
    const canvas = makeCanvas(200, 100);
    const result = toImageRect({ x: 10, y: 20, width: 50, height: 30 }, canvas);
    expect(result).toEqual({ x: 10, y: 20, width: 50, height: 30 });
  });

  it("canvas 縮小為一半顯示時座標乘以 2", () => {
    const canvas = makeCanvas(200, 100, 100, 50);
    const result = toImageRect({ x: 10, y: 10, width: 40, height: 20 }, canvas);
    expect(result).toEqual({ x: 20, y: 20, width: 80, height: 40 });
  });

  it("display 尺寸為 0 時回傳零矩形", () => {
    const canvas = makeCanvas(200, 100, 0, 0);
    expect(toImageRect({ x: 10, y: 10, width: 50, height: 30 }, canvas)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

describe("toImagePoint", () => {
  it("縮小一半時座標乘以 2", () => {
    const canvas = makeCanvas(200, 100, 100, 50);
    expect(toImagePoint(30, 15, canvas)).toEqual({ x: 60, y: 30 });
  });

  it("display 尺寸為 0 時回傳 (0,0)", () => {
    const canvas = makeCanvas(200, 100, 0, 0);
    expect(toImagePoint(10, 10, canvas)).toEqual({ x: 0, y: 0 });
  });
});

// ── hitSlopImage ──────────────────────────────────────────────────────────────
describe("hitSlopImage", () => {
  it("1:1 比例時等於 HANDLE_SLOP_DISPLAY", () => {
    const canvas = makeCanvas(200, 100);
    expect(hitSlopImage(canvas)).toBe(HANDLE_SLOP_DISPLAY);
  });

  it("display 尺寸為 0 時回傳 HANDLE_SLOP_DISPLAY（不崩潰）", () => {
    const canvas = makeCanvas(200, 100, 0, 0);
    expect(hitSlopImage(canvas)).toBe(HANDLE_SLOP_DISPLAY);
  });
});

// ── hitTestMasks ──────────────────────────────────────────────────────────────
describe("hitTestMasks", () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = makeCanvas(400, 300);
  });

  it("無遮罩時回傳 none", () => {
    expect(hitTestMasks(50, 50, [], canvas)).toEqual({ kind: "none" });
  });

  it("命中遮罩本體回傳 body", () => {
    const mask = makeMask({ x: 20, y: 20, width: 100, height: 60 });
    const result = hitTestMasks(50, 40, [mask], canvas);
    expect(result.kind).toBe("body");
    expect(result.kind === "body" && result.id).toBe("test-id");
  });

  it("命中左上角回傳 corner nw", () => {
    const mask = makeMask({ x: 50, y: 50, width: 100, height: 80 });
    // 完全在角點上
    const result = hitTestMasks(50, 50, [mask], canvas);
    expect(result.kind).toBe("corner");
    expect(result.kind === "corner" && result.corner).toBe("nw");
  });

  it("指標在遮罩外回傳 none", () => {
    const mask = makeMask({ x: 100, y: 100, width: 50, height: 50 });
    expect(hitTestMasks(10, 10, [mask], canvas)).toEqual({ kind: "none" });
  });

  it("多遮罩時末尾（視覺上層）優先命中", () => {
    const bottom = makeMask({ id: "bottom", x: 0, y: 0, width: 200, height: 200 });
    const top = makeMask({ id: "top", x: 0, y: 0, width: 200, height: 200 });
    const result = hitTestMasks(50, 50, [bottom, top], canvas);
    expect(result.kind === "body" && result.id).toBe("top");
  });
});
