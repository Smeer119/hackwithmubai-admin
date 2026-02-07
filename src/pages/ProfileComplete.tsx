import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileComplete() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [organizationName, setOrganizationName] = useState("");
  const [locationText, setLocationText] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Avatar file select handler (no immediate upload)
  const onAvatarFileSelected = async (file?: File) => {
    if (!file) return;
    setAvatarFile(file);
    try {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        navigate("/signin");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (profile) {
        setRole((profile.role as any) === "admin" ? "admin" : "user");
        setName(profile.name || "");
        setPhone(profile.phone || "");
        setAvatarUrl(profile.avatar_url || "");
        setOrganizationName(profile.organization_name || "");
        setLocationText(profile.location_text || "");
        setLat(profile.latitude?.toString?.() || "");
        setLng(profile.longitude?.toString?.() || "");
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      return;
    }
    let finalAvatarUrl: string | null = avatarUrl || null;
    // If user picked a new avatar file, upload it now
    if (avatarFile) {
      try {
        setUploadingAvatar(true);
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${userId}/avatar-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('profile_photos')
          .upload(path, avatarFile, { upsert: false, contentType: avatarFile.type || 'image/jpeg' });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('profile_photos').getPublicUrl(path);
        if (!pub?.publicUrl) throw new Error('Failed to get public URL for avatar');
        finalAvatarUrl = pub.publicUrl;
      } catch (err: any) {
        alert(err?.message || 'Failed to upload avatar');
        console.error('Avatar upload during save (complete) error', err);
        setSaving(false);
        setUploadingAvatar(false);
        return;
      } finally {
        setUploadingAvatar(false);
      }
    }
    const updates: any = {
      name: name || null,
      phone: phone || null,
      avatar_url: finalAvatarUrl,
      role, // expects enum or text with values 'user' or 'admin'
      organization_name: role === "admin" ? organizationName || null : null,
      location_text: locationText || null,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      is_complete: true,
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
    setSaving(false);
    if (error) {
      alert(`Failed to save profile: ${error.message}`);
      return;
    }
    // Update state after successful save
    if (finalAvatarUrl) setAvatarUrl(finalAvatarUrl);
    setAvatarFile(null);
    setAvatarPreview("");
    
    // Invalidate profile query to ensure fresh data on the Profile page
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    
    navigate("/profile");
  };

  const autofillLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude.toString());
        setLng(longitude.toString());
        // Best-effort reverse geocoding could be added via external API; for now, just set coords
        setLocationText(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
      },
      (err) => {
        alert(`Failed to get location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>Provide required details to proceed</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="border rounded p-2 w-full bg-black text-white appearance-none"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +9190..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar</Label>
              <div className="flex items-center gap-2">
                <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => onAvatarFileSelected(e.target.files?.[0])}
                  disabled={saving || uploadingAvatar}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {uploadingAvatar ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
              {(avatarPreview || avatarUrl) && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarPreview || avatarUrl} alt="avatar-preview" className="h-16 w-16 rounded-full object-cover border" />
                </div>
              )}
            </div>

            {role === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="org">Organization Name</Label>
                <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Your organization" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="location_text">Location</Label>
              <Input id="location_text" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="City, Area or Address" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
                <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
              <Button type="button" variant="outline" onClick={autofillLocation}>Autofill Location</Button>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save and continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
