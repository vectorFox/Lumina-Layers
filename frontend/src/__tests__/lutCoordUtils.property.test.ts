import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getObjectFitRect, lutClickToCell } from "../utils/lutCoordUtils";

// ========== Generators ==========

/** Positive integer dimension in [1, 2000], simulating image/element pixel sizes. */
const positiveDimension = fc.integer({ min: 1, max: 2000 });

/** Grid size in [1, 100], covering typical LUT grid sizes. */
const positiveGridSize = fc.integer({ min: 1, max: 100 });

// ========== Tests ==========

describe("Feature: extractor-cell-fix-highlight, Property 1: 坐标映射 round-trip", () => {
  /**
   * **Validates: Requirements 1.1, 3.4**
   *
   * For any valid image dimensions (naturalWidth, naturalHeight),
   * element dimensions (clientWidth, clientHeight), gridSize,
   * and valid cell coordinates (row, col) where 0 <= row < gridSize
   * and 0 <= col < gridSize:
   *
   * Computing the cell center pixel coordinate within the rendered area,
   * then mapping it back via getObjectFitRect + lutClickToCell,
   * SHALL produce the original (row, col).
   */
  it("单元格中心点 → getObjectFitRect + lutClickToCell → 原始 (row, col)", () => {
    fc.assert(
      fc.property(
        positiveDimension,
        positiveDimension,
        positiveDimension,
        positiveDimension,
        positiveGridSize.chain((gridSize) =>
          fc.tuple(
            fc.constant(gridSize),
            fc.integer({ min: 0, max: gridSize - 1 }),
            fc.integer({ min: 0, max: gridSize - 1 }),
          ),
        ),
        (naturalWidth, naturalHeight, clientWidth, clientHeight, [gridSize, row, col]) => {
          const rendered = getObjectFitRect(naturalWidth, naturalHeight, clientWidth, clientHeight);

          // Compute the center of the cell in element coordinates
          const clickX = rendered.offsetX + (col + 0.5) * rendered.width / gridSize;
          const clickY = rendered.offsetY + (row + 0.5) * rendered.height / gridSize;

          const result = lutClickToCell(clickX, clickY, rendered, gridSize);

          expect(result).not.toBeNull();
          expect(result).toEqual([row, col]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("所有边界单元格 (0,0) 和 (gridSize-1, gridSize-1) 的中心点均可正确 round-trip", () => {
    fc.assert(
      fc.property(
        positiveDimension,
        positiveDimension,
        positiveDimension,
        positiveDimension,
        positiveGridSize,
        (naturalWidth, naturalHeight, clientWidth, clientHeight, gridSize) => {
          const rendered = getObjectFitRect(naturalWidth, naturalHeight, clientWidth, clientHeight);

          // Test first cell (0, 0)
          const clickX0 = rendered.offsetX + 0.5 * rendered.width / gridSize;
          const clickY0 = rendered.offsetY + 0.5 * rendered.height / gridSize;
          const result0 = lutClickToCell(clickX0, clickY0, rendered, gridSize);
          expect(result0).toEqual([0, 0]);

          // Test last cell (gridSize-1, gridSize-1)
          const lastRow = gridSize - 1;
          const lastCol = gridSize - 1;
          const clickXLast = rendered.offsetX + (lastCol + 0.5) * rendered.width / gridSize;
          const clickYLast = rendered.offsetY + (lastRow + 0.5) * rendered.height / gridSize;
          const resultLast = lutClickToCell(clickXLast, clickYLast, rendered, gridSize);
          expect(resultLast).toEqual([lastRow, lastCol]);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Feature: extractor-cell-fix-highlight, Property 2: Letterbox 区域点击拒绝", () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any valid image dimensions and element dimensions, and any click
   * coordinate that falls within the element bounds (0 to clientWidth,
   * 0 to clientHeight) but OUTSIDE the RenderedImageRect returned by
   * getObjectFitRect, lutClickToCell SHALL return null.
   */

  /**
   * Generator that produces a click point in the letterbox area.
   * Strategy: generate dimensions, compute rendered rect, then pick a point
   * in one of the four letterbox strips (left, right, top, bottom).
   * Uses fc.pre() to skip cases where no letterbox exists (aspect ratios match exactly).
   */
  const letterboxClick = fc
    .record({
      naturalWidth: positiveDimension,
      naturalHeight: positiveDimension,
      clientWidth: positiveDimension,
      clientHeight: positiveDimension,
      gridSize: positiveGridSize,
      /** Uniform [0,1) used to pick a random point within the letterbox strip. */
      u: fc.double({ min: 0, max: 1, noNaN: true }),
      v: fc.double({ min: 0, max: 1, noNaN: true }),
      /** Which letterbox strip to target: 0=left, 1=right, 2=top, 3=bottom */
      strip: fc.integer({ min: 0, max: 3 }),
    })
    .filter(({ naturalWidth, naturalHeight, clientWidth, clientHeight, strip }) => {
      // Compute rendered rect to check if the chosen strip has non-zero width
      const rendered = getObjectFitRect(naturalWidth, naturalHeight, clientWidth, clientHeight);
      if (rendered.width <= 0 || rendered.height <= 0) return false;

      switch (strip) {
        case 0: return rendered.offsetX > 0.5;          // left strip exists
        case 1: return clientWidth - (rendered.offsetX + rendered.width) > 0.5;  // right strip
        case 2: return rendered.offsetY > 0.5;          // top strip exists
        case 3: return clientHeight - (rendered.offsetY + rendered.height) > 0.5; // bottom strip
        default: return false;
      }
    });

  it("落在 letterbox 留白区域的点击 → lutClickToCell 返回 null", () => {
    fc.assert(
      fc.property(
        letterboxClick,
        ({ naturalWidth, naturalHeight, clientWidth, clientHeight, gridSize, u, v, strip }) => {
          const rendered = getObjectFitRect(naturalWidth, naturalHeight, clientWidth, clientHeight);

          let clickX: number;
          let clickY: number;

          switch (strip) {
            case 0: // left letterbox: x in [0, offsetX), y anywhere in element
              clickX = u * rendered.offsetX * 0.999; // stay strictly < offsetX
              clickY = v * clientHeight;
              break;
            case 1: // right letterbox: x in [offsetX + width, clientWidth), y anywhere
              clickX = rendered.offsetX + rendered.width + u * (clientWidth - rendered.offsetX - rendered.width) * 0.999 + 0.001;
              clickY = v * clientHeight;
              break;
            case 2: // top letterbox: y in [0, offsetY), x anywhere in element
              clickX = u * clientWidth;
              clickY = v * rendered.offsetY * 0.999; // stay strictly < offsetY
              break;
            case 3: // bottom letterbox: y in [offsetY + height, clientHeight), x anywhere
              clickX = u * clientWidth;
              clickY = rendered.offsetY + rendered.height + v * (clientHeight - rendered.offsetY - rendered.height) * 0.999 + 0.001;
              break;
            default:
              clickX = 0;
              clickY = 0;
          }

          const result = lutClickToCell(clickX, clickY, rendered, gridSize);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("Feature: extractor-cell-fix-highlight, Property 3: 渲染区域边界不变量", () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * For any positive naturalWidth, naturalHeight, clientWidth, clientHeight,
   * getObjectFitRect SHALL return a RenderedImageRect satisfying:
   *   offsetX >= 0
   *   offsetY >= 0
   *   offsetX + width <= clientWidth
   *   offsetY + height <= clientHeight
   */
  it("渲染区域完全包含在元素边界内", () => {
    fc.assert(
      fc.property(
        positiveDimension,
        positiveDimension,
        positiveDimension,
        positiveDimension,
        (naturalWidth, naturalHeight, clientWidth, clientHeight) => {
          const rendered = getObjectFitRect(naturalWidth, naturalHeight, clientWidth, clientHeight);

          expect(rendered.offsetX).toBeGreaterThanOrEqual(0);
          expect(rendered.offsetY).toBeGreaterThanOrEqual(0);
          expect(rendered.offsetX + rendered.width).toBeLessThanOrEqual(clientWidth);
          expect(rendered.offsetY + rendered.height).toBeLessThanOrEqual(clientHeight);
        },
      ),
      { numRuns: 200 },
    );
  });
});
