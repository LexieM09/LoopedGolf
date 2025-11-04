import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import L from "leaflet";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export default function MapScreen() {
  const navigate = useNavigate();
  const [center, setCenter] = useState([37.7749, -122.4194]); // Default to SF
  const [userLocation, setUserLocation] = useState(null);

  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 100),
    initialData: [],
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.GolfCourse.list('-created_date', 100),
    initialData: [],
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setCenter([latitude, longitude]);
        },
        () => {}
      );
    }
  }, []);

  const postsWithLocation = posts.filter(p => p.latitude && p.longitude);
  const coursesWithLocation = courses.filter(c => c.latitude && c.longitude);

  return (
    <div className="h-[calc(100vh-4rem)] relative flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        {/* Back Arrow - Top Left */}
        <Button
          onClick={() => navigate(createPageUrl("Feed"))}
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-[1000] bg-white rounded-full shadow-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </Button>

        {/* Location Button - Top Right */}
        <button
          onClick={() => userLocation && setCenter(userLocation)}
          className="absolute top-4 right-4 z-[1000] bg-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Navigation className="w-5 h-5 text-green-600" />
        </button>

        <MapContainer
          center={center}
          zoom={13}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Post Markers */}
          {postsWithLocation.map((post) => (
            <Marker key={post.id} position={[post.latitude, post.longitude]}>
              <Popup>
                <div className="w-48">
                  <img
                    src={post.image_url}
                    alt={post.caption}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                  <p className="font-semibold text-sm mb-1">{post.course_name}</p>
                  <p className="text-xs text-gray-600">{post.caption}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Course Markers */}
          {coursesWithLocation.map((course) => (
            <Marker key={course.id} position={[course.latitude, course.longitude]}>
              <Popup>
                <div className="w-48">
                  {course.image_url && (
                    <img
                      src={course.image_url}
                      alt={course.name}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  <p className="font-semibold text-sm mb-1">{course.name}</p>
                  <p className="text-xs text-gray-600 mb-1">{course.location}</p>
                  {course.holes && (
                    <p className="text-xs text-gray-500">{course.holes} holes • Par {course.par}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom Section */}
      <div className="bg-[#4AA669] p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
          <Input
            type="text"
            placeholder="Search golf courses..."
            className="pl-12 h-12 rounded-full bg-white border-none placeholder:text-gray-500"
          />
        </div>

        {/* Suggested Courses */}
        <div>
          <h3 className="font-semibold text-sm mb-3 text-white">Suggested Courses</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {coursesWithLocation.slice(0, 10).map((course) => (
              <div
                key={course.id}
                className="flex-shrink-0 w-32 cursor-pointer"
                onClick={() => setCenter([course.latitude, course.longitude])}
              >
                <div className="w-32 h-32 bg-gray-200 rounded-xl overflow-hidden mb-2">
                  {course.image_url ? (
                    <img
                      src={course.image_url}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-200">
                      <span className="text-4xl">⛳</span>
                    </div>
                  )}
                </div>
                <p className="font-medium text-xs truncate text-white">{course.name}</p>
                <p className="text-xs text-white/80 truncate">{course.location}</p>
              </div>
            ))}
            {coursesWithLocation.length === 0 && (
              <div className="flex-shrink-0 w-32">
                <div className="w-32 h-32 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                  <span className="text-4xl">⛳</span>
                </div>
                <p className="font-medium text-xs text-white/80">No courses yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}