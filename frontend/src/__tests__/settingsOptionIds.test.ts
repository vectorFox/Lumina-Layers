import { describe, expect, it } from "vitest";

import {
  filterCompatiblePrinters,
  normalizePrinterOptionId,
  normalizeSlicerOptionId,
  resolvePrinterOptionId,
  resolveSlicerOptionId,
} from "../utils/settingsOptionIds";
import type { PrinterInfo, SlicerOption } from "../api/types";

const SLICERS: SlicerOption[] = [
  { id: "BambuStudio", display_name: "BambuStudio" },
  { id: "OrcaSlicer", display_name: "OrcaSlicer" },
];

const PRINTERS: PrinterInfo[] = [
  {
    id: "bambu-h2d",
    display_name: "Bambu Lab H2D",
    brand: "Bambu Lab",
    bed_width: 350,
    bed_depth: 320,
    bed_height: 325,
    nozzle_count: 2,
    is_dual_head: true,
    supported_slicers: ["BambuStudio", "OrcaSlicer"],
  },
  {
    id: "elegoo-cc2",
    display_name: "Elegoo Centauri Carbon 2",
    brand: "Elegoo",
    bed_width: 256,
    bed_depth: 256,
    bed_height: 256,
    nozzle_count: 1,
    is_dual_head: false,
    supported_slicers: ["ElegooSlicer"],
  },
];

describe("settingsOptionIds", () => {
  it("normalizes legacy slicer ids", () => {
    expect(normalizeSlicerOptionId("orca_slicer")).toBe("OrcaSlicer");
    expect(normalizeSlicerOptionId("BambuStudio")).toBe("BambuStudio");
  });

  it("normalizes legacy printer ids", () => {
    expect(normalizePrinterOptionId("BAMBU_H2D")).toBe("bambu-h2d");
  });

  it("resolves invalid slicer selection to a canonical option", () => {
    expect(resolveSlicerOptionId("orca_slicer", SLICERS)).toBe("OrcaSlicer");
  });

  it("resolves invalid printer selection to a compatible option", () => {
    expect(resolvePrinterOptionId("BAMBU_H2D", PRINTERS, "OrcaSlicer")).toBe("bambu-h2d");
  });

  it("filters printers by canonical slicer id", () => {
    expect(filterCompatiblePrinters(PRINTERS, "OrcaSlicer")).toHaveLength(1);
    expect(filterCompatiblePrinters(PRINTERS, "OrcaSlicer")[0]?.id).toBe("bambu-h2d");
  });
});
