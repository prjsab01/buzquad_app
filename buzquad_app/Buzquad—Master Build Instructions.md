# Buzquad — Master Build Instructions

You are a senior staff-level full-stack engineer, product engineer, and systems architect. Build **Buzquad**, a real, end-to-end, responsive **PWA + Android app** from a single codebase.

Buzquad is a social + collaboration + messaging + activity platform that blends the best practical parts of Discord, Slack, WhatsApp, Instagram, Facebook, Microsoft Teams, Telegram, Threads, X, and Google Workspace into one coherent product.

Your job is to build a **complete, working, production-quality app**, not a demo.

## GENERAL GUIDANCE FOR YOU
* All code should be built and tested locally before pushing to Git repo.
* Whenever my manual effort is required, stop there with exact proper step-by-step guided instructions for me to do what.

---

## SAFE DEFAULTS FOR THIS PROJECT

When making decisions without explicit instruction, default to:

* free-tier compatible implementation,
* Firestore for persistent data, Realtime Database for ephemeral/presence data,
* Cloudinary for media uploads (no Firebase Storage),
* no new npm dependencies unless strictly necessary,
* no new Cloudflare Workers unless the task explicitly requires one,
* TypeScript strict typing — no `any` without justification,
* existing service patterns in `src/lib/` — do not create parallel patterns,
* existing component patterns in `src/pages/` — do not introduce new folder structures without documenting them.

---

## FREE-TIER GUARD

Before implementing any feature that touches data reads, writes, storage, or network:

* Estimate the Firestore read/write cost at scale.
* Confirm the implementation uses pagination, not full collection scans.
* Confirm media goes to Cloudinary or R2, not Firestore.
* Confirm Realtime Database listeners are scoped and unsubscribed on unmount.
* If a feature would silently exceed free-tier limits at modest usage, flag it before implementing.

---

## SECURITY GUARD

Before completing any task that touches auth, data access, or user input:

* Confirm Firestore rules enforce the intended access control — do not rely on UI guards alone.
* Confirm no user can read or write another user's private data through a rule gap.
* Confirm admin-only operations are enforced server-side (custom claims or Worker), not just in the UI.
* Confirm no secrets, tokens, or credentials appear in client-side code or committed files.

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


---

## 31) Reactions and emoji system

Go beyond a single like button. Implement a full emoji reaction system across all content surfaces.

### Reaction surfaces

* feed posts
* comments
* chat messages
* poll results
* event cards
* activity room moments
* community announcements

### Reaction behavior

* quick-tap defaults to a primary reaction (configurable per user)
* long-press or hover opens a reaction picker with emoji grid
* reaction counts grouped and displayed inline (e.g. 👍 12 ❤️ 4 😂 7)
* clicking a reaction count shows who reacted with what
* user can change or remove their reaction
* reactions trigger notifications to the content author
* reaction picker supports search by emoji name
* recently used reactions shown first in picker
* community admins can restrict allowed reactions per channel or group

---

## 32) Rich text and formatting in posts and messages

Support lightweight rich text everywhere users write.

### Supported formatting

* bold, italic, strikethrough, inline code
* bullet lists and numbered lists
* block quotes
* code blocks with syntax highlighting (lightweight, client-side only)
* headings (H2, H3 only — no H1 in posts)
* horizontal divider
* inline mentions (@username, @community, @event)
* inline hashtags (#topic)
* inline emoji shortcodes (:smile:)
* inline link with custom display text

### Formatting rules

* use a lightweight editor (e.g. Tiptap or a minimal custom implementation) — no heavy WYSIWYG
* store content as structured JSON (ProseMirror/Tiptap format) in Firestore, render as HTML on display
* plain text fallback for notifications and previews
* no raw HTML storage — sanitize all output
* formatting available in: feed posts, community posts, channel posts, event descriptions, group descriptions, chat messages (subset: bold/italic/code/quote only in chat)

---

## 33) User status and presence system

Give users expressive, real-time presence beyond just online/offline.

### Status types

* online (auto)
* away (auto after inactivity threshold)
* do not disturb (manual — suppresses notifications)
* invisible (manual — appears offline to others)
* custom status with emoji + text (e.g. 🎧 Listening to music, 📚 Reading, 🏃 Away from keyboard)
* activity-derived status (e.g. "In a call", "Watching together", "In a reading room") — shown only if user allows it

### Status behavior

* custom status has optional expiry (30 min, 1 hour, today, this week, indefinitely)
* status visible on avatar hover/tap in chat, profile, and member lists
* status visible in call participant list
* user controls who can see their status (everyone / friends / circle / nobody)
* do not disturb suppresses all notification sounds and badges except direct mentions
* invisible mode hides presence from all surfaces but user can still use the app normally
* status stored in Realtime Database (ephemeral) — not Firestore

---

## 34) Drafts and scheduled posts

Let users save work and post at the right time.

### Drafts

* auto-save draft while composing a post or message (debounced, local storage first, Firestore backup)
* draft indicator shown in composer when a draft exists
* drafts page accessible from profile or settings — lists all saved drafts with preview and last-edited timestamp
* drafts can be edited, published, or deleted
* drafts scoped per context (feed draft, community draft, group draft, etc.)

### Scheduled posts

* when creating a post, user can choose "Schedule" instead of "Post now"
* date/time picker with timezone awareness
* scheduled posts visible in a "Scheduled" tab on the user's profile or post composer
* scheduled posts can be edited or cancelled before publish time
* on publish time, a Cloudflare Worker (cron trigger) reads due scheduled posts from Firestore and marks them published
* show a countdown or scheduled timestamp on the draft card

---

## 35) Pinned profiles and spotlight section

Let users curate what the world sees first on their profile.

### Spotlight section (on profile page, below bio)

* up to 3 pinned items, user-chosen from:
  * a post
  * a community they own or admin
  * an event they created
  * an activity session
  * a collection
  * a link with custom label and icon
* each spotlight card shows a thumbnail, title, and short description
* spotlight items are reorderable via drag-and-drop
* spotlight is visible to anyone who can view the profile (respects privacy mode)

### Profile achievements and badges

* system-awarded badges for milestones (e.g. first post, 100 followers, community founder, event host, verified)
* community-awarded badges (community admins can create and assign custom badges to members)
* badges displayed on profile below display name
* badge detail on hover/tap: name, description, awarded by, date
* user can choose which badges to show publicly (toggle per badge)

---

## 36) Shared notes and collaborative docs

A lightweight shared writing surface inside communities, circles, and groups.

### Note types

* personal note (private, only visible to owner)
* shared note (visible to circle/group/community members)
* community wiki page (editable by trusted members or admins)
* event agenda / meeting notes (attached to an event)
* collection note (attached to a collection)

### Note features

* rich text editing (same formatting as §32)
* last-edited-by and timestamp shown
* version history (last 10 versions stored, viewable and restorable)
* share note as read-only link
* export note as Markdown or plain text
* pin note to a community, group, or circle
* mention users in notes (@username)
* notes searchable within their parent context
* no real-time collaborative editing (too expensive on free tier) — last-write-wins with conflict warning if two users edit within the same minute

---

## 37) Link previews and smart embeds

When a URL is pasted into a post, message, or note, generate a rich preview.

### Preview behavior

* fetch Open Graph / meta tags via a Cloudflare Worker (to avoid CORS and keep client clean)
* display: site favicon, title, description, preview image, domain
* user can dismiss the preview before posting
* preview stored as metadata in Firestore alongside the post/message — do not re-fetch on every render
* if preview fetch fails, show plain URL with a small link icon — never block the post

### Smart embed types

* YouTube / YouTube Music — show thumbnail, title, channel, duration; play inline on tap
* Spotify track/album/playlist — show cover, title, artist; link out to Spotify (no embedded player unless official embed is free)
* GitHub repo or gist — show repo name, description, stars, language badge
* Twitter/X post — show text preview, author, timestamp (no iframe — metadata only)
* Wikipedia article — show title and first paragraph
* generic article — show OG title, description, image

### Embed rules

* all embeds are opt-in on render (show a "Load embed" button before loading any iframe)
* never auto-play video or audio
* never load third-party iframes without user tap
* store only metadata in Firestore — never the full page content

---

## 38) Reactions and engagement analytics for creators

Give post authors and community admins lightweight insight into how their content performs.

### Per-post analytics (visible to post author only)

* total views (increment on render, stored in Realtime Database counter, flushed to Firestore periodically)
* unique viewer count (approximate — hashed uid set, capped at 1000 for free-tier safety)
* reaction breakdown by type
* comment count
* repost/share count
* bookmark count
* reach: followers who saw it vs. non-followers

### Community analytics (visible to community admins)

* member growth over time (weekly snapshots stored in Firestore)
* most active members (by post count, comment count, reaction count)
* top posts of the week/month
* event attendance rates
* poll participation rates
* activity room usage

### Rules

* no third-party analytics SDK
* no pixel tracking
* all analytics computed from existing Firestore/RTDB data — no separate analytics pipeline
* analytics data is never sold or shared
* user-facing analytics are always aggregated — never expose individual viewer identities to post authors

---

## 39) Onboarding improvements and interest-based feed seeding

Make the first-run experience fast, personal, and immediately useful.

### Onboarding flow additions

* after username claim, show an interest picker: grid of topic tags (music, books, gaming, tech, fitness, art, food, travel, etc.) — user picks at least 3
* after interest selection, show suggested communities to join (filtered by selected interests) — user can join 0 or more before continuing
* after communities, show suggested people to follow (filtered by mutual interests and joined communities)
* show a "your feed is ready" confirmation screen with a preview of what the feed will look like
* all onboarding steps skippable individually but tracked (so the app knows what was completed)
* onboarding progress stored in Firestore user doc (`onboardingStep` field)
* if user skips onboarding, show a dismissible "Complete your profile" banner on the home feed for 7 days

### Interest tags system

* interest tags are a global taxonomy stored in Firestore (`/tags` collection)
* tags have: id, label, icon/emoji, category, post count
* users store their selected tags in their profile doc
* posts, communities, events, and activities can be tagged with up to 5 tags
* tags are used for feed ranking, discovery, and search filtering
* admin can add/edit/deprecate tags from the admin dashboard

---

## 40) Keyboard shortcuts and power-user features

Make the desktop experience fast for users who live in the app.

### Global shortcuts

* `K` — open command palette (search everything: users, posts, communities, chats, events)
* `N` — new post composer
* `M` — go to inbox
* `G then H` — go to home feed
* `G then C` — go to communities
* `G then A` — go to activity hub
* `G then E` — go to events
* `/` — focus search bar
* `Escape` — close any open modal or panel

### In-chat shortcuts

* `Enter` — send message
* `Shift+Enter` — new line in message
* `Up arrow` — edit last sent message
* `@` — open mention picker
* `:` — open emoji picker
* `Ctrl+B` / `Cmd+B` — bold
* `Ctrl+I` / `Cmd+I` — italic

### Command palette

* fuzzy search across: users, communities, groups, channels, events, posts, settings pages
* recent items shown before typing
* keyboard navigable (arrow keys + Enter)
* shows keyboard shortcut hints inline
* accessible via `K` shortcut or a search icon in the top bar

### Rules

* shortcuts only active when no input is focused (except in-chat shortcuts)
* shortcuts documented in a `/help/shortcuts` page
* shortcuts can be disabled in settings for accessibility

---

## 41) Accessibility improvements

The app must be genuinely usable by people with disabilities, not just technically compliant.

### Required implementations

* all interactive elements have visible focus rings (not just browser default)
* all images have meaningful `alt` text or `aria-hidden` if decorative
* all icon-only buttons have `aria-label`
* all modals trap focus and return focus to trigger on close
* all form fields have associated `<label>` elements
* color contrast meets WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
* no information conveyed by color alone — always pair with text or icon
* all toast/alert notifications announced via `aria-live` region
* infinite scroll lists have a "Load more" button fallback for keyboard users
* video embeds never autoplay
* audio never autoplays
* motion animations respect `prefers-reduced-motion` media query — disable or reduce all transitions when set
* font size respects browser/OS text size preferences — no fixed `px` font sizes on body text

### Accessibility settings page

* toggle: reduce motion
* toggle: high contrast mode (applies a high-contrast Tailwind theme variant)
* toggle: large text mode (bumps base font size by one step)
* toggle: disable autoplay for all embeds

---

## 42) Theme and appearance settings

Let users personalize the look of the app without breaking the design system.

### Theme options

* system default (follows OS light/dark preference)
* light mode
* dark mode
* OLED black mode (true black backgrounds for OLED screens — saves battery)

### Accent color

* user picks from a curated set of 8–10 accent colors (e.g. violet, blue, teal, green, orange, rose, slate)
* accent color applied to: buttons, links, active nav items, reaction highlights, progress bars
* accent color stored in user profile doc and applied on login across devices

### Density settings

* comfortable (default — standard padding and spacing)
* compact (reduced padding — more content visible, useful on desktop)
* cozy (increased padding — easier touch targets on mobile)

### Font settings

* system font (default)
* serif option (for reading-heavy users)
* dyslexia-friendly font option (OpenDyslexic or similar free font)

### Rules

* all theme settings stored in Firestore user doc and applied immediately on change
* no full page reload required for theme changes
* theme applied before first paint to avoid flash of wrong theme (read from localStorage on initial load, sync to Firestore after auth)

---

## 43) Smart notifications and notification preferences

Give users fine-grained control over what they hear about and when.

### Notification preference levels (per source)

* all activity
* only mentions and direct messages
* only important (friend requests, call invites, admin actions)
* muted (nothing)

### Configurable per context

* global default
* per community
* per group
* per circle
* per channel
* per conversation

### Notification digest

* option to batch non-urgent notifications into a daily or weekly digest instead of real-time
* digest delivered as a single in-app notification summarizing activity
* digest timing configurable (morning / evening / weekly)

### Do not disturb schedule

* user sets a DND window (e.g. 10pm–8am)
* during DND window, all notifications are silenced and queued
* queued notifications delivered as a batch when DND ends
* DND schedule stored in user profile doc with timezone

### Notification center improvements

* notifications grouped by type (reactions, comments, follows, system)
* mark all as read button
* filter by type
* delete individual notifications
* notification history retained for 30 days then auto-purged

---

## 44) In-app search improvements

Make search fast, contextual, and genuinely useful.

### Search scopes

* global (searches everything)
* within a community
* within a group or circle
* within a conversation (message search)
* within activity hub (books, movies, games, etc.)

### Search result types with distinct UI treatments

* users — avatar, display name, username, mutual count, follow button inline
* communities — icon, name, member count, join button inline
* posts — author avatar, post preview, timestamp, reaction count
* events — date badge, title, RSVP count, RSVP button inline
* polls — question preview, vote count, vote button inline
* messages — conversation context, message snippet, timestamp
* collections — owner, item count, visibility badge
* tags/topics — tag name, post count, follow tag button

### Search UX

* instant results as user types (debounced 300ms)
* recent searches saved locally (last 10)
* trending searches shown when search bar is empty
* search filters: type, date range, community scope, tag
* no results state with suggestions ("Try searching for people instead" / "Browse communities")
* search results paginated — load more on scroll

---

## 45) User-to-user gifting and appreciation (free-tier compatible)

Let users express appreciation without any payment infrastructure.

### Appreciation system

* users can send "kudos" to other users — a lightweight appreciation signal (like a super-reaction on a profile)
* kudos have a daily send limit per user (e.g. 5/day) to prevent spam
* kudos count visible on profile as a badge/counter
* kudos trigger a notification to the recipient
* kudos history visible to the recipient on their profile (who sent, when)
* kudos are not monetary — purely social signal

### Community awards

* community admins can create named awards (e.g. "Most Helpful", "Top Contributor", "Funniest Post")
* awards can be given to members by admins/moderators
* awards appear on the recipient's profile under the community section
* awards are permanent unless revoked by an admin

---

## 46) Content warnings and sensitive content controls

Give users and communities control over what is shown by default.

### Content warning system

* post author can attach a content warning label to any post before publishing
* predefined labels: Spoiler, Sensitive, Mature, Disturbing, Flashing lights, Political, Other
* posts with content warnings show a blurred/collapsed preview with the warning label
* user must tap "Show anyway" to reveal the content
* user can set a preference: "Always show content warnings" / "Always hide until tapped" / "Show for specific labels only"

### Community-level content controls

* community admins can require content warnings for specific post types in their community
* community admins can restrict mature content entirely (default for all communities)
* community admins can enable mature content for their community (requires admin approval flow)

### User-level filters

* user can add keywords to a personal filter list
* posts containing filtered keywords are collapsed with a "Hidden by your filter" label
* filter list editable in privacy settings
* filters apply across feed, community posts, and search results

---

## 47) Spaces — persistent voice/activity rooms

A Discord-style "always-on" room concept for communities and circles.

### What a Space is

* a persistent, named room inside a community or circle that users can drop in and out of freely
* no scheduled start time — it exists until the host closes it or it auto-expires after inactivity
* supports: voice-only, voice + video, activity (e.g. "Study Space", "Music Room", "Chill Zone")

### Space features

* space has a name, description, and optional topic (e.g. "Now playing: lo-fi beats")
* space shows live participant count and avatars in the community sidebar
* users can join silently (listen-only mode) or with mic active
* host can mute all, kick participants, or lock the space
* space has an attached text chat channel (lightweight, last 50 messages only)
* space activity (join/leave events) shown in the community activity feed
* spaces auto-close after 30 minutes of zero participants
* community can have up to 3 active spaces at once (free-tier cap)
* space state stored in Realtime Database (ephemeral) — not Firestore

---

## 48) Profile portfolio and work showcase

Let creators, professionals, and builders show their work directly on their profile.

### Portfolio section (optional, user-enabled)

* user can add portfolio items to their profile
* each item has: title, description, cover image (Cloudinary), tags, external link, date
* item types: project, design, writing, code, art, music, video, other
* portfolio items displayed in a grid or list on the profile page
* portfolio section visibility controlled by profile privacy settings
* up to 20 portfolio items per user
* portfolio items can be featured (pinned to top of grid)
* portfolio items can be shared as standalone posts into the feed or communities

---

## 49) Streaks and engagement nudges

Lightweight gamification to encourage consistent participation — without dark patterns.

### Streak system

* daily login streak: increments each day the user opens the app
* posting streak: increments each day the user creates at least one post
* reading streak: increments each day the user opens the activity hub and reads/watches something
* streaks displayed on profile as a small flame icon + count
* streak freeze: user gets 1 free streak freeze per week (auto-applied on a missed day)
* streak milestones trigger a congratulatory in-app notification (7 days, 30 days, 100 days)
* streaks are opt-out — user can disable streak tracking in settings

### Engagement nudges (non-intrusive)

* if user hasn't posted in 7 days, show a soft prompt in the feed: "Share what's on your mind"
* if user has unread activity in a community they joined, show a dot on the community icon
* if a friend just joined an activity room, show a subtle "X is in a reading room — join them?" card at the top of the activity hub
* all nudges are dismissible and frequency-capped (max 1 per session per nudge type)
* nudges never use guilt language — always positive framing

---

## 50) Localization and internationalization (i18n) readiness

Build the app so it can be translated without a rewrite.

### Requirements

* all user-facing strings extracted into a locale file (`src/locales/en.json` to start)
* no hardcoded English strings in JSX — all text via a `t()` translation function
* use a lightweight i18n library (e.g. `i18next` with `react-i18next`) — only add if the project doesn't already have one
* date/time formatting uses `Intl.DateTimeFormat` with the user's locale and timezone
* number formatting uses `Intl.NumberFormat`
* RTL layout support: use logical CSS properties (`margin-inline-start` instead of `margin-left`) throughout
* language preference stored in user profile doc
* language switcher in settings (initially only English available, but the infrastructure is ready)

### Timezone handling

* all timestamps stored in Firestore as UTC
* all timestamps displayed in the user's local timezone (from their profile `timezone` field)
* event times shown in both the event creator's timezone and the viewer's timezone
* timezone picker in onboarding and settings uses the IANA timezone database

---

## 51) Progressive disclosure UI pattern

The app should not overwhelm new users but should reveal depth as users engage more.

### Implementation

* new users see a simplified home feed with a "Getting started" card that guides them through: completing profile → joining a community → starting a chat → exploring the activity hub
* advanced features (collections, spaces, portfolio, scheduled posts, analytics) are hidden behind a "More" or "Advanced" toggle until the user has been active for at least 7 days or explicitly enables them
* community pages show a simplified view for guests/new members and a full view for active members
* settings page uses a "Basic" / "Advanced" tab split — basic covers the most common settings, advanced covers everything else
* feature discovery tooltips appear once on first use of a feature (stored in Firestore user doc as `seenTooltips` array) — never shown again after dismissed

---

## 52) Offline-first improvements

Go beyond a basic offline fallback page.

### Offline capabilities

* home feed: last loaded feed cached in service worker cache — readable offline, clearly labeled "Cached — last updated X minutes ago"
* chat: last 50 messages per conversation cached — readable offline
* profile pages: own profile cached — viewable offline
* communities list: cached — viewable offline
* compose while offline: user can write a post or message while offline — it queues locally and sends automatically when connection is restored
* offline queue indicator: a small banner shows "X items queued — waiting for connection"
* failed sends retry automatically with exponential backoff (max 3 retries)
* if a retry fails permanently, the draft is saved and the user is notified

### Service worker strategy

* shell (HTML/CSS/JS): cache-first
* API/Firestore data: network-first with cache fallback
* images: stale-while-revalidate
* third-party embeds: network-only (never cache)

---

## 53) Deep linking and share targets

Make every piece of content in the app shareable and directly linkable.

### Deep link structure

* `/u/:username` — user profile
* `/c/:communityId` — community
* `/g/:groupId` — group
* `/ch/:channelId` — channel
* `/e/:eventId` — event
* `/post/:postId` — individual post
* `/poll/:pollId` — poll
* `/activity/:sessionId` — activity session
* `/collection/:collectionId` — collection
* `/invite/:code` — invite link (community, group, or circle join)

### Share behavior

* every post, event, community, and profile has a "Share" button
* share options: copy link, share to feed, share to chat, share to circle, native share sheet (Web Share API on mobile)
* shared links render a rich Open Graph preview when pasted in other apps (title, description, image, site name)
* OG meta tags generated dynamically per route via a Cloudflare Worker that reads Firestore metadata and returns a pre-rendered HTML head

### PWA share target

* register the app as a share target in the web manifest
* when user shares a URL from another app to Buzquad, the app opens the post composer with the URL pre-filled and a link preview generated

---

## 54) Lightweight AI-assist features (free-tier compatible, no paid AI API)

Add useful writing and discovery assists using only free, client-side, or zero-cost approaches.

### Post composer assists

* character/word count with a soft limit warning (not a hard block)
* readability score (Flesch-Kincaid, computed client-side) shown as a subtle indicator
* hashtag suggestions: as user types, suggest relevant tags from the global tag taxonomy based on partial match — no AI needed, pure string matching against `/tags` collection
* mention autocomplete: `@` triggers a live search of followed users and community members

### Content discovery assists

* "More like this" button on any post — filters the feed by the post's tags client-side (no server-side ML needed)
* "You might like" section on the communities page — shows communities that share tags with communities the user already joined
* "People who follow X also follow" section on profile pages — computed from a lightweight Firestore query (followers of X who also follow Y)

### Rules

* no OpenAI, Anthropic, or any paid AI API
* no server-side ML model
* all "smart" features are pattern matching, tag overlap, or simple set intersection — fast, free, and privacy-preserving
* label all suggestions clearly as "Suggested" — never present them as authoritative

---

## 55) Community health and safety tools

Give community owners and moderators practical tools to keep their spaces healthy.

### Auto-moderation rules (configurable per community)

* word/phrase blocklist: posts or messages containing blocked words are held for moderator review before publishing
* link blocklist: posts containing links from a blocked domain list are auto-held
* new member posting cooldown: new members cannot post for the first X hours after joining (configurable: 0, 1, 6, 24 hours)
* spam detection: if a user posts more than N times in M minutes, their posts are auto-held and the user is flagged
* all auto-held content goes into the community moderation queue — not silently deleted

### Moderation queue

* community moderators see a "Moderation" tab in the community detail page
* queue shows: held posts, held messages, reported content, flagged users
* moderator can: approve, reject (with optional reason sent to author), escalate to admin, or dismiss
* all moderation actions logged with moderator uid, timestamp, and action taken

### Community health score (visible to admins only)

* a simple computed score based on: report rate, active member ratio, post approval rate, spam flag rate
* shown as a color-coded indicator (green/yellow/red) in the admin dashboard
* no external service — computed from existing Firestore data

### Trust levels

* new member (0–7 days in community)
* member (7+ days, no violations)
* trusted member (manually granted by moderator or auto-granted after 30 days + no violations)
* trusted members bypass the new-member posting cooldown and word filter hold

---

## 56) Event check-in and attendance tracking

Make events feel real and give hosts useful data.

### Check-in flow

* when an event starts, the host can open a "Check-in" mode from the event detail page
* a unique QR code is generated for the event (encodes the event ID + a short-lived token)
* attendees scan the QR code with their phone camera — opens the event page and auto-marks them as checked in
* alternatively, host can manually mark attendees as checked in from the guest list
* check-in status shown on the guest list: RSVP'd / Checked in / No-show

### Post-event

* after the event ends, host can publish an event recap (text + optional images)
* recap visible on the event detail page permanently
* attendees who checked in get a "Attended" badge on their profile for that event
* host sees attendance stats: RSVP count, check-in count, no-show count

---

## 57) Collaborative watchlist and shared shelves

Let users build shared lists together, not just personal ones.

### Shared watchlist / reading shelf

* any user can create a named list (e.g. "Movies to watch with Priya", "Our book club shelf")
* list can be shared with specific users, a circle, or a group
* shared list members can add/remove items and leave comments on items
* list has a chat thread attached (lightweight, last 100 messages)
* list items have: title, cover image, type (movie/book/series/game/etc.), added-by, status (want to / in progress / done), rating (1–5 stars), notes
* list visible on the profiles of all members who have it set to public
* list exportable as JSON or plain text

---

## 58) Buzquad Wrapped — annual personal recap

A shareable year-in-review card generated from the user's own activity data.

### What it shows

* total posts created
* total reactions received
* most used reaction given
* top community by activity
* top activity (books read, movies watched, etc.)
* longest streak
* first post of the year
* most liked post of the year
* new friends/connections made
* events attended

### Implementation

* generated on-demand (user taps "Generate my Wrapped" in settings or profile)
* computed from existing Firestore data — no separate analytics pipeline
* rendered as a visually styled card (Tailwind, no canvas needed)
* shareable as an image (use `html-to-image` or similar lightweight client-side library) or as a link to a public `/wrapped/:uid/:year` page
* data computed client-side from paginated Firestore queries — no server-side aggregation job needed
* only available for the current calendar year and the previous one
