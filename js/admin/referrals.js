import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const referralStatsContainer = document.getElementById('referral-stats');
const referralHistoryContainer = document.getElementById('referral-history');
const loadingElement = document.getElementById('loading-indicator');
const errorElement = document.getElementById('error-message');

// Check if user is admin
onAuthStateChanged(auth, async (user) => {
  if (loading) showLoading();
  
  if (!user) {
    // Redirect to login page if not logged in
    window.location.href = '/login.html?redirect=admin/referrals.html';
    return;
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    
    if (!userData || !userData.isAdmin) {
      // Redirect to home if not admin
      window.location.href = '/index.html';
      return;
    }
    
    // User is admin, load the referral data
    await loadReferralData();
    
  } catch (error) {
    console.error('Error checking admin status:', error);
    showError('Failed to verify admin privileges');
  }
});

// Load referral statistics and history
async function loadReferralData() {
  showLoading();
  
  try {
    // Get referral stats
    await loadReferralStats();
    
    // Get recent referrals
    await loadRecentReferrals();
    
    hideLoading();
  } catch (error) {
    console.error('Error loading referral data:', error);
    showError('Failed to load referral data');
  }
}

// Load referral statistics
async function loadReferralStats() {
  // Get all referrals
  const referralsQuery = query(collection(db, 'referrals'));
  const referralsSnapshot = await getDocs(referralsQuery);
  
  // Calculate stats
  const totalReferrals = referralsSnapshot.size;
  let totalPointsAwarded = 0;
  const referrerCounts = {};
  
  referralsSnapshot.forEach(doc => {
    const referral = doc.data();
    totalPointsAwarded += referral.pointsAwarded || 0;
    
    // Count referrals per referrer
    if (referral.referrerId) {
      referrerCounts[referral.referrerId] = (referrerCounts[referral.referrerId] || 0) + 1;
    }
  });
  
  // Find top referrers
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Get user details for top referrers
  const topReferrersWithDetails = await Promise.all(
    topReferrers.map(async ([referrerId, count]) => {
      const userDoc = await getDoc(doc(db, 'users', referrerId));
      const userData = userDoc.exists() ? userDoc.data() : { displayName: 'Unknown User' };
      return {
        id: referrerId,
        name: userData.displayName,
        count: count
      };
    })
  );
  
  // Display stats
  referralStatsContainer.innerHTML = `
    <div class="stat-card">
      <h3>Total Referrals</h3>
      <p class="stat-value">${totalReferrals}</p>
    </div>
    <div class="stat-card">
      <h3>Total Points Awarded</h3>
      <p class="stat-value">${totalPointsAwarded}</p>
    </div>
    <div class="stat-card">
      <h3>Top Referrers</h3>
      <ul class="top-referrers-list">
        ${topReferrersWithDetails.map(referrer => `
          <li>
            <span class="user-name">${escapeHtml(referrer.name)}</span>
            <span class="referral-count">${referrer.count} referrals</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

// Load recent referrals
async function loadRecentReferrals() {
  const recentReferralsQuery = query(
    collection(db, 'referrals'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  const referralsSnapshot = await getDocs(recentReferralsQuery);
  
  if (referralsSnapshot.empty) {
    referralHistoryContainer.innerHTML = '<p class="no-data">No referrals found</p>';
    return;
  }
  
  // Create table
  let tableHTML = `
    <table class="referrals-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Referrer</th>
          <th>New User</th>
          <th>Points Awarded</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  referralsSnapshot.forEach(doc => {
    const referral = doc.data();
    const date = referral.createdAt ? new Date(referral.createdAt.seconds * 1000) : new Date();
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    tableHTML += `
      <tr>
        <td>${formattedDate}</td>
        <td>${escapeHtml(referral.referrerName || 'Unknown')}</td>
        <td>${escapeHtml(referral.newUserName || 'Unknown')}</td>
        <td>${referral.pointsAwarded || 0}</td>
      </tr>
    `;
  });
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  referralHistoryContainer.innerHTML = tableHTML;
}

// Helper functions
function showLoading() {
  loadingElement.style.display = 'block';
}

function hideLoading() {
  loadingElement.style.display = 'none';
}

function showError(message) {
  hideLoading();
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Export functions for testing
export { loadReferralData, loadReferralStats, loadRecentReferrals }; 