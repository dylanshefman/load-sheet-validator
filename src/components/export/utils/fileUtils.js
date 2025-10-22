import * as dfd from "danfojs";
import * as XLSX from "xlsx";

/**
 * Export a DataFrame as CSV (danfojs >= 1.1 syntax)
 */
export function exportAsCsv(df, filename = "export.csv") {
  try {
    if (!df || !(df instanceof dfd.DataFrame)) {
      console.error("Invalid DataFrame provided to exportAsCsv");
      return;
    }

    const csv = dfd.toCSV(df, { download: false }); // ✅ new API
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to export CSV:", err);
  }
}

/**
 * Export a DataFrame as XLSX
 */
export function exportAsXlsx(df, filename = "export.xlsx") {
  try {
    if (!df || !(df instanceof dfd.DataFrame)) {
      console.error("Invalid DataFrame provided to exportAsXlsx");
      return;
    }

    const data = [df.columns, ...df.values];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    XLSX.writeFile(workbook, filename);
  } catch (err) {
    console.error("Failed to export XLSX:", err);
  }
}
