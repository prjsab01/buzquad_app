# Buzquad — Master Build Instructions

You are a senior staff-level full-stack engineer, product engineer, and systems architect. Build **Buzquad**, a real, end-to-end, responsive **PWA + Android app** from a single codebase.

Buzquad is a social + collaboration + messaging + activity platform that blends the best practical parts of Discord, Slack, WhatsApp, Instagram, Facebook, Microsoft Teams, Telegram, Threads, X, and Google Workspace into one coherent product.

Your job is to build a **complete, working, production-quality app**, not a demo.

## GENERAL GUIDANCE FOR YOU
* All code should be built and tested locally before pushing to Git repo.
* Whenever my manual effort is required, stop there with exact proper step-by-step guided instructions for me to do what.

---

## 1) Non-negotiable constraints

You MUST obey every one of these constraints.

### Hard constraints

* No paid services.
* No self-hosting.
* No Supabase.
* No Firebase Blaze plan.
* No Firebase Storage / Cloud Storage for Firebase.
* No Flutter.
* No Android Studio required workflow.
* No hosted SFU stack that needs paid infrastructure.
* No backend that requires a credit card.
* No feature that silently breaks free-tier usage limits.
* No feature that assumes unlimited media or video infrastructure.

### Allowed stack only

* React + TypeScript + Vite
* Tailwind CSS + shadcn/ui
* Zustand for UI state
* TanStack Query for server state
* Cloudflare Pages for hosting
* Firebase Auth
* Cloud Firestore
* Firebase Realtime Database
* Cloudflare Workers
* Cloudflare R2
* Native browser WebRTC
* Bubblewrap / Trusted Web Activity for Android packaging

---

## 2) Product vision

Buzquad must feel like a single integrated product with these pillars:

1. **Social graph**
2. **Community graph**
3. **Messaging graph**
4. **Calling graph**
5. **Activity graph**
6. **Admin and moderation graph**
7. **Media discovery graph**
8. **Backup and portability graph**

The app must support:

* public feed
* public profiles
* private profiles
* connections / follow / friend relationships
* public groups
* private circle groups
* public channels
* private circle chats
* 1:1 calls
* small group calls
* events and scheduling
* polls
* activity sessions
* media discovery and embedded/linked viewing
* admin/moderation tools
* backup to user-owned cloud drives
* responsive PWA
* Android app wrapper

---

## 3) Core technical architecture

### Frontend

* React + TypeScript + Vite
* Tailwind CSS + shadcn/ui
* React Router
* Zustand
* TanStack Query
* Framer Motion only where lightweight and helpful
* Lazy loading, code splitting, and list virtualization

### Backend/data

* Firebase Auth for login
* Firestore for persistent app data
* Realtime Database for presence, typing, call signaling, ephemeral room state
* Cloudflare Workers for secure thin backend tasks only
* Cloudflare R2 for all file storage and APK storage

### Hosting

* Cloudflare Pages for the web app
* Use a custom domain if available
* Connection to Cloudflare with auto deployment will happen via GitHub. Code pushed to GitHub should deploy and reflect on website deployed on Cloudflare.

* PWA must be installable from the hosted web app

### Android delivery

* Package the same web codebase using Bubblewrap/TWA
* Build APK from command line
* Host APK in R2
* Add a visible download button on the landing screen
* Android users can sideload the APK

### Calls

* Use native browser WebRTC only
* No self-hosted media bridge
* No paid RTC provider dependency
* Calls should be limited to practical free-tier room sizes and degrade gracefully

### Media

* Cloudflare R2 only
* No Firebase Storage
* No storing large binary blobs in Firestore
* Store metadata in Firestore, media in R2

---

## 4) Identity, authentication, and account model

### Login

* Users sign in with **Google account** first.
* Use Firebase Auth Google sign-in.
* After first login, users must complete onboarding.

### Required identity fields

* unique username / handle
* display name
* avatar
* cover image
* bio
* pronouns
* location
* time zone
* links
* interest tags
* privacy mode
* status message
* verification state
* account type / roles

### Username rules

* global uniqueness
* lowercase canonical storage
* case-insensitive uniqueness checks
* 3–20 characters
* allow only safe characters (letters, numbers, underscore, dot if chosen)
* reject reserved words
* change cooldown
* username history retained for moderation and recovery
* public profile URL slug based on username
* availability checker in UI

### Profile modes

* public
* private
* circle-only
* community-only
* hidden/deactivated

### Profile sections that can be individually controlled

* avatar
* cover
* bio
* links
* interests
* activity summary
* followers/friends
* mutuals
* status
* badges
* featured post
* featured media

---

## 5) Social graph

Implement these relationship types:

* follow / unfollow
* friend request / accept / reject
* connection
* block / unblock
* mute / unmute
* close friends list
* private circle membership
* group membership
* channel subscription
* custom lists / collections

### Social graph requirements

* Support public discovery and private relationships.
* Enforce privacy by role and relationship state.
* Support searchable handles and people discovery.
* Support connection suggestions.
* Support mutuals.

---

## 6) Public feed, private feed, and content model

### Feed types

* public feed
* following feed
* community feed
* circle feed
* group feed
* channel feed
* saved/bookmarked feed
* activity feed
* announcements feed
* trending feed

### Post types

* text
* image
* carousel
* link preview
* poll
* event card
* activity post
* quote post
* repost/share
* announcement
* attachment post

### Feed actions

* like/reaction
* comment
* threaded reply
* repost
* quote repost
* bookmark
* pin
* report
* hide
* mute author
* share internally
* share externally

### Feed behavior

* chronological by default
* optional lightweight ranking
* infinite scroll with pagination
* virtualization for large feeds
* lightweight cached previews
* low-bandwidth fallback

---

## 7) Communities, groups, channels, private circles, and collections

This is a core product pillar and must be designed as a hierarchy.

### Hierarchy

* Community

  * Collections
  * Groups
  * Channels
  * Events
  * Polls
  * Activity rooms
  * Private circles

### Community types

* public
* private
* invite-only
* approval-required
* announcement-only
* project/community hub

### Group types

* public group
* private group
* invite-only group
* approval-required group
* temporary event group
* project group
* discussion group

### Channel types

* announcement channel
* discussion channel
* resource channel
* event channel
* media channel

### Private circle types

* close friends
* family
* work team
* custom trusted circle
* small private community

### Roles

* owner
* admin
* moderator
* member
* guest/pending
* trusted member

### Collection feature

Collections are first-class objects that can contain:

* groups
* private circles
* channels
* posts
* events
* polls
* activity rooms
* bookmarks
* media links
* shared notes

Collections can be:

* personal
* shared
* community-owned
* private

### Community features

* banner and icon
* rules
* description
* tags
* categories
* invite links
* QR invite codes
* join request flow
* admin/moderation controls
* member directory
* pinned announcements
* resources
* featured activities
* collection tabs
* event tabs
* group tabs

---

## 8) Messaging system

Implement a robust messaging layer.

### Chat types

* 1:1 DM
* group chat
* private circle chat
* community chat
* channel discussion
* thread

### Messaging features

* text messages
* image messages
* file messages
* voice notes
* reactions
* replies
* edit/delete
* forward/share
* pinned messages
* starred messages
* message search
* read receipts
* typing indicators
* online presence
* last seen
* message requests
* archived chats
* muted chats
* message threads
* link previews
* mentions

### Chat organization

* inbox
* starred
* archived
* unread
* pinned
* private circle
* communities
* channels
* requests

---

## 9) Calls and screen sharing

Use only native browser WebRTC.

### Call types

* 1:1 audio
* 1:1 video
* small group audio
* small group video
* screen sharing
* optional watch-together room metadata

### Default product caps

Set practical, user-facing caps that can be configured by admins per room/community template.

* 1:1 calls: 2 participants
* small group video: default 6 participants
* small group audio: default 8 participants
* admin-configurable caps by template or community
* automatic fallback to audio-only or reduced-video mode under poor conditions

### Call controls

* mute/unmute
* camera on/off
* speaker selection
* microphone selection
* switch camera
* screen share start/stop
* leave call
* invite user
* participant list
* active speaker highlight
* connection quality indicator
* low-bandwidth warning
* auto-downgrade to audio-only
* call timer
* host controls
* hand raise
* optional waiting room / lobby

### Call signaling

* use Firestore or Realtime Database for signaling
* keep signaling ephemeral and light
* do not create a heavy backend

### Screen sharing

* support screen, window, or tab capture
* automatically pause or reduce camera when sharing screen if helpful
* keep UI simple and stable

---

## 10) Events and scheduling

Implement a full event system.

### Event types

* meeting
* call
* study session
* watch party
* listen-along
* gaming session
* community event
* private circle event
* AMA
* workshop
* town hall
* recurring session

### Event features

* create/edit/delete event
* title
* description
* date/time
* timezone
* recurrence
* RSVP
* yes/no/maybe/going
* guest list
* invite link
* co-hosts
* reminder notifications
* agenda
* notes
* attachments
* discussion thread
* event recap
* approval flow for private communities

### Calendar features

* day/week/month views
* personal calendar
* group calendar
* community calendar
* reminder timestamps
* recurring event support

---[12:18 AM]
## 11) Polls

Implement versatile polls.

### Poll types

* single choice
* multiple choice
* yes/no
* ranked choice
* anonymous
* public
* circle-only
* community-only
* deadline-based

### Poll features

* poll comments
* poll reactions
* poll results live update
* vote tracking
* poll expiry
* pinned poll
* poll in chat
* poll in feed
* poll in groups and events

---

## 12) Activity Hub

The Activity Hub is a major feature and must feel native to Buzquad.

### Activity categories

* reading books
* watching movies
* watching web series
* watching reels / short-form clips
* listening to music
* playing games
* listening to podcasts
* browsing articles
* learning/studying
* coding
* sketching/creative work
* fitness / walking
* shared browsing / co-browsing where feasible

### Activity modes

* solo
* 1:1
* small group
* private circle
* community room

### Universal activity actions

For every activity, support:

* search
* browse
* start session
* join session
* invite others
* react
* comment
* save/bookmark
* history tracking
* continue where left off
* show who is active now
* share into chats/groups/circles/feed
* pin to profile if desired

### Activity social layer

Every activity must have:

* host
* participants
* visibility settings
* timer/status
* activity room chat
* room reactions
* room presence
* leave/join lifecycle
* lightweight analytics

### Books module

The books area must support:

* search books by title, author, tags, categories
* read PDF and EPUB in-app where feasible
* metadata display: cover, description, author, language, tags
* save to shelf
* bookmark pages/sections
* continue reading from last position
* join someone else reading
* invite others to read together
* private circle reading rooms
* community reading clubs
* reading history

#### Books sources

* admin-uploaded files stored in Google Drive and linked in-app
* admin-curated Google Drive folders or shared links
* legal public-domain or free book metadata sources when available
* community book collections

#### Books rules

* do not mirror copyrighted books illegally
* prefer metadata + user-access links + user-owned backups
* keep all large media out of Firestore

### Movies module

The movies area must support:

* search and browse movies
* solo viewing
* 1:1 viewing
* small group viewing
* invite others to watch
* join another person's watch session
* reactions while watching
* comments/chat during activity
* watchlist
* watch history
* continue watching

#### Movies sources

* admin-curated YouTube links
* admin-curated Odysee playlists
* legal discovery APIs when available
* community watch collections

#### Movies rules

* do not illegally mirror copyrighted movies
* prefer embeds, playlists, and link-based discovery
* keep playback pathways lightweight and optional

### Reels / short-form module

The reels area must support:

* scrolling short clips
* like/reaction
* save/bookmark
* share
* invite another person to watch together
* small-group short clip sessions
* clip collections

### Web series module

The series area must support:

* search series
* browse seasons and episodes
* continue watching
* solo mode
* 1:1 mode
* group mode
* watch party invites
* watch history
* share episode into circles/groups

#### Series sources

* admin-curated YouTube playlists
* admin-curated Odysee playlists
* legal discovery APIs when available

### Music module

The music area must support:

* solo listening
* 1:1 listening
* small-group listening
* music rooms
* shared queue metadata where feasible
* favorites
* history
* invite others
* see what friends are listening to
* connect supported music accounts where official authorization exists

#### Music sources

* Spotify connection through official user authorization where available
* YouTube / YouTube Music link-based flows where legal and technically feasible
* admin-curated playlists
* free music discovery APIs when available

### Games module

The games area must support:

* browse free games
* solo games
* 1:1 games
* small-group games
* invite others
* active play status
* game favorites
* history
* collections of games

#### Games sources

* free game discovery APIs where available and legal
* lightweight web games where allowed
* admin-curated game collections

### Other activity types

Also support:

* podcasts
* articles
* art galleries
* study rooms
* coding sessions
* fitness/walking sessions
* language learning
* shared browsing sessions where feasible

### Activity Hub UX

Include:

* tabs for books, movies, reels, series, music, games, and other activities
* search and filters
* recently used activities
* trending activities
* suggested activities from circles/groups/communities
* create activity
* join activity
* invite activity
* continue where I left off
* friends are doing this now
* circle sessions
* community sessions

### Activity backup and portability

Users must be able to export:

* reading lists
* watchlists
* music queues
* favorite games
* activity history
* saved collections

Backups may be stored to Google Drive or OneDrive through user-authorized links.

### Activity rules

* do not host large media files yourself unless explicitly user-owned and within quota
* do not require paid streaming infrastructure
* keep embeds optional
* always provide graceful fallback if a source fails
* keep the feature mobile-friendly and lightweight
* use metadata first, playback second

---

## 13) Media and file handling

### Use Cloudflare R2 for all file/media storage

* avatars
* banners
* post images
* chat images
* attachments
* audio snippets
* voice notes
* small video clips
* APK files
* backup archives when needed

### Media rules

* signed upload URLs via Cloudflare Worker
* client-side compression before upload
* MIME validation
* file size limits
* thumbnails/previews
* public and private access modes
* metadata in Firestore only
* storage and download links in R2
* delete and restore policy where needed

### APK distribution

* build APK from same web codebase
* upload APK to R2
* expose a versioned download link in the landing screen
* show version number and changelog
* optionally show checksum

---

## 14) Backup to user-owned cloud drives

This feature is mandatory.

### Support cloud destinations

* Google Drive
* OneDrive

### Backup scope

* single chat
* multiple chats
* private circle chat
* group chat
* community chat
* all account history
* selected date ranges
* text only
* text + metadata
* text + media references
* text + media files if size-bounded and permitted

### Backup formats

* JSON
* HTML
* ZIP if bundling assets

### Backup flow

1. User chooses what to back up.
2. App generates export bundle.
3. User connects Google Drive or OneDrive.
4. App uploads the export to the user's own drive.
5. App stores or copies the resulting backup link.
6. User can restore later.

### Backup implementation guidance

* Use Google sign-in for auth flow.
* Use official OAuth-based Google Drive access where available.
* Use official Microsoft Graph delegated auth for OneDrive where available.
* Keep the user in control of where the backup goes.
* The app must never silently retain backups without user intent.

---

## 15) Admin and moderation

Create a protected `/admin` area.

### Admin features

* user search
* user profile review
* username disputes
* content moderation
* report queue
* spam queue
* abuse queue
* post takedown
* comment takedown
* message moderation
* group moderation
* channel moderation
* community moderation
* event moderation
* poll moderation
* activity moderation
* featured content management
* featured books/playlists/games management
* community templates
* collection templates
* role assignment
* suspend/ban/unban
* audit logs
* feature flags
* system status
* quota/usage dashboard

### Roles

* super admin
* admin
* moderator
* community owner
* community admin
* community moderator
* creator
* verified user
* regular user

### Security

* use Firebase custom claims for roles
* enforce all admin access in Firestore rules
* never trust the client UI alone
* log every admin action

---

## 16) Security model

### Must implement

* Firebase Auth
* custom claims
* Firestore security rules
* Realtime Database security rules
* Worker-level validation for sensitive operations
* App Check if feasible

### Access control rules

* public content visible where intended
* private circle content visible only to members
* private profile sections visible only to allowed viewers
* admin pages blocked from regular users
* backup links protected by user ownership or explicit sharing
* upload endpoints locked down
* moderation logs protected

---

## 17) Search and discovery

Implement search across:

* users
* usernames
* profiles
* posts
* groups
* communities
* circles
* channels
* events
* polls
* activities
* messages
* collections
* media metadata

### Discovery features

* trending topics
* suggested users
* suggested communities
* suggested groups
* suggested events
* recommended activities
* tags/hashtags
* category pages
* local search within circles/communities
* global search

---

## 18) Notifications

Implement:

* in-app notifications
* unread counts
* mention notifications
* reply notifications
* reaction notifications
* follow/friend request notifications
* invite notifications
* event reminders
* poll reminders
* call invites
* backup completion notifications
* moderation/admin notifications
* push-ready architecture

---

## 19) PWA requirements

The app must be a true installable PWA.

### Must include

* web manifest
* service worker
* cached shell
* offline fallback page
* install prompt
* app icons
* splash/launch behavior
* update prompt
* responsive layout
* navigation suitable for mobile and desktop

---

## 20) Android app requirements

Package the same codebase into Android with TWA.

### Requirements

* Bubblewrap / Trusted Web Activity workflow
* command-line build path
* APK hosted in R2
* landing page download button
* no Flutter
* no Android Studio requirement for normal workflow

### Android delivery behavior

* user can download APK from landing screen
* app install flow is documented clearly
* if sideloading is required, explain it in the app/help page
* versioning and update notes should be visible

---[12:19 AM]

## 21) Free-tier safety and quota control

The app must actively protect the free-tier budget.

### Enforce these rules in product UX

* limit live group video size by default
* keep audio rooms larger than video rooms
* compress images before upload
* cap upload sizes
* paginate all lists
* lazy load media and feed items
* avoid large unbounded subscriptions
* batch writes where practical
* keep docs small
* avoid full collection scans
* cache aggressively
* minimize Worker invocations
* keep media heavy features optional
* provide a text-first fallback everywhere

### Build in visible product limits

* show room participant caps in UI
* show file size limits
* show backup size limits
* show plan-friendly warnings where needed
* show when a feature is unavailable due to free-tier constraints

---

## 22) Data model

Use Firestore collections and subcollections for:

* users
* usernames
* profiles
* follows
* friendships
* friend_requests
* blocks
* mutes
* communities
* groups
* channels
* circles
* collections
* group_members
* community_members
* channel_subscribers
* posts
* comments
* reactions
* bookmarks
* conversations
* messages
* message_threads
* call_rooms
* call_participants
* events
* rsvps
* polls
* votes
* activities
* activity_sessions
* media
* backups
* reports
* moderation_actions
* admin_audit_logs
* notifications
* feature_flags
* app_settings

### Data rules

* avoid giant documents
* use subcollections for high-volume objects
* paginate lists
* denormalize only when useful
* store timestamps consistently
* index search fields appropriately
* store media metadata only, not binaries

---

## 23) Must-have UI pages

Build all of these:

* landing page
* sign in / sign up
* onboarding
* username claim page
* home feed
* search page
* profile page
* public profile page
* private profile page
* follow/friend management page
* communities page
* community detail page
* group detail page
* circle detail page
* channel detail page
* collections page
* inbox page
* chat room page
* call room page
* events calendar page
* event detail page
* polls page
* activity hub page
* media gallery page
* backup settings page
* notifications page
* settings page
* privacy settings page
* admin dashboard
* moderation dashboard
* APK download page
* help/about/privacy/terms pages

---

## 24) Design and UX requirements

The app should be:

* responsive
* mobile-first
* desktop-friendly
* tablet-friendly
* clean and modern
* fast on low-end phones
* accessible
* keyboard navigable
* screen-reader aware
* visually consistent
* lightly animated only where helpful

### Layout guidance

* mobile bottom navigation
* desktop sidebar or split layout
* top search
* quick create button
* notification badge
* compact cards
* clear hierarchy
* no clutter

---

## 25) Reliability and fallback behavior

The app must not crash when something is missing.

### Required graceful handling

* auth failure
* network failure
* media permission denial
* upload failure
* drive auth failure
* R2 upload failure
* calling permission failure
* low bandwidth
* offline mode
* unsupported embed/source
* source unavailable

### Fallback rules

* if a source fails, show a usable fallback
* if a call degrades, fall back to audio-only
* if a media item cannot be embedded, show metadata and open/link option
* if a backup target fails, keep the export locally available for the user

---

## 26) Build order

Implement in this order:

1. project setup
2. routing/layout
3. Google Auth
4. username claim flow
5. profile system
6. privacy/roles/security rules
7. feed
8. communities/groups/circles/collections
9. messaging
10. events
11. polls
12. activity hub
13. R2 media uploads
14. backup/export flows
15. WebRTC calling
16. admin/moderation
17. PWA polish
18. Android packaging
19. tests
20. docs
21. cleanup and optimization

---

## 27) Deliverables

You must deliver:

* full working repository
* complete folder structure
* README with setup and deployment
* environment example file
* Firebase configuration instructions
* Firestore rules
* Realtime Database rules
* Cloudflare Worker code
* R2 upload/download logic
* PWA manifest and service worker
* Android packaging instructions
* admin role setup
* backup flow docs
* test suite
* seed/mock data
* release checklist

---

## 28) Production-quality standards

The code must be:

* modular
* readable
* strongly typed
* well-commented only where needed
* secure
* tested
* maintainable
* free of hardcoded secrets
* consistent in naming and structure
* optimized for free-tier limits

### Error handling

Every important flow must have:

* loading state
* empty state
* error state
* retry option
* graceful fallback

---

## 29) Acceptance criteria

The build is complete only if:

* Google login works
* unique username claim works
* public/private profiles work
* feed works
* communities/groups/circles/collections work
* chats work
* calls work
* screen sharing works
* events work
* polls work
* activity hub works
* books/movies/reels/series/music/games sections work in a free-tier compatible way
* backups to Google Drive and OneDrive work
* admin dashboard works
* moderation works
* PWA installs correctly
* Android APK can be downloaded from the app itself
* the app respects free-tier constraints and degrades gracefully

---

## 30) Final instruction

Build Buzquad as a **coherent, real product**. Every module must connect to the same identity system, social graph, privacy model, community model, activity model, and admin model.

If a feature would require paid infrastructure, replace it with the nearest free-tier-compatible alternative and clearly document the limitation in the code, UI, and README.

Do not leave the repo half-finished. Do not omit moderation, privacy, backups, or admin tooling. Do not treat activity features as afterthoughts. Ship the full product architecture in a way that can be iterated safely inside free-tier boundaries.