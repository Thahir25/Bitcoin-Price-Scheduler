# Bitcoin Price Scheduler

📈 A real-time Bitcoin price tracking application that lets you monitor prices on your schedule.

## Overview

* **What it does:**
  * Automatically checks Bitcoin prices at set intervals
  * Shows price history in a clean table format
  * Tracks price changes, market cap, and 24h volume
  * Runs multiple tracking schedules simultaneously

* **Schedule Types:**
  * ⏰ Every X minutes (1-59 minutes)
  * 🕐 Hourly (at specific minute)
  * 📅 Daily (at specific time)
  * 📆 Weekly (on specific day and time)

* **Key Information Tracked:**
  * Current Bitcoin price in USD
  * 24-hour price change percentage
  * Market capitalization
  * Trading volume (24h)

* **User-Friendly Features:**
  * Easy schedule creation and management
  * Real-time price updates
  * Visual indicators for price changes
  * Mobile-responsive design

## Features

- Schedule Bitcoin price checks at different intervals:
  - Every X minutes
  - Hourly
  - Daily
  - Weekly
- Real-time price updates
- Historical price tracking
- Clean and modern UI
- Mobile responsive design

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: SQLite3
- **APIs**: CoinGecko API for Bitcoin price data
- **Task Scheduling**: node-cron

## Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd bitcoin-price-scheduler
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
node server.js
```

4. Open your browser and navigate to:

```
http://localhost:3000
```

## Usage

1. Create a new schedule by:

   - Entering a schedule name
   - Selecting schedule type (minutely, hourly, daily, or weekly)
   - Setting the specific time/interval
   - Clicking "Create Schedule"

2. View price reports by:

   - Selecting a schedule from the dropdown
   - Viewing the latest price data and history

3. Delete schedules by clicking the delete button (×) on any schedule card

## Technical Implementation

* **Frontend:**
  * Pure JavaScript - no frameworks needed
  * Modern CSS with CSS variables
  * Responsive grid layout
  * Real-time UI updates

* **Backend:**
  * Node.js & Express server
  * SQLite database for data persistence
  * Node-cron for schedule management
  * RESTful API endpoints

* **Data Flow:**
  * CoinGecko API integration for price data
  * Automatic data fetching based on schedules
  * Real-time price updates
  * Historical data storage and retrieval

* **Database:**
  * Two main tables: jobs and bitcoin_data
  * Automatic data cleanup
  * Efficient indexing for quick queries
  * Transaction support for data integrity


