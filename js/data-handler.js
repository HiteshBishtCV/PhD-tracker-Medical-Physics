// Data management utilities
class DataHandler {
    constructor() {
        this.apiBaseUrl = 'https://api.github.com';
        this.repoOwner = 'your-username'; // Replace with actual GitHub username
        this.repoName = 'phd-opportunities'; // Replace with actual repo name
        this.branch = 'main';
    }

    // GitHub API integration for adding sources
    async addSourceToRepository(sourceData) {
        try {
            // Get current sources.json file
            const sourcesResponse = await this.getFileFromRepo('data/sources.json');
            let sources = [];
            
            if (sourcesResponse.content) {
                const decodedContent = atob(sourcesResponse.content);
                sources = JSON.parse(decodedContent);
            }

            // Add new source
            const newSource = {
                id: this.generateId(),
                name: sourceData.name,
                url: sourceData.url,
                selectors: this.parseSelectors(sourceData.selectors),
                active: true,
                addedDate: new Date().toISOString().split('T')[0],
                lastScraped: null,
                successCount: 0,
                errorCount: 0
            };

            sources.push(newSource);

            // Update file in repository
            await this.updateFileInRepo('data/sources.json', JSON.stringify(sources, null, 2), sourcesResponse.sha);

            return newSource;
        } catch (error) {
            console.error('Error adding source to repository:', error);
            throw error;
        }
    }

    // Parse CSS selectors from textarea input
    parseSelectors(selectorsText) {
        if (!selectorsText.trim()) return {};

        const selectors = {};
        const lines = selectorsText.split('\n');
        
        lines.forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                selectors[key] = value;
            }
        });

        return selectors;
    }

    // Get file from GitHub repository
    async getFileFromRepo(path) {
        const token = this.getGitHubToken();
        if (!token) {
            throw new Error('GitHub token not configured');
        }

        const url = `${this.apiBaseUrl}/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.status === 404) {
            return { content: null, sha: null };
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
    }

    // Update file in GitHub repository
    async updateFileInRepo(path, content, sha = null) {
        const token = this.getGitHubToken();
        if (!token) {
            throw new Error('GitHub token not configured');
        }

        const url = `${this.apiBaseUrl}/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        
        const body = {
            message: `Update ${path}`,
            content: btoa(content),
            branch: this.branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
    }

    // Get GitHub token from localStorage or environment
    getGitHubToken() {
        // In a real implementation, you might want to use GitHub Apps or OAuth
        // For now, return null to indicate no token is available
        return localStorage.getItem('github_token') || null;
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Validate opportunity data
    validateOpportunity(opportunity) {
        const required = ['title', 'institute', 'deadline', 'link', 'source'];
        const missing = required.filter(field => !opportunity[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Validate date format
        if (isNaN(Date.parse(opportunity.deadline))) {
            throw new Error('Invalid deadline date format');
        }

        // Validate URL
        try {
            new URL(opportunity.link);
        } catch {
            throw new Error('Invalid URL format');
        }

        return true;
    }

    // Deduplicate opportunities
    deduplicateOpportunities(opportunities) {
        const seen = new Set();
        const deduplicated = [];

        opportunities.forEach(opp => {
            // Create a key based on title and institute (case-insensitive)
            const key = `${opp.title.toLowerCase()}-${opp.institute.toLowerCase()}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(opp);
            }
        });

        return deduplicated;
    }

    // Clean and normalize opportunity data
    cleanOpportunityData(opportunity) {
        return {
            ...opportunity,
            title: this.cleanText(opportunity.title),
            institute: this.cleanText(opportunity.institute),
            description: this.cleanText(opportunity.description || ''),
            source: this.cleanText(opportunity.source),
            deadline: this.normalizeDate(opportunity.deadline),
            dateAdded: opportunity.dateAdded || new Date().toISOString().split('T')[0],
            id: opportunity.id || this.generateId()
        };
    }

    // Clean text by removing extra whitespace and normalizing
    cleanText(text) {
        if (!text) return '';
        return text.replace(/\s+/g, ' ').trim();
    }

    // Normalize date to YYYY-MM-DD format
    normalizeDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateString}`);
        }
        return date.toISOString().split('T')[0];
    }

    // Archive expired opportunities
    archiveExpiredOpportunities(opportunities) {
        const today = new Date();
        const active = [];
        const expired = [];

        opportunities.forEach(opp => {
            const deadline = new Date(opp.deadline);
            if (deadline < today) {
                expired.push({ ...opp, archivedDate: today.toISOString().split('T')[0] });
            } else {
                active.push(opp);
            }
        });

        return { active, expired };
    }

    // Get statistics from opportunities data
    getStatistics(opportunities) {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        return {
            total: opportunities.length,
            newToday: opportunities.filter(opp => opp.dateAdded === today).length,
            expiringSoon: opportunities.filter(opp => 
                opp.deadline <= thirtyDaysFromNow && opp.deadline > today
            ).length,
            bySource: this.groupBy(opportunities, 'source'),
            byInstitute: this.groupBy(opportunities, 'institute'),
            lastUpdated: opportunities.length > 0 ? 
                Math.max(...opportunities.map(opp => new Date(opp.dateAdded))) : null
        };
    }

    // Group array by field
    groupBy(array, field) {
        return array.reduce((groups, item) => {
            const key = item[field];
            groups[key] = (groups[key] || 0) + 1;
            return groups;
        }, {});
    }

    // Export data to various formats
    exportToCSV(opportunities, filename = 'opportunities.csv') {
        const headers = ['Title', 'Institute', 'Deadline', 'Source', 'Date Added', 'Link', 'Description'];
        const csvContent = [
            headers.join(','),
            ...opportunities.map(opp => [
                `"${this.escapeCsvField(opp.title)}"`,
                `"${this.escapeCsvField(opp.institute)}"`,
                opp.deadline,
                `"${this.escapeCsvField(opp.source)}"`,
                opp.dateAdded,
                opp.link,
                `"${this.escapeCsvField(opp.description || '')}"`
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    exportToJSON(opportunities, filename = 'opportunities.json') {
        const jsonContent = JSON.stringify(opportunities, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    // Escape CSV field content
    escapeCsvField(field) {
        if (!field) return '';
        return field.replace(/"/g, '""');
    }

    // Download file to user's device
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Local storage utilities
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    loadFromLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from localStorage:', error);
        }
    }

    // Cache management
    setCacheExpiry(key, hours = 24) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + hours);
        this.saveToLocalStorage(`${key}_expiry`, expiry.toISOString());
    }

    isCacheExpired(key) {
        const expiry = this.loadFromLocalStorage(`${key}_expiry`);
        if (!expiry) return true;
        
        return new Date() > new Date(expiry);
    }

    // URL validation
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    // Date utilities
    formatDate(date, format = 'short') {
        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
            relative: { relative: true }
        };

        if (format === 'relative') {
            const now = new Date();
            const diffTime = date - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays === -1) return 'Yesterday';
            if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
            if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
        }

        return date.toLocaleDateString('en-US', options[format] || options.short);
    }

    // Generate RSS feed (for potential future use)
    generateRSSFeed(opportunities) {
        const rssItems = opportunities.slice(0, 20).map(opp => `
            <item>
                <title><![CDATA[${opp.title}]]></title>
                <description><![CDATA[${opp.description || 'PhD opportunity at ' + opp.institute}]]></description>
                <link>${opp.link}</link>
                <guid>${opp.id}</guid>
                <pubDate>${new Date(opp.dateAdded).toUTCString()}</pubDate>
                <category>PhD Opportunities</category>
            </item>
        `).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>PhD Medical Physics Opportunities</title>
                    <description>Latest PhD opportunities in Medical Physics</description>
                    <link>${window.location.origin}</link>
                    <language>en-us</language>
                    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
                    ${rssItems}
                </channel>
            </rss>`;
    }
}

// Create global instance
window.dataHandler = new DataHandler();
