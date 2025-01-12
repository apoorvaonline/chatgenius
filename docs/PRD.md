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

3\. **Message**: { id, channel, sender, content, timestamp, fileUrl }

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

## User Status Feature

### Status Types

Users can have the following status states:

1. **Online** (🟢) - User is actively using the application
2. **Away** (🟡) - User is logged in but inactive
3. **Do Not Disturb** (🔴) - User doesn't want to be disturbed
4. **Offline** (⚫) - User is not logged in

### Status Behavior

#### Automatic Status Changes

1. **Online to Away**

   - Triggers when user is inactive for 5 minutes
   - Inactivity defined as: no mouse movement, keyboard input, or interaction with the app

2. **Away/DND to Offline**

   - Triggers when user closes the browser/app
   - Triggers on session timeout (after 24 hours of inactivity)
   - Triggers on explicit logout

3. **To Online**
   - When user logs in
   - When user returns from Away status by interacting with the app
   - When user manually sets status to Online

#### Manual Status Control

- Users can manually set their status through a dropdown menu
- Manual "Do Not Disturb" status won't automatically change to Away
- Manual status settings persist until:
  - User manually changes it
  - User logs out
  - Session expires

### Status Display

- Status indicator shown as a colored dot next to user's avatar
- Status visible in:
  - User list
  - Chat messages
  - User profile
  - Channel member lists

### Technical Requirements

1. **Frontend**

   - Status indicator component
   - Status selector dropdown
   - Idle time detection
   - WebSocket connection for real-time status updates

2. **Backend**

   - Status storage in user document
   - WebSocket events for status changes
   - Session management
   - API endpoints for status updates

3. **Database**
   - Add status field to user schema
   - Add lastActive timestamp to track user activity

### Privacy Considerations

- Users can hide their status from specific users or groups
- Status visibility settings in user preferences
- Option to disable automatic status changes

## Emoji Feature

### Core Functionality

1. **Message Composition**

   - Emoji picker interface for new messages
   - Support for both Unicode emojis and custom emojis
   - Shortcode support (e.g., `:smile:` converts to 😊)
   - Recently used emojis section
   - Emoji search functionality

2. **Message Reactions**
   - Add emoji reactions to existing messages
   - View who reacted with each emoji
   - Remove own reactions
   - Limit of 20 different emoji types per message
   - Show reaction count when more than 3 users use the same emoji

### Technical Requirements

1. **Frontend**

   - Emoji picker component
   - Emoji reaction overlay/popup for messages
   - Emoji rendering support
   - Shortcode parser for message input
   - Reaction counter and user list popup

2. **Backend**

   - Message schema update to support reactions
   - API endpoints for managing reactions
   - WebSocket events for real-time reaction updates
   - Custom emoji storage and management

3. **Database**
   - Add reactions array to message schema:
     ```javascript
     reactions: [
       {
         emoji: String, // Unicode emoji or custom emoji ID
         users: [userId], // Array of user IDs who reacted
         timestamp: Date, // When the reaction was first added
       },
     ];
     ```
   - Custom emoji collection (if supporting custom emojis):
     ```javascript
     customEmoji: {
       id: String,
       name: String,
       url: String,
       createdBy: userId,
       createdAt: Date
     }
     ```

### User Experience

1. **Emoji Picker**

   - Accessible via button in message input
   - Categorized emoji list (smileys, animals, objects, etc.)
   - Search bar for finding emojis
   - Keyboard shortcuts for quick access
   - Recently used section showing last 20 emojis

2. **Message Reactions**
   - Click/tap on message to show reaction options
   - Quick reaction bar for most common emojis
   - Show reaction counts and user list on hover
   - Animate emoji when reaction is added
   - Group similar reactions together

### Performance Considerations

1. **Optimization**

   - Lazy load emoji picker
   - Cache emoji data locally
   - Optimize reaction updates for real-time sync
   - Limit number of reactions per message for performance

2. **Storage**
   - Efficient storage of emoji data
   - CDN distribution for custom emojis
   - Reaction count aggregation for messages with high engagement

### Security & Validation

1. **Input Validation**

   - Sanitize emoji input
   - Validate custom emoji uploads
   - Rate limiting for reactions
   - Permission checks for custom emoji creation

2. **Access Control**
   - Channel-specific reaction permissions
   - Admin controls for enabling/disabling reactions
   - Moderation tools for inappropriate reactions

### Accessibility

1. **Screen Reader Support**

   - Proper aria labels for emojis
   - Keyboard navigation in emoji picker
   - Alternative text for emoji reactions
   - Screen reader announcements for reaction updates

2. **Visual Accessibility**
   - High contrast mode support
   - Configurable emoji sizes
   - Clear visual indicators for selected emojis
   - Alternative text display option

### Mobile Considerations

1. **Touch Interface**

   - Touch-friendly emoji picker
   - Long-press to access reactions
   - Swipe gestures for emoji categories
   - Mobile-optimized reaction displays

2. **Performance**
   - Reduced animation on mobile
   - Optimized emoji picker for smaller screens
   - Efficient loading on slower connections

# Message Threading Feature Requirements

## Overview

Add support for message threads (similar to Slack) where users can create conversation threads on any message within a channel. This enables focused discussions without cluttering the main channel.

## Functional Requirements

### Message Thread Creation

- Users can start a thread on any message in a channel
- Only one level of threading is allowed (no nested threads)
- The original message acts as the parent message for the thread
- Thread replies are visually connected to the parent message

### Thread Display

- Parent messages with threads should show:
  - An indicator showing number of replies
  - Timestamp of the latest reply
- Threads should be expandable/collapsible
- Thread view should display:
  - Original parent message at the top
  - Chronological list of thread replies
  - Clear visual distinction from main channel messages

### Thread Interactions

- Users can:
  - Reply to threads
  - Edit their own thread replies
  - Delete their own thread replies
  - View all participants in a thread
  - See real-time updates in threads

### Data Model Updates

- Messages need to track:
  - Thread ID (if message is part of a thread)
  - Parent Message ID (if message is a thread reply)
  - Reply count
  - Latest reply timestamp

### Notifications

- Users should be notified when:
  - Someone replies to their message thread
  - Someone mentions them in a thread
  - New replies are added to threads they're participating in

### API Requirements

- New endpoints needed for:
  - Creating thread replies
  - Fetching thread messages
  - Updating thread status
  - Getting thread statistics

## Technical Considerations

### Database Schema Updates

- Message model needs new fields:
  - isThreadParent (boolean)
  - parentMessageId (reference)
  - threadReplyCount (number)
  - lastReplyTimestamp (datetime)

### Real-time Updates

- WebSocket events for:
  - New thread creation
  - New thread replies
  - Thread updates/deletions

### Performance Considerations

- Efficient pagination for thread replies
- Optimized queries for thread statistics
- Caching strategy for active threads

## User Experience Guidelines

- Clear visual hierarchy between main channel and thread messages
- Intuitive thread creation process
- Smooth transitions between channel and thread views
- Clear indicators for unread thread replies
- Easy navigation between threads and main channel

## Future Considerations

- Thread search functionality
- Thread bookmarking
- Thread sharing across channels
- Thread analytics and insights
- Thread archiving
