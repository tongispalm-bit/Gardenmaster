# Garden Master — Product Overview

Garden Master (แกนมาสเตอร์) is a Thai-language orchard management web app. It lets farmers track and manage multiple orchards, each with its own care records and financial transactions.

## Core Concepts

- **Orchard** — top-level entity representing a single farm/plot. Each has a name, color, and emoji icon.
- **Care Record** — a log entry for a plant care activity (watering, fertilizing, pesticide application).
- **Transaction** — a financial record (income or expense) tied to an orchard, with category and description.
- **Tree Profile / Fertilizer Profile** — data models defined but not yet implemented in the UI.

## Current Feature Status

| Feature | Status |
|---|---|
| Orchard list & navigation | ✅ Live |
| Care records (add/delete) | ✅ Live |
| General expenses (add/delete) | ✅ Live |
| Upgrade costs | 🚧 Coming soon |
| Sales tracking | 🚧 Coming soon |
| Hospital (sick tree tracking) | 🚧 Coming soon |

## UI Language

All user-facing text is in **Thai**. Error messages, labels, placeholders, and button text should remain in Thai unless explicitly changed.

## Theme

Supports light/dark mode. Theme is persisted in `localStorage` under the key `theme-mode` and applied via a `dark` class on `<html>` before first paint to prevent flash.
