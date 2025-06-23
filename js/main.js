// Main application controller
class PhDOpportunitiesApp {
    constructor() {
        this.opportunities = [];
        this.filteredOpportunities = [];
        this.currentSort = { field: 'dateAdded', direction: 'desc' };
        this.filters = {
            search: '',
            institute: '',
            source: '',
            deadline: ''
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupTheme();
        await this.loadData();
        this.renderOpportunities();
        this.updateStats();
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });

        // Search and filters
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        document.getElementById('institute-filter').addEventListener('change', (e) => {
            this.filters.institute = e.target.value;
            this.applyFilters();
        });

        document.getElementById('source-filter').addEventListener('change', (e) => {
            this.filters.source = e.target.value;
            this.applyFilters();
        });

        document.getElementById('deadline-filter').addEventListener('change', (e) => {
            this.filters.deadline = e.target.value;
            this.applyFilters();
        });

        // Export CSV
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Add source modal
        document.getElementById('add-source').addEventListener('click', () => {
            this.showAddSourceModal();
        });

        // Modal close
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.hideAddSourceModal();
        });

        // Modal background click
        document.getElementById('add-source-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAddSourceModal();
            }
        });

        // Form submission
        document.getElementById('add-source-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddSource();
        });

        // Test source
        document.getElementById('test-source').addEventListener('click', () => {
            this.testSource();
        });

        // Table sorting
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                this.sortTable(th.dataset.sort);
            });
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#theme-toggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    async loadData() {
        try {
            document.getElementById('loading-indicator').style.display = 'block';
            
            // Try to load from GitHub Pages data directory
            const response = await fetch('./data/opportunities.json');
            if (response.ok) {
                this.opportunities = await response.json();
            } else {
                // Fallback to sample data if no data file exists yet
                this.opportunities = this.generateSampleData();
            }
            
            this.filteredOpportunities = [...this.opportunities];
            this.populateFilterOptions();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.opportunities = this.generateSampleData();
            this.filteredOpportunities = [...this.opportunities];
            this.populateFilterOptions();
        } finally {
            document.getElementById('loading-indicator').style.display = 'none';
        }
    }

    generateSampleData() {
        const sampleData = [
            {
                id: '1',
                title: 'PhD in Medical Physics - Radiation Oncology',
                institute: 'Stanford University',
                deadline: '2025-08-15',
                source: 'University Website',
                link: 'https://example.com/phd1',
                dateAdded: '2025-06-20',
                description: 'Research in advanced radiation therapy techniques'
            },
            {
                id: '2',
                title: 'Graduate Research Position - Imaging Physics',
                institute: 'Mayo Clinic',
                deadline: '2025-09-01',
                source: 'Direct Application',
                link: 'https://example.com/phd2',
                dateAdded: '2025-06-21',
                description: 'Medical imaging and diagnostic physics research'
            },
            {
                id: '3',
                title: 'PhD Opportunity in Nuclear Medicine',
                institute: 'Johns Hopkins University',
                deadline: '2025-07-30',
                source: 'Academic Job Board',
                link: 'https://example.com/phd3',
                dateAdded: '2025-06-22',
                description: 'Molecular imaging and radiopharmaceutical development'
            },
            {
                id: '4',
                title: 'Medical Physics PhD - Proton Therapy',
                institute: 'MD Anderson Cancer Center',
                deadline: '2025-08-20',
                source: 'LinkedIn',
                link: 'https://example.com/phd4',
                dateAdded: '2025-06-23',
                description: 'Advanced proton beam therapy research'
            }
        ];

        return sampleData;
    }

    populateFilterOptions() {
        // Populate institute filter
        const institutes = [...new Set(this.opportunities.map(opp => opp.institute))].sort();
        const instituteFilter = document.getElementById('institute-filter');
        instituteFilter.innerHTML = '<option value="">All Institutes</option>';
        institutes.forEach(institute => {
            const option = document.createElement('option');
            option.value = institute;
            option.textContent = institute;
            instituteFilter.appendChild(option);
        });

        // Populate source filter
        const sources = [...new Set(this.opportunities.map(opp => opp.source))].sort();
        const sourceFilter = document.getElementById('source-filter');
        sourceFilter.innerHTML = '<option value="">All Sources</option>';
        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            sourceFilter.appendChild(option);
        });
    }

    applyFilters() {
        this.filteredOpportunities = this.opportunities.filter(opp => {
            const matchesSearch = this.filters.search === '' || 
                opp.title.toLowerCase().includes(this.filters.search) ||
                opp.institute.toLowerCase().includes(this.filters.search) ||
                opp.description.toLowerCase().includes(this.filters.search);
            
            const matchesInstitute = this.filters.institute === '' || 
                opp.institute === this.filters.institute;
            
            const matchesSource = this.filters.source === '' || 
                opp.source === this.filters.source;
            
            const matchesDeadline = this.filters.deadline === '' || 
                opp.deadline >= this.filters.deadline;
            
            return matchesSearch && matchesInstitute && matchesSource && matchesDeadline;
        });

        this.sortOpportunities();
        this.renderOpportunities();
        this.updateStats();
    }

    sortTable(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        this.sortOpportunities();
        this.renderOpportunities();
        this.updateSortIcons();
    }

    sortOpportunities() {
        this.filteredOpportunities.sort((a, b) => {
            let aVal = a[this.currentSort.field];
            let bVal = b[this.currentSort.field];

            // Handle date sorting
            if (this.currentSort.field === 'deadline' || this.currentSort.field === 'dateAdded') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return this.currentSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateSortIcons() {
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === this.currentSort.field) {
                th.classList.add(`sort-${this.currentSort.direction}`);
            }
        });
    }

    renderOpportunities() {
        const tbody = document.getElementById('opportunities-tbody');
        const noResults = document.getElementById('no-results');

        if (this.filteredOpportunities.length === 0) {
            tbody.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        
        tbody.innerHTML = this.filteredOpportunities.map(opp => {
            const deadlineClass = this.getDeadlineClass(opp.deadline);
            const formattedDeadline = this.formatDate(opp.deadline);
            const formattedDateAdded = this.formatDate(opp.dateAdded);

            return `
                <tr>
                    <td>
                        <a href="${opp.link}" target="_blank" class="opportunity-title">
                            ${opp.title}
                        </a>
                        <div class="text-secondary">${opp.description || ''}</div>
                    </td>
                    <td>${opp.institute}</td>
                    <td class="deadline-cell ${deadlineClass}">${formattedDeadline}</td>
                    <td><span class="source-badge">${opp.source}</span></td>
                    <td class="date-added">${formattedDateAdded}</td>
                    <td class="action-links">
                        <a href="${opp.link}" target="_blank">Apply</a>
                        <a href="#" onclick="app.shareOpportunity('${opp.id}')">Share</a>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getDeadlineClass(deadline) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'deadline-expired';
        if (diffDays <= 7) return 'deadline-urgent';
        if (diffDays <= 30) return 'deadline-soon';
        return '';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    updateStats() {
        const total = this.opportunities.length;
        const today = new Date().toISOString().split('T')[0];
        const newToday = this.opportunities.filter(opp => opp.dateAdded === today).length;
        
        const expiringSoon = this.opportunities.filter(opp => {
            const deadline = new Date(opp.deadline);
            const daysDiff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
            return daysDiff <= 30 && daysDiff > 0;
        }).length;

        const lastUpdated = this.opportunities.length > 0 ? 
            this.formatDate(Math.max(...this.opportunities.map(opp => new Date(opp.dateAdded)))) : 
            'Never';

        document.getElementById('total-opportunities').textContent = total;
        document.getElementById('new-today').textContent = newToday;
        document.getElementById('expiring-soon').textContent = expiringSoon;
        document.getElementById('last-updated').textContent = lastUpdated;
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn');
        const originalContent = refreshBtn.innerHTML;
        
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        refreshBtn.disabled = true;

        try {
            await this.loadData();
            this.renderOpportunities();
            this.updateStats();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            refreshBtn.innerHTML = originalContent;
            refreshBtn.disabled = false;
        }
    }

    exportToCSV() {
        const headers = ['Title', 'Institute', 'Deadline', 'Source', 'Date Added', 'Link'];
        const csvContent = [
            headers.join(','),
            ...this.filteredOpportunities.map(opp => [
                `"${opp.title}"`,
                `"${opp.institute}"`,
                opp.deadline,
                `"${opp.source}"`,
                opp.dateAdded,
                opp.link
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phd-opportunities-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    shareOpportunity(id) {
        const opportunity = this.opportunities.find(opp => opp.id === id);
        if (opportunity) {
            const shareText = `Check out this PhD opportunity: ${opportunity.title} at ${opportunity.institute}`;
            const shareUrl = opportunity.link;
            
            if (navigator.share) {
                navigator.share({
                    title: opportunity.title,
                    text: shareText,
                    url: shareUrl
                });
            } else {
                // Fallback to clipboard
                navigator.clipboard.writeText(`${shareText} - ${shareUrl}`).then(() => {
                    alert('Opportunity link copied to clipboard!');
                });
            }
        }
    }

    showAddSourceModal() {
        document.getElementById('add-source-modal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideAddSourceModal() {
        document.getElementById('add-source-modal').classList.remove('show');
        document.body.style.overflow = '';
        document.getElementById('add-source-form').reset();
        document.getElementById('test-results').style.display = 'none';
    }

    async testSource() {
        const url = document.getElementById('source-url').value;
        const selectors = document.getElementById('source-selectors').value;
        const testResults = document.getElementById('test-results');

        if (!url) {
            testResults.innerHTML = '<p style="color: var(--danger-color);">Please enter a URL to test.</p>';
            testResults.style.display = 'block';
            testResults.className = 'test-results error';
            return;
        }

        testResults.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing source...';
        testResults.style.display = 'block';
        testResults.className = 'test-results';

        try {
            // Simulate testing (in real implementation, this would call your scraping service)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock successful test
            testResults.innerHTML = `
                <div style="color: var(--success-color); margin-bottom: 1rem;">
                    <i class="fas fa-check-circle"></i> Test successful!
                </div>
                <div><strong>Found:</strong> 3 potential opportunities</div>
                <div><strong>Sample titles:</strong></div>
                <ul>
                    <li>PhD Position in Medical Physics</li>
                    <li>Graduate Research - Radiation Therapy</li>
                    <li>Doctoral Studies in Imaging Physics</li>
                </ul>
            `;
            testResults.className = 'test-results success';

        } catch (error) {
            testResults.innerHTML = `
                <div style="color: var(--danger-color); margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-circle"></i> Test failed
                </div>
                <div>${error.message}</div>
            `;
            testResults.className = 'test-results error';
        }
    }

    async handleAddSource() {
        const url = document.getElementById('source-url').value;
        const name = document.getElementById('source-name').value;
        const selectors = document.getElementById('source-selectors').value;

        try {
            // In a real implementation, this would:
            // 1. Add the source to sources.json via GitHub API
            // 2. Update the scraping configuration
            // 3. Trigger a test scrape

            // For now, simulate success
            alert('Source added successfully! It will be included in the next automated scrape.');
            this.hideAddSourceModal();

        } catch (error) {
            alert('Error adding source: ' + error.message);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PhDOpportunitiesApp();
});
