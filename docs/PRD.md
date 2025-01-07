**Product Requirements Document for ChatGenius**

**Project Overview**

ChatGenius is an AI-augmented workplace communication tool that combines the familiarity of chat apps like Slack with generative AI to enhance collaboration. The app enables real-time messaging, channel-based organization, and AI-driven user representation through customizable avatars.

**User Roles & Core Workflows**

1\. **Standard User**: Send/receive messages in real-time, organize discussions into channels/DMs, and share files.

2\. **Admin User**: Manage users, create/delete channels, and monitor message activity.

3\. **AI Avatar**: Respond on behalf of users in conversations using context-aware, user-specific language.

**Technical Foundation**

**Technology Stack**

• **Frontend**: React, React Router, Tailwind CSS (for styling)

• **Backend**: Node.js with Express, Socket.IO (for real-time messaging)

• **Database**: MongoDB (for storing users, messages, channels)

• **Hosting**: AWS (for deployment), S3 (for file storage)

**Data Models**

1\. **User**: { id, name, email, avatarUrl, role, lastSeen }

2\. **Channel**: { id, name, type, participants\[\] }

3\. **Message**: { id, channelId, senderId, content, timestamp, fileUrl }

**API Endpoints**

1\. **POST /auth/login**: Authenticate users and return a session token.

2\. **GET /channels**: Retrieve all channels the user has access to.

3\. **POST /messages**: Send a message to a specific channel or DM.

4\. **GET /messages/:channelId**: Fetch messages for a channel.

**Key Components**

1\. **Authentication System**: Secure login with JWT-based sessions.

2\. **Real-Time Messaging**: Socket.IO integration for live updates.

3\. **Channel & User Management**: API-based CRUD operations.

4\. **File Sharing**: AWS S3-backed upload/download system.

**MVP Launch Requirements**

1\. Authentication system with user login, registration, and JWT-based session management.

2\. Real-time messaging with support for channel-based and direct messages.

3\. Basic channel and DM organization, including the ability to create and join channels.

4\. File sharing with support for uploads and secure downloads.

5\. User presence and status updates (e.g., “online” or “away”).

6\. Responsive UI with a clean design for mobile and desktop users.
