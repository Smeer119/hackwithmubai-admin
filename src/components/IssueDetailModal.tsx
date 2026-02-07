import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { MapPin, User, Calendar, Clock, CheckCircle2, AlertCircle, Settings, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Issue {
  id: number;
  title: string;
  category: string;
  status: "urgent" | "high" | "medium" | "low";
  location: string;
  description: string;
  urgencyScore: number;
  createdAt: string;
  reportedBy: string;
  coinsEarned?: number;
  photos?: string[] | string | null;
}

interface IssueDetailModalProps {
  issue: Issue | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const IssueDetailModal = ({ issue, isOpen, onClose, isAdmin = false }: IssueDetailModalProps) => {
  const [newStatus, setNewStatus] = useState<string>("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [mapUrl, setMapUrl] = useState<string>("");
  const [resolvedPhotos, setResolvedPhotos] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize map with issue location when modal opens
  useEffect(() => {
    if (issue && issue.location) {
      const location = issue.location.trim();
      if (location) {
        const newMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(location)}&z=15&output=embed`;
        setMapUrl(newMapUrl);
      } else {
        // Fallback to city center if no location
        const defaultUrl = `https://www.google.com/maps?q=City+Center&z=13&output=embed`;
        setMapUrl(defaultUrl);
      }
    }
  }, [issue]);

  // Resolve photo URLs (storage paths, JSON strings, comma-separated, or direct URLs)
  useEffect(() => {
    const run = async () => {
      if (!issue) {
        setResolvedPhotos([]);
        return;
      }

      const raw = (issue as any).photos;

      const normalize = (input: any): string[] => {
        let out: string[] = [];
        if (Array.isArray(input)) {
          input.forEach((v) => { out.push(...normalize(v)); });
          return out;
        }
        if (typeof input === "string") {
          const s = input.trim();
          if (!s) return out;
          // Try parse JSON array strings
          if (s.startsWith("[") || s.startsWith("\"[")) {
            try {
              const arr = JSON.parse(s);
              if (Array.isArray(arr)) return normalize(arr);
            } catch {}
          }
          // Extract any URLs embedded in the string
          const matches = s.match(/https?:\/\/[^\s,"\]]+/g);
          if (matches && matches.length) return matches;
          // Fallback: comma-separated list
          return s.split(/\s*,\s*/).filter(Boolean);
        }
        return out;
      };

      const items = normalize(raw);
      const results: string[] = [];
      for (const item of items) {
        const val = (item || "").toString().trim();
        if (!val) continue;
        if (/^https?:\/\//i.test(val)) {
          results.push(val);
          continue;
        }
        // Treat as storage object path
        let path = val.replace(/^issue[_-]photos\//i, "").replace(/^\/+/, "");
        if (!path) continue;
        // Prefer public URL (bucket is Public), fallback to signed
        const { data: pub } = supabase.storage.from("issue-photos").getPublicUrl(path);
        if (pub?.publicUrl) {
          results.push(pub.publicUrl);
          continue;
        }
        const { data, error } = await supabase.storage.from("issue-photos").createSignedUrl(path, 3600);
        if (!error && data?.signedUrl) {
          results.push(data.signedUrl);
        }
      }
      setResolvedPhotos(results);
    };
    run();
  }, [issue]);

  if (!issue) return null;

  const handleStatusUpdate = () => {
    // TODO: Connect to Supabase for status updates
    console.log("Updating status to:", newStatus, "with notes:", resolutionNotes);
    onClose();
  };

  const progressSteps = [
    { status: "reported", label: "Reported", icon: AlertCircle, completed: true },
    { status: "accepted", label: "Accepted", icon: CheckCircle2, completed: issue.status !== "urgent" },
    { status: "in-progress", label: "In Progress", icon: Clock, completed: issue.status === "low" },
    { status: "completed", label: "Completed", icon: CheckCircle2, completed: false },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-start justify-between">
            <span>{issue.title}</span>
            <StatusBadge status={issue.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Issue Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-background/50 border-border/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{issue.category}</Badge>
                  <div className="px-2 py-1 bg-primary/20 rounded text-xs font-medium text-primary">
                    Score: {issue.urgencyScore}
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground space-x-4">
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {issue.location}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center text-sm text-muted-foreground space-x-4">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Reported by {issue.reportedBy}
                  </span>
                  {issue.coinsEarned && (
                    <span className="flex items-center text-warning">
                      <span className="w-4 h-4 mr-1">🪙</span>
                      {issue.coinsEarned} coins earned
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="bg-background/50 border-border/30">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{issue.description}</p>
              </CardContent>
            </Card>

            {/* Interactive Map showing issue location */}
            <Card className="bg-background/50 border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Location: {issue.location}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Google Maps Embed */}
                <div className="relative h-64 rounded-lg border border-border overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full"
                  />
                  
                  {/* Issue Marker Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div 
                      className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg bg-primary animate-pulse"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`Issue Location: ${issue.location}`}
                    >
                      <span className="sr-only">Issue location marker</span>
                    </div>
                  </div>
                  
                  {/* Map Info Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 border border-border/50">
                    <div className="text-center text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Issue Location</p>
                      <p>{issue.location}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-muted-foreground text-center">
                  <p>Interactive Google Maps showing the exact issue location</p>
                  <p>Click and drag to explore the area around this location</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Progress, Photos & Admin Controls */}
          <div className="space-y-6">
            {/* Progress Timeline */}
            <Card className="bg-background/50 border-border/30">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-4">Progress Timeline</h3>
                <div className="space-y-4">
                  {progressSteps.map((step, index) => (
                    <div key={step.status} className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? "bg-success text-success-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          step.completed ? "text-success" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Photos Gallery (replaces Actions area) */}
            <Card className="bg-background/50 border-border/30">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Photos</h3>
                {resolvedPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {resolvedPhotos.map((url, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-border/50">
                        <img src={url} alt={`Issue photo ${idx + 1}`} className="w-full h-48 object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No photos attached for this issue.</div>
                )}
              </CardContent>
            </Card>

            {/* Admin Controls */}
            {isAdmin && (
              <Card className="bg-background/50 border-border/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Controls
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Update Status
                      </label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accepted">Accept Issue</SelectItem>
                          <SelectItem value="in-progress">Mark In Progress</SelectItem>
                          <SelectItem value="completed">Mark Completed</SelectItem>
                          <SelectItem value="rejected">Reject Issue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Resolution Notes
                      </label>
                      <Textarea
                        placeholder="Add notes about the resolution or actions taken..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleStatusUpdate}
                        className="bg-primary hover:bg-primary/90"
                        disabled={!newStatus}
                      >
                        Update Status
                      </Button>
                      <Button variant="outline">
                        Assign Team
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IssueDetailModal;