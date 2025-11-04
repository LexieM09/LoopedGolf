import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Followers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("followers");

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 50),
    initialData: [],
  });

  // Mock followers data - in a real app, this would come from a follow relationship entity
  const mockFollowers = users.slice(0, 8);
  const mockFollowing = users.slice(2, 10);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Profile"))}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Connections</h1>
        </div>

        {/* Tabs with TabsList and TabsContent inside */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          {/* Followers Tab */}
          <TabsContent value="followers" className="mt-0">
            <div className="bg-white">
              {mockFollowers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-4xl">👥</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">No followers yet</h3>
                  <p className="text-gray-600">Share great rounds to gain followers!</p>
                </div>
              ) : (
                <div>
                  {mockFollowers.map((user) => (
                    <div
                      key={user.id}
                      className="px-6 py-4 border-b border-gray-200 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex-shrink-0">
                        {user.profile_image ? (
                          <img src={user.profile_image} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                            {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{user.full_name || user.email.split('@')[0]}</h3>
                        <p className="text-sm text-gray-500">{user.home_course || user.location || user.email}</p>
                        {user.handicap && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">
                            Handicap: +{user.handicap}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="border-gray-300">
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="mt-0">
            <div className="bg-white">
              {mockFollowing.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-4xl">👥</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Not following anyone</h3>
                  <p className="text-gray-600">Find golfers to follow!</p>
                </div>
              ) : (
                <div>
                  {mockFollowing.map((user) => (
                    <div
                      key={user.id}
                      className="px-6 py-4 border-b border-gray-200 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex-shrink-0">
                        {user.profile_image ? (
                          <img src={user.profile_image} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                            {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{user.full_name || user.email.split('@')[0]}</h3>
                        <p className="text-sm text-gray-500">{user.home_course || user.location || user.email}</p>
                        {user.handicap && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">
                            Handicap: +{user.handicap}
                          </p>
                        )}
                      </div>
                      <Button size="sm" className="bg-gray-200 hover:bg-gray-300 text-gray-800">
                        Following
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}