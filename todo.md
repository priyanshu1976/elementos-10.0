# Auction Website – TODO

--------------------------------------------------
PHASE 1 – PLANNING
--------------------------------------------------
- [x] Finalize bidding rules
- [x] Decide tech stack
- [x] Decide authentication method
- [x] Decide DB schema
- [x] Decide timer strategy (Server based)

--------------------------------------------------
PHASE 2 – BACKEND CORE
--------------------------------------------------

## AUTH APIs
- [x] POST /api/auth/login
- [x] POST /api/auth/logout
- [x] POST /api/auth/refresh
- [x] GET  /api/auth/me

--------------------------------------------------

## TEAM APIs
- [x] GET  /api/team/profile
- [x] GET  /api/team/money
- [x] GET  /api/team/status
- [x] GET  /api/team/history
- [x] PATCH /api/team/eliminate

--------------------------------------------------

## ADMIN APIs
- [x] POST /api/admin/create-team
- [x] GET  /api/admin/teams
- [x] PATCH /api/admin/team-money
- [x] DELETE /api/admin/team
- [x] GET /api/admin/bids/live

--------------------------------------------------

## ITEM APIs
- [x] POST /api/item/create
- [x] GET  /api/item/current
- [x] GET  /api/item/all
- [x] PATCH /api/item/update
- [x] DELETE /api/item/delete

--------------------------------------------------

## AUCTION APIs
- [x] POST /api/auction/start
- [x] POST /api/auction/stop
- [x] GET  /api/auction/status
- [x] GET  /api/auction/timer
- [x] GET  /api/auction/result
- [x] POST /api/auction/restart

--------------------------------------------------

## BID APIs
- [x] POST /api/bid/place
- [x] PATCH /api/bid/update
- [x] GET  /api/bid/current-highest
- [x] GET  /api/bid/team
- [x] GET  /api/bid/history

--------------------------------------------------

## REALTIME (SOCKET EVENTS)
- [x] auction:start
- [x] auction:timer
- [x] bid:update
- [x] bid:highest
- [x] auction:finalPhase
- [x] auction:result
- [x] team:eliminated

--------------------------------------------------

PHASE 3 – FRONTEND PAGES
--------------------------------------------------

## PUBLIC
- [x] Login Page
- [x] 404 Page

--------------------------------------------------

## TEAM PAGES
- [x] Team Dashboard
- [x] Live Auction Screen
- [x] Bid Update Modal
- [x] Result Screen
- [x] History Page
- [x] Eliminated Screen

--------------------------------------------------

## ADMIN PAGES
- [x] Admin Login
- [x] Admin Dashboard
- [x] Team Management Page
- [x] Create Team Page
- [x] Item Management Page
- [x] Create Item Page
- [x] Live Bidding Monitor
- [x] Auction Control Panel
- [ ] Bid Logs Page

--------------------------------------------------

PHASE 4 – UI COMPONENTS
--------------------------------------------------
- [x] Navbar
- [ ] Sidebar
- [x] Timer Component
- [ ] Bid Card
- [ ] Team Card
- [ ] Modal
- [x] Toast Notifications
- [x] Loader
- [x] Table
- [ ] Pagination

--------------------------------------------------

PHASE 5 – AUCTION LOGIC
--------------------------------------------------
- [x] 3-minute bidding timer
- [x] Reveal highest bid
- [x] 1-minute rebid phase
- [x] Timestamp conflict resolution
- [x] Winner calculation
- [x] Deduct winner money
- [x] Eliminate winner
- [x] Deduct 10% from losers
- [x] Broadcast results

--------------------------------------------------

PHASE 6 – SECURITY
--------------------------------------------------
- [x] Role based middleware
- [ ] Rate limit bids
- [x] Prevent double submission
- [x] Validate timestamps
- [x] Secure cookies / tokens

--------------------------------------------------

PHASE 7 – TESTING
--------------------------------------------------
- [ ] Concurrent bidding tests
- [ ] Timer drift tests
- [x] Equal bid tests
- [x] Permission tests
- [x] Socket disconnect tests

--------------------------------------------------

PHASE 8 – DEPLOYMENT
--------------------------------------------------
- [x] Production DB (Docker Compose)
- [ ] CI/CD
- [ ] Monitoring
- [ ] Logging
- [ ] Backups
