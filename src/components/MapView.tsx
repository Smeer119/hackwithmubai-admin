import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
}

interface MapViewProps {
  issues: Issue[];
  onIssueSelect?: (issue: Issue) => void;
  highlightedIssueId?: number | null;
  className?: string;
}

const MapView = ({ issues, onIssueSelect, highlightedIssueId, className = "" }: MapViewProps) => {
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [mapUrl, setMapUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "urgent": return "bg-civic-urgent";
      case "high": return "bg-civic-high"; 
      case "medium": return "bg-civic-medium";
      case "low": return "bg-civic-low";
      default: return "bg-muted";
    }
  };

  // Initialize map with default location or first issue location
  useEffect(() => {
    if (issues.length > 0) {
      // Use the first issue's location as the initial map center
      const firstIssue = issues.find(issue => issue.location && issue.location.trim() !== '');
      if (firstIssue) {
        const initialLocation = firstIssue.location;
        const newMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(initialLocation)}&z=13&output=embed`;
        setMapUrl(newMapUrl);
        setCurrentLocation(initialLocation);
      } else {
        // Fallback to default location
        const defaultUrl = `https://www.google.com/maps?q=City+Center&z=13&output=embed`;
        setMapUrl(defaultUrl);
        setCurrentLocation("City Center");
      }
    } else {
      // No issues, show default city center
      const defaultUrl = `https://www.google.com/maps?q=City+Center&z=13&output=embed`;
      setMapUrl(defaultUrl);
      setCurrentLocation("City Center");
    }
  }, [issues]);

  // Function to navigate map to specific location
  const navigateToLocation = (location: string) => {
    if (location && location.trim() !== '') {
      const newMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(location)}&z=15&output=embed`;
      setMapUrl(newMapUrl);
      setCurrentLocation(location);
      
      // Update iframe if it exists
      if (iframeRef.current) {
        iframeRef.current.src = newMapUrl;
      }
    }
  };

  // Handle marker click - navigate to location and select issue
  const handleMarkerClick = (issue: Issue) => {
    // Navigate to the issue location
    navigateToLocation(issue.location);
    
    // Call the onIssueSelect callback if provided
    onIssueSelect?.(issue);
  };

  // Function to get map center based on current issues
  const getMapCenter = () => {
    if (issues.length === 0) {
      return "City Center";
    }
    
    // Find the most recent issue with a location
    const validIssues = issues.filter(issue => issue.location && issue.location.trim() !== '');
    
    if (validIssues.length > 0) {
      // Return the most recent issue location
      return validIssues[0].location;
    }
    
    return "City Center";
  };

  return (
    <Card className={`bg-gradient-card border-border/50 h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Issues Map</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Layers className="w-4 h-4 mr-1" />
              Layers
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Map Legend */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-civic-urgent"></div>
            <span>Urgent</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-civic-high"></div>
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-civic-medium"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-civic-low"></div>
            <span>Low</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 h-full">
        {/* Google Maps Website Embed with Issue Markers */}
        <div className="relative h-full min-h-[400px] rounded-lg border border-border overflow-hidden">
          {/* Google Maps Website Embed */}
          <iframe
            ref={iframeRef}
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 z-0"
          />
          
          {/* Issue Markers Overlay - Positioned based on actual issue data */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {issues.map((issue, index) => {
              // Calculate marker position based on issue location
              const markerPosition = getMarkerPosition(issue, index, issues.length);
              
              return (
                <button
                  key={issue.id}
                  onClick={() => handleMarkerClick(issue)}
                  className={`absolute w-6 h-6 rounded-full border-2 border-white shadow-lg transition-all duration-300 hover:scale-125 pointer-events-auto ${
                    getStatusColor(issue.status)
                  } ${
                    highlightedIssueId === issue.id 
                      ? 'scale-150 ring-2 ring-white animate-pulse' 
                      : ''
                  }`}
                  style={{
                    left: `${markerPosition.x}%`,
                    top: `${markerPosition.y}%`,
                  }}
                  title={`${issue.title} - ${issue.status.toUpperCase()}\nLocation: ${issue.location}\nClick to navigate to this location`}
                >
                  <span className="sr-only">{issue.title}</span>
                </button>
              );
            })}
          </div>
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
            <Button size="sm" variant="secondary" className="w-8 h-8 p-0">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" className="w-8 h-8 p-0">
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Map Info Panel */}
         
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to calculate marker positions based on issue data
const getMarkerPosition = (issue: any, index: number, totalIssues: number) => {
  // If issue has specific coordinates, use them
  if (issue.latitude && issue.longitude) {
    // Convert coordinates to percentage positions on the map
    // This would need to be calibrated based on your map bounds
    return {
      x: ((issue.longitude + 180) / 360) * 100,
      y: ((90 - issue.latitude) / 180) * 100
    };
  }
  
  // If issue has a location string, try to parse it intelligently
  if (issue.location) {
    const locationStr = issue.location.toLowerCase();
    
    // Parse location strings to position markers appropriately
    if (locationStr.includes('downtown') || locationStr.includes('center') || locationStr.includes('central') || locationStr.includes('main')) {
      return { x: 50, y: 50 }; // Center of map
    } else if (locationStr.includes('north') || locationStr.includes('upper')) {
      return { x: 50, y: 20 }; // Upper area
    } else if (locationStr.includes('south') || locationStr.includes('lower')) {
      return { x: 50, y: 80 }; // Lower area
    } else if (locationStr.includes('east') || locationStr.includes('right')) {
      return { x: 80, y: 50 }; // Right area
    } else if (locationStr.includes('west') || locationStr.includes('left')) {
      return { x: 20, y: 50 }; // Left area
    } else if (locationStr.includes('northeast') || locationStr.includes('ne')) {
      return { x: 75, y: 25 }; // Upper right
    } else if (locationStr.includes('northwest') || locationStr.includes('nw')) {
      return { x: 25, y: 25 }; // Upper left
    } else if (locationStr.includes('southeast') || locationStr.includes('se')) {
      return { x: 75, y: 75 }; // Lower right
    } else if (locationStr.includes('southwest') || locationStr.includes('sw')) {
      return { x: 25, y: 75 }; // Lower left
    }
    
    // For specific street names or landmarks, distribute them more intelligently
    if (locationStr.includes('street') || locationStr.includes('road') || locationStr.includes('avenue') || locationStr.includes('boulevard')) {
      // Distribute along a grid pattern
      const cols = Math.ceil(Math.sqrt(totalIssues));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        x: 20 + (col * 60) / Math.max(cols - 1, 1),
        y: 25 + (row * 50) / Math.max(Math.ceil(totalIssues / cols) - 1, 1)
      };
    }
    
    // For park, plaza, square, etc.
    if (locationStr.includes('park') || locationStr.includes('plaza') || locationStr.includes('square') || locationStr.includes('market')) {
      return { x: 40 + (index % 3) * 20, y: 30 + Math.floor(index / 3) * 20 };
    }
  }
  
  // Fallback: distribute markers evenly across the map
  const cols = Math.ceil(Math.sqrt(totalIssues));
  const row = Math.floor(index / cols);
  const col = index % cols;
  
  return {
    x: 15 + (col * 70) / Math.max(cols - 1, 1),
    y: 20 + (row * 60) / Math.max(Math.ceil(totalIssues / cols) - 1, 1)
  };
};

export default MapView;