import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Trophy, Camera, Loader2, Flag, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SetupProfile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    home_course: "",
    location: "",
    country_flag: "🇨🇦",
    handicap: "",
    bio: "",
    profile_image: ""
  });

  useEffect(() => {
    base44.auth.me().then((user) => {
      setCurrentUser(user);
      // Pre-fill with existing data if any
      setProfileData({
        full_name: user.full_name || "",
        home_course: user.home_course || "",
        location: user.location || "",
        country_flag: user.country_flag || "🇨🇦",
        handicap: user.handicap || "",
        bio: user.bio || "",
        profile_image: user.profile_image || ""
      });
    }).catch(() => {});
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData({ ...profileData, profile_image: file_url });
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setIsUploading(false);
  };

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      return await base44.auth.updateMe({
        full_name: profileData.full_name,
        home_course: profileData.home_course,
        location: profileData.location,
        country_flag: profileData.country_flag,
        handicap: profileData.handicap ? parseFloat(profileData.handicap) : null,
        bio: profileData.bio,
        profile_image: profileData.profile_image,
        first_time_user: false
      });
    },
    onSuccess: () => {
      navigate(createPageUrl("Feed"));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!profileData.full_name || !profileData.home_course) {
      alert("Please fill in at least your name and home course");
      return;
    }
    saveProfileMutation.mutate();
  };

  const countryFlags = [
    { flag: "🇨🇦", name: "Canada" },
    { flag: "🇺🇸", name: "USA" },
    { flag: "🇬🇧", name: "UK" },
    { flag: "🇦🇺", name: "Australia" },
    { flag: "🇮🇪", name: "Ireland" },
    { flag: "🇯🇵", name: "Japan" },
    { flag: "🇰🇷", name: "South Korea" },
    { flag: "🇿🇦", name: "South Africa" },
    { flag: "🇳🇿", name: "New Zealand" },
    { flag: "🇸🇪", name: "Sweden" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="relative">
          {/* Back Button */}
          {currentUser && !currentUser.first_time_user && (
            <Button
              onClick={() => navigate(createPageUrl("Profile"))}
              variant="ghost"
              size="icon"
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          )}
          
          <div className="text-center pt-8">
            <CardTitle className="text-3xl font-bold text-green-700">
              {currentUser?.first_time_user ? "Welcome to Looped!" : "Edit Profile"}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {currentUser?.first_time_user ? "Let's set up your golf profile" : "Update your golf profile"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <Label className="mb-3 text-center">Profile Picture</Label>
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex-shrink-0">
                  {profileData.profile_image ? (
                    <img src={profileData.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                      {profileData.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white" />
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                Full Name *
              </Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Tiger Woods"
                className="mt-2"
                required
              />
            </div>

            {/* Home Course */}
            <div>
              <Label htmlFor="home_course" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Home Course *
              </Label>
              <Input
                id="home_course"
                value={profileData.home_course}
                onChange={(e) => setProfileData({ ...profileData, home_course: e.target.value })}
                placeholder="Pebble Beach Golf Links"
                className="mt-2"
                required
              />
            </div>

            {/* Location and Country Flag */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profileData.location}
                  onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                  placeholder="California"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="country_flag" className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-green-600" />
                  Country
                </Label>
                <select
                  id="country_flag"
                  value={profileData.country_flag}
                  onChange={(e) => setProfileData({ ...profileData, country_flag: e.target.value })}
                  className="mt-2 w-full h-10 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {countryFlags.map((country) => (
                    <option key={country.flag} value={country.flag}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Handicap */}
            <div>
              <Label htmlFor="handicap" className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-600" />
                Handicap
              </Label>
              <Input
                id="handicap"
                type="number"
                step="0.1"
                value={profileData.handicap}
                onChange={(e) => setProfileData({ ...profileData, handicap: e.target.value })}
                placeholder="2.5"
                className="mt-2"
              />
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Golf enthusiast, love playing on weekends..."
                className="mt-2"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={saveProfileMutation.isPending || !profileData.full_name || !profileData.home_course}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12"
            >
              {saveProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
