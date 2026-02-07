import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from "recharts";
import { 
  TrendingUp, Calendar, Download, AlertTriangle, 
  Users, Clock, MapPin, Activity, ShieldCheck, Zap, MoreHorizontal, MessageSquare
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";

const Analytics = () => {
  const [mounted, setMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('week');
  const [liveIssues, setLiveIssues] = useState<any[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchLiveIssues = async () => {
    setLoadingLive(true);
    const { data, error } = await supabase
      .from("issues")
      .select("id, title, location_text, created_at, category")
      .order("created_at", { ascending: false })
      .limit(4);
    
    if (!error && data) {
      setLiveIssues(data);
    }
    setLoadingLive(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchLiveIssues();

    const channel = supabase
      .channel('analytics:issues')
      .on(
        'postgres_changes',
        { event: '*', table: 'issues', schema: 'public' },
        () => {
          fetchLiveIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Timeframe-specific data
  const dataMap = {
    week: {
      line: [
        { name: "Mon", issues: 45, resolved: 32 },
        { name: "Tue", issues: 52, resolved: 45 },
        { name: "Wed", issues: 48, resolved: 50 },
        { name: "Thu", issues: 70, resolved: 55 },
        { name: "Fri", issues: 61, resolved: 58 },
        { name: "Sat", issues: 38, resolved: 35 },
        { name: "Sun", issues: 42, resolved: 40 },
      ],
      bar: [
        { name: "Gokak", count: 85 },
        { name: "Bengaluru", count: 120 },
        { name: "Delhi", count: 95 },
        { name: "Mumbai", count: 110 },
        { name: "Pune", count: 70 },
      ],
      metrics: [
        { title: "Resolution Rate", value: "92.4%", change: "+5.2%", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Avg. TAT", value: "3.2 Days", change: "-12%", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
        { title: "Active Reports", value: "1,280", change: "+18%", icon: Activity, color: "text-cyan-600", bg: "bg-cyan-50" },
        { title: "Success Score", value: "4.8/5", change: "+0.3", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
      ]
    },
    month: {
      line: [
        { name: "Week 1", issues: 210, resolved: 180 },
        { name: "Week 2", issues: 245, resolved: 210 },
        { name: "Week 3", issues: 190, resolved: 205 },
        { name: "Week 4", issues: 310, resolved: 275 },
      ],
      bar: [
        { name: "Gokak", count: 320 },
        { name: "Bengaluru", count: 450 },
        { name: "Delhi", count: 380 },
        { name: "Mumbai", count: 410 },
        { name: "Pune", count: 290 },
      ],
      metrics: [
        { title: "Resolution Rate", value: "88.1%", change: "+2.1%", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Avg. TAT", value: "4.1 Days", change: "-5%", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
        { title: "Active Reports", value: "5,420", change: "+24%", icon: Activity, color: "text-cyan-600", bg: "bg-cyan-50" },
        { title: "Success Score", value: "4.6/5", change: "+0.1", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
      ]
    },
    year: {
      line: [
        { name: "Q1", issues: 950, resolved: 880 },
        { name: "Q2", issues: 1200, resolved: 1100 },
        { name: "Q3", issues: 1100, resolved: 1050 },
        { name: "Q4", issues: 1540, resolved: 1420 },
      ],
      bar: [
        { name: "Gokak", count: 2100 },
        { name: "Bengaluru", count: 4500 },
        { name: "Delhi", count: 3800 },
        { name: "Mumbai", count: 4200 },
        { name: "Pune", count: 2800 },
      ],
      metrics: [
        { title: "Resolution Rate", value: "85.4%", change: "-1.2%", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Avg. TAT", value: "5.5 Days", change: "+8%", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
        { title: "Active Reports", value: "62.4k", change: "+42%", icon: Activity, color: "text-cyan-600", bg: "bg-cyan-50" },
        { title: "Success Score", value: "4.5/5", change: "-0.2", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
      ]
    }
  };

  const currentData = dataMap[timeframe];

  const pieData = [
    { name: "Infrastructure", value: 35, color: "#2563eb" },
    { name: "Utilities", value: 25, color: "#0891b2" },
    { name: "Safety", value: 20, color: "#ea580c" },
    { name: "Other", value: 20, color: "#16a34a" },
  ];

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f8fafc"
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`CityPulse_Intelligence_Report_${timeframe}.pdf`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <Navigation />
      
      <div ref={reportRef} className="max-w-[1600px] mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">Intelligence Hub</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Predictive modeling and real-time civic data analysis</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex shadow-sm">
              <button 
                onClick={() => setTimeframe('week')}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${timeframe === 'week' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setTimeframe('month')}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${timeframe === 'month' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setTimeframe('year')}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${timeframe === 'year' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Year
              </button>
            </div>
            <Button 
                onClick={handleExportPDF}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs h-11 px-6 shadow-xl transition-all active:scale-95"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {currentData.metrics.map((metric, i) => (
            <Card key={i} className="bg-white border-none p-7 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-5 text-slate-900">
                <div className={`${metric.bg} p-4 rounded-3xl`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black ${metric.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'} bg-slate-50 border border-slate-100 px-2 py-1 rounded-full`}>
                    {metric.change}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">{metric.title}</p>
              <h3 className="text-4xl font-black text-slate-900 tabular-nums">{metric.value}</h3>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full blur-2xl group-hover:bg-blue-50 transition-all"></div>
            </Card>
          ))}
        </div>

        {/* Main Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Large Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Main Trend Chart */}
            <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm shadow-slate-200 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 space-y-4 sm:space-y-0 text-slate-900">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-1">Impact Volatility</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Live Performance Index</p>
                </div>
                <div className="flex space-x-8">
                  <div className="flex items-center space-x-3 text-slate-900">
                    <div className="w-4 h-4 rounded-full bg-blue-600 shadow-lg shadow-blue-200"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reports</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-900">
                    <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-lg shadow-cyan-200"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resolved</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[450px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.line}>
                    <defs>
                      <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 900 }} 
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 900 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#ffffff", border: "none", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", padding: "20px" }}
                      itemStyle={{ fontWeight: 900, fontSize: "14px" }}
                    />
                    <Area type="monotone" dataKey="issues" stroke="#2563eb" strokeWidth={5} fillOpacity={1} fill="url(#colorIssues)" />
                    <Area type="monotone" dataKey="resolved" stroke="#0891b2" strokeWidth={5} fillOpacity={1} fill="url(#colorResolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Bottom Two Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-900">
              <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-400">Sector Analysis</h3>
                  <MoreHorizontal className="text-slate-300" />
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={10}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={5} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#ffffff", border: "none", borderRadius: "20px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-6">
                  {pieData.map((item, i) => (
                    <div key={i} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-400">City Hotspots</h3>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentData.bar}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 900 }} 
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{ backgroundColor: "#ffffff", border: "none", borderRadius: "20px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 12, 12]} barSize={25}>
                        {currentData.bar.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2563eb' : '#0891b2'} className="transition-all hover:opacity-80" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 flex justify-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reports per District</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 space-y-8 text-slate-900">
            <Card className="bg-gradient-to-br from-blue-700 to-blue-900 border-none p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-all duration-1000"></div>
              <Activity className="w-12 h-12 mb-8 text-blue-200" />
              <h3 className="text-3xl font-black mb-3">Citizen Voice</h3>
              <p className="text-blue-100 text-sm font-bold mb-10 leading-relaxed opacity-80">
                AI sentiment analysis reveals an 94% positivity increase in urban infrastructure feedback.
              </p>
              <div className="space-y-6">
                {[
                  { label: "Stability", value: 92, color: "bg-emerald-400" },
                  { label: "Community", value: 78, color: "bg-blue-400" },
                  { label: "Urgency", value: 34, color: "bg-orange-400" },
                ].map((item, i) => (
                  <div key={i} className="bg-white/10 rounded-[2rem] p-5 backdrop-blur-md border border-white/5">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.25em] mb-3">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full rounded-full transition-all duration-1000`} style={{ width: mounted ? `${item.value}%` : '0%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-400">Live Activity</h3>
                <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></div>
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Reality</span>
                </div>
              </div>
              <div className="space-y-8 flex-1">
                {loadingLive ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Feed...</p>
                  </div>
                ) : liveIssues.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs font-bold text-slate-400">No recent activity detected.</p>
                  </div>
                ) : (
                  liveIssues.map((item, i) => (
                    <div key={item.id} className="flex items-center space-x-5 group cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-2xl transition-all">
                      <div className={`w-12 h-12 rounded-2xl ${
                        i % 2 === 0 ? 'bg-blue-600' : 'bg-cyan-600'
                      } flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300`}>
                          <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 truncate leading-none mb-1.5">{item.title}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {item.location_text || "Unknown Location"} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
             
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;