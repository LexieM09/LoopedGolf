{
  "name": "GolfCourse",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the golf course"
    },
    "location": {
      "type": "string",
      "description": "Full address or city"
    },
    "latitude": {
      "type": "number",
      "description": "Latitude coordinate"
    },
    "longitude": {
      "type": "number",
      "description": "Longitude coordinate"
    },
    "rating": {
      "type": "number",
      "description": "Course rating (1-5)"
    },
    "holes": {
      "type": "number",
      "description": "Number of holes (9 or 18)"
    },
    "par": {
      "type": "number",
      "description": "Course par"
    },
    "image_url": {
      "type": "string",
      "description": "Course image"
    },
    "description": {
      "type": "string",
      "description": "Course description"
    }
  },
  "required": [
    "name",
    "location"
  ]
}