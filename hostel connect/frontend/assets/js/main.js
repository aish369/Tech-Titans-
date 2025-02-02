// DOM Elements
const loginForm = document.getElementById('loginForm');
const dashboard = document.getElementById('dashboard');
const complaintModal = document.getElementById('complaintModal');
const complaintForm = document.getElementById('complaintForm');
const complaintsList = document.getElementById('complaintsList');
const newComplaintBtn = document.querySelector('.new-complaint-btn');
const closeModal = document.querySelector('.close');
const logoutBtn = document.getElementById('logoutBtn');

// Mock Data
let currentUser = null;
const complaints = [];

// Event Listeners
document.getElementById('login').addEventListener('submit', handleLogin);
complaintForm.addEventListener('submit', handleNewComplaint);
newComplaintBtn.addEventListener('click', () => complaintModal.classList.remove('hidden'));
closeModal.addEventListener('click', () => complaintModal.classList.add('hidden'));
logoutBtn.addEventListener('click', handleLogout);

// Login Handler
function handleLogin(e) {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    const userType = e.target[2].value;

    // Mock authentication
    currentUser = {
        email,
        userType,
        name: email.split('@')[0]
    };

    document.getElementById('userName').textContent = currentUser.name;
    loginForm.classList.add('hidden');
    dashboard.classList.remove('hidden');
}

// New Complaint Handler
function handleNewComplaint(e) {
    e.preventDefault();
    const type = e.target[0].value;
    const title = e.target[1].value;
    const description = e.target[2].value;

    const complaint = {
        id: Date.now(),
        type,
        title,
        description,
        status: 'pending',
        timestamp: new Date(),
        user: currentUser
    };

    complaints.unshift(complaint);
    updateComplaintsList();
    complaintModal.classList.add('hidden');
    e.target.reset();

    // If emergency, show alert
    if (type === 'emergency') {
        alert('Emergency complaint submitted! Authorities have been notified.');
    }
}

// Update Complaints List
function updateComplaintsList(filteredComplaints = complaints) {
    complaintsList.innerHTML = filteredComplaints.map(complaint => createComplaintCard(complaint)).join('');
}

// Logout Handler
function handleLogout() {
    currentUser = null;
    complaints.length = 0;
    loginForm.classList.remove('hidden');
    dashboard.classList.add('hidden');
    document.getElementById('login').reset();
}

// Auto-escalation Timer (30 minutes)
function startEscalationTimer(complaintId) {
    setTimeout(() => {
        const complaint = complaints.find(c => c.id === complaintId);
        if (complaint && complaint.status === 'pending') {
            complaint.status = 'escalated';
            updateComplaintsList();
            alert(`Complaint #${complaintId} has been escalated to authorities due to no response!`);
        }
    }, 30 * 60 * 1000); // 30 minutes
}

// Update Dashboard Stats
function updateDashboardStats() {
    const stats = {
        active: complaints.filter(c => c.status === 'pending' || c.status === 'inProgress').length,
        resolved: complaints.filter(c => c.status === 'resolved').length,
        pending: complaints.filter(c => c.status === 'pending').length,
        escalated: complaints.filter(c => c.status === 'escalated').length
    };

    document.getElementById('activeComplaints').textContent = stats.active;
    document.getElementById('resolvedComplaints').textContent = stats.resolved;
    document.getElementById('pendingComplaints').textContent = stats.pending;
    document.getElementById('escalatedComplaints').textContent = stats.escalated;
}

// Enhanced Complaint Card
function createComplaintCard(complaint) {
    const statusColors = {
        pending: 'warning',
        inProgress: 'primary',
        resolved: 'success',
        escalated: 'danger'
    };

    return `
        <div class="complaint-card ${complaint.type} fade-in">
            <div class="complaint-header">
                <span class="complaint-type">
                    <i class="fas ${getComplaintTypeIcon(complaint.type)}"></i>
                    ${complaint.type.charAt(0).toUpperCase() + complaint.type.slice(1)}
                </span>
                <span class="status-${complaint.status}">
                    <i class="fas ${getStatusIcon(complaint.status)}"></i>
                    ${complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
                </span>
            </div>
            <h4>${complaint.title}</h4>
            <p>${complaint.description}</p>
            <div class="complaint-meta">
                <span>
                    <i class="fas fa-user"></i>
                    ${complaint.user.name}
                </span>
                <span>
                    <i class="fas fa-clock"></i>
                    ${formatDate(complaint.timestamp)}
                </span>
            </div>
            ${complaint.image ? `<img src="${complaint.image}" alt="Complaint Image" class="complaint-image">` : ''}
            <div class="complaint-actions">
                ${getActionButtons(complaint)}
            </div>
        </div>
    `;
}

// Helper Functions
function getComplaintTypeIcon(type) {
    const icons = {
        emergency: 'fa-exclamation-triangle',
        medical: 'fa-medical-kit',
        maintenance: 'fa-tools',
        general: 'fa-comment'
    };
    return icons[type] || 'fa-comment';
}

function getStatusIcon(status) {
    const icons = {
        pending: 'fa-clock',
        inProgress: 'fa-spinner',
        resolved: 'fa-check-circle',
        escalated: 'fa-exclamation-circle'
    };
    return icons[status] || 'fa-clock';
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getActionButtons(complaint) {
    if (currentUser.userType === 'student') {
        return `
            <button class="btn-secondary" onclick="trackComplaint(${complaint.id})">
                <i class="fas fa-eye"></i> Track
            </button>
        `;
    }
    return `
        <button class="btn-primary" onclick="updateStatus(${complaint.id}, 'inProgress')">
            <i class="fas fa-play"></i> Take Action
        </button>
        <button class="btn-success" onclick="updateStatus(${complaint.id}, 'resolved')">
            <i class="fas fa-check"></i> Resolve
        </button>
    `;
}

// Filter Complaints
document.getElementById('statusFilter').addEventListener('change', filterComplaints);
document.getElementById('typeFilter').addEventListener('change', filterComplaints);

function filterComplaints() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;

    const filteredComplaints = complaints.filter(complaint => {
        const statusMatch = statusFilter === 'all' || complaint.status === statusFilter;
        const typeMatch = typeFilter === 'all' || complaint.type === typeFilter;
        return statusMatch && typeMatch;
    });

    updateComplaintsList(filteredComplaints);
}

// Image Upload Preview
document.getElementById('complaintImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.createElement('img');
            preview.src = e.target.result;
            preview.className = 'image-preview';
            this.parentElement.appendChild(preview);
        }.bind(this);
        reader.readAsDataURL(file);
    }
});

// Initialize Dashboard
function initializeDashboard() {
    updateDashboardStats();
    updateComplaintsList();
    startNotificationCheck();
}

// Start Notification Check
function startNotificationCheck() {
    setInterval(() => {
        const newNotifications = complaints.filter(c => 
            c.status === 'pending' && 
            new Date() - new Date(c.timestamp) > 15 * 60 * 1000
        ).length;
        
        document.querySelector('.notification-badge').textContent = newNotifications;
    }, 60000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeDashboard); 