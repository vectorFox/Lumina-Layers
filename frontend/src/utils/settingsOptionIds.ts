import type { PrinterInfo, SlicerOption } from "../api/types";

const LEGACY_SLICER_ID_MAP: Record<string, string> = {
  bambu: "BambuStudio",
  bambu_studio: "BambuStudio",
  "bambu studio": "BambuStudio",
  bambustudio: "BambuStudio",
  orca: "OrcaSlicer",
  orca_slicer: "OrcaSlicer",
  orcaslicer: "OrcaSlicer",
  snapmaker: "SnapmakerOrca",
  snapmaker_orca: "SnapmakerOrca",
  "snapmaker orca": "SnapmakerOrca",
  snapmakerorca: "SnapmakerOrca",
  elegoo: "ElegooSlicer",
  elegoo_slicer: "ElegooSlicer",
  "elegoo slicer": "ElegooSlicer",
  elegooslicer: "ElegooSlicer",
};

export function normalizeSlicerOptionId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return LEGACY_SLICER_ID_MAP[trimmed.toLowerCase()] ?? trimmed;
}

export function normalizePrinterOptionId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.toLowerCase().replace(/_/g, "-");
}

export function supportsSlicer(printer: PrinterInfo, slicerId: string): boolean {
  return (
    !printer.supported_slicers ||
    printer.supported_slicers.length === 0 ||
    printer.supported_slicers.includes(slicerId)
  );
}

export function filterCompatiblePrinters(
  printers: PrinterInfo[],
  slicerId: string,
): PrinterInfo[] {
  return printers.filter((printer) => supportsSlicer(printer, slicerId));
}

export function resolveSlicerOptionId(
  currentValue: string,
  slicers: SlicerOption[],
): string {
  const normalized = normalizeSlicerOptionId(currentValue);
  if (slicers.some((slicer) => slicer.id === normalized)) {
    return normalized;
  }
  return slicers[0]?.id ?? normalized;
}

export function resolvePrinterOptionId(
  currentValue: string,
  printers: PrinterInfo[],
  slicerId: string,
): string {
  const normalized = normalizePrinterOptionId(currentValue);
  const compatiblePrinters = filterCompatiblePrinters(printers, slicerId);

  if (compatiblePrinters.some((printer) => printer.id === normalized)) {
    return normalized;
  }
  return compatiblePrinters[0]?.id ?? printers[0]?.id ?? normalized;
}
