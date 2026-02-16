# Auction Website – Architecture

## Tech Stack (Recommended)
Frontend: React / Next.js  
Backend: Node.js + Express  
Database: PostgreSQL or MongoDB  
Realtime: Socket.io  
Auth: JWT  
Hosting: Vercel (frontend) + Render / AWS (backend)

---

## Roles

### Team
- Login
- View dashboard
- Place bid
- Update bid
- Cannot bid after winning

### Admin
- Login
- Create item
- Start auction
- Monitor bids
- Stop auction manually

---

## Core Modules

### 1. Authentication Module
- JWT tokens
- Role based access
- Team vs Admin middleware

### 2. Auction Engine
Responsible for:
- Timers
- Bid validation
- Winner calculation
- Money deduction
- Team elimination

### 3. Realtime Service
- WebSockets
- Live bid updates
- Timer sync
- Winner broadcast

### 4. Database Models

#### Team
- id
- name
- leaderEmail
- passwordHash
- money
- isEliminated

#### Item
- id
- title
- description
- basePrice
- status

#### Bid
- id
- teamId
- itemId
- amount
- timestamp

#### Auction
- id
- itemId
- phase (OPEN / FINAL / CLOSED)
- startTime
- endTime
- finalEndTime

---

## Auction Flow

1. Admin sets item
2. Auction OPEN – 3 minutes
3. Highest bid revealed
4. FINAL phase – 1 minute rebid
5. Resolve clashes by timestamp
6. Winner decided
7. Deduct winner money
8. Winner eliminated
9. Losers lose 10%
10. Broadcast results

---

## Edge Cases
- Same bid amount
- Late bids
- Network delay
- Team disconnect
- Admin override
