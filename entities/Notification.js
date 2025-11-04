{
  "name": "Notification",
  "type": "object",
  "properties": {
    "recipient_email": {
      "type": "string",
      "description": "Email of the user receiving the notification"
    },
    "sender_email": {
      "type": "string",
      "description": "Email of the user who triggered the notification"
    },
    "type": {
      "type": "string",
      "enum": [
        "like",
        "comment",
        "follow",
        "tag"
      ],
      "description": "Type of notification"
    },
    "post_id": {
      "type": "string",
      "description": "Related post ID if applicable"
    },
    "is_read": {
      "type": "boolean",
      "default": false,
      "description": "Whether the notification has been read"
    }
  },
  "required": [
    "recipient_email",
    "sender_email",
    "type"
  ]
}