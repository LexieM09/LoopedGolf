{
  "name": "Post",
  "type": "object",
  "properties": {
    "image_url": {
      "type": "string",
      "description": "Primary image URL (kept for backward compatibility)"
    },
    "image_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of all image URLs for the post"
    },
    "caption": {
      "type": "string",
      "description": "Post caption with description"
    },
    "description": {
      "type": "string",
      "description": "Additional comment/description about the round"
    },
    "course_name": {
      "type": "string",
      "description": "Name of the golf course"
    },
    "course_location": {
      "type": "string",
      "description": "Location of the golf course"
    },
    "latitude": {
      "type": "number",
      "description": "Latitude coordinate"
    },
    "longitude": {
      "type": "number",
      "description": "Longitude coordinate"
    },
    "likes": {
      "type": "number",
      "default": 0,
      "description": "Number of likes"
    },
    "liked_by": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": [],
      "description": "Array of user emails who liked this post"
    },
    "comments_count": {
      "type": "number",
      "default": 0,
      "description": "Number of comments"
    },
    "hole_number": {
      "type": "number",
      "description": "Hole number if applicable"
    },
    "score": {
      "type": "string",
      "description": "Score on the hole (birdie, par, eagle, etc.)"
    },
    "scorecard": {
      "type": "array",
      "items": {
        "type": "number"
      },
      "description": "Array of 18 hole scores"
    },
    "tagged_users": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": [],
      "description": "Array of tagged user emails"
    }
  },
  "required": []
}