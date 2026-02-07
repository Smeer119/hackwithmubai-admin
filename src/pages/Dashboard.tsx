import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import StatsCard from "@/components/StatsCard";
import IssueDetailModal from "@/components/IssueDetailModal";
import FilterSidebar from "@/components/FilterSidebar";
import IssuesList from "@/components/IssuesList";
import MapView from "@/components/MapView";
import StatusBadge from "@/components/StatusBadge";
import MobileFilterDrawer from "@/components/MobileFilterDrawer";
import { AlertTriangle, TrendingUp, Users, Clock, Map, List, Menu, X, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    city: "all",
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

  const uniqueCities = Array.from(new Set(issues.map(issue => {
    const parts = (issue.location || "").split(',');
    return parts[parts.length - 1].trim();
  }))).filter(Boolean).sort();

  const filteredIssues = issues.filter((issue) => {
    const searchMatch = filters.search === "" || 
      issue.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      issue.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      issue.location.toLowerCase().includes(filters.search.toLowerCase());
    const categoryMatch = filters.category === "all" || issue.category === filters.category;
    const statusMatch = filters.status === "all" || issue.status === filters.status;
    const locationMatch = filters.location === "all" || issue.location.includes(filters.location);
    const cityMatch = filters.city === "all" || issue.location.toLowerCase().includes(filters.city.toLowerCase());
    
    return searchMatch && categoryMatch && statusMatch && locationMatch && cityMatch;
  });

  const handleIssueClick = (issue: any) => {
    setSelectedIssue(issue);
    setIsDetailModalOpen(true);
  };

  const handleMapHighlight = (issueId: number) => {
    setHighlightedIssueId(issueId);
  };

  const handleStatusUpdate = async (issueId: number, newPriority: string) => {
    const { error } = await supabase
      .from("issues")
      .update({ priority: newPriority })
      .eq("id", issueId);

    if (error) {
      console.error("Failed to update status", error);
    } else {
      // Update local state
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { 
          ...issue, 
          status: newPriority, 
          urgencyScore: newPriority === "urgent" ? 90 : newPriority === "high" ? 75 : newPriority === "medium" ? 50 : 25 
        } : issue
      ));
      if (selectedIssue?.id === issueId) {
        setSelectedIssue((prev: any) => ({ 
          ...prev, 
          status: newPriority,
          urgencyScore: newPriority === "urgent" ? 90 : newPriority === "high" ? 75 : newPriority === "medium" ? 50 : 25
        }));
      }
    }
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
      
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Sidebar - Issues List */}
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">City Issues</h2>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                Export
              </Button>
            </div>
            <input
              type="text"
              placeholder="Filter Issues"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm mb-3"
            />
            
            <Select 
              value={filters.city} 
              onValueChange={(value) => setFilters({ ...filters, city: value })}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="Filter by City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => {
                  setSelectedIssue(issue);
                  setHighlightedIssueId(issue.id);
                }}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  highlightedIssueId === issue.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      issue.status === 'urgent' ? 'bg-red-500' :
                      issue.status === 'high' ? 'bg-orange-500' :
                      issue.status === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  >
                    {issue.title.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`font-black text-sm truncate ${
                        highlightedIssueId === issue.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {issue.title}
                      </p>
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 ml-2 whitespace-nowrap bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                        {new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 truncate flex items-center mt-1">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-blue-500" />
                      {issue.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Map */}
        <div className="flex-1 relative h-full">
          <MapView 
            issues={filteredIssues}
            onIssueSelect={(issue) => {
              setSelectedIssue(issue);
              setHighlightedIssueId(issue.id);
            }}
            highlightedIssueId={highlightedIssueId}
          />
          
          {/* Right Floating Panel - Issue Details */}
          {selectedIssue && (
            <div className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 backdrop-blur-md dark:bg-gray-900/95 rounded-xl shadow-2xl border border-border/50 overflow-y-auto z-[500] animate-in slide-in-from-right-10 duration-300">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 z-10" 
                onClick={() => setSelectedIssue(null)}
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </Button>
              
              <div className="p-6 pt-10">
                
                <div className="flex flex-col items-center mb-6">
                  {selectedIssue.photos && selectedIssue.photos.length > 0 ? (
                    <div className="w-full h-40 rounded-xl overflow-hidden mb-4 shadow-md bg-muted">
                      <img 
                        src={selectedIssue.photos[0]} 
                        alt={selectedIssue.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg ${
                      selectedIssue.status === 'urgent' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      selectedIssue.status === 'high' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                      selectedIssue.status === 'medium' ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                      'bg-gradient-to-br from-green-500 to-green-600'
                    }`}>
                      {selectedIssue.title.charAt(0)}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-center leading-tight mb-1 text-gray-900 dark:text-white">{selectedIssue.title}</h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">{selectedIssue.category}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-1.5 bg-blue-500 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{selectedIssue.urgencyScore}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Urgency</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-2xl border border-orange-100 dark:border-orange-800/50 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-1.5 bg-orange-500 rounded-lg">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-orange-700 dark:text-orange-400">
                      {Math.floor((new Date().getTime() - new Date(selectedIssue.createdAt).getTime()) / (1000 * 60 * 60))}h
                    </p>
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">Active</p>
                  </div>
                </div>

                <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
                  <h4 className="text-[11px] font-black mb-4 uppercase tracking-[0.15em] text-gray-400">Activity Timeline</h4>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex-[2] bg-gradient-to-r from-blue-600 to-blue-400 h-2.5 rounded-full shadow-sm"></div>
                    <div className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-300 h-2.5 rounded-full shadow-sm"></div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full"></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500">
                    <span className="text-blue-600">Reported</span>
                    <span className="text-cyan-500">In Progress</span>
                    <span>Pending</span>
                  </div>
                </div>

                <div className="space-y-5 px-1">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <Map className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Location</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedIssue.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <List className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Description</p>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{selectedIssue.description}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <Users className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Reported By</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedIssue.reportedBy}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Impact Level</p>
                      <Select 
                        value={selectedIssue.status} 
                        onValueChange={(val) => handleStatusUpdate(selectedIssue.id, val)}
                      >
                        <SelectTrigger className="w-full h-9 border-0 bg-gray-50 dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 shadow-sm font-bold text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                          <SelectItem value="high">🟠 High</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="low">🟢 Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Issue Detail Modal */}
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
          }}
          isAdmin={false} // TODO: Connect to auth system
        />
      </div>
    </div>
  );
};

export default Dashboard;