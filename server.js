const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('crypto.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
    initializeDatabase();
});

// Initialize database
function initializeDatabase() {
    db.serialize(() => {
        // Enable foreign keys and WAL mode for better performance
        db.run('PRAGMA foreign_keys = ON');
        db.run('PRAGMA journal_mode = WAL');
        
        // Create jobs table with index on created_at
        db.run(`CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            schedule_type TEXT NOT NULL,
            schedule_value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)`);

        // Create bitcoin_data table with indexes for common queries
        db.run(`CREATE TABLE IF NOT EXISTS bitcoin_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            price REAL,
            market_cap REAL,
            volume_24h REAL,
            price_change_24h REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_bitcoin_data_job_time ON bitcoin_data(job_id, timestamp DESC)`);
    });
}

// Function to fetch Bitcoin data
async function fetchBitcoinData(jobId) {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'bitcoin',
                vs_currencies: 'usd',
                include_market_cap: true,
                include_24hr_vol: true,
                include_24hr_change: true
            }
        });

        const bitcoinData = response.data.bitcoin;
          console.log('\n=== Bitcoin Data Log ===');
        console.log('Time:', new Date().toLocaleString('en-US', { 
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }));
        console.log('Price:', '$' + bitcoinData.usd.toLocaleString('en-US'));
        console.log('24h Change:', bitcoinData.usd_24h_change.toFixed(2) + '%');
        console.log('Market Cap:', '$' + bitcoinData.usd_market_cap.toLocaleString('en-US'));
        console.log('24h Volume:', '$' + bitcoinData.usd_24h_vol.toLocaleString());
        console.log('=====================\n');

        db.run(
            'INSERT INTO bitcoin_data (job_id, price, market_cap, volume_24h, price_change_24h) VALUES (?, ?, ?, ?, ?)',
            [jobId, bitcoinData.usd, bitcoinData.usd_market_cap, bitcoinData.usd_24h_vol, bitcoinData.usd_24h_change]
        );
    } catch (error) {
        console.error('Error fetching Bitcoin data:', error.message);
    }
}

// Function to create a cron schedule
function createCronSchedule(scheduleType, scheduleValue) {
    try {
        switch (scheduleType) {
            case 'minutely':
                if (scheduleValue < 1 || scheduleValue > 59) throw new Error('Minutes must be between 1 and 59');
                return `*/${scheduleValue} * * * *`;
            case 'hourly':
                if (scheduleValue < 0 || scheduleValue > 59) throw new Error('Minutes must be between 0 and 59');
                return `${scheduleValue} * * * *`;
            case 'daily':
                const [hours, minutes] = scheduleValue.split(':');
                return `${minutes} ${hours} * * *`;
            case 'weekly':
                const [day, time] = scheduleValue.split(' ');
                const [hour, minute] = time.split(':');
                if (day < 0 || day > 6) throw new Error('Day must be between 0 and 6');
                return `${minute} ${hour} * * ${day}`;
            default:
                throw new Error('Invalid schedule type');
        }
    } catch (error) {
        throw new Error(`Invalid schedule format: ${error.message}`);
    }
}

// Store active jobs
const activeJobs = new Map();

// API Routes
app.post('/api/jobs', (req, res) => {
    const { name, scheduleType, scheduleValue } = req.body;
    
    try {
        const cronSchedule = createCronSchedule(scheduleType, scheduleValue);
        
        db.run(
            'INSERT INTO jobs (name, schedule_type, schedule_value) VALUES (?, ?, ?)',
            [name, scheduleType, scheduleValue],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });

                const jobId = this.lastID;
                const job = cron.schedule(cronSchedule, () => fetchBitcoinData(jobId));
                activeJobs.set(jobId, job);
                
                res.json({ id: jobId, name, scheduleType, scheduleValue });
            }
        );
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/jobs', (req, res) => {
    db.all('SELECT * FROM jobs ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/reports/:jobId', (req, res) => {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
    }

    const query = `
        SELECT 
            b.price,
            b.market_cap,
            b.volume_24h,
            b.price_change_24h,
            b.timestamp as local_timestamp,
            j.name as job_name,
            j.schedule_type,
            j.schedule_value
        FROM bitcoin_data b
        JOIN jobs j ON b.job_id = j.id
        WHERE j.id = ?
        ORDER BY b.timestamp DESC
        LIMIT 5
    `;
    
    // Set cache headers for 30 seconds
    res.set('Cache-Control', 'public, max-age=30');
    
    db.all(query, [jobId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (rows.length === 0) {
            db.get('SELECT * FROM jobs WHERE id = ?', [jobId], (err, job) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                if (!job) return res.status(404).json({ error: 'Job not found' });
                res.json([]);
            });
        } else {
            res.json(rows);
        }
    });
});

app.delete('/api/jobs/:id', (req, res) => {
    const jobId = req.params.id;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        try {
            const job = activeJobs.get(parseInt(jobId));
            if (job) {
                job.stop();
                activeJobs.delete(parseInt(jobId));
            }

            db.run('DELETE FROM jobs WHERE id = ?', [jobId], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'Job not found' });
                }
                db.run('COMMIT');
                res.json({ message: 'Job deleted successfully' });
            });
        } catch (error) {
            db.run('ROLLBACK');
            res.status(500).json({ error: error.message });
        }
    });
});

// Load existing jobs on startup
db.all('SELECT * FROM jobs', [], (err, rows) => {
    if (err) return console.error('Error loading existing jobs:', err);
    rows.forEach(job => {
        try {
            const cronSchedule = createCronSchedule(job.schedule_type, job.schedule_value);
            const cronJob = cron.schedule(cronSchedule, () => fetchBitcoinData(job.id));
            activeJobs.set(job.id, cronJob);
            console.log(`Loaded job: ${job.name}`);
        } catch (error) {
            console.error(`Error loading job ${job.name}:`, error);
        }
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    activeJobs.forEach(job => job.stop());
    db.close(() => {
        console.log('Database connection closed');
        process.exit(0);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Server timezone: ${process.env.TZ}`);
}); 