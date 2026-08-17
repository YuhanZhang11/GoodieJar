# GoodieJar Design Document

## 1. Overview

GoodieJar is a mobile self-reward application that turns productive or meaningful activities into a personal coin economy.

Users can:

- Complete tasks to earn coins
- Save accumulated coins
- Redeem rewards by spending coins
- Record meaningful achievements and receive bonus coins
- Track daily activity
- Record daily mental exhaustion
- Record estimated and actual activity duration

The app should feel lightweight, cute, rewarding, and visually satisfying rather than like a traditional productivity or finance application.

The first version is local-first and does not require accounts, a backend server, or cloud synchronization.

---

## 2. Core Product Loop

```text
Complete meaningful activity
        ↓
Earn coins
        ↓
Save coins
        ↓
Redeem enjoyable rewards
```

The purpose of the system is to make effort feel tangible and make rewards intentional.

---

## 3. Long-Term Vision

In later versions, GoodieJar may adapt Task rewards and Reward costs based on user behavior.

Possible signals include:

- Estimated task duration
- Actual task duration
- Estimated reward duration
- Actual reward duration
- Daily mental exhaustion
- Historical earning/spending balance
- Frequency of Task completion
- Frequency of Reward redemption

Example:

```text
Task: Study ML

Current coin reward: 20
Estimated duration: 60 minutes

Historical behavior:
Average actual duration: 95 minutes
Mental exhaustion: consistently high

Possible future recommendation:
Increase reward from 20 → 30 coins
```

This adaptive reward system is NOT part of the MVP.

---

## 4. MVP Scope

### Included

The MVP should support:

- Create Task
- Edit Task
- Archive Task
- Complete Task
- Earn coins from Tasks
- Create Reward
- Edit Reward
- Archive Reward
- Redeem Reward
- Spend coins on Rewards
- Add Achievement
- Award coins for Achievement
- Record transaction history
- Record actual duration of an activity
- Record daily mental exhaustion
- Calculate current coin balance
- Review activities by day

### Not Included

The MVP does not initially include:

- Authentication
- User accounts
- Cloud synchronization
- Backend server
- Social functionality
- Shared accounts
- AI recommendations
- Automatic coin-value adjustment
- Push notifications
- Subscription/payment systems
- Complex analytics

---

## 5. Technology Stack

Current stack:

```text
React Native
Expo SDK 54
TypeScript
Expo Router
expo-sqlite
```

Development environment:

```text
Windows
VS Code
Expo
Physical iPhone/iPad testing with Expo Go
```

The MVP uses SQLite for local persistent storage.

No backend is required for V1.

---

## 6. Application Architecture

Preferred architecture:

```text
UI / Screens
      ↓
Service / Business Logic
      ↓
Database Layer
      ↓
SQLite
```

Responsibilities should remain separated.

```text
app/
    Screens and routing

components/
    Reusable UI components

models/
    TypeScript domain models

database/
    SQLite schema and database initialization

services/
    Business logic and database operations
```

UI components should not contain raw SQL beyond trivial cases.

---

## 7. Core Entities

GoodieJar currently has five primary entities:

```text
Task
Reward
Achievement
DailyLog
CoinTransaction
```

Their responsibilities are intentionally different.

---

## 8. Task

A Task represents a reusable activity that can earn coins.

Examples:

```text
Study ML
Go to the gym
Apply for a job
Read a paper
Clean apartment
```

A Task is a reusable definition/template.

Completing the Task does NOT delete it.

A Task can generate many CoinTransactions over time.

### TypeScript Model

```ts
export interface Task {
  id: string;
  name: string;
  description: string;

  coinReward: number;
  estimatedDurationMinutes: number | null;

  createdAt: string;
  archivedAt: string | null;
}
```

### Fields

#### `id`

Unique Task identifier.

UUID-style string IDs may be used.

#### `name`

Short Task name.

Example:

```text
Study ML
```

#### `description`

Additional Task description.

An empty string may be used when no description is provided.

#### `coinReward`

Number of coins received each time the Task is completed.

Example:

```text
Study ML
coinReward = 20
```

#### `estimatedDurationMinutes`

Expected/default duration of the Task.

Example:

```text
estimatedDurationMinutes = 60
```

means approximately one hour.

It may be `null` when the user does not provide an estimate.

#### `createdAt`

Timestamp when the Task was created.

#### `archivedAt`

```text
null
```

means the Task is active.

A timestamp means the Task has been archived.

Archiving removes a Task from active Task lists without destroying history.

---

## 9. Reward

A Reward represents something the user can redeem by spending coins.

Examples:

```text
Bubble tea
Watch a movie
Play games
Go out for dinner
Buy a small treat
```

Reward is also a reusable definition/template.

Redeeming a Reward does NOT automatically delete it.

### TypeScript Model

```ts
export interface Reward {
  id: string;
  name: string;
  description: string;

  coinCost: number;
  estimatedDurationMinutes: number | null;

  createdAt: string;
  archivedAt: string | null;
}
```

### `coinCost`

Number of coins required to redeem the Reward.

Example:

```text
Watch Movie
coinCost = 50
```

### `estimatedDurationMinutes`

Expected time associated with using the Reward.

Example:

```text
Watch Movie
estimatedDurationMinutes = 120
```

This can later be used to compare productive time and reward time.

---

## 10. Achievement

Achievement represents an important event that has already happened.

It is NOT currently designed as a future milestone that is created first and completed later.

The expected user flow is:

```text
Something meaningful happens
        ↓
User selects Add Achievement
        ↓
Achievement is recorded
        ↓
Coin bonus is awarded
```

Examples:

```text
Finished Master's thesis
Received a job offer
Reached an important research breakthrough
Completed a major project
```

### TypeScript Model

```ts
export interface Achievement {
  id: string;
  name: string;
  description: string;

  coinBonus: number;

  achievedAt: string;
  createdAt: string;

  archivedAt: string | null;
}
```

### `achievedAt`

Required.

Represents when the achievement actually occurred.

It should not be nullable because an Achievement is created only after the achievement has happened.

### `createdAt`

Represents when the Achievement record was entered into GoodieJar.

This may differ from `achievedAt`.

Example:

```text
Achievement happened:
August 10

Achievement added to GoodieJar:
August 17
```

Then:

```text
achievedAt = August 10
createdAt = August 17
```

### `coinBonus`

Coins awarded for the Achievement.

---

## 11. DailyLog

DailyLog represents information belonging to an entire calendar day rather than one specific activity.

### TypeScript Model

```ts
export interface DailyLog {
  id: string;
  date: string;

  mentalExhaustion: number | null;
}
```

There should be at most one DailyLog per calendar date.

Therefore the database `date` field should be unique.

Example:

```text
DailyLog

date = 2026-08-17
mentalExhaustion = 7
```

---

## 12. Mental Exhaustion

`mentalExhaustion` represents how mentally exhausted the user feels for the day.

Possible future UI:

```text
0 -------------------- 10
Fresh              Exhausted
```

Missing data and zero are different.

```text
mentalExhaustion = null
```

means:

```text
User did not provide a value.
```

While:

```text
mentalExhaustion = 0
```

means:

```text
User explicitly reported no exhaustion.
```

This distinction should be preserved.

---

## 13. CoinTransaction

CoinTransaction is the historical ledger of the GoodieJar coin economy.

Task, Reward, and Achievement describe why a balance change can happen.

CoinTransaction records the actual balance change that happened.

Examples:

```text
+20 Study ML
-30 Bubble Tea
+100 Received Job Offer
```

### TypeScript Model

```ts
export type TransactionType = 'EARN' | 'SPEND';

export interface CoinTransaction {
  id: string;
  type: TransactionType;

  amount: number;
  actualDurationMinutes: number | null;

  sourceName: string;

  taskId: string | null;
  rewardId: string | null;
  achievementId: string | null;

  dailyLogId: string;

  occurredAt: string;
}
```

---

## 14. Transaction Amount Rule

Transaction amount should always be stored as a positive number.

Correct:

```text
type = EARN
amount = 20
```

Correct:

```text
type = SPEND
amount = 30
```

Do NOT store:

```text
type = SPEND
amount = -30
```

Whether the amount increases or decreases balance is determined by `type`.

Current balance:

```text
SUM(EARN)
-
SUM(SPEND)
=
current balance
```

---

## 15. Transaction Sources

A transaction normally corresponds to exactly one source.

### Task Completion

```text
type = EARN

taskId = task123
rewardId = null
achievementId = null
```

### Reward Redemption

```text
type = SPEND

taskId = null
rewardId = reward123
achievementId = null
```

### Achievement

```text
type = EARN

taskId = null
rewardId = null
achievementId = achievement123
```

---

## 16. `sourceName` Snapshot

CoinTransaction stores:

```ts
sourceName: string;
```

even though the source entity also contains a name.

This duplication is intentional.

Example:

```text
Task name:
Study ML

Transaction sourceName:
Study ML
```

Suppose the Task is later renamed:

```text
Study ML
→
Study AI
```

Historical transactions should not retroactively change.

The transaction still contains:

```text
sourceName = "Study ML"
```

This also allows transaction history to remain understandable if the original Task or Reward is later deleted.

---

## 17. Estimated Duration vs Actual Duration

Task and Reward store:

```text
estimatedDurationMinutes
```

CoinTransaction stores:

```text
actualDurationMinutes
```

Example:

```text
Task:
Study ML

estimatedDurationMinutes = 60
```

Actual completion:

```text
CoinTransaction:

actualDurationMinutes = 95
```

This distinction is intentional and important for future personalization.

---

## 18. DailyLog and Transaction Relationship

One DailyLog can contain many CoinTransactions.

Example:

```text
DailyLog
2026-08-17

mentalExhaustion = 7

    ├── +20 Study ML
    ├── +10 Workout
    ├── -30 Bubble Tea
    └── +100 Job Offer
```

Database relationship:

```text
DailyLog 1
    ↓
CoinTransaction many
```

Each CoinTransaction stores:

```text
dailyLogId
```

---

## 19. Daily Aggregates

DailyLog should NOT initially duplicate values that can be calculated from CoinTransaction.

Do not store:

```text
totalCoinsEarned
totalCoinsSpent
totalTaskDuration
totalRewardDuration
```

unless there is a future performance reason to cache them.

Instead calculate:

```text
dailyCoinsEarned =
SUM(EARN transactions)
```

```text
dailyCoinsSpent =
SUM(SPEND transactions)
```

Task time can be calculated using Task-linked transactions.

Reward time can be calculated using Reward-linked transactions.

This avoids redundant data and synchronization bugs.

---

## 20. Entity Relationships

High-level relationship:

```text
Task ───────────────┐
                    │
Reward ─────────────┼──> CoinTransaction ───> DailyLog
                    │
Achievement ────────┘
```

More specifically:

```text
Task
1 → many CoinTransactions

Reward
1 → many CoinTransactions

Achievement
1 → normally 1 CoinTransaction

DailyLog
1 → many CoinTransactions
```

---

## 21. Complete Task Business Rule

When a user completes a Task:

```text
Task
 ↓
Create CoinTransaction
```

Transaction should contain approximately:

```text
type = EARN
amount = Task.coinReward
sourceName = Task.name
taskId = Task.id
rewardId = null
achievementId = null
actualDurationMinutes = user-provided value or null
occurredAt = completion timestamp
```

The original Task remains available for future completion.

---

## 22. Redeem Reward Business Rule

When a user redeems a Reward:

```text
Reward
 ↓
Create CoinTransaction
```

Transaction should contain approximately:

```text
type = SPEND
amount = Reward.coinCost
sourceName = Reward.name
taskId = null
rewardId = Reward.id
achievementId = null
actualDurationMinutes = user-provided value or null
occurredAt = redemption timestamp
```

The Reward remains available unless the user archives or deletes it.

---

## 23. Add Achievement Business Rule

When a user records an Achievement:

```text
Create Achievement
        ↓
Create EARN CoinTransaction
```

Transaction:

```text
type = EARN
amount = Achievement.coinBonus
sourceName = Achievement.name
taskId = null
rewardId = null
achievementId = Achievement.id
occurredAt = Achievement.achievedAt
```

---

## 24. DailyLog Creation Rule

Whenever an activity occurs, GoodieJar should associate it with the DailyLog corresponding to that calendar date.

If the DailyLog for that date already exists:

```text
Use existing DailyLog
```

If it does not exist:

```text
Create DailyLog
date = transaction date
mentalExhaustion = null
```

Then attach the CoinTransaction to that DailyLog.

Example:

```text
Complete Task on 2026-08-17
        ↓
Find DailyLog for 2026-08-17
        ↓
Does not exist
        ↓
Create DailyLog
        ↓
Create CoinTransaction with dailyLogId
```

---

## 25. Editing Task or Reward

Editing a Task or Reward should affect future usage only.

Example:

```text
August 17

Study ML
coinReward = 20

User completes it:
+20
```

Later:

```text
August 20

Study ML
coinReward changes to 30
```

The August 17 transaction must remain:

```text
+20
```

It must NOT retroactively become:

```text
+30
```

Transaction amount therefore stores a snapshot of the amount at the time the event occurred.

---

## 26. Archiving

Task and Reward support archiving.

```text
archivedAt = null
```

means active.

```text
archivedAt = timestamp
```

means archived.

Archived items should normally disappear from active lists but remain available to historical relationships.

Archiving is preferred over deleting when possible.

Achievement may also be archived if the UI needs to hide an entry without deleting historical information.

---

## 27. Hard Deletion

If a user permanently deletes a Task or Reward, existing transaction history should survive.

For this reason:

```text
CoinTransaction.taskId
CoinTransaction.rewardId
CoinTransaction.achievementId
```

may become null if the source is deleted.

However:

```text
sourceName
amount
occurredAt
```

remain stored on CoinTransaction.

Historical data should remain readable.

---

## 28. Current SQLite Tables

The SQLite database contains or is intended to contain:

```text
tasks
rewards
daily_logs
achievements
coin_transactions
```

---

## 29. `tasks` Table

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  coin_reward INTEGER NOT NULL,
  estimated_duration_minutes INTEGER,

  created_at TEXT NOT NULL,
  archived_at TEXT
);
```

---

## 30. `rewards` Table

```sql
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  coin_cost INTEGER NOT NULL,
  estimated_duration_minutes INTEGER,

  created_at TEXT NOT NULL,
  archived_at TEXT
);
```

---

## 31. `daily_logs` Table

```sql
CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL UNIQUE,

  mental_exhaustion INTEGER
);
```

---

## 32. `achievements` Table

```sql
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  coin_bonus INTEGER NOT NULL,

  achieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  archived_at TEXT
);
```

---

## 33. `coin_transactions` Table

```sql
CREATE TABLE IF NOT EXISTS coin_transactions (
  id TEXT PRIMARY KEY NOT NULL,

  type TEXT NOT NULL
    CHECK (type IN ('EARN', 'SPEND')),

  amount INTEGER NOT NULL,
  actual_duration_minutes INTEGER,

  source_name TEXT NOT NULL,

  task_id TEXT,
  reward_id TEXT,
  achievement_id TEXT,

  daily_log_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,

  FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE SET NULL,

  FOREIGN KEY (reward_id)
    REFERENCES rewards(id)
    ON DELETE SET NULL,

  FOREIGN KEY (achievement_id)
    REFERENCES achievements(id)
    ON DELETE SET NULL,

  FOREIGN KEY (daily_log_id)
    REFERENCES daily_logs(id)
);
```

---

## 34. Database Configuration

SQLite initialization should enable:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

Database filename:

```text
goodiejar.db
```

Tables should use:

```sql
CREATE TABLE IF NOT EXISTS
```

so initialization can safely run whenever the app starts.

---

## 35. Date and Time Representation

TypeScript currently represents timestamps as strings.

Example:

```text
2026-08-17T18:20:00.000Z
```

This simplifies persistence through SQLite and future JSON/cloud synchronization.

Convert to JavaScript Date objects only when needed:

```ts
new Date(timestamp)
```

`DailyLog.date` should represent a calendar date rather than a precise timestamp.

Example:

```text
2026-08-17
```

---

## 36. Current Balance

Current coin balance should initially be derived from CoinTransaction rather than stored independently.

Conceptually:

```text
balance =
SUM(amount WHERE type = EARN)
-
SUM(amount WHERE type = SPEND)
```

This makes CoinTransaction the source of truth for coin history.

A cached balance may be introduced later only if performance requires it.

---

## 37. Initial User Flows

### Create Task

```text
Tasks
 ↓
Add Task
 ↓
Enter name
 ↓
Optional description
 ↓
Set coin reward
 ↓
Optional estimated duration
 ↓
Save
```

### Complete Task

```text
Select Task
 ↓
Complete
 ↓
Optional actual duration
 ↓
Find/Create DailyLog
 ↓
Create EARN transaction
 ↓
Balance increases
```

### Create Reward

```text
Rewards
 ↓
Add Reward
 ↓
Enter name
 ↓
Optional description
 ↓
Set coin cost
 ↓
Optional estimated duration
 ↓
Save
```

### Redeem Reward

```text
Select Reward
 ↓
Redeem
 ↓
Optional actual duration
 ↓
Find/Create DailyLog
 ↓
Create SPEND transaction
 ↓
Balance decreases
```

### Add Achievement

```text
Achievements
 ↓
Add Achievement
 ↓
Name
 ↓
Description
 ↓
Coin bonus
 ↓
Achievement date
 ↓
Save Achievement
 ↓
Find/Create DailyLog
 ↓
Create EARN transaction
```

---

## 38. Future Calendar / History

Daily history should eventually be generated from:

```text
DailyLog
+
CoinTransaction
```

Example:

```text
August 17

Mental exhaustion: 7/10

Earned: 130
Spent: 30

Activities:

+20  Study ML
+10  Workout
-30  Bubble Tea
+100 Job Offer
```

The totals should normally be calculated from transaction data.

---

## 39. Future Adaptive Coin Economy

The future adaptive system may use historical data to determine whether Task rewards or Reward prices are poorly calibrated.

Potential signals:

```text
Task estimated duration
Task actual duration

Reward estimated duration
Reward actual duration

Daily mental exhaustion

Coin income
Coin spending

Long-term balance

Frequency of Task completion
Frequency of Reward redemption
```

Example:

```text
Task:
Study ML

Coin reward:
20 coins

Expected:
60 min

Observed:
95 min average

Daily exhaustion on Task-heavy days:
8/10
```

The system may conclude that 20 coins undervalues the Task.

Potential recommendation:

```text
Increase Study ML:
20 → 30 coins
```

The exact algorithm is intentionally deferred.

---

## 40. Development Principles

When implementing GoodieJar:

1. Keep the MVP simple.
2. Prefer understandable code over unnecessary abstraction.
3. Preserve historical data.
4. Do not introduce a backend unless required.
5. Keep database logic separate from UI logic.
6. Use parameterized SQLite queries.
7. Do not modify historical CoinTransactions when Task or Reward values change.
8. Avoid storing values that can easily be derived.
9. Use nullable fields when "not provided" is meaningfully different from zero.
10. Implement one layer at a time.
11. Do not redesign the existing schema without a concrete reason.
12. Avoid unnecessary dependencies.
13. Keep the local-first architecture for the MVP.

---

## 41. Current Development Status

Completed:

```text
Expo project initialization
iPhone Expo Go development environment
TypeScript domain models
SQLite schema design
SQLite database initialization
```

Current models:

```text
Task
Reward
Achievement
DailyLog
CoinTransaction
```

Current database tables:

```text
tasks
rewards
achievements
daily_logs
coin_transactions
```

---

## 42. Next Development Step

The next implementation phase should be the database/service layer.

Recommended order:

```text
Task CRUD
    ↓
Reward CRUD
    ↓
DailyLog operations
    ↓
Transaction operations
    ↓
Achievement operations
    ↓
Business logic
    ↓
UI
```

First Task operations:

```text
createTask()
getTaskById()
getActiveTasks()
updateTask()
archiveTask()
```

After Task CRUD is validated against SQLite, implement equivalent Reward functionality.

Do not redesign the UI before the core data flow works reliably.

---

## 43. First Functional Milestone

The first end-to-end GoodieJar milestone should be:

```text
Create Task
 ↓
Save to SQLite
 ↓
Display Task
 ↓
Complete Task
 ↓
Find/Create DailyLog
 ↓
Create EARN transaction
 ↓
Balance increases
 ↓
Close app
 ↓
Reopen app
 ↓
Data still exists
```

Then:

```text
Create Reward
 ↓
Save to SQLite
 ↓
Redeem Reward
 ↓
Create SPEND transaction
 ↓
Balance decreases
```

Once both flows work, the core GoodieJar economy exists.

---

## 44. Codex Implementation Guidance

Before implementing new features:

1. Read this document.
2. Inspect the existing repository.
3. Preserve the existing domain model unless a change is necessary.
4. Explain any proposed schema changes before implementing them.
5. Work on one logical layer or feature at a time.
6. Do not implement unrelated features.
7. Do not add cloud/backend infrastructure unless explicitly requested.
8. Keep transaction history as the source of truth for coin balance.
9. Keep historical transaction values immutable when source entities are edited.
10. Prefer simple, maintainable code suitable for an MVP.