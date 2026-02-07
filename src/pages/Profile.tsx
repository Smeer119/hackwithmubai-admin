import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import IssuesList from "@/components/IssuesList";
import IssueDetailModal from "@/components/IssueDetailModal";

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
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [userIssues, setUserIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState<boolean>(true);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/signin");
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
      setProfile((prev) => ({ ...(prev || {}), avatar_url: publicUrl }));
    } catch (e: any) {
      console.error('Avatar upload error', e);
      alert(e?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        navigate("/signin");
        return;
      }
      const { data } = await supabase.from("profiles").select("email,name,phone,avatar_url,organization_name,role,is_complete").eq("id", uid).maybeSingle();
      setProfile(data || null);
      setLoading(false);

      // Load user issues (reported by this user)
      setLoadingIssues(true);
      const { data: issuesData, error } = await supabase
        .from("issues")
        .select("id, title, description, category, location_text, priority, status, created_at, reporter_name, photos, reporter_id")
        .eq("reporter_id", uid)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load user issues", error);
        setUserIssues([]);
      } else {
        const mapped = (issuesData || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          category: row.category || "Other",
          status: (row.priority || "low") as "urgent" | "high" | "medium" | "low",
          location: row.location_text || "",
          description: row.description || "",
          urgencyScore: row.priority === "urgent" ? 90 : row.priority === "high" ? 75 : row.priority === "medium" ? 50 : 25,
          createdAt: row.created_at,
          reportedBy: row.reporter_name || "You",
          photos: Array.isArray(row.photos) ? row.photos : (row.photos ? [row.photos] : []),
        }));
        setUserIssues(mapped);
      }
      setLoadingIssues(false);
    };
    load();
  }, [navigate]);

  if (loading) return <div className="min-h-screen p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>View your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary" />
              )}
              <div>
                <div className="text-lg font-semibold">{profile?.name || "Unnamed"}</div>
                <div className="text-sm text-muted-foreground">{profile?.email}</div>
                <div className="mt-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                    disabled={uploadingAvatar}
                  />
                  <Button type="button" size="sm" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
                    {uploadingAvatar ? 'Uploading…' : 'Change Avatar'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="font-medium capitalize">{profile?.role || "user"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="font-medium">{profile?.phone || "—"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">Organization</div>
                <div className="font-medium">{profile?.organization_name || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Profile Status</div>
                <div className="font-medium">{profile?.is_complete ? "Complete" : "Incomplete"}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Link to="/profile-complete">
                <Button variant="default">Edit Profile</Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Button variant="destructive" onClick={handleLogout}>Log out</Button>
            </div>
          </CardContent>
        </Card>

        {/* Your Issues */}
        <Card className="max-w-4xl mx-auto bg-gradient-card border-border/50 mt-6">
          <CardHeader>
            <CardTitle>Your Issues</CardTitle>
            <CardDescription>
              {loadingIssues ? "Loading your issues..." : `${userIssues.length} issue${userIssues.length === 1 ? '' : 's'} submitted`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingIssues ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : (
              <IssuesList
                issues={userIssues}
                onIssueClick={(issue: any) => { setSelectedIssue(issue); setIsDetailModalOpen(true); }}
                selectedIssueId={selectedIssue?.id || null}
                onMapHighlight={() => {}}
              />
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={isDetailModalOpen}
          onClose={() => { setIsDetailModalOpen(false); setSelectedIssue(null); }}
          isAdmin={false}
        />
      </div>
    </div>
  );
}
