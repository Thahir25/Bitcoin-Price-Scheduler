# Bitcoin Price Scheduler

A web application that allows users to schedule automated Bitcoin price checks at customizable intervals.

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

## License

MIT
