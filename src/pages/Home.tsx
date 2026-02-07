import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  AlertTriangle, BarChart3, UserPlus, LogIn, 
  MapPin, TrendingUp, ShieldCheck, Zap, LayoutDashboard,
  ArrowRight, Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Home = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Navigation />
      
      <main className="max-w-[1400px] mx-auto px-6 pt-20 pb-20">
        {/* Welcome Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Enterprise Administration Hub</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 uppercase italic">
            CityPulse <span className="text-blue-600">v2.0</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            A next-generation governance platform for real-time civic monitoring, 
            predictive analytics, and emergency response management.
          </p>
        </div>

        {/* Main Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {/* Admin Dashboard Entry */}
          <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform duration-500">
              <LayoutDashboard className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-4 uppercase italic">Admin Panel</h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              Access the main operational dashboard to monitor live issues, track field agents, and manage resources.
            </p>
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] py-8 text-xs font-black uppercase tracking-widest group" asChild>
              <Link to="/dashboard">
                Enter Dashboard
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                <Activity className="w-24 h-24 text-slate-900" />
            </div>
          </Card>

          {/* Intelligence Hub Entry */}
          <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-cyan-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-cyan-200 group-hover:scale-110 transition-transform duration-500">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-4 uppercase italic">Intelligence</h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              Dive into predictive modeling, monthly trends, and citizen sentiment analysis powered by AI.
            </p>
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] py-8 text-xs font-black uppercase tracking-widest group" asChild>
              <Link to="/analytics">
                View Analytics
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                <Zap className="w-24 h-24 text-slate-900" />
            </div>
          </Card>

          {/* Citizen Portal Entry */}
          <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col items-center text-center md:col-span-2 lg:col-span-1">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 border border-blue-100 group-hover:scale-110 transition-transform duration-500">
              <MapPin className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black mb-4 uppercase italic">Public Report</h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              Allow citizens to submit new issues directly from the street. Quick, anonymous, and efficient.
            </p>
            <Button variant="outline" className="w-full border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 rounded-[2rem] py-8 text-xs font-black uppercase tracking-widest transition-all" asChild>
              <Link to="/report">
                Submit Report
              </Link>
            </Button>
          </Card>
        </div>

        {/* Quick Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Active Nodes", value: "1,247", icon: Activity, color: "text-blue-600" },
            { label: "Resolved Nodes", value: "8,902", icon: ShieldCheck, color: "text-emerald-600" },
            { label: "AI Confidence", value: "98.4%", icon: Zap, color: "text-orange-600" },
            { label: "System Uptime", value: "99.9%", icon: BarChart3, color: "text-blue-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
           CITYPULSE OS // BUILT FOR MODERN GOVERNANCE
        </p>
      </footer>
    </div>
  );
};

export default Home;