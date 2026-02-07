import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import StatsCard from "@/components/StatsCard";
import IssueDetailModal from "@/components/IssueDetailModal";
import FilterSidebar from "@/components/FilterSidebar";
import IssuesList from "@/components/IssuesList";
import MapView from "@/components/MapView";
import MobileFilterDrawer from "@/components/MobileFilterDrawer";
import { AlertTriangle, TrendingUp, Users, Clock, Map, List, Menu } from "lucide-react";

import { supabase } from "@/lib/supabaseClient"; // Make sure this points to your supabase client

const Dashboard = () => {
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [highlightedIssueId, setHighlightedIssueId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    status: "all",
    location: "all", 
    dateRange: "all",
  });
  const [viewMode, setViewMode] = useState<"list" | "map">("list"); // Mobile view toggle
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [issues, setIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    const loadIssues = async () => {
      setLoadingIssues(true);
      const { data, error } = await supabase
        .from("issues")
        .select("id, title, description, category, location_text, priority, status, created_at, reporter_name, photos")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load issues", error);
        setIssues([]);
      } else {
        const mapped = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          category: row.category || "Other",
          status: (row.priority || "low") as "urgent" | "high" | "medium" | "low",
          location: row.location_text || "",
          description: row.description || "",
          urgencyScore: row.priority === "urgent" ? 90 : row.priority === "high" ? 75 : row.priority === "medium" ? 50 : 25,
          createdAt: row.created_at,
          reportedBy: row.reporter_name || "Anonymous",
          photos: Array.isArray(row.photos) ? row.photos : (row.photos ? [row.photos] : []),
        }));
        setIssues(mapped);
      }
      setLoadingIssues(false);
    };
    loadIssues();
  }, []);

  const filteredIssues = issues.filter((issue) => {
    const searchMatch = filters.search === "" || 
      issue.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      issue.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      issue.location.toLowerCase().includes(filters.search.toLowerCase());
    const categoryMatch = filters.category === "all" || issue.category === filters.category;
    const statusMatch = filters.status === "all" || issue.status === filters.status;
    const locationMatch = filters.location === "all" || issue.location.includes(filters.location);
    
    return searchMatch && categoryMatch && statusMatch && locationMatch;
  });

  const handleIssueClick = (issue: any) => {
    setSelectedIssue(issue);
    setIsDetailModalOpen(true);
  };

  const handleMapHighlight = (issueId: number) => {
    setHighlightedIssueId(issueId);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const activeFilterCount = Object.values(filters).filter(value => value !== "all" && value !== "").length;

  const handleExportPDF = async () => {
    try {
      // Resolve signed URLs from storage when needed
      const resolvePhotoUrls = async (raw: any): Promise<string[]> => {
        const items: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const results: string[] = [];
        for (const item of items) {
          if (typeof item === "string" && /^https?:\/\//i.test(item)) {
            results.push(item);
            continue;
          }
          let path = String(item || "").trim();
          if (!path) continue;
          path = path.replace(/^issue[_-]photos\//i, "");
          const { data, error } = await supabase.storage.from("issue_photos").createSignedUrl(path, 3600);
          if (!error && data?.signedUrl) {
            results.push(data.signedUrl);
            continue;
          }
          const alt = await supabase.storage.from("issue-photos").createSignedUrl(path, 3600);
          if (!alt.error && alt.data?.signedUrl) {
            results.push(alt.data.signedUrl);
          }
        }
        return results;
      };

      const resolvedById: Record<number, string[]> = {};
      for (const issue of filteredIssues as any[]) {
        resolvedById[issue.id] = await resolvePhotoUrls(issue.photos);
      }

      const exportDate = new Date().toLocaleString();
      const columns = [
        "ID",
        "Title",
        "Category",
        "Status",
        "Location",
        "Description",
        "Urgency Score",
        "Created At",
        "Reported By",
      ];

      const escapeHtml = (unsafe: string) =>
        unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const tableRows = filteredIssues.map((issue) => `
        <tr>
          <td>${issue.id}</td>
          <td>${escapeHtml(issue.title || "")}</td>
          <td>${escapeHtml(issue.category || "")}</td>
          <td>${escapeHtml(String(issue.status || ""))}</td>
          <td>${escapeHtml(issue.location || "")}</td>
          <td>${escapeHtml(issue.description || "")}</td>
          <td>${escapeHtml(String(issue.urgencyScore ?? ""))}</td>
          <td>${escapeHtml(new Date(issue.createdAt).toLocaleString())}</td>
          <td>${escapeHtml(issue.reportedBy || "")}</td>
        </tr>
      `).join("");

      const imagesSection = filteredIssues.map((issue) => {
        const photos: string[] = resolvedById[(issue as any).id] || [];
        if (!photos.length) return "";
        const imgs = photos.map((url, idx) => `
          <div class="img-wrap">
            <img src="${url}" alt="Issue ${issue.id} photo ${idx + 1}" />
            <div class="img-caption">Issue #${issue.id} - ${escapeHtml(issue.title || "")} (Photo ${idx + 1})</div>
          </div>
        `).join("");
        return `
          <div class="issue-images">
            <h3>Issue #${issue.id} - ${escapeHtml(issue.title || "")}</h3>
            <div class="images-grid">${imgs}</div>
          </div>
        `;
      }).join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Issues Export</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; }
              h1 { margin: 0 0 8px; font-size: 22px; }
              .meta { color: #555; margin-bottom: 16px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; }
              th { background: #f5f5f5; text-align: left; }
              tbody tr:nth-child(even) { background: #fafafa; }
              .section-title { margin: 24px 0 8px; font-size: 18px; }
              .issue-images { page-break-inside: avoid; margin-bottom: 16px; }
              .images-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
              .img-wrap { page-break-inside: avoid; }
              img { max-width: 100%; max-height: 480px; border: 1px solid #ddd; border-radius: 6px; }
              .img-caption { font-size: 11px; color: #444; margin-top: 4px; }
              @page { margin: 16mm; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="text-align:right; margin-bottom:8px;">
              <button onclick="window.print()" style="padding:6px 10px;">Print / Save PDF</button>
            </div>
            <h1>Issues Export</h1>
            <div class="meta">Exported at ${escapeHtml(exportDate)} • ${filteredIssues.length} issues</div>
            <table>
              <thead>
                <tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <div class="section-title">Attached Photos</div>
            ${imagesSection || '<div style="color:#666;">No photos available.</div>'}

            <script>
              window.addEventListener('load', function() {
                try { window.print(); } catch (e) {}
              });
            </script>
          </body>
        </html>
      `;

      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      console.error('Export failed', e);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Civic Issues Dashboard</h1>
              <p className="text-muted-foreground">
                Real-time monitoring and intelligent prioritization of city issues
              </p>
            </div>
            
            {/* Mobile Controls */}
            <div className="flex items-center space-x-2 sm:hidden">
              <MobileFilterDrawer 
                onFilterChange={handleFilterChange} 
                activeFilterCount={activeFilterCount}
              />
              <Button 
                variant="outline" 
                onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              >
                {viewMode === "list" ? <Map className="w-4 h-4 mr-2" /> : <List className="w-4 h-4 mr-2" />}
                {viewMode === "list" ? "Map" : "List"}
              </Button>
            </div>
          </div>
        </div>

        
       

        {/* Main Content - Desktop Layout */}
        <div className={`hidden lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-280px)]`}>
          {/* Left Sidebar - Filters */}
          <div className={`${sidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'} transition-all duration-300`}>
            {!sidebarCollapsed && (
              <div className="h-full overflow-y-auto">
                <FilterSidebar onFilterChange={handleFilterChange} />
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="mt-2 w-full"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>

          {/* Middle - Issues List */}
          <div className={`${sidebarCollapsed ? 'lg:col-span-5' : 'lg:col-span-4'} transition-all duration-300`}>
            <div className="h-full overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {loadingIssues ? "Loading Issues..." : `Issues (${filteredIssues.length})`}
                </h2>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  Export
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <IssuesList 
                  issues={filteredIssues}
                  onIssueClick={handleIssueClick}
                  onMapHighlight={handleMapHighlight}
                  selectedIssueId={highlightedIssueId}
                />
              </div>
            </div>
          </div>

          {/* Right - Map */}
          <div className={`${sidebarCollapsed ? 'lg:col-span-6' : 'lg:col-span-5'} transition-all duration-300`}>
            <MapView 
              issues={filteredIssues}
              onIssueSelect={handleIssueClick}
              highlightedIssueId={highlightedIssueId}
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          {viewMode === "list" ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">
                  Issues ({filteredIssues.length})
                </h2>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  Export
                </Button>
              </div>
              
              <IssuesList 
                issues={filteredIssues}
                onIssueClick={handleIssueClick}
                onMapHighlight={handleMapHighlight}
                selectedIssueId={highlightedIssueId}
              />
            </div>
          ) : (
            <div className="h-[70vh]">
              <MapView 
                issues={filteredIssues}
                onIssueSelect={handleIssueClick}
                highlightedIssueId={highlightedIssueId}
              />
            </div>
          )}
        </div>

        {/* Issue Detail Modal */}
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedIssue(null);
          }}
          isAdmin={false} // TODO: Connect to auth system
        />
      </div>
    </div>
  );
};

export default Dashboard;