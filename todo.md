# Auction Website – TODO

--------------------------------------------------
PHASE 1 – PLANNING
--------------------------------------------------
- [ ] Finalize bidding rules
- [ ] Decide tech stack
- [ ] Decide authentication method
- [ ] Decide DB schema
- [ ] Decide timer strategy (Server based)

--------------------------------------------------
PHASE 2 – BACKEND CORE
--------------------------------------------------

## AUTH APIs
- [ ] POST /api/auth/login
- [ ] POST /api/auth/logout
- [ ] POST /api/auth/refresh
- [ ] GET  /api/auth/me

--------------------------------------------------

## TEAM APIs
- [ ] GET  /api/team/profile
- [ ] GET  /api/team/money
- [ ] GET  /api/team/status
- [ ] GET  /api/team/history
- [ ] PATCH /api/team/eliminate

--------------------------------------------------

## ADMIN APIs
- [ ] POST /api/admin/create-team
- [ ] GET  /api/admin/teams
- [ ] PATCH /api/admin/team-money
- [ ] DELETE /api/admin/team
- [ ] GET /api/admin/bids/live

--------------------------------------------------

## ITEM APIs
- [ ] POST /api/item/create
- [ ] GET  /api/item/current
- [ ] GET  /api/item/all
- [ ] PATCH /api/item/update
- [ ] DELETE /api/item/delete

--------------------------------------------------

## AUCTION APIs
- [ ] POST /api/auction/start
- [ ] POST /api/auction/stop
- [ ] GET  /api/auction/status
- [ ] GET  /api/auction/timer
- [ ] GET  /api/auction/result
- [ ] POST /api/auction/restart

--------------------------------------------------

## BID APIs
- [ ] POST /api/bid/place
- [ ] PATCH /api/bid/update
- [ ] GET  /api/bid/current-highest
- [ ] GET  /api/bid/team
- [ ] GET  /api/bid/history

--------------------------------------------------

## REALTIME (SOCKET EVENTS)
- [ ] auction:start
- [ ] auction:timer
- [ ] bid:update
- [ ] bid:highest
- [ ] auction:finalPhase
- [ ] auction:result
- [ ] team:eliminated

--------------------------------------------------

PHASE 3 – FRONTEND PAGES
--------------------------------------------------

## PUBLIC
- [ ] Login Page
- [ ] 404 Page

--------------------------------------------------

## TEAM PAGES
- [ ] Team Dashboard
- [ ] Live Auction Screen
- [ ] Bid Update Modal
- [ ] Result Screen
- [ ] History Page
- [ ] Eliminated Screen

--------------------------------------------------

## ADMIN PAGES
- [ ] Admin Login
- [ ] Admin Dashboard
- [ ] Team Management Page
- [ ] Create Team Page
- [ ] Item Management Page
- [ ] Create Item Page
- [ ] Live Bidding Monitor
- [ ] Auction Control Panel
- [ ] Bid Logs Page

--------------------------------------------------

PHASE 4 – UI COMPONENTS
--------------------------------------------------
- [ ] Navbar
- [ ] Sidebar
- [ ] Timer Component
- [ ] Bid Card
- [ ] Team Card
- [ ] Modal
- [ ] Toast Notifications
- [ ] Loader
- [ ] Table
- [ ] Pagination

--------------------------------------------------

PHASE 5 – AUCTION LOGIC
--------------------------------------------------
- [ ] 3-minute bidding timer
- [ ] Reveal highest bid
- [ ] 1-minute rebid phase
- [ ] Timestamp conflict resolution
- [ ] Winner calculation
- [ ] Deduct winner money
- [ ] Eliminate winner
- [ ] Deduct 10% from losers
- [ ] Broadcast results

--------------------------------------------------

PHASE 6 – SECURITY
--------------------------------------------------
- [ ] Role based middleware
- [ ] Rate limit bids
- [ ] Prevent double submission
- [ ] Validate timestamps
- [ ] Secure cookies / tokens

--------------------------------------------------

PHASE 7 – TESTING
--------------------------------------------------
- [ ] Concurrent bidding tests
- [ ] Timer drift tests
- [ ] Equal bid tests
- [ ] Permission tests
- [ ] Socket disconnect tests

--------------------------------------------------

PHASE 8 – DEPLOYMENT
--------------------------------------------------
- [ ] Production DB
- [ ] CI/CD
- [ ] Monitoring
- [ ] Logging
- [ ] Backups
