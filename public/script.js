document.addEventListener('DOMContentLoaded', () => {
    const jobForm = document.getElementById('jobForm');
    const scheduleType = document.getElementById('scheduleType');
    const scheduleValueContainer = document.getElementById('scheduleValueContainer');
    const jobsList = document.getElementById('jobsList');
    const reportJobSelect = document.getElementById('reportJobSelect');
    const reportData = document.getElementById('reportData');

    let currentJobId = null;
    let reportRefreshInterval = null;

    function startReportAutoRefresh() {
        stopReportAutoRefresh();
        if (currentJobId) {
            reportRefreshInterval = setInterval(() => loadReportData(currentJobId, true), 30000);
        }
    }

    function stopReportAutoRefresh() {
        if (reportRefreshInterval) {
            clearInterval(reportRefreshInterval);
            reportRefreshInterval = null;
        }
    }

    function updateScheduleValueInput() {
        const type = scheduleType.value;
        let html = '';

        switch (type) {
            case 'minutely':
                html = `
                    <label for="scheduleValue">Run every (1-59 minutes):</label>
                    <input type="number" id="scheduleValue" min="1" max="59" required>
                `;
                break;
            case 'hourly':
                html = `
                    <label for="scheduleValue">Minute (0-59):</label>
                    <input type="number" id="scheduleValue" min="0" max="59" required>
                `;
                break;
            case 'daily':
                html = `
                    <label for="scheduleValue">Time:</label>
                    <input type="time" id="scheduleValue" required>
                `;
                break;
            case 'weekly':
                html = `
                    <label for="scheduleDay">Day:</label>
                    <select id="scheduleDay" required>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                    </select>
                    <label for="scheduleTime">Time:</label>
                    <input type="time" id="scheduleTime" required>
                `;
                break;
            default:
                html = '<p>Please select a schedule type</p>';
        }

        scheduleValueContainer.innerHTML = html;
    }    function getScheduleValue() {
        const type = scheduleType.value;
        if (type === 'weekly') {
            return `${document.getElementById('scheduleDay').value} ${document.getElementById('scheduleTime').value}`;
        }
        return document.getElementById('scheduleValue').value;
    }

    function formatSchedule(type, value) {
        switch (type) {
            case 'minutely':
                return `Every ${value} minute${value > 1 ? 's' : ''}`;
            case 'hourly':
                return `Every hour at ${value} minutes`;
            case 'daily':
                return `Daily at ${value}`;
            case 'weekly':
                const [day, time] = value.split(' ');
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return `Every ${days[day]} at ${time}`;
            default:
                return `${type} - ${value}`;
        }
    }

    async function loadJobs() {
        try {
            const response = await fetch('http://localhost:3000/api/jobs');
            const jobs = await response.json();
            
            jobsList.innerHTML = jobs.map(job => `
                <div class="job-card" data-job-id="${job.id}">
                    <button class="delete-job" type="button" data-job-id="${job.id}" onclick="event.stopPropagation();">×</button>
                    <div class="job-content">
                        <h3>${job.name}</h3>
                        <div class="job-details">
                            <p>Schedule: ${formatSchedule(job.schedule_type, job.schedule_value)}</p>
                            <p class="status-active">Status: Active</p>
                        </div>
                    </div>
                </div>
            `).join('');

            reportJobSelect.innerHTML = `
                <option value="">Select a schedule to view report</option>
                ${jobs.map(job => `<option value="${job.id}">${job.name}</option>`).join('')}
            `;

            document.querySelectorAll('.job-card').forEach(card => {
                const jobId = card.dataset.jobId;
                card.querySelector('.job-content').addEventListener('click', () => {
                    reportJobSelect.value = jobId;
                    loadReportData(jobId);
                });

                card.querySelector('.delete-job').addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this schedule?')) {
                        try {
                            const response = await fetch(`http://localhost:3000/api/jobs/${jobId}`, {
                                method: 'DELETE'
                            });

                            if (response.ok) {
                                if (reportJobSelect.value === jobId) {
                                    reportJobSelect.value = '';
                                    reportData.innerHTML = '<p class="select-job-message">Select a schedule to view its report</p>';
                                    currentJobId = null;
                                    stopReportAutoRefresh();
                                }
                                card.style.animation = 'fadeOut 0.3s ease-in-out';
                                setTimeout(loadJobs, 300);
                            }
                        } catch (error) {
                            alert('Error deleting schedule. Please try again.');
                        }
                    }
                });
            });
        } catch (error) {
            jobsList.innerHTML = '<p class="error-message">Error loading schedules. Please refresh the page.</p>';
        }
    }

    async function loadReportData(jobId, isAutoRefresh = false) {
        if (!jobId) {
            reportData.innerHTML = '<p class="select-job-message">Select a schedule to view its report</p>';
            currentJobId = null;
            stopReportAutoRefresh();
            return;
        }

        currentJobId = jobId;
        if (!isAutoRefresh) {
            reportData.innerHTML = '<div class="loading">Loading report data...</div>';
        }

        try {
            const response = await fetch(`http://localhost:3000/api/reports/${jobId}`);
            const data = await response.json();

            if (data.length === 0) {
                reportData.innerHTML = '<p class="no-data-message">No data available for this schedule yet</p>';
                return;
            }

            const bitcoinData = data[0];
            const timestamp = new Date(bitcoinData.local_timestamp).toLocaleString();            reportData.innerHTML = `
                <div class="report-summary">
                    <div class="report-header">
                        <div class="report-title">
                            <h3>${data[0].job_name}</h3>
                            <p>Schedule: ${formatSchedule(data[0].schedule_type, data[0].schedule_value)}</p>
                        </div>
                    </div>
                    <div class="bitcoin-data">
                        <table class="price-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Price (USD)</th>
                                    <th>24h Change</th>
                                    <th>Market Cap</th>
                                    <th>24h Volume</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(record => `
                                    <tr>                                        <td>${new Date(record.local_timestamp).toLocaleString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: true
                                        })}</td>
                                        <td>$${record.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                        <td class="${record.price_change_24h >= 0 ? 'positive' : 'negative'}">
                                            ${record.price_change_24h >= 0 ? '↑' : '↓'} ${Math.abs(record.price_change_24h).toFixed(2)}%
                                        </td>
                                        <td>$${(record.market_cap / 1e9).toFixed(2)}B</td>
                                        <td>$${(record.volume_24h / 1e9).toFixed(2)}B</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            if (!isAutoRefresh) {
                startReportAutoRefresh();
            }
        } catch (error) {
            if (!isAutoRefresh) {
                reportData.innerHTML = '<p class="error-message">Error loading report data</p>';
            }
        }
    }

    scheduleType.addEventListener('change', updateScheduleValueInput);
    reportJobSelect.addEventListener('change', e => loadReportData(e.target.value));

    jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3000/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('jobName').value,
                    scheduleType: scheduleType.value,
                    scheduleValue: getScheduleValue()
                })
            });

            if (response.ok) {
                const result = await response.json();
                jobForm.reset();
                await loadJobs();
                updateScheduleValueInput();
                reportJobSelect.value = result.id;
                loadReportData(result.id);
            }
        } catch (error) {
            alert('Error creating schedule. Please try again.');
        }
    });

    updateScheduleValueInput();
    loadJobs();

    window.addEventListener('beforeunload', () => {
        stopReportAutoRefresh();
    });
}); 