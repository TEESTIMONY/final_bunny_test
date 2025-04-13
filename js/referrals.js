document.addEventListener('DOMContentLoaded', function() {
    // Initialize the referrals dashboard
    initReferralsDashboard();
});

async function initReferralsDashboard() {
    try {
        // Load all data in parallel
        await Promise.all([
            loadReferralStats(),
            loadRecentReferrals(),
            loadTopReferrers()
        ]);
    } catch (error) {
        showError('Failed to initialize dashboard: ' + error.message);
        console.error('Dashboard initialization error:', error);
    }
}

async function loadReferralStats() {
    const statsContainer = document.getElementById('stats-container');
    const loadingElement = document.getElementById('stats-loading');
    
    try {
        // Show loading indicator
        loadingElement.style.display = 'flex';
        
        // Simulate API call with timeout
        const response = await simulateApiCall('/api/admin/referrals/stats');
        
        // Create stats cards
        const stats = [
            { title: 'Total Referrals', value: response.totalReferrals, subtitle: 'All time' },
            { title: 'Pending Referrals', value: response.pendingReferrals, subtitle: 'Awaiting completion' },
            { title: 'Completed Referrals', value: response.completedReferrals, subtitle: 'Successfully converted' },
            { title: 'Conversion Rate', value: response.conversionRate + '%', subtitle: 'Avg. completion rate' }
        ];
        
        // Populate stats cards
        stats.forEach(stat => {
            statsContainer.innerHTML += `
                <div class="stat-card">
                    <div class="stat-title">${stat.title}</div>
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-subtitle">${stat.subtitle}</div>
                </div>
            `;
        });
        
        // Hide loading indicator
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        showError('Failed to load referral statistics');
        console.error('Error loading referral stats:', error);
    }
}

async function loadRecentReferrals() {
    const tableBody = document.getElementById('referrals-table-body');
    const loadingElement = document.getElementById('referrals-loading');
    
    try {
        // Show loading indicator
        loadingElement.style.display = 'flex';
        
        // Simulate API call with timeout
        const response = await simulateApiCall('/api/admin/referrals/recent');
        
        // Clear existing table rows
        tableBody.innerHTML = '';
        
        // Populate table with referrals
        response.referrals.forEach(referral => {
            const statusClass = referral.status === 'complete' ? 'status-complete' : 'status-pending';
            
            tableBody.innerHTML += `
                <tr>
                    <td>${referral.id}</td>
                    <td>${referral.referrer}</td>
                    <td>${referral.referred}</td>
                    <td>${formatDate(referral.date)}</td>
                    <td><span class="referral-status ${statusClass}">${referral.status}</span></td>
                    <td>${referral.reward}</td>
                </tr>
            `;
        });
        
        // Hide loading indicator
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        showError('Failed to load recent referrals');
        console.error('Error loading recent referrals:', error);
    }
}

async function loadTopReferrers() {
    const topReferrersContainer = document.getElementById('top-referrers');
    const loadingElement = document.getElementById('top-referrers-loading');
    
    try {
        // Show loading indicator
        loadingElement.style.display = 'flex';
        
        // Simulate API call with timeout
        const response = await simulateApiCall('/api/admin/referrals/top');
        
        // Clear existing content
        topReferrersContainer.innerHTML = '';
        
        // Populate top referrers
        response.topReferrers.forEach((referrer, index) => {
            topReferrersContainer.innerHTML += `
                <div class="top-referrer-item">
                    <div class="top-referrer-rank">${index + 1}</div>
                    <div class="top-referrer-info">
                        <div>${referrer.name}</div>
                        <div>ID: ${referrer.id}</div>
                    </div>
                    <div class="top-referrer-count">${referrer.count}</div>
                </div>
            `;
        });
        
        // Hide loading indicator
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        showError('Failed to load top referrers');
        console.error('Error loading top referrers:', error);
    }
}

function exportToCSV() {
    try {
        // Simulate CSV export
        console.log('Exporting to CSV...');
        // In a real implementation, this would generate and download a CSV file
        alert('Referrals data exported to CSV successfully!');
    } catch (error) {
        showError('Failed to export to CSV');
        console.error('CSV export error:', error);
    }
}

function exportToJSON() {
    try {
        // Simulate JSON export
        console.log('Exporting to JSON...');
        // In a real implementation, this would generate and download a JSON file
        alert('Referrals data exported to JSON successfully!');
    } catch (error) {
        showError('Failed to export to JSON');
        console.error('JSON export error:', error);
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
}

// Helper function to simulate API calls
function simulateApiCall(endpoint) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Mock data for demonstration
            if (endpoint === '/api/admin/referrals/stats') {
                resolve({
                    totalReferrals: 856,
                    pendingReferrals: 142,
                    completedReferrals: 714,
                    conversionRate: 83.4
                });
            } else if (endpoint === '/api/admin/referrals/recent') {
                resolve({
                    referrals: [
                        { id: 'REF-9385', referrer: 'John Smith', referred: 'Alice Johnson', date: '2023-05-15', status: 'complete', reward: '$25.00' },
                        { id: 'REF-9384', referrer: 'Emily Davis', referred: 'Michael Brown', date: '2023-05-14', status: 'pending', reward: '$25.00' },
                        { id: 'REF-9383', referrer: 'James Wilson', referred: 'Sophia Miller', date: '2023-05-14', status: 'complete', reward: '$25.00' },
                        { id: 'REF-9382', referrer: 'Olivia Johnson', referred: 'William Jones', date: '2023-05-13', status: 'complete', reward: '$25.00' },
                        { id: 'REF-9381', referrer: 'Daniel Taylor', referred: 'Charlotte Thomas', date: '2023-05-12', status: 'pending', reward: '$25.00' },
                        { id: 'REF-9380', referrer: 'Sophia Miller', referred: 'Ethan Anderson', date: '2023-05-11', status: 'complete', reward: '$25.00' },
                        { id: 'REF-9379', referrer: 'Matthew Martin', referred: 'Emma Wilson', date: '2023-05-10', status: 'complete', reward: '$25.00' },
                        { id: 'REF-9378', referrer: 'Ava Martinez', referred: 'Noah Clark', date: '2023-05-09', status: 'complete', reward: '$25.00' }
                    ]
                });
            } else if (endpoint === '/api/admin/referrals/top') {
                resolve({
                    topReferrers: [
                        { name: 'John Smith', id: 'USR-2945', count: 42 },
                        { name: 'Emily Davis', id: 'USR-1842', count: 36 },
                        { name: 'James Wilson', id: 'USR-3756', count: 29 },
                        { name: 'Sophia Miller', id: 'USR-4218', count: 23 },
                        { name: 'Daniel Taylor', id: 'USR-5673', count: 17 }
                    ]
                });
            }
        }, 800); // Simulate network delay
    });
} 