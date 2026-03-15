/**
 * Coordinate mapping utilities for LUT preview image click handling.
 * LUT 预览图点击坐标映射工具函数。
 */

/** Rendered image rect within an object-contain element (excluding letterbox). */
/** object-contain 模式下图像实际渲染区域（不含 letterbox 留白） */
export interface RenderedImageRect {
  offsetX: number;   // Image content left offset relative to element edge. (图像内容左边距)
  offsetY: number;   // Image content top offset relative to element edge. (图像内容上边距)
  width: number;     // Rendered image width in pixels. (图像内容渲染宽度)
  height: number;    // Rendered image height in pixels. (图像内容渲染高度)
}

/**
 * Compute the actual rendered rect of an image in object-contain mode.
 * 计算 object-contain 模式下图像的实际渲染区域。
 *
 * Pure function with no side effects. When naturalWidth or naturalHeight
 * is zero, returns a zero-size rect to avoid division by zero.
 * 纯函数，无副作用。当 naturalWidth 或 naturalHeight 为 0 时返回零尺寸区域。
 *
 * @param naturalWidth - Intrinsic image width in pixels. (图像原始宽度)
 * @param naturalHeight - Intrinsic image height in pixels. (图像原始高度)
 * @param clientWidth - Element client width in pixels. (元素客户端宽度)
 * @param clientHeight - Element client height in pixels. (元素客户端高度)
 * @returns Rendered image rect with offset and dimensions. (渲染区域的偏移和尺寸)
 */
export function getObjectFitRect(
  naturalWidth: number,
  naturalHeight: number,
  clientWidth: number,
  clientHeight: number,
): RenderedImageRect {
  if (naturalWidth <= 0 || naturalHeight <= 0 || clientWidth <= 0 || clientHeight <= 0) {
    return { offsetX: 0, offsetY: 0, width: 0, height: 0 };
  }

  const ratio = Math.min(clientWidth / naturalWidth, clientHeight / naturalHeight);
  const width = Math.min(naturalWidth * ratio, clientWidth);
  const height = Math.min(naturalHeight * ratio, clientHeight);
  const offsetX = (clientWidth - width) / 2;
  const offsetY = (clientHeight - height) / 2;

  return { offsetX, offsetY, width, height };
}

/**
 * Map a click coordinate to a LUT grid cell index.
 * 将点击坐标映射为 LUT 网格单元格索引。
 *
 * Returns [row, col] for clicks inside the rendered image area,
 * or null for clicks in the letterbox padding or when gridSize is invalid.
 * 点击在渲染图像区域内时返回 [row, col]，点击在留白区域或 gridSize 无效时返回 null。
 *
 * @param clickX - Click X relative to element left edge. (相对于元素左边缘的点击 X)
 * @param clickY - Click Y relative to element top edge. (相对于元素上边缘的点击 Y)
 * @param rendered - Rendered image rect from getObjectFitRect. (由 getObjectFitRect 返回的渲染区域)
 * @param gridSize - Number of rows/columns in the LUT grid. (LUT 网格的行列数)
 * @returns [row, col] tuple or null if click is outside the image area. (单元格索引或 null)
 */
export function lutClickToCell(
  clickX: number,
  clickY: number,
  rendered: RenderedImageRect,
  gridSize: number,
): [number, number] | null {
  if (gridSize <= 0) return null;
  if (rendered.width <= 0 || rendered.height <= 0) return null;

  const relX = clickX - rendered.offsetX;
  const relY = clickY - rendered.offsetY;

  if (relX < 0 || relX >= rendered.width || relY < 0 || relY >= rendered.height) {
    return null;
  }

  const col = Math.min(Math.floor(relX / rendered.width * gridSize), gridSize - 1);
  const row = Math.min(Math.floor(relY / rendered.height * gridSize), gridSize - 1);

  return [row, col];
}

/**
 * Compute the pixel position and size of a selected grid cell overlay.
 * 计算选中色块在渲染图像上的覆盖层像素位置和尺寸。
 *
 * @param row - Zero-based row index of the selected cell. (选中色块的行索引)
 * @param col - Zero-based column index of the selected cell. (选中色块的列索引)
 * @param rendered - Rendered image rect from getObjectFitRect. (由 getObjectFitRect 返回的渲染区域)
 * @param gridSize - Number of rows/columns in the LUT grid. (LUT 网格的行列数)
 * @returns Overlay position and size in pixels. (覆盖层的位置和尺寸，单位为像素)
 */
export function getCellOverlayStyle(
  row: number,
  col: number,
  rendered: RenderedImageRect,
  gridSize: number,
): { left: number; top: number; width: number; height: number } {
  const cellWidth = rendered.width / gridSize;
  const cellHeight = rendered.height / gridSize;
  const left = rendered.offsetX + col * cellWidth;
  const top = rendered.offsetY + row * cellHeight;
  return { left, top, width: cellWidth, height: cellHeight };
}
