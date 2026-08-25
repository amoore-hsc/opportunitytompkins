import { useState } from "react";
import { Download, FileText, Table } from "lucide-react";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardMetrics } from "@/components/admin/AdminDashboard";
import { siteConfig } from "@/config";

interface DashboardExportProps {
  metrics: DashboardMetrics;
  dashboardRef: React.RefObject<HTMLElement>;
}

export const DashboardExport = ({ metrics, dashboardRef }: DashboardExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const date = new Date().toISOString().slice(0, 10);
  const slug = siteConfig.siteName.toLowerCase().replace(/\s+/g, "-");
  const baseFilename = `${slug}-dashboard-${date}`;

  const exportToPdf = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      await html2pdf()
        .set({
          margin: 0.5,
          filename: `${baseFilename}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
        })
        .from(dashboardRef.current)
        .save();
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Metric", "Value"],
      ["Total Applications", metrics.totalApplications],
      ["Positions Filled", metrics.positionsFilled],
      ["Listings Removed", metrics.listingsRemoved],
      ["Active Listings", metrics.activeListings],
      ["Education Listings", metrics.educationListings],
      ["Volunteer Listings", metrics.volunteerListings],
    ]);
    summarySheet["!cols"] = [{ wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const appsByOrg = metrics.applicationsByOrg.map((o) => ({
      Organization: o.name,
      Applications: o.count,
    }));
    const orgSheet = XLSX.utils.json_to_sheet(appsByOrg);
    orgSheet["!cols"] = [{ wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, orgSheet, "Applications by Org");

    const appsByRole = metrics.applicationsByRole.map((r) => ({
      Classification: r.name,
      Applications: r.count,
    }));
    const roleSheet = XLSX.utils.json_to_sheet(appsByRole);
    roleSheet["!cols"] = [{ wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, roleSheet, "Applications by Role");

    const appsByOpportunity = metrics.applicationsByOpportunity.map((o) => ({
      Opportunity: o.title,
      Organization: o.orgName,
      Applications: o.count,
    }));
    const oppSheet = XLSX.utils.json_to_sheet(appsByOpportunity);
    oppSheet["!cols"] = [{ wch: 50 }, { wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, oppSheet, "Applications by Opportunity");

    const positionsFilled = metrics.positionsFilledByOrg.map((o) => ({
      Organization: o.name,
      "Listings Closed": o.listings,
      "Positions Filled": o.positions,
    }));
    const filledSheet = XLSX.utils.json_to_sheet(positionsFilled);
    filledSheet["!cols"] = [{ wch: 40 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, filledSheet, "Positions Filled by Org");

    const removalReasons = metrics.removalReasons.map((r) => ({
      Reason: r.reason,
      Count: r.count,
    }));
    const reasonsSheet = XLSX.utils.json_to_sheet(removalReasons);
    reasonsSheet["!cols"] = [{ wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, reasonsSheet, "Removal Reasons");

    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting…" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPdf}>
          <FileText className="h-4 w-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <Table className="h-4 w-4 mr-2" />
          Download as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DashboardExport;
