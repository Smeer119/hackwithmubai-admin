import { Button } from "@/components/ui/button";
import { Home, BarChart3, FileText, TrendingUp, AlertTriangle, LogIn, UserPlus, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
    { icon: TrendingUp, label: "Analytics", path: "/analytics" },
  ];

  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthed(!!data.session);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-[#0a192f] to-[#112240] backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight">CityPulse</h1>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">Real-time Civic Dashboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`flex items-center space-x-2 transition-all duration-300 ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                  asChild
                >
                  <Link to={item.path}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
            
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-border">
              {!isAuthed ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 transition-all duration-300 hover:bg-secondary"
                    asChild
                  >
                    <Link to="/signin">
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Link>
                  </Button>
                  
                  <Button
                    size="sm"
                    className="flex items-center space-x-2 bg-gradient-hero hover:shadow-glow transition-all duration-300"
                    asChild
                  >
                    <Link to="/signup">
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Sign Up</span>
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  asChild
                >
                  <Link to="/profile">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Account</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;