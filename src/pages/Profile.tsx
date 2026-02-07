import { useState, useRef } from "react";

import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { 
  User, Mail, Phone, Building2, ShieldCheck, 
  Camera, LogOut, ArrowLeft, CheckCircle2 
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ProfileData {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  organization_name?: string | null;
  role?: string | null;
  is_complete?: boolean | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");
      
      const { data } = await supabase
        .from("profiles")
        .select("email,name,phone,avatar_url,organization_name,role,is_complete")
        .eq("id", uid)
        .maybeSingle();
      
      return data as ProfileData;
    },
    staleTime: Infinity, // Keep the data fresh indefinitely once loaded
    gcTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      queryClient.clear(); // Clear cache on logout
      navigate("/signin");
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const handleAvatarChange = async (file?: File) => {
    try {
      if (!file) return;
      setUploadingAvatar(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        navigate("/signin");
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${uid}/avatar-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, file, { upsert: false, contentType: file.type || 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
      const publicUrl = pub.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL for avatar');
      
      const { error: updateErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', uid);
      if (updateErr) throw updateErr;
      
      // Update cache manually
      queryClient.setQueryData(["profile"], (old: any) => ({ ...old, avatar_url: publicUrl }));
    } catch (e: any) {
      console.error('Avatar upload error', e);
      alert(e?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Profile Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Navigation />
      
      <div className="max-w-[1000px] mx-auto px-6 py-20">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tight text-slate-900 leading-none mb-3">
              Account <span className="text-blue-600">Profile</span>
            </h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Control Center // v2.0</p>
          </div>
          <Button variant="outline" className="rounded-full px-6 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-xs font-black uppercase tracking-widest transition-all shadow-sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Identity Card */}
          <Card className="lg:col-span-12 bg-white border-none p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="relative group">
              <div className="w-40 h-40 rounded-3xl overflow-hidden bg-slate-100 shadow-xl border-4 border-white">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-slate-300" />
                  </div>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                disabled={uploadingAvatar}
              />
              <button 
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-200 hover:scale-110 transition-transform disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-1.5 rounded-full mb-4">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{profile?.role || "Administrator"}</span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-2">{profile?.name || "Access Denied"}</h2>
              <p className="text-slate-400 font-bold mb-8">{profile?.email}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center space-x-3 text-slate-400 mb-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Contact Contact</span>
                  </div>
                  <p className="font-bold text-slate-800">{profile?.phone || "Disconnected"}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center space-x-3 text-slate-400 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Organization</span>
                  </div>
                  <p className="font-bold text-slate-800">{profile?.organization_name || "Independent Operative"}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Settings & Actions */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-white border-none p-10 rounded-[3rem] shadow-sm">
                <h3 className="text-lg font-black uppercase italic mb-6">Security Settings</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-900 uppercase tracking-tight">Active session</span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Verified</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] py-8 text-xs font-black uppercase tracking-widest" asChild>
                    <Link to="/profile-complete">Edit Profile</Link>
                  </Button>
                  <Button 
                    onClick={handleLogout}
                    variant="outline" 
                    className="flex-1 border-2 border-rose-50 text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-[1.5rem] py-8 text-xs font-black uppercase tracking-widest"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Terminate Session
                  </Button>
                </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-700 to-blue-900 border-none p-10 rounded-[3rem] text-white overflow-hidden relative shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <ShieldCheck className="w-40 h-40 text-white" />
              </div>
              <h3 className="text-lg font-black uppercase italic mb-6">System Access</h3>
              <p className="text-blue-100 text-sm font-medium mb-10 leading-relaxed max-w-[280px]">
                Your account is currently active with full administrative privileges in the CityPulse OS.
              </p>
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Protocol Secured</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
