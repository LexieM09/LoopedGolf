import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MyCourses() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: userPosts, isLoading } = useQuery({
    queryKey: ['userPosts', currentUser?.email],
    queryFn: () => base44.entities.Post.filter({ created_by: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
    initialData: [],
  });

  // Get unique courses from posts
  const uniqueCourses = userPosts.reduce((acc, post) => {
    if (post.course_name && !acc.find(c => c.name === post.course_name)) {
      acc.push({
        name: post.course_name,
        location: post.course_location || "",
        postCount: userPosts.filter(p => p.course_name === post.course_name).length,
        lastPlayed: post.created_date,
        image: post.image_url
      });
    }
    return acc;
  }, []);

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
          <h1 className="text-xl font-bold">My Courses</h1>
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading courses...</p>
          </div>
        ) : uniqueCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">⛳</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No courses yet</h3>
            <p className="text-gray-600">Start posting rounds to track your courses!</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {uniqueCourses.map((course, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Course Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200 flex-shrink-0">
                    {course.image ? (
                      <img
                        src={course.image}
                        alt={course.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">⛳</span>
                      </div>
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{course.name}</h3>
                    {course.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <MapPin className="w-3 h-3" />
                        <span>{course.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{course.postCount} {course.postCount === 1 ? 'round' : 'rounds'}</span>
                      <span>•</span>
                      <span>Last played {new Date(course.lastPlayed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}