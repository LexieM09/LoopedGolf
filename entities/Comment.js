{
  "name": "Comment",
  "type": "object",
  "properties": {
    "post_id": {
      "type": "string",
      "description": "ID of the post being commented on"
    },
    "comment_text": {
      "type": "string",
      "description": "The comment text"
    },
    "commenter_email": {
      "type": "string",
      "description": "Email of the user who commented"
    }
  },
  "required": [
    "post_id",
    "comment_text",
    "commenter_email"
  ]
}