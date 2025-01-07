# ChatGenius

## Project Overview
ChatGenius is an AI-augmented workplace communication tool that combines the familiarity of chat apps like Slack with generative AI to enhance collaboration. The app enables real-time messaging, channel-based organization, and AI-driven user representation through customizable avatars.

## User Roles & Core Workflows
- **Standard User**: Send/receive messages in real-time, organize discussions into channels/DMs, and share files.
- **Admin User**: Manage users, create/delete channels, and monitor message activity.
- **AI Avatar**: Respond on behalf of users in conversations using context-aware, user-specific language.

## Technology Stack
- **Frontend**: React, React Router, Tailwind CSS (for styling)
- **Backend**: Node.js with Express, Socket.IO (for real-time messaging)
- **Database**: MongoDB (for storing users, messages, channels)
- **Hosting**: AWS (for deployment), S3 (for file storage)

## Data Models
- **User**: `{ id, name, email, avatarUrl, role, lastSeen }`
- **Channel**: `{ id, name, type, participants[] }`
- **Message**: `{ id, channelId, senderId, content, timestamp, fileUrl }`

## API Endpoints
- **POST /auth/login**: Authenticate users and return a session token.
- **GET /channels**: Retrieve all channels the user has access to.
- **POST /messages**: Send a message to a specific channel or DM.
- **GET /messages/:channelId**: Fetch messages for a channel.

## Key Components
- **Authentication System**: Secure login with JWT-based sessions.
- **Real-Time Messaging**: Socket.IO integration for live updates.
- **Channel & User Management**: API-based CRUD operations.
- **File Sharing**: AWS S3-backed upload/download system.

## Installation Instructions
1. Clone the repository: `git clone https://github.com/apoorvaonline/chatgenius.git`
2. Navigate to the project directory: `cd chatgenius`
3. Install dependencies:
   - For the frontend: `cd client && npm install`
   - For the backend: `cd server && npm install`
4. Set up environment variables as needed.
5. Start the application:
   - For the frontend: `npm start`
   - For the backend: `npm run start`

## Usage
Once the application is running, you can access it via your web browser at `http://localhost:3000`. Create an account or log in to start using ChatGenius.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
No license needed.

## Contact
For questions or feedback, please reach out to francoverma@gmai..com.
