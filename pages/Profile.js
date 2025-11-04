import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Settings, MapPin, TrendingUp, TrendingDown, Camera, Loader2, LogOut, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const queryClient = useQueryClient();
  
  // Check if viewing another user's profile
  const viewingUserEmail = location.state?.userEmail;
  const isOwnProfile = !viewingUserEmail || (currentUser && viewingUserEmail === currentUser.email);

  useEffect(() => {
    // Fetch the currently logged-in user once on component mount
    base44.auth.me().then(setCurrentUser).catch(() => {
      // If `me()` fails, it typically means no user is logged in.
      // We'll leave `currentUser` as null and let the loading state handle it.
    });
  }, []);

  // Fetch the profile user (either current user's details or the user being viewed)
  const { data: profileUser, isLoading: isLoadingProfileUser } = useQuery({
    queryKey: ['profileUser', viewingUserEmail],
    queryFn: async () => {
      // If it's the current user's profile OR no specific user is designated,
      // return the authenticated `currentUser`.
      if (isOwnProfile) {
        return currentUser;
      }
      // If viewing another user's profile, fetch their data by email.
      if (viewingUserEmail) {
        const users = await base44.entities.User.filter({ email: viewingUserEmail });
        return users[0] || null;
      }
      return null; // Should not be reached if `enabled` logic is correct
    },
    // This query is enabled only when `currentUser` has been fetched.
    // This allows `isOwnProfile` to be accurately determined before `queryFn` runs.
    enabled: !!currentUser,
    // Provide initial data based on `isOwnProfile` and `currentUser` for smoother transitions.
    initialData: isOwnProfile ? currentUser : null,
  });

  // `displayUser` is the user object whose profile is currently being shown.
  // It prioritizes `profileUser` (which could be the fetched user or `currentUser` from its `queryFn`)
  // and falls back to `currentUser` if `profileUser` is still null but it's *our own* profile.
  const displayUser = profileUser || (isOwnProfile ? currentUser : null);

  const { data: userPosts, isLoading: isLoadingUserPosts } = useQuery({
    queryKey: ['userPosts', displayUser?.email],
    queryFn: () => base44.entities.Post.filter({ created_by: displayUser.email }, '-created_date'),
    enabled: !!displayUser, // Only fetch posts if we have a user to display
    initialData: [],
  });

  const updateProfileImageMutation = useMutation({
    mutationFn: async (imageUrl) => {
      return await base44.auth.updateMe({ profile_image: imageUrl });
    },
    onSuccess: (updatedUser) => {
      // If it's the current user's profile being updated, update the local state.
      if (isOwnProfile) {
        setCurrentUser(updatedUser);
      }
      // Invalidate relevant queries to ensure fresh data across the app.
      queryClient.invalidateQueries({ queryKey: ['user'] }); // General user data (e.g., from global context)
      queryClient.invalidateQueries({ queryKey: ['profileUser', viewingUserEmail] }); // Specific profile being viewed
    }
  });

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateProfileImageMutation.mutateAsync(file_url);
    } catch (error) {
      console.error("Error uploading profile image:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const deletePostMutation = useMutation({
    mutationFn: async (postId) => {
      await base44.entities.Post.delete(postId);
    },
    onSuccess: () => {
      // Invalidate specific user's posts and the general posts list after deletion.
      queryClient.invalidateQueries({ queryKey: ['userPosts', displayUser?.email] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleDeletePost = (postId) => {
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      deletePostMutation.mutate(postId);
    }
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      setCurrentUser(null); // Clear local current user state
      queryClient.clear(); // Clear all cached data from React Query
      navigate(createPageUrl("Login"), { replace: true }); // Redirect to login page and prevent going back
    } catch (error) {
      console.error("Logout failed:", error);
      // If server logout fails, force reload to ensure client-side state is cleared.
      window.location.reload();
    }
  };

  const handleEditProfile = () => {
    navigate(createPageUrl("SetupProfile"));
  };

  // Calculate unique courses from the display user's posts.
  const uniqueCourses = userPosts.reduce((acc, post) => {
    if (post.course_name && !acc.find(c => c.name === post.course_name)) {
      acc.push({
        name: post.course_name,
        location: post.course_location || "",
        image: post.image_url,
        postCount: userPosts.filter(p => p.course_name === post.course_name).length
      });
    }
    return acc;
  }, []);

  // --- Loading States ---
  // Show a loading spinner if the current user (for auth context) is null,
  // OR if we're viewing another user's profile and their data is still loading.
  if (!currentUser || (!!viewingUserEmail && !isOwnProfile && isLoadingProfileUser)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If `currentUser` has loaded (so `isOwnProfile` is correctly determined),
  // but `displayUser` is still null, it implies:
  // 1. For own profile: `currentUser` somehow became null after initial load (unlikely with this setup).
  // 2. For another user's profile: `viewingUserEmail` was provided, but `profileUser` fetch returned null (user not found).
  if (!displayUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white px-6 py-8 border border-gray-200 shadow-md">
        <div className="flex items-start gap-4 mb-6">
          {/* Profile Picture with Upload */}
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex-shrink-0">
              {displayUser.profile_image ? (
                <img src={displayUser.profile_image} alt={displayUser.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                  {displayUser.full_name?.[0]?.toUpperCase() || displayUser.email[0].toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Upload Button Overlay - only show on own profile */}
            {isOwnProfile && (
              <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingImage ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  disabled={isUploadingImage}
                />
              </label>
            )}
          </div>

          {/* Name, Course & Handicap */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {displayUser.full_name || displayUser.email.split('@')[0]}
                </h1>
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <span className="font-medium">{displayUser.home_course || "Add your home course"}</span>
                  <span className="text-lg">{displayUser.country_flag || "🌍"}</span>
                </div>
                {displayUser.location && (
                  <p className="text-xs text-gray-500 mt-1">{displayUser.location}</p>
                )}
                {displayUser.bio && (
                  <p className="text-sm text-gray-600 mt-2">{displayUser.bio}</p>
                )}
              </div>
              
              {/* Handicap Display */}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {displayUser.handicap ? `+${displayUser.handicap}` : "--"}
                </div>
                <div className="text-xs text-gray-500">Handicap</div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile & Logout Buttons - only show on own profile */}
        {isOwnProfile && (
          <div className="flex gap-3 mb-4">
            <Button
              onClick={handleEditProfile}
              variant="outline"
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}

        {/* Follow Button - only show on other users' profiles */}
        {!isOwnProfile && currentUser && displayUser && (
          <FollowButton 
            targetUserEmail={displayUser.email} 
            currentUser={currentUser}
          />
        )}

        {/* Stats Row */}
        <div className="flex justify-around border-t border-gray-200 pt-4">
          <button 
            // Pass the displayUser's email to the target page's state.
            onClick={() => navigate(createPageUrl("Followers"), { state: { userEmail: displayUser.email } })}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-2xl font-bold">{displayUser.followers_count || 0}</p>
            <p className="text-gray-600 font-medium text-sm">Followers</p>
          </button>
          <button 
            // Pass the displayUser's email to the target page's state.
            onClick={() => navigate(createPageUrl("Followers"), { state: { userEmail: displayUser.email } })}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-2xl font-bold">{displayUser.following_count || 0}</p>
            <p className="text-gray-600 font-medium text-sm">Following</p>
          </button>
          <button 
            // Pass the displayUser's email to the target page's state.
            onClick={() => navigate(createPageUrl("MyCourses"), { state: { userEmail: displayUser.email } })}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-2xl font-bold">{uniqueCourses.length || 0}</p>
            <p className="text-gray-600 font-medium text-sm">Courses</p>
          </button>
        </div>
      </div>

      {/* Recent Rounds Section */}
      <div className="px-6 py-6 bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Recent Rounds</h2>
        
        {userPosts.length === 0 && !isLoadingUserPosts ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">⛳</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No rounds yet</h3>
            <p className="text-gray-600">{isOwnProfile ? 'Share your first round' : 'No rounds posted yet'}</p>
          </div>
        ) : isLoadingUserPosts ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            <p className="ml-2 text-gray-500">Loading rounds...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {userPosts.map((post) => {
              // Get all images from the post
              const postImages = post.image_urls && post.image_urls.length > 0 
                ? post.image_urls 
                : (post.image_url ? [post.image_url] : []);
              
              return (
                <div key={post.id} className="bg-white rounded-lg overflow-hidden relative">
                  {/* Delete Button - only show on own posts */}
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletePostMutation.isPending}
                      className="absolute bottom-3 right-3 z-10 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-full p-1.5 shadow-md transition-colors"
                      title="Delete post"
                    >
                      {deletePostMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {/* Round Header */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{post.course_name || "Golf Course"}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(post.created_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">{post.score || "71"}</div>
                    </div>
                  </div>

                  {/* Round Images - Dynamic based on actual post images */}
                  <div className="px-4 pb-4">
                    {postImages.length === 1 ? (
                      // Single image - full width
                      <div className="rounded-lg overflow-hidden bg-gray-100 aspect-[16/9]">
                        <img
                          src={postImages[0]}
                          alt="Round"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : postImages.length === 2 ? (
                      // Two images - side by side
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                          <img
                            src={postImages[0]}
                            alt="Round"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                          <img
                            src={postImages[1]}
                            alt="Round"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : postImages.length > 2 ? (
                      // Multiple images - grid layout (min 3, max 4 shown with counter)
                      <div className="grid grid-cols-3 gap-2">
                        {postImages.slice(0, 3).map((img, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden bg-gray-100 aspect-square">
                            <img
                              src={img}
                              alt={`Round ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {postImages.length > 3 && (
                          <div className="rounded-lg overflow-hidden bg-gray-100 aspect-square relative">
                            <img
                              src={postImages[3]}
                              alt="Round 4"
                              className="w-full h-full object-cover"
                            />
                            {postImages.length > 4 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">+{postImages.length - 4}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : null /* No images to display */ }
                  </div>

                  {/* Round Caption */}
                  <div className="px-4 pb-4">
                    <p className="font-semibold mb-1">{post.caption || "Great round!"}</p>
                    <p className="text-sm text-gray-600">
                      {post.description || "Hit it well, could've putt better..."}
                    </p>
                    {post.tagged_users && post.tagged_users.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        with {post.tagged_users.length} {post.tagged_users.length === 1 ? 'golfer' : 'golfers'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Courses Section - Dynamic */}
      <div className="px-6 py-6 bg-white">
        <h2 className="text-2xl font-bold mb-4">My Courses</h2>
        {uniqueCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">⛳</span>
            </div>
            <p className="text-gray-600">No courses yet. Start posting rounds!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {uniqueCourses.map((course, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-green-200 to-emerald-300 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => navigate(createPageUrl("MyCourses"), { state: { userEmail: displayUser.email } })}
              >
                {course.image ? (
                  <img
                    src={course.image}
                    alt={course.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-green-300 to-emerald-400" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-start justify-end p-4">
                  <h3 className="text-white font-bold text-lg drop-shadow-lg">{course.name}</h3>
                  {course.location && (
                    <p className="text-white/90 text-xs drop-shadow-lg">{course.location}</p>
                  )}
                  <p className="text-white/80 text-xs mt-1">
                    {course.postCount} {course.postCount === 1 ? 'round' : 'rounds'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Follow Button Component
function FollowButton({ targetUserEmail, currentUser }) {
  const queryClient = useQueryClient();
  
  const { data: follows = [], isLoading: isLoadingFollows } = useQuery({
    queryKey: ['follows', currentUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser?.email && !!targetUserEmail, // Only enabled if current user is logged in and target user email is available
    initialData: [],
  });

  const isFollowing = follows.some(f => f.following_email === targetUserEmail);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        // Unfollow
        const followRecord = follows.find(f => f.following_email === targetUserEmail);
        if (followRecord) {
          await base44.entities.Follow.delete(followRecord.id);
          
          // Update current user's following count
          // Note: This relies on `updateMe` properly updating the `currentUser` in backend.
          // The `onSuccess` invalidation will then fetch the updated `currentUser` data.
          await base44.auth.updateMe({ 
            following_count: Math.max(0, (currentUser.following_count || 0) - 1)
          });
        }
      } else {
        // Follow
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: targetUserEmail
        });

        // Update current user's following count
        await base44.auth.updateMe({ 
          following_count: (currentUser.following_count || 0) + 1 
        });

        // Create notification
        await base44.entities.Notification.create({
          recipient_email: targetUserEmail,
          sender_email: currentUser.email,
          type: "follow",
          is_read: false
        });
      }
    },
    onSuccess: () => {
      // Invalidate specific queries to refetch latest follow status, user counts, and notifications
      queryClient.invalidateQueries({ queryKey: ['follows', currentUser?.email] }); // Re-fetch current user's follow list
      queryClient.invalidateQueries({ queryKey: ['notifications', targetUserEmail] }); // Re-fetch target user's notifications
      queryClient.invalidateQueries({ queryKey: ['profileUser', targetUserEmail] }); // Re-fetch target user's profile (to update follower count)
      queryClient.invalidateQueries({ queryKey: ['profileUser', currentUser?.email] }); // Re-fetch current user's profile (to update following count)
      queryClient.invalidateQueries({ queryKey: ['user'] }); // General user data potentially used elsewhere
    },
    onError: (error) => {
        console.error("Follow/Unfollow action failed:", error);
        // Optionally, add user-facing error feedback here
    }
  });

  const buttonDisabled = followMutation.isPending || !currentUser?.email || !targetUserEmail || isLoadingFollows;

  return (
    <div className="mb-4">
      <Button
        onClick={() => followMutation.mutate()}
        disabled={buttonDisabled}
        className={isFollowing ? "w-full bg-gray-200 hover:bg-gray-300 text-gray-800" : "w-full bg-green-600 hover:bg-green-700 text-white"}
      >
        {followMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isFollowing ? 'Unfollowing...' : 'Following...'}
          </>
        ) : isFollowing ? (
          'Following'
        ) : (
          'Follow'
        )}
      </Button>
    </div>
  );
}
