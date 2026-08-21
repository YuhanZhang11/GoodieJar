# GoodieJar Design Document

## 1. Overview

GoodieJar is a mobile self-reward application that turns productive or meaningful activities into a personal coin economy.

Users can:

- Plan reusable Tasks as independent Daily Task Entries
- Run persistent Focus Sessions and earn coins from actual active time
- Save accumulated coins
- Redeem rewards by spending coins
- Record meaningful achievements and receive bonus coins
- Set and finish Daily Goals for bonus coins
- Review daily activity in Calendar
- Record planned and actual activity duration

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

Current base rate: 20 coins/hour
Estimated duration: 60 minutes

Historical behavior:
Average actual duration: 95 minutes
Mental exhaustion: consistently high

Possible future recommendation:
Increase base rate from 20 to 30 coins/hour
```

This adaptive reward system is NOT part of the MVP.

---

## 4. MVP Scope

### Included

The MVP should support:

- Create, edit, and archive reusable Tasks
- Add independent Daily Task Entries to Today
- Start, pause, resume, extend, and stop persistent Focus Sessions
- Add the same Task to one day more than once
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
- Calculate current coin balance
- Review activities by day
- Create, edit, track, and explicitly finish Daily Goals
- Award Focus, Task, and Combo Daily Goal bonuses at Finish Today

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
- Remote push notifications
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

Current bottom tabs are:

```text
Tasks
Rewards
Achievements
Calendar
```

Tasks is also the Today/home-like surface. GoodieJar does not have a separate Home tab.

---

## 7. Core Entities

GoodieJar currently has these primary domain entities:

```text
TaskCategory
Task
DailyTaskPlan (conceptually a Daily Task Entry)
TaskSession
Reward
Achievement
DailyLog
DailyGoal
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
  categoryId: string;

  coinsPerHour: number;
  isFocused: boolean;
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

#### `categoryId`

Current organizational category for the reusable Task template.

TaskCategory is classification metadata. Reward behavior does not live on the Category.

#### `coinsPerHour`

Positive base earning rate for the Task.

Example:

```text
Study ML
coinsPerHour = 40
```

#### `isFocused`

Controls the Task's reward behavior.

```text
false = linear reward by active duration
true  = the centralized marginal Focused reward curve
```

The Focused curve belongs to each Task and is never inferred from its Category.

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

### Daily Task Entry

`DailyTaskPlan` is the implementation model for one concrete occurrence of a reusable Task on a local calendar day. Product terminology may describe it as a Daily Task Entry.

The same Task may be added to the same day more than once. Each entry has its own:

- `id`, which is the occurrence identity
- Goal Duration
- Priority
- Goal Reward
- Task and Category snapshots
- Focus Session and final payout

`DailyTaskPlan.id`, not `taskId + dailyLogId` or a timestamp, identifies the occurrence.

Goal Reward may be manually overridden before Start. The plan preserves the suggested raw and displayed values so the later session can apply the existing reward-scale semantics precisely.

### Focus Session

`TaskSession` represents actual execution of one Daily Task Entry from Start through Pause/Resume/Stop.

Session state is derived from timestamps:

```text
RUNNING: activeStartedAt != null and endedAt == null
PAUSED:  activeStartedAt == null and endedAt == null
ENDED:   endedAt != null
```

Only one open TaskSession exists globally. A paused session is still open and blocks starting another session.

Start freezes the plan's Goal Duration and reward inputs. Later Task template edits do not change an existing plan or session.

Stop may occur before or after the entry's Goal Duration. It creates exactly one immutable EARN CoinTransaction based on actual active time. Paused time does not count, and an interval tick is never the authoritative timer.

For a non-Focused Task, raw reward is linear:

```text
coinsPerHour * activeSeconds / 3600
```

Focused Tasks use the existing centralized marginal Focused reward curve. The calculation accumulates raw values across crossed intervals and rounds only the final reward.

When the user accepts the suggested Goal Reward, session reward scale is `1`. When the Goal Reward is manually overridden, the frozen session uses:

```text
rewardScale = plannedCoinAmountSnapshot / suggestedRawCoinAmountSnapshot
```

An ended session is not automatically a Completed Task for Daily Goal purposes. A Daily Task Entry counts once toward the Daily Completed Tasks Goal only when:

```text
TaskSession.endedAt != null
AND
TaskSession.accumulatedSeconds >= TaskSession.goalDurationSecondsSnapshot
```

Therefore a session stopped early still receives its normal Task payout but does not count toward that Daily Goal. An open session above its Goal Duration does not count until Stop. Repeated entries count independently.

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

### Daily Goals

The Tasks tab is the Today/home-like surface. Daily Goals appear above today's Daily Task Entries; there is no separate Home tab.

Daily Goals V1 has exactly two user-set targets:

1. Focus Time Goal
2. Completed Tasks Goal

Category-specific goals and rewards do not exist in V1. Category focus data is reserved for insights and visualization.

There is at most one DailyGoal per DailyLog. It has two conceptual states.

#### OPEN

```text
finishedAt == null
```

- Targets may be created or edited at any time during that local calendar day.
- All progress from the day counts, including progress before goal creation.
- Progress is dynamically derived from TaskSessions.
- Bonus amounts are dynamic previews.
- Reaching a goal is informational and does not issue coins.

There is no first-session locking rule.

Example:

```text
Already completed today:
Focus Time = 120 minutes
Completed Tasks = 2

New targets:
Focus Goal = 180 minutes
Task Goal = 4

Displayed progress:
120 / 180 minutes
2 / 4 tasks
```

#### FINISHED

The user explicitly presses `Finish Today`. This is the settlement boundary.

At Finish Today, the app transactionally:

1. Verifies that no RUNNING or PAUSED TaskSession belongs to the DailyLog.
2. Derives final Focus Time and Completed Tasks.
3. Calculates the final typical hourly rate and bonus amounts.
4. Snapshots the final progress and economy values.
5. Sets `finishedAt`.
6. Creates qualifying immutable Daily Goal CoinTransactions exactly once.

Finish Today does not stop an open session silently. The user must Stop that session first.

After Finish Today, targets and results are immutable. The user may still add, start, and stop Tasks normally, but later work cannot change the finalized Daily Goal result or earn another Daily Goal bonus for that date.

### Daily Focus Time

Daily Focus Time is derived rather than stored as a rolling aggregate.

For TaskSessions whose Daily Task Entry belongs to the DailyLog:

```text
PAUSED or ENDED contribution = accumulatedSeconds

RUNNING contribution =
accumulatedSeconds + current active segment since activeStartedAt
```

Paused wall-clock time does not count. For V1, active time is attributed to the Daily Task Entry's local DailyLog date rather than splitting sessions at midnight.

At Finish Today, `finalFocusSecondsSnapshot` freezes the result.

### Daily Goal Economy Calibration

The user does not configure an economy scale. GoodieJar derives `typicalHourlyRate` from:

- Completed TaskSessions from the previous 14 local calendar dates
- The current date excluded
- `TaskSession.coinsPerHourSnapshot` as the value
- `TaskSession.accumulatedSeconds` as the weight

The weighted median is the hourly rate where cumulative active-time weight first reaches at least 50% of total weight.

If no usable session history exists, use the ordinary median `coinsPerHour` of active Tasks. For an even count, average the two middle rates. If neither source exists, Daily Goal bonus calculation remains unavailable until an active Task exists.

### Daily Goal Bonus Formulas

```text
rawFocusBonus =
typicalHourlyRate
* (focusGoalMinutes / 60)
* 0.10

focusBonusAmount = Math.round(rawFocusBonus)
```

The minimum Completed Tasks Goal is 3.

```text
taskTier = Math.ceil(taskGoalCount / 3)

rawTaskBonus =
typicalHourlyRate
* 0.125
* taskTier

taskBonusAmount = Math.round(rawTaskBonus)
```

At a typical hourly rate of 40:

```text
3 tasks = +5
4-6 tasks = +10
7-9 tasks = +15
```

```text
rawComboBonus = typicalHourlyRate * 0.25
comboBonusAmount = Math.round(rawComboBonus)
```

Each component is calculated fully and rounded once with `Math.round`. There is no minimum one-coin bonus. A reached component may validly snapshot zero coins without creating an invalid zero-amount transaction.

### Daily Goal Settlement

While OPEN, reached bonuses are pending and balance does not change.

At finalization:

```text
focusReached =
finalFocusSecondsSnapshot >= focusGoalMinutes * 60

taskReached =
finalCompletedTaskCountSnapshot >= taskGoalCount

comboReached = focusReached && taskReached
```

Create FOCUS, TASK, or COMBO transactions only for reached components whose final snapshot amount is greater than zero. Settlement uses one transaction-safe, idempotent path and enforces at most one payout per `dailyGoalId + goalBonusKind`.

### DailyGoal Model

```ts
export interface DailyGoal {
  id: string;
  dailyLogId: string;
  focusGoalMinutes: number;
  taskGoalCount: number;

  typicalHourlyRateSnapshot: number | null;
  focusBonusAmountSnapshot: number | null;
  taskBonusAmountSnapshot: number | null;
  comboBonusAmountSnapshot: number | null;
  finalFocusSecondsSnapshot: number | null;
  finalCompletedTaskCountSnapshot: number | null;

  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Rate, bonus, and final progress snapshots are null while OPEN because previews are dynamic. Finish Today fills them with the frozen settlement/result values. Reached flags and rolling daily totals remain derived rather than separately persisted.

---

## 12. Mental Exhaustion

`mentalExhaustion` represents how mentally exhausted the user feels for the day.

The field is reserved in the local model, but mental-exhaustion input and adaptive behavior are planned rather than part of the current functional UI.

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
export type GoalBonusKind = 'FOCUS' | 'TASK' | 'COMBO';

export interface CoinTransaction {
  id: string;
  type: TransactionType;

  amount: number;
  actualDurationMinutes: number | null;

  sourceName: string;

  taskId: string | null;
  rewardId: string | null;
  achievementId: string | null;
  dailyGoalId: string | null;
  goalBonusKind: GoalBonusKind | null;

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

Balance is never clamped to zero. A negative balance is valid and means the user spent coins in advance and can earn them back later.

---

## 15. Transaction Sources

A transaction normally corresponds to exactly one source.

Exactly one main source ID is non-null among Task, Reward, Achievement, and DailyGoal.

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

### Daily Goal Bonus

```text
type = EARN

taskId = null
rewardId = null
achievementId = null
dailyGoalId = dailyGoal123
goalBonusKind = FOCUS | TASK | COMBO
```

Daily Goal source names are immutable snapshots such as `Focus Goal Bonus`, `Task Goal Bonus`, and `Daily Goals Combo Bonus`.

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

For the current Task flow, a Daily Task Entry stores planned duration and TaskSession stores exact active seconds. The final Task CoinTransaction stores the compatible whole-minute actual-duration snapshot, while TaskSession remains the precise timing source.

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

Task focus time is derived from TaskSessions and their Daily Task Entries.

Reward time can be calculated using Reward-linked transactions.

Daily Goal progress is also derived while OPEN. Only the final Focus Time and Completed Tasks result is snapshotted at Finish Today.

This avoids redundant data and synchronization bugs.

---

## 20. Entity Relationships

High-level relationship:

```text
Task -> DailyTaskPlan -> TaskSession -> CoinTransaction
Reward ------------------------------> CoinTransaction
Achievement -------------------------> CoinTransaction
DailyGoal ---------------------------> CoinTransaction

DailyLog -> DailyTaskPlan many
DailyLog -> DailyGoal zero or one
DailyLog -> CoinTransaction many
```

More specifically:

```text
Task
1 -> many DailyTaskPlans
1 -> many CoinTransactions

DailyTaskPlan
1 -> zero or one TaskSession

TaskSession
1 -> zero or one payout CoinTransaction

Reward
1 → many CoinTransactions

Achievement
1 -> one initial CoinTransaction and optional immutable correction transactions

DailyGoal
1 -> at most one FOCUS, one TASK, and one COMBO CoinTransaction

DailyLog
1 -> many CoinTransactions
```

---

## 21. Stop TaskSession Business Rule

The user adds a reusable Task as a Daily Task Entry, then starts its TaskSession.

```text
Task
 -> DailyTaskPlan
 -> Start TaskSession
 -> Pause/Resume as needed
 -> Stop
 -> Create CoinTransaction
```

Stop calculates reward from exact accumulated active time using the session's frozen rate, Focused setting, and Goal Reward scale. It creates exactly one EARN transaction and records the transaction ID on TaskSession.

Transaction contains approximately:

```text
type = EARN
amount = final whole-coin TaskSession reward
sourceName = Task name snapshot
taskId = Task.id
rewardId = null
achievementId = null
dailyGoalId = null
actualDurationMinutes = compatible actual active minutes
occurredAt = Stop timestamp
```

The Daily Task Entry and TaskSession remain persisted as history. The reusable Task remains available for future entries.

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

Redemption does not require sufficient current balance. A SPEND transaction may make the ledger-derived balance negative.

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

Achievement edits correct the same historical event. A coinBonus change creates an additional immutable EARN or SPEND delta transaction rather than changing the original transaction. Deleting an Achievement archives it and creates an immutable SPEND reversal of its current contribution. Calendar presents the current active Achievement as one corrected event rather than exposing raw correction rows.

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
Stop TaskSession on 2026-08-17
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
coinsPerHour = 20

User starts a frozen Daily Task Entry and later Stops:
final payout = +20
```

Later:

```text
August 20

Study ML
coinsPerHour changes to 30
```

The August 17 Daily Task Entry, TaskSession snapshots, and transaction must remain:

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

Task, Reward, TaskCategory, and Achievement support archiving.

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

The user-facing Achievement Delete action archives the event and preserves its immutable ledger history.

---

## 27. Hard Deletion

Current Task, Reward, Category, and Achievement removal flows use soft archive rather than hard deletion.

If permanent deletion is introduced later, existing transaction and Daily Task Entry history must still survive. Hard deletion must not violate the exactly-one-source ledger invariant.

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

The SQLite database contains:

```text
task_categories
tasks
rewards
daily_logs
achievements
coin_transactions
daily_task_plans
task_sessions
daily_goals
```

---

## 29. `tasks` Table

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT NOT NULL,

  -- Retained physically for migration compatibility; not the active reward model.
  coin_reward INTEGER NOT NULL,
  coins_per_hour INTEGER NOT NULL,
  is_focused INTEGER NOT NULL,
  estimated_duration_minutes INTEGER,

  created_at TEXT NOT NULL,
  archived_at TEXT,

  FOREIGN KEY (category_id)
    REFERENCES task_categories(id)
);
```

The active TypeScript and product reward model uses `coins_per_hour` and `is_focused`. The legacy `coin_reward` column remains only to preserve safe migration compatibility.

Related Task tables preserve occurrence and execution history:

```text
daily_task_plans
  id (occurrence identity)
  task_id
  daily_log_id
  category_id snapshot
  planned_duration_minutes
  planned_coin_amount
  coins_per_hour_snapshot
  is_focused_snapshot
  suggested_raw_coin_amount
  suggested_coin_amount
  priority
  created_at

task_sessions
  id
  task_plan_id (unique)
  started_at / active_started_at / accumulated_seconds / ended_at
  extended_at
  frozen Goal Duration and reward snapshots
  coin_transaction_id
  goal_notification_id
  created_at
```

There is no same-Task/same-day uniqueness constraint on `daily_task_plans`. There is at most one TaskSession per Daily Task Entry and at most one globally open TaskSession.

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

Each DailyLog may have one `daily_goals` row:

```text
daily_goals
  id
  daily_log_id (unique)
  focus_goal_minutes
  task_goal_count
  typical_hourly_rate_snapshot (nullable while OPEN)
  focus_bonus_amount_snapshot (nullable while OPEN)
  task_bonus_amount_snapshot (nullable while OPEN)
  combo_bonus_amount_snapshot (nullable while OPEN)
  final_focus_seconds_snapshot (nullable while OPEN)
  final_completed_task_count_snapshot (nullable while OPEN)
  finished_at
  created_at
  updated_at
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
  daily_goal_id TEXT,
  goal_bonus_kind TEXT,

  daily_log_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,

  CHECK (
    (task_id IS NOT NULL)
    + (reward_id IS NOT NULL)
    + (achievement_id IS NOT NULL)
    + (daily_goal_id IS NOT NULL)
    = 1
  ),

  FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE SET NULL,

  FOREIGN KEY (reward_id)
    REFERENCES rewards(id)
    ON DELETE SET NULL,

  FOREIGN KEY (achievement_id)
    REFERENCES achievements(id)
    ON DELETE SET NULL,

  FOREIGN KEY (daily_goal_id)
    REFERENCES daily_goals(id),

  FOREIGN KEY (daily_log_id)
    REFERENCES daily_logs(id)
);
```

Daily Goal transactions additionally require an EARN type and a `goal_bonus_kind` of `FOCUS`, `TASK`, or `COMBO`. A unique partial index permits at most one row per `daily_goal_id + goal_bonus_kind`.

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

Current schema version is `9`.

Version 9 replaced the tested-but-abandoned v8 DailyGoal first-session-locking shape with the final `finishedAt` settlement model. Old v8 goals migrate OPEN/editable, obsolete preview snapshots are cleared, and all immutable CoinTransactions are preserved. If an old threshold payout already exists, Finish Today treats that bonus kind as already paid and does not duplicate it.

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

Negative balance is valid and Reward redemption is not pre-authorized from a UI balance value.

A cached balance may be introduced later only if performance requires it.

---

## 37. Initial User Flows

### Create Task

```text
Tasks
 ↓
Open Task Library
 ↓
Enter name
 ↓
Optional description
 ↓
Choose Category
 ↓
Set Base Coins / Hour and Focused mode
 ↓
Save reusable Task
```

### Add and Run a Daily Task Entry

```text
Select existing or newly created Task
 ↓
Choose Goal Duration, Priority, and Goal Reward
 ↓
Add to Today
 ↓
Start Focus Session
 ↓
Pause/Resume as needed
 ↓
Stop
 ↓
Create one actual-time EARN transaction
```

### Daily Goals

```text
Tasks / Today
 ↓
Set or edit Focus Time and Completed Tasks goals
 ↓
Track dynamic progress and pending bonus previews
 ↓
Stop any open Focus Session
 ↓
Finish Today
 ↓
Snapshot final results and settle qualifying bonuses exactly once
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

## 38. Calendar / History

Calendar is implemented as user-facing activity history rather than a raw ledger dump.

- Task completions use immutable CoinTransaction name and amount snapshots.
- Reward redemptions use immutable CoinTransaction snapshots.
- Active Achievements appear as one current corrected event on `achievedAt`; raw correction/reversal rows are hidden.
- Settled Daily Goal bonus transactions appear as Daily Goal activity.

The current Calendar includes month navigation, direct month/year selection, Today navigation, activity markers, a selected-day activity modal, and a summary derived from the same presentation events.

### Planned Daily Insights

A future Calendar/Daily Detail phase may add:

- Category focus breakdown with horizontal bars ordered by focused minutes descending
- Focus Goal retrospective result
- Completed Tasks Goal retrospective result
- Celebratory or encouraging reached/not-reached feedback
- Daily Goal bonus summary

Category breakdown is visualization and insight, not a category-specific goal or reward system.

### Planned Completion Analytics

Future analytics should preserve and distinguish Daily Task Entry outcomes:

- Completed
- Uncompleted
- Deleted / Cancelled

A planned entry that remains unfinished should be retained historically for later analytics. Potential analysis includes completion rate overall, by Task, and by Category; planned duration versus completion; priority versus completion; and goal difficulty versus completion.

Explicitly deleted or cancelled entries must not count against the completion-rate denominator. This outcome model is a future design requirement and is not currently implemented.

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

Base rate:
20 coins/hour

Expected:
60 min

Observed:
95 min average

Daily exhaustion on Task-heavy days:
8/10
```

The system may conclude that 20 coins/hour undervalues the Task.

Potential recommendation:

```text
Increase Study ML:
20 -> 30 coins/hour
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
SQLite schema and versioned migrations through v9
Task Library, Categories, and repeated Daily Task Entries
Persistent Focus Sessions with Goal Reach, Extend, notifications, and actual-time payout
Rewards with reusable redemption and negative balance support
Achievements with immutable correction transactions
Calendar activity history and navigation
Daily Goals OPEN / Finish Today / FINISHED flow
```

Current models:

```text
TaskCategory
Task
DailyTaskPlan
TaskSession
Reward
Achievement
DailyLog
DailyGoal
CoinTransaction
```

Current database tables:

```text
task_categories
tasks
rewards
achievements
daily_logs
coin_transactions
daily_task_plans
task_sessions
daily_goals
```

---

## 42. Next Development Step

The next approved product direction is a separate Calendar/Daily Insights phase.

Planned work includes category Focus Time visualization and retrospective Daily Goal results. It must remain presentation/insight work rather than introducing Category goals or Category reward behavior.

The future Daily Task Entry outcome model for completion-rate analytics also remains intentionally deferred.

---

## 43. First Functional Milestone

The first end-to-end GoodieJar economy milestone is complete:

```text
Create Task
 ↓
Save to SQLite
 ↓
Display Task
 ↓
Add Daily Task Entry and Stop TaskSession
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

These flows, along with Achievements, Calendar, Focus Sessions, and Daily Goals, now form the current local-first product baseline.

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
