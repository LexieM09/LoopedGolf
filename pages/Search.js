import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search as SearchIcon, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("golfers");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const queryClient = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.GolfCourse.list('-created_date', 50),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
    initialData: [],
  });

  // Fetch follows for current user
  const { data: follows } = useQuery({
    queryKey: ['follows', currentUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const followMutation = useMutation({
    mutationFn: async (targetEmail) => {
      if (!currentUser || !currentUser.email) {
        throw new Error("Current user not authenticated.");
      }
      const isFollowing = follows.some(f => f.following_email === targetEmail);
      
      if (isFollowing) {
        // Unfollow
        const followRecord = follows.find(f => f.following_email === targetEmail && f.follower_email === currentUser.email);
        if (followRecord) {
          await base44.entities.Follow.delete(followRecord.id);
          
          // Update current user's following count
          await base44.auth.updateMe({ 
            following_count: Math.max(0, (currentUser.following_count || 0) - 1)
          });
        }
      } else {
        // Follow
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: targetEmail
        });

        // Update current user's following count
        await base44.auth.updateMe({ 
          following_count: (currentUser.following_count || 0) + 1 
        });

        // Create notification
        await base44.entities.Notification.create({
          recipient_email: targetEmail,
          sender_email: currentUser.email,
          type: "follow",
          is_read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profileUser'] }); // Added line
      // Refresh current user to get updated counts
      base44.auth.me().then(setCurrentUser);
    }
  });

  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) && user.email !== currentUser?.email
  );

  // Show all users except current user when no search query
  const suggestedAccounts = searchQuery ? [] : users.filter(u => u.email !== currentUser?.email);

  const isFollowing = (userEmail) => {
    return follows.some(f => f.following_email === userEmail && f.follower_email === currentUser?.email);
  };

  const handleFollowClick = (userEmail) => {
    if (!currentUser) {
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }
    followMutation.mutate(userEmail);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Search Bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search courses, golfers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="golfers">Golfers</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
        </TabsList>

        {/* Golfers Tab */}
        <TabsContent value="golfers">
          <div className="space-y-3">
            {searchQuery ? (
              // Show filtered results when searching
              filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No golfers found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    isFollowing={isFollowing(user.email)}
                    onFollowClick={() => handleFollowClick(user.email)}
                    isPending={followMutation.isPending}
                  />
                ))
              )
            ) : (
              // Show all users as suggestions when not searching
              <>
                {suggestedAccounts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No suggested accounts to follow.
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Suggested Accounts</h3>
                    <div className="space-y-3">
                      {suggestedAccounts.map((user) => (
                        <UserCard 
                          key={user.id} 
                          user={user} 
                          isFollowing={isFollowing(user.email)}
                          onFollowClick={() => handleFollowClick(user.email)}
                          isPending={followMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <div className="space-y-3">
            {filteredCourses.map((course) => (
              <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center text-white text-2xl">
                  ⛳
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{course.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    {course.location}
                  </div>
                  {course.holes && (
                    <p className="text-xs text-gray-500 mt-1">
                      {course.holes} holes • Par {course.par}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredCourses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No courses found
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to create page URLs based on page name
const createPageUrl = (pageName) => {
  switch (pageName) {
    case "Profile":
      return "/profile"; // Assuming a /profile route for user profiles that uses state for user details
    // Add other cases as needed for other page names
    default:
      return "/";
  }
};

function UserCard({ user, isFollowing, onFollowClick, isPending }) {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <button
        onClick={() => navigate(createPageUrl("Profile"), { state: { userEmail: user.email } })}
        className="hover:opacity-80 transition-opacity"
      >
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex-shrink-0">
          {user.profile_image ? (
            <img src={user.profile_image} alt={user.full_name || "User"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-semibold text-xl">
              {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
          )}
        </div>
      </button>
      <div className="flex-1">
        <h3 className="font-semibold">{user.full_name || user.email.split('@')[0]}</h3>
        <p className="text-sm text-gray-600">{user.bio || user.home_course || user.location || ""}</p>
        {user.handicap && (
          <p className="text-xs text-green-600 font-medium mt-1">
            Handicap: {user.handicap}
          </p>
        )}
      </div>
      <Button 
        size="sm" 
        onClick={onFollowClick}
        disabled={isPending}
        className={isFollowing ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-[#4AA669] hover:bg-[#3d8f57] text-white"}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFollowing ? (
          "Following"
        ) : (
          "Follow"
        )}
      </Button>
    </div>
  );
}
