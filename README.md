# TradeWithNine Trading Challenge Dashboard

Local-first Next.js dashboard for the TradeWithNine 60 Day Challenge and the 2X in 120 capital-growth challenge.

## Features

- Dashboard metrics for capital, P&L, win/loss days, win rate, streaks, max drawdown, and completion.
- Google Sheet sync for daily challenge rows.
- Trade log with sort and result filters.
- Recharts analytics: equity curve, daily P&L, distribution, discipline trend, drawdown, and rule breaks.
- Milestone cards for Day 10, 20, 30, 40, 50, and 60.
- Instagram 9:16 share-card preview with PNG export.
- Auto-generated Instagram caption and hashtags.
- JSON import/export and CSV trade-log export.
- Browser localStorage persistence, no backend, no login, no paid API.
- Top-level challenge switch with an isolated `/2x120` dashboard.
- 2X in 120 capital progress, daily risk thresholds, trade-sequence compliance, and trade-number analytics.

## Design

The UI uses a custom Market Midnight theme inspired by the `theme-factory` Codex skill: dark charcoal surfaces, slate grid borders, profit green, loss red, amber risk, and blue information accents.

## Setup

```bash
cd tradewithnine-dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- 60 Day Challenge: [http://localhost:3000](http://localhost:3000)
- Default dashboard / 2X in 120: [http://localhost:3000](http://localhost:3000)
- 60 Day archive: [http://localhost:3000/60days](http://localhost:3000/60days)

## Data

Google Sheets is the source of truth. The app caches the last successful sync in browser `localStorage` under:

```text
tradewithnine.challenge.entries.v1
```

Use Setup to export a JSON backup before clearing browser data or switching machines.

## Google Sheet Columns

The parser supports the current sheet structure:

```text
Date, Amount Start, Profit/Loss, Brokerage/tax, Amount End, Profit Day,
Live Trade Day, Discipline with S/L, Comments
```

Optional columns can be added for richer Instagram cards:

```text
Screenshot URL, Result, Trades Taken, Instrument, Mistakes, Improve Tomorrow
```

`Profit/Loss` is treated as the final net daily P&L after brokerage/tax. `Brokerage/tax` is stored only as reference data and is not deducted again. `Amount End` is used as current capital.

## 2X in 120 Sheet Tabs

The 2X dashboard reads three tabs from the configured Google Sheet:

```text
2X120 Daily
2X120 Trades
2X120 Setup
```

`2X120 Daily` holds one row per challenge day. `2X120 Trades` holds one row per trade, with `Number` restarting from 1 each day. Its primary headers are `Day`, `Number`, `Type`, and `SL Price`; the previous `Trading Day`, `Trade Number`, `Option Type`, and `Stop Loss Price` names remain supported. The dashboard uses the trade order to detect consecutive-loss stop breaches.

The setup tab should use `Setting` and `Value` as its first-row headers, followed by rows for Challenge Name, Starting Capital, Target Capital, Trading Days, Profit Threshold %, Daily Loss Limit %, Maximum Consecutive Losses, Maximum Total Losing Trades, Morning Window, and Afternoon Window.

`Net P&L` and `Trade P&L` are treated as final realized values. `Charges` remains reference data and is not deducted again.

## Seed Data

The app seeds Day 1 and Day 2 entries on first launch:

- Day 1: +₹2,461, Win, 2 trades, discipline score 8.
- Day 2: -₹2,024, Loss, 2 trades, discipline score 6.
