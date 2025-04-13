/**
 * Hop Bunny Admin Dashboard
 * This script handles the admin dashboard functionality, including:
 * - User authentication
 * - Fetching and displaying user data
 * - Filtering, sorting, and pagination
 */

// API Configuration
const API_BASE_URL = 'https://new-backend-hop.vercel.app/api';
const API_ENDPOINTS = {
    users: '/users',
    userDetails: '/user', // + userId
    login: '/admin/login',
};

// Dashboard state
const dashboardState = {
    // Authentication
    isLoggedIn: false,
    token: localStorage.getItem('adminToken') || null,
    adminEmail: localStorage.getItem('adminEmail') || null,
    
    // Pagination
    currentPage: 1,
    pageSize: 10,
    totalUsers: 0,
    totalPages: 1,
    
    // Sorting and filtering
    sortField: 'username',
    sortDirection: 'asc',
    searchQuery: '',
    
    // Data
    users: []
};

// DOM Elements
const elements = {
    // Auth elements
    loginButton: document.getElementById('loginButton'),
    logoutButton: document.getElementById('logoutButton'),
    loginForm: document.getElementById('loginForm'),
    submitLogin: document.getElementById('submitLogin'),
    cancelLogin: document.getElementById('cancelLogin'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    adminEmail: document.getElementById('adminEmail'),
    loggedInStatus: document.getElementById('loggedInStatus'),
    authMessage: document.getElementById('authMessage'),
    welcomeMessage: document.getElementById('welcomeMessage'),
    
    // User table
    usersTableBody: document.getElementById('usersTableBody'),
    totalUsersDisplay: document.getElementById('totalUsers'),
    
    // Pagination
    prevPageButton: document.getElementById('prevPage'),
    nextPageButton: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    
    // Search and filter
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    sortSelect: document.getElementById('sortSelect'),
    refreshButton: document.getElementById('refreshButton'),
    
    // Modal
    userDetailModal: new bootstrap.Modal(document.getElementById('userDetailModal')),
    userDetailContent: document.getElementById('userDetailContent')
};

/**
 * Initialize the dashboard
 */
function initDashboard() {
    // Check if user is already logged in
    checkAuthStatus();
    
    // Set up event listeners
    setupEventListeners();
    
    // Only load data if user is logged in
    if (dashboardState.isLoggedIn) {
        loadUserData();
    } else {
        // Show login prompt if not logged in
        showLoginPrompt();
    }
}

/**
 * Set up event listeners for interactive elements
 */
function setupEventListeners() {
    // Auth related events
    elements.loginButton.addEventListener('click', showLoginForm);
    elements.submitLogin.addEventListener('click', handleLogin);
    elements.cancelLogin.addEventListener('click', hideLoginForm);
    elements.logoutButton.addEventListener('click', handleLogout);
    
    // Pagination events
    elements.prevPageButton.addEventListener('click', () => changePage(dashboardState.currentPage - 1));
    elements.nextPageButton.addEventListener('click', () => changePage(dashboardState.currentPage + 1));
    elements.pageSizeSelect.addEventListener('change', handlePageSizeChange);
    
    // Search and filter events
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.sortSelect.addEventListener('change', handleSortChange);
    elements.refreshButton.addEventListener('click', refreshData);
}

/**
 * Show login prompt for unauthenticated users
 */
function showLoginPrompt() {
    // Hide all data sections
    hideDataSections();
    
    // Show welcome message
    elements.welcomeMessage.classList.remove('d-none');
    
    // Show login prompt message
    elements.authMessage.textContent = 'Please log in with admin credentials to access the dashboard';
    elements.authMessage.className = 'alert alert-info';
    elements.authMessage.classList.remove('d-none');
}

/**
 * Hide all data sections when not logged in
 */
function hideDataSections() {
    // Get all data containers
    const dataSections = document.querySelectorAll('.data-section');
    
    // Hide all data sections
    dataSections.forEach(section => {
        section.classList.add('d-none');
    });
}

/**
 * Show all data sections after login
 */
function showDataSections() {
    // Get all data containers
    const dataSections = document.querySelectorAll('.data-section');
    
    // Show all data sections
    dataSections.forEach(section => {
        section.classList.remove('d-none');
    });
}

/**
 * Update UI based on authentication status
 */
function updateUIForAuthStatus() {
    if (dashboardState.isLoggedIn) {
        // User is logged in - show data sections and update login display
        showDataSections();
        elements.loginButton.classList.add('d-none');
        elements.loggedInStatus.classList.remove('d-none');
        elements.adminEmail.textContent = dashboardState.adminEmail;
        elements.welcomeMessage.classList.add('d-none');
    } else {
        // User is not logged in - hide data and show login button
        hideDataSections();
        showLoginPrompt();
        elements.loginButton.classList.remove('d-none');
        elements.loggedInStatus.classList.add('d-none');
        elements.welcomeMessage.classList.remove('d-none');
    }
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
    const token = localStorage.getItem('adminToken');
    const email = localStorage.getItem('adminEmail');
    
    if (token && email) {
        // Update state for logged in user
        dashboardState.isLoggedIn = true;
        dashboardState.token = token;
        dashboardState.adminEmail = email;
    } else {
        // Update state for logged out user
        dashboardState.isLoggedIn = false;
        dashboardState.token = null;
        dashboardState.adminEmail = null;
    }
    
    // Update UI based on auth status
    updateUIForAuthStatus();
}

/**
 * Show login form
 */
function showLoginForm() {
    elements.loginForm.classList.remove('d-none');
    elements.welcomeMessage.classList.add('d-none');
    elements.emailInput.focus();
}

/**
 * Hide login form
 */
function hideLoginForm() {
    elements.loginForm.classList.add('d-none');
    elements.emailInput.value = '';
    elements.passwordInput.value = '';
    
    // Show welcome message if not logged in
    if (!dashboardState.isLoggedIn) {
        elements.welcomeMessage.classList.remove('d-none');
    }
}

/**
 * Handle login form submission
 */
function handleLogin() {
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value.trim();
    
    if (!email || !password) {
        showAuthMessage('Please enter both username and password', 'danger');
        return;
    }
    
    // Validate specific admin credentials
    if (email === 'king-bunny' && password === 'thekinghimself') {
        // Valid credentials - set token and update UI
        localStorage.setItem('adminToken', 'admin-token-2023');
        localStorage.setItem('adminEmail', email);
        
        // Update state
        hideLoginForm();
        dashboardState.isLoggedIn = true;
        dashboardState.token = 'admin-token-2023';
        dashboardState.adminEmail = email;
        
        // Update UI for authenticated state
        updateUIForAuthStatus();
        
        showAuthMessage('Login successful! You now have admin access', 'success');
        
        // Load user data now that we're authenticated
        loadUserData();
    } else {
        // Invalid credentials
        showAuthMessage('Invalid admin credentials', 'danger');
        elements.passwordInput.value = '';
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    // Clear local storage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    
    // Update state
    dashboardState.isLoggedIn = false;
    dashboardState.token = null;
    dashboardState.adminEmail = null;
    
    // Update UI for unauthenticated state
    updateUIForAuthStatus();
    
    showAuthMessage('You have been logged out', 'info');
}

/**
 * Show authentication message
 * @param {string} message - Message to display
 * @param {string} type - Bootstrap alert type (success, danger, warning, info)
 */
function showAuthMessage(message, type = 'info') {
    elements.authMessage.textContent = message;
    elements.authMessage.className = `alert alert-${type}`;
    elements.authMessage.classList.remove('d-none');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        elements.authMessage.classList.add('d-none');
    }, 5000);
}

/**
 * Load user data from API
 */
function loadUserData() {
    // Show loading state
    elements.usersTableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="7" class="text-center p-5">
                <div class="d-flex flex-column align-items-center">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mb-0 text-muted">Loading user data...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Build query string for API request
    const queryParams = new URLSearchParams({
        page: dashboardState.currentPage,
        limit: dashboardState.pageSize,
        sort: dashboardState.sortField,
        order: dashboardState.sortDirection
    });
    
    if (dashboardState.searchQuery) {
        queryParams.append('search', dashboardState.searchQuery);
    }
    
    // Make API request - use fetch API with authorization
    fetch(`${API_BASE_URL}${API_ENDPOINTS.users}?${queryParams}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': dashboardState.token ? `Bearer ${dashboardState.token}` : ''
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        return response.json();
    })
    .then(data => {
        // Process data - in a real app, this would come from the API
        processUserData(data);
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        
        // For demo purposes, load sample data if API fails
        loadSampleUserData();
    });
}

/**
 * Process user data from API
 * @param {Object} data - User data from API
 */
function processUserData(data) {
    // Update dashboard state
    dashboardState.users = data.users || [];
    dashboardState.totalUsers = data.total || dashboardState.users.length;
    dashboardState.totalPages = data.totalPages || Math.ceil(dashboardState.totalUsers / dashboardState.pageSize);
    
    // Update UI
    renderUserTable();
    updatePagination();
}

/**
 * Load sample user data (for demo purposes)
 */
function loadSampleUserData() {
    // Create sample data for demonstration
    const sampleUsers = [
        {
            userId: "PCwtU7YgdQbw13r24rNHj0ix5Xx1",
            username: "Delo",
            email: "testimonyalade191@gmail.com",
            highScore: 297,
            gamesPlayed: 8,
            createdAt: "2025-04-10T08:54:55.039Z"
        },
        {
            userId: "jA8IwqYgdQbw13r24rNHj0ix5Xx2",
            username: "PepeHop",
            email: "pepe@example.com",
            highScore: 512,
            gamesPlayed: 15,
            createdAt: "2025-04-11T10:25:12.039Z"
        },
        {
            userId: "K9PrT7YgdQbw13r24rNHj0ix5Xx3",
            username: "BunnyMaster",
            email: "bunny@example.com",
            highScore: 756,
            gamesPlayed: 23,
            createdAt: "2025-04-09T14:30:45.039Z"
        },
        {
            userId: "M5QtW2YgdQbw13r24rNHj0ix5Xx4",
            username: "HopKing",
            email: "king@example.com",
            highScore: 421,
            gamesPlayed: 12,
            createdAt: "2025-04-12T09:15:22.039Z"
        },
        {
            userId: "N7RsX4YgdQbw13r24rNHj0ix5Xx5",
            username: "JumpQueen",
            email: "queen@example.com",
            highScore: 689,
            gamesPlayed: 19,
            createdAt: "2025-04-08T11:45:33.039Z"
        }
    ];
    
    // Update dashboard state with sample data
    dashboardState.users = sampleUsers;
    dashboardState.totalUsers = sampleUsers.length;
    dashboardState.totalPages = Math.ceil(dashboardState.totalUsers / dashboardState.pageSize);
    
    // Update UI
    renderUserTable();
    updatePagination();
}

/**
 * Render user table with current data
 */
function renderUserTable() {
    // Clear existing table content
    elements.usersTableBody.innerHTML = '';
    
    // If no users found, show empty state
    if (dashboardState.users.length === 0) {
        elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-emoji-frown text-muted" style="font-size: 2rem;"></i>
                        <p class="mt-2 mb-0">No users found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each user
    dashboardState.users.forEach((user, index) => {
        // Calculate the actual index based on pagination
        const userNumber = (dashboardState.currentPage - 1) * dashboardState.pageSize + index + 1;
        
        // Create a new row
        const row = document.createElement('tr');
        row.classList.add('user-row');
        row.setAttribute('data-user-id', user.userId);
        
        // Format date
        const createdDate = new Date(user.createdAt);
        const formattedDate = createdDate.toLocaleDateString() + ' ' + 
                             createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Set row content
        row.innerHTML = `
            <td>${userNumber}</td>
            <td data-label="Username">${user.username}</td>
            <td data-label="Email">${user.email}</td>
            <td data-label="High Score">${user.score}</td>
            <td data-label="Games Played">${user.gamesPlayed}</td>
            <td data-label="Created At">${user.createdAt}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-details" data-user-id="${user.userId}">
                    View
                </button>
            </td>
        `;
        
        // Add event listener for view details button
        const viewButton = row.querySelector('.view-details');
        viewButton.addEventListener('click', () => showUserDetails(user));
        
        // Add row to table
        elements.usersTableBody.appendChild(row);
    });
    
    // Update total users display
    elements.totalUsersDisplay.textContent = dashboardState.totalUsers;
}

/**
 * Update pagination controls
 */
function updatePagination() {
    // Update page info text
    elements.pageInfo.textContent = `Page ${dashboardState.currentPage} of ${dashboardState.totalPages}`;
    
    // Enable/disable previous button
    elements.prevPageButton.disabled = dashboardState.currentPage <= 1;
    
    // Enable/disable next button
    elements.nextPageButton.disabled = dashboardState.currentPage >= dashboardState.totalPages;
}

/**
 * Change current page
 * @param {number} pageNumber - New page number
 */
function changePage(pageNumber) {
    // Validate page number
    if (pageNumber < 1 || pageNumber > dashboardState.totalPages) {
        return;
    }
    
    // Update state and reload data
    dashboardState.currentPage = pageNumber;
    loadUserData();
}

/**
 * Handle page size change
 */
function handlePageSizeChange() {
    // Get selected page size
    const newPageSize = parseInt(elements.pageSizeSelect.value);
    
    // Update state and reset to first page
    dashboardState.pageSize = newPageSize;
    dashboardState.currentPage = 1;
    
    // Reload data with new page size
    loadUserData();
}

/**
 * Handle search
 */
function handleSearch() {
    // Get search query
    const searchQuery = elements.searchInput.value.trim();
    
    // Update state and reset to first page
    dashboardState.searchQuery = searchQuery;
    dashboardState.currentPage = 1;
    
    // Reload data with search filter
    loadUserData();
}

/**
 * Handle sort change
 */
function handleSortChange() {
    // Get selected sort field
    const sortField = elements.sortSelect.value;
    
    // Update state
    dashboardState.sortField = sortField;
    
    // Reload data with new sort
    loadUserData();
}

/**
 * Refresh data
 */
function refreshData() {
    // Show spinning animation on refresh button
    elements.refreshButton.innerHTML = '<i class="bi bi-arrow-clockwise fa-spin"></i>';
    elements.refreshButton.disabled = true;
    
    // Reload data
    loadUserData();
    
    // Reset refresh button after delay
    setTimeout(() => {
        elements.refreshButton.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
        elements.refreshButton.disabled = false;
    }, 1000);
}

/**
 * Show user details in modal
 * @param {Object} user - User object
 */
function showUserDetails(user) {
    // Format created date
    const createdDate = new Date(user.createdAt);
    const formattedDate = createdDate.toLocaleDateString() + ' ' + 
                         createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create user detail content
    elements.userDetailContent.innerHTML = `
        <div class="user-detail-card">
            <div class="mb-3">
                <small class="text-muted">User ID</small>
                <div>${user.userId}</div>
            </div>
            
            <div class="mb-3">
                <small class="text-muted">Username</small>
                <div class="fw-bold fs-5">${user.username}</div>
            </div>
            
            <div class="mb-3">
                <small class="text-muted">Email</small>
                <div>${user.email}</div>
            </div>
            
            <div class="row mb-3">
                <div class="col-6">
                    <small class="text-muted">High Score</small>
                    <div class="fw-bold text-primary">${user.highScore}</div>
                </div>
                <div class="col-6">
                    <small class="text-muted">Games Played</small>
                    <div>${user.gamesPlayed}</div>
                </div>
            </div>
            
            <div>
                <small class="text-muted">Joined</small>
                <div>${formattedDate}</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-title">Average Score Per Game</div>
            <div class="stat-value">${Math.round(user.highScore / user.gamesPlayed)}</div>
        </div>
    `;
    
    // Show modal
    elements.userDetailModal.show();
}

// Initialize the dashboard when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initDashboard); 