# GoodieJar Agent Instructions

GoodieJar is a React Native + Expo + TypeScript mobile application.

Before making architectural or data-model changes, read DESIGN.md.

## Current stack

- React Native
- Expo SDK 54
- TypeScript
- Expo Router
- expo-sqlite
- Local-first architecture

## Important directories

- `app/` - screens and routing only
- `models/` - TypeScript domain models
- `database/` - SQLite schema and database initialization
- `components/` - reusable UI components

## Development principles

- Keep the MVP simple.
- Do not introduce a backend unless explicitly requested.
- Do not redesign the database schema without explaining why first.
- Keep UI code separate from database/business logic.
- Use parameterized SQLite queries.
- Preserve transaction history even if a Task or Reward is archived/deleted.
- Prefer small, understandable implementations over unnecessary abstraction.

## Current development stage

The domain models and initial SQLite schema have been designed.

Before implementing a feature:
1. Inspect the existing implementation.
2. Check DESIGN.md for intended behavior.
3. Explain any architectural change that would conflict with it.
4. Do not implement unrelated features.