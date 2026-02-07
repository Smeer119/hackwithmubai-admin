import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, Navigation } from "lucide-react";

// Fix for default marker icon issues in React-Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  // Optional coordinates if available in real data
  lat?: number;
  lng?: number;
}

interface MapViewProps {
  issues: Issue[];
  onIssueSelect?: (issue: Issue) => void;
  highlightedIssueId?: number | null;
  className?: string;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  "gokak": [16.1667, 74.8333],
  "belagavi": [15.8497, 74.4977],
  "belgaum": [15.8497, 74.4977],
  "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946],
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "mumbai": [19.0760, 72.8777],
  "pune": [18.5204, 73.8567],
  "chennai": [13.0827, 80.2707],
  "hyderabad": [17.3850, 78.4867],
  "kolkata": [22.5726, 88.3639],
  "ahmedabad": [23.0225, 72.5714],
  "surat": [21.1702, 72.8311],
  "jaipur": [26.9124, 75.7873],
  "lucknow": [26.8467, 80.9462],
  "kanpur": [26.4499, 80.3319],
  "nagpur": [21.1458, 79.0882],
  "indore": [22.7196, 75.8577],
  "thane": [19.2183, 72.9781],
  "bhopal": [23.2599, 77.4126],
  "visakhapatnam": [17.6868, 83.2185],
  "patna": [25.5941, 85.1376],
  "vadodara": [22.3072, 73.1812],
  "ghaziabad": [28.6692, 77.4538],
  "ludhiana": [30.9010, 75.8573],
  "agra": [27.1767, 78.0081],
  "nashik": [19.9975, 73.7898],
  "ranchi": [23.3441, 85.3096],
  "faridabad": [28.4089, 77.3178],
  "meerut": [28.9845, 77.7064],
  "rajkot": [22.3039, 70.8022],
  "kalyan": [19.2403, 73.1305],
  "dombivli": [19.2184, 73.0867],
  "vasai": [19.3919, 72.8397],
  "virar": [19.47, 72.8],
  "varanasi": [25.3176, 82.9739],
  "srinagar": [34.0837, 74.7973],
  "aurangabad": [19.8762, 75.3433],
  "dhanbad": [23.7957, 86.4304],
  "amritsar": [31.6340, 74.8723],
  "navi mumbai": [19.0330, 73.0297],
  "allahabad": [25.4358, 81.8463],
  "prayagraj": [25.4358, 81.8463],
  "howrah": [22.5958, 88.2636],
  "coimbatore": [11.0168, 76.9558],
  "jabalpur": [23.1815, 79.9864],
  "gwalior": [26.2183, 78.1828],
  "vijayawada": [16.5062, 80.6480],
  "jodhpur": [26.2389, 73.0243],
  "madurai": [9.9252, 78.1198],
  "raipur": [21.2514, 81.6296],
  "kota": [25.2138, 75.8648],
  "guwahati": [26.1445, 91.7362],
  "chandigarh": [30.7333, 76.7794],
  "solapur": [17.6599, 75.9064],
  "hubballi": [15.3647, 75.1240],
  "hubli": [15.3647, 75.1240],
  "dharwad": [15.4589, 75.0078],
  "bareilly": [28.3670, 79.4304],
  "mysore": [12.2958, 76.6394],
  "mysuru": [12.2958, 76.6394],
  "tiruchirappalli": [10.7905, 78.7047],
  "gurgaon": [28.4595, 77.0266],
  "gurugram": [28.4595, 77.0266],
  "noida": [28.5355, 77.3910],
  "jalandhar": [31.3260, 75.5762],
  "udaipur": [24.5854, 73.7125],
  "salem": [11.6643, 78.1460],
  "warangal": [17.9689, 79.5941],
  "trivandrum": [8.5241, 76.9366],
  "thiruvananthapuram": [8.5241, 76.9366],
  "kochi": [9.9312, 76.2673],
  "bhubaneswar": [20.2961, 85.8245],
};

const getCoordinates = (location: string, id: number): [number, number] => {
  if (!location) return [20.5937, 78.9629]; // Default to India center
  
  const normalize = (s: string) => s.toLowerCase().trim();
  const parts = location.split(',').map(normalize);
  
  // 1. Try exact matches on parts
  for (const part of parts) {
    if (CITY_COORDINATES[part]) {
        // Add a small random jitter so markers in same city don't perfectly overlap
        // Use id to make jitter deterministic
        const jitter = (id % 100) * 0.0005 - 0.00025;
        const [lat, lng] = CITY_COORDINATES[part];
        return [lat + jitter, lng + jitter];
    }
  }

  // 2. Try partial matches
  for (const part of parts) {
      const city = Object.keys(CITY_COORDINATES).find(c => part.includes(c));
      if (city && CITY_COORDINATES[city]) {
          const jitter = (id % 100) * 0.0005 - 0.00025;
          const [lat, lng] = CITY_COORDINATES[city];
          return [lat + jitter, lng + jitter];
      }
  }

  // 3. Fallback: Hash-based deterministic coordinates around India center or previous known location
  // This is better than Singapore
  const hash = id * 123456789;
  const latOffset = ((hash % 1000) / 500 - 1) * 5; // +/- 5 degrees
  const lngOffset = (((hash / 1000) % 1000) / 500 - 1) * 5;
  
  return [20.5937 + latOffset, 78.9629 + lngOffset];
};

// Component to handle map movement when highlighted issue changes
const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

const MapView = ({ 
  issues = [], 
  onIssueSelect, 
  highlightedIssueId,
  className = "" 
}: MapViewProps) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);

  // augment issues with coordinates
  const mappedIssues = useMemo(() => {
    return issues.map((issue) => {
        const [lat, lng] = getCoordinates(issue.location, issue.id);
        return { ...issue, lat, lng };
    });
  }, [issues]);

  // Update map center when an issue is highlighted
  useEffect(() => {
    if (highlightedIssueId) {
      const issue = mappedIssues.find(i => i.id === highlightedIssueId);
      if (issue) {
        setMapCenter([issue.lat, issue.lng]);
        setMapZoom(13); // Zoom in closer for specific issue
      }
    } else if (mappedIssues.length > 0) {
        // If no specific highlight, maybe center on the first issue?
        // Or if we have a filter, center on the first one
        setMapCenter([mappedIssues[0].lat, mappedIssues[0].lng]);
        setMapZoom(10);
    } else {
        // If no issues, reset to India center
        setMapCenter([20.5937, 78.9629]);
        setMapZoom(5);
    }
  }, [highlightedIssueId, mappedIssues]);

  // Create custom icons for markers
  const createCustomIcon = (issue: any, isHighlighted: boolean) => {
    const colorClass = 
        issue.status === 'urgent' ? 'bg-red-500' :
        issue.status === 'high' ? 'bg-orange-500' :
        issue.status === 'medium' ? 'bg-yellow-500' :
        'bg-green-500';
    
    const size = isHighlighted ? 'w-12 h-12 text-lg ring-4 ring-white' : 'w-10 h-10 text-sm border-2 border-white';
    
    return L.divIcon({
      className: 'custom-icon-marker',
      html: `<div class="${colorClass} ${size} rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-all duration-300 transform hover:scale-110">
              ${issue.title.charAt(0)}
             </div>`,
      iconSize: isHighlighted ? [48, 48] : [40, 40],
      iconAnchor: isHighlighted ? [24, 24] : [20, 20],
      popupAnchor: [0, -20]
    });
  };

  // Route coordinates for polylines
  const routePositions = mappedIssues.map(issue => [issue.lat, issue.lng] as [number, number]);

  return (
    <div className={`h-full relative z-0 ${className}`}>
        {/* Map Header Overlay */}
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-sm dark:bg-gray-900/90 rounded-xl shadow-lg p-4 border border-border/50">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="font-bold text-foreground">Live Monitor</h3>
                    <p className="text-xs text-muted-foreground">Real-time issue tracking</p>
                </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <Navigation className="w-3 h-3" />
                <span>{issues.length} Active Reports</span>
            </div>
        </div>

        <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            scrollWheelZoom={true} 
            className="h-full w-full outline-none"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Connecting Lines (Routes) */}
            <Polyline 
                positions={routePositions}
                pathOptions={{ 
                    color: '#06b6d4', 
                    weight: 4, 
                    opacity: 0.6, 
                    dashArray: '10, 10', 
                    lineCap: 'round' 
                }} 
            />
            <Polyline 
                positions={routePositions}
                pathOptions={{ 
                    color: '#3b82f6', 
                    weight: 2, 
                    opacity: 0.8,
                    lineCap: 'round'
                }} 
            />

            {/* Markers */}
            {mappedIssues.map((issue) => (
                <Marker
                    key={issue.id}
                    position={[issue.lat, issue.lng]}
                    icon={createCustomIcon(issue, highlightedIssueId === issue.id)}
                    eventHandlers={{
                        click: () => onIssueSelect?.(issue as Issue),
                    }}
                >
                    <Popup className="custom-popup">
                        <div className="p-2 min-w-[200px]">
                            <h3 className="font-bold text-base mb-1">{issue.title}</h3>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500">{issue.category}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                                    issue.status === 'urgent' ? 'bg-red-500' :
                                    issue.status === 'high' ? 'bg-orange-500' :
                                    issue.status === 'medium' ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}>
                                    {issue.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{issue.description}</p>
                            <p className="text-xs text-gray-400">{issue.location}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>

        {/* Floating Legend */}
        <div className="absolute bottom-6 right-6 z-[400] bg-white/90 backdrop-blur-sm dark:bg-gray-900/90 rounded-xl shadow-lg p-4 border border-border/50 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority Level</h4>
            <div className="space-y-2">
                {[
                    { label: 'Urgent', color: 'bg-red-500' },
                    { label: 'High', color: 'bg-orange-500' },
                    { label: 'Medium', color: 'bg-yellow-500' },
                    { label: 'Low', color: 'bg-green-500' }
                ].map((item) => (
                    <div key={item.label} className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm`} />
                        <span className="text-xs font-medium">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default MapView;