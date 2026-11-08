# Freelance Books

Double-entry accounting software for freelancers and small businesses. You record invoices, bills, payments and receipts, and the app keeps the ledgers, registers and financial statements up to date.

It runs on your own computer. Your books are kept in a local SQLite database, and you can put them online behind a login if you want to.

---

## What it does

**Your work**
- Invoices and purchases, with what is still owed each way
- Clients, vendors and per-project profit

**Entries**
- Sales, purchase, payment, receipt, contra, journal, credit note and debit note entries
- Your own entry types and numbering (for example, a Retainer Invoice)
- Printable invoices and vouchers

**Accounts**
- Ledgers, groups, currencies, budgets and what-if scenarios
- Optional inventory: stock items, groups, categories, units and locations

**Reports**
- Balance Sheet, Profit & Loss, Trial Balance, Cash Flow, Funds Flow, Ratio Analysis
- Day Book, Cash and Bank Books, ledger statements, and sales, purchase and other registers
- Money to collect and money to pay, ageing and interest
- Stock summary, movement, ageing, reorder status and pending orders
- Project break-up, budget vs actual, forex gain or loss, and exceptions to check

**Banking**
- Bank reconciliation, cheque register, post-dated entries, deposit slips and payment advice

**VAT, tax and payroll**
- VAT and tax reports, payroll and payroll reports

**Business and tools**
- Backup and restore to a JSON file
- A Go To search that finds any screen

---

## Run it on Windows (no coding needed)

1. Double-click **`setup.bat`**. It checks for Node.js (version 22.13 or newer), installs what the app needs, builds it and adds a **Freelance Books** shortcut to your desktop.
2. Double-click the **Freelance Books** shortcut (or `start.bat`) whenever you want to work.
3. The app opens at <http://localhost:3001>. Keep the black window open while you work. Close it when you are done; everything is already saved.

## Put it online

See **`HOW TO PUT ONLINE.txt`** for a step-by-step guide using a free ngrok address and `start-online.bat`.

You can also run it on any host that runs Docker, using the included `Dockerfile`. Mount a persistent disk at `/data` and set the login settings below.

## Settings

Copy `.env.example` to `.env` and fill it in. `.env` stays on your computer and is never committed.

| Setting | What it does |
| --- | --- |
| `BOOKS_USER`, `BOOKS_PASSWORD` | The login. The server won't open to the network without these. |
| `BOOKS_SESSION_SECRET` | Any long random text. Keeps people signed in when the server restarts. |
| `HOST` | Set to `0.0.0.0` to let other computers reach the app. Needs the login. |
| `PORT` | The server port. Default is `3001`. |
| `BOOKS_DATA_DIR` | The folder that holds the database. Default is `data/`. |
| `NGROK_DOMAIN` | Your fixed ngrok address, used by `start-online.bat`. |

## For developers

Built with React 19, React Router, Tailwind CSS 4 and Vite, plus a small Node.js server using the built-in `node:sqlite`.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm start
```

```bash
npm test
```

```bash
npm run lint
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server |
| `npm run build` | Type-checks and builds the app into `dist/` |
| `npm start` | Runs the server, which serves `dist/` and the books API on port 3001 |
| `npm test` | Runs the accounting engine tests |
| `npm run lint` | Lints the code with oxlint |

### Project layout

```
server/        Node server: login, books API, SQLite storage
src/core/      Accounting engine, types, defaults, formatting, data migration
src/store/     App state and the API client
src/screens/   Screens: home, entries, masters, reports
src/ui/        Shell, navigation, shared components, charts, styles
```

## Your data

The `data/` folder (your books) and `.env` (your login) are listed in `.gitignore`, so they stay out of git. Export a backup regularly from **Business & Tools → Backup & Restore**.
