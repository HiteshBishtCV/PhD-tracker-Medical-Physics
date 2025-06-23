// Scraper management and coordination
class ScraperManager {
    constructor() {
        this.sources = [];
        this.scrapingQueue = [];
        this.isScrapingActive = false;
        this.results = [];
        this.errors = [];
        
        // Default source configurations
        this.defaultSources = [
            {
                id: 'nature-jobs',
                name: 'Nature Jobs',
                url: 'https://www.nature.com/naturecareers/jobs',
                type: 'academic',
                selectors: {
                    container: '.job-listing',
                    title: '.job-title',
                    institute: '.job-location',
                    deadline: '.job-deadline',
                    link: '.job-link'
                },
                searchParams: {
                    keywords: 'medical physics phd',
                    category: 'academic'
                }
            },
            {
                id: 'academic-jobs',
                name: 'Academic Jobs Online',
                url: 'https://academicjobsonline.org',
                type: 'academic',
                selectors: {
                    container: '.job-row',
                    title: '.job-title',
                    institute: '.institution',
                    deadline: '.deadline',
                    link: '.apply-link'
                }
            }
        ];
    }

    // Initialize scraper manager
    async init() {
        await this.loadSources();
        this.setupPeriodicScraping();
    }

    // Load sources from configuration
    async loadSources() {
        try {
            const response = await fetch('./data/sources.json');
            if (response.ok) {
                this.sources = await response.json();
            } else {
                this.sources = [...this.defaultSources];
            }
        } catch (error) {
            console.error('Error loading sources:', error);
            this.sources = [...this.defaultSources];
        }
    }

    // Add new source to configuration
    async addSource(sourceData) {
        const newSource = {
            id: this.generateSourceId(sourceData.name),
            name: sourceData.name,
            url: sourceData.url,
            type: 'custom',
            selectors: this.parseSelectors(sourceData.selectors),
            active: true,
            addedDate: new Date().toISOString(),
            lastScraped: null,
            successCount: 0,
            errorCount: 0
        };

        this.sources.push(newSource);
        
        // In a real implementation, save to repository
        await this.saveSources();
        
        return newSource;
    }

    // Test scraping a source
    async testSource(url, selectors = {}) {
        try {
            // Simulate testing by checking if URL is accessible
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors' // This will be limited, but provides basic connectivity test
            });
            
            // Since we can't actually scrape due to CORS, simulate results
            const mockResults = this.generateMockScrapingResults(url);
            
            return {
                success: true,
                results: mockResults,
                message: 'Source appears to be accessible'
            };
            
        } catch (error) {
            return {
                success: false,
                results: [],
                error: error.message
            };
        }
    }

    // Generate mock scraping results for testing
    generateMockScrapingResults(url) {
        const domain = new URL(url).hostname;
        return [
            {
                title: `PhD Position in Medical Physics - ${domain}`,
                institute: 'Sample University',
                deadline: '2025-08-15',
                link: url,
                description: 'Research opportunity in medical physics'
            },
            {
                title: `Graduate Research Position - ${domain}`,
                institute: 'Research Institute',
                deadline: '2025-09-01',
                link: url,
                description: 'Advanced imaging and therapy research'
            }
        ];
    }

    // Start scraping process
    async startScraping(sources = null) {
        if (this.isScrapingActive) {
            throw new Error('Scraping is already in progress');
        }

        this.isScrapingActive = true;
        this.results = [];
        this.errors = [];

        const sourcesToScrape = sources || this.sources.filter(s => s.active);
        
        try {
            for (const source of sourcesToScrape) {
                await this.scrapeSource(source);
                // Add delay between requests to be respectful
                await this.delay(2000);
            }
            
            return {
                success: true,
                results: this.results,
                errors: this.errors,
                summary: this.generateScrapingSummary()
            };
            
        } catch (error) {
            throw error;
        } finally {
            this.isScrapingActive = false;
        }
    }

    // Scrape individual source
    async scrapeSource(source) {
        try {
            console.log(`Scraping: ${source.name}`);
            
            // Update last scraped time
            source.lastScraped = new Date().toISOString();
            
            // Since we can't actually scrape from the browser due to CORS,
            // this would normally call a backend service or use a proxy
            const opportunities = await this.performScraping(source);
            
            // Clean and validate results
            const cleanedOpportunities = opportunities
                .map(opp => this.cleanOpportunityData(opp, source))
                .filter(opp => this.validateOpportunity(opp));
            
            this.results.push(...cleanedOpportunities);
            source.successCount++;
            
            console.log(`Found ${cleanedOpportunities.length} opportunities from ${source.name}`);
            
        } catch (error) {
            console.error(`Error scraping ${source.name}:`, error);
            this.errors.push({
                source: source.name,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            source.errorCount++;
        }
    }

    // Perform actual scraping (mock implementation)
    async performScraping(source) {
        // In a real implementation, this would either:
        // 1. Call a backend scraping service
        // 2. Use a browser extension with elevated permissions
        // 3. Use a proxy service that handles CORS
        
        // For demo purposes, return mock data
        return this.generateMockOpportunities(source);
    }

    // Generate mock opportunities for demonstration
    generateMockOpportunities(source) {
        const mockTitles = [
            'PhD Position in Medical Physics',
            'Graduate Research Assistant - Radiation Oncology',
            'Doctoral Studies in Imaging Physics',
            'PhD Opportunity in Nuclear Medicine',
            'Research Position - Proton Therapy',
            'Graduate Student Position - Medical Imaging',
            'PhD in Radiotherapy Physics',
            'Medical Physics Research Assistant'
        ];

        const mockInstitutes = [
            'Stanford University',
            'Mayo Clinic',
            'Johns Hopkins University',
            'MD Anderson Cancer Center',
            'Massachusetts General Hospital',
            'University of Wisconsin-Madison',
            'Duke University',
            'University of Pennsylvania'
        ];

        const opportunities = [];
        const numOpportunities = Math.floor(Math.random() * 5) + 1; // 1-5 opportunities

        for (let i = 0; i < numOpportunities; i++) {
            const title = mockTitles[Math.floor(Math.random() * mockTitles.length)];
            const institute = mockInstitutes[Math.floor(Math.random() * mockInstitutes.length)];
            const deadline = this.generateRandomDeadline();
            
            opportunities.push({
                title: `${title} - ${source.name}`,
                institute: institute,
                deadline: deadline,
                link: `${source.url}/opportunity-${i + 1}`,
                description: `Research opportunity in medical physics at ${institute}`,
                source: source.name
            });
        }

        return opportunities;
    }

    // Generate random future deadline
    generateRandomDeadline() {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + Math.floor(Math.random() * 180) + 30); // 30-210 days from now
        return futureDate.toISOString().split('T')[0];
    }

    // Clean opportunity data
    cleanOpportunityData(opportunity, source) {
        return {
            id: this.generateOpportunityId(opportunity),
            title: this.cleanText(opportunity.title),
            institute: this.cleanText(opportunity.institute),
            deadline: this.normalizeDate(opportunity.deadline),
            link: opportunity.link,
            description: this.cleanText(opportunity.description || ''),
            source: source.name,
            dateAdded: new Date().toISOString().split('T')[0],
            scrapedAt: new Date().toISOString()
        };
    }

    // Validate opportunity data
    validateOpportunity(opportunity) {
        const required = ['title', 'institute', 'deadline', 'link'];
        return required.every(field => opportunity[field] && opportunity[field].trim());
    }

    // Clean text content
    cleanText(text) {
        if (!text) return '';
        return text.replace(/\s+/g, ' ').trim();
    }

    // Normalize date format
    normalizeDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch {
            // If date parsing fails, return a default future date
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 6);
            return futureDate.toISOString().split('T')[0];
        }
    }

    // Generate unique opportunity ID
    generateOpportunityId(opportunity) {
        const content = `${opportunity.title}-${opportunity.institute}`.toLowerCase();
        return content.replace(/[^a-z0-9]/g, '-').substring(0, 50) + '-' + Date.now().toString(36);
    }

    // Generate unique source ID
    generateSourceId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    }

    // Parse selectors from string format
    parseSelectors(selectorsText) {
        if (!selectorsText || !selectorsText.trim()) {
            return {};
        }

        const selectors = {};
        const lines = selectorsText.split('\n');
        
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                if (key && value) {
                    selectors[key] = value;
                }
            }
        });

        return selectors;
    }

    // Generate scraping summary
    generateScrapingSummary() {
        const totalResults = this.results.length;
        const totalErrors = this.errors.length;
        const sourcesScrapped = new Set(this.results.map(r => r.source)).size;
        
        return {
            totalOpportunities: totalResults,
            totalErrors: totalErrors,
            sourcesScrapped: sourcesScrapped,
            successRate: totalErrors === 0 ? 100 : Math.round((totalResults / (totalResults + totalErrors)) * 100),
            scrapingDuration: null // Would be calculated in real implementation
        };
    }

    // Setup periodic scraping
    setupPeriodicScraping() {
        // In a real implementation, this would be handled by GitHub Actions
        // For demonstration, we can set up a simple interval
        const scrapingInterval = 24 * 60 * 60 * 1000; // 24 hours
        
        // Don't actually set up periodic scraping in the browser
        console.log('Periodic scraping would be configured via GitHub Actions');
    }

    // Save sources configuration
    async saveSources() {
        try {
            // In a real implementation, this would save to the repository
            // For now, save to localStorage as fallback
            localStorage.setItem('phd_scraper_sources', JSON.stringify(this.sources));
            console.log('Sources saved locally');
        } catch (error) {
            console.error('Error saving sources:', error);
        }
    }

    // Get scraping statistics
    getScrapingStats() {
        return {
            totalSources: this.sources.length,
            activeSources: this.sources.filter(s => s.active).length,
            successfulScrapes: this.sources.reduce((sum, s) => sum + s.successCount, 0),
            failedScrapes: this.sources.reduce((sum, s) => sum + s.errorCount, 0),
            lastScrapingSession: {
                results: this.results.length,
                errors: this.errors.length,
                timestamp: new Date().toISOString()
            }
        };
    }

    // Remove or deactivate source
    removeSource(sourceId) {
        const index = this.sources.findIndex(s => s.id === sourceId);
        if (index > -1) {
            this.sources.splice(index, 1);
            this.saveSources();
            return true;
        }
        return false;
    }

    // Toggle source active status
    toggleSource(sourceId) {
        const source = this.sources.find(s => s.id === sourceId);
        if (source) {
            source.active = !source.active;
            this.saveSources();
            return source.active;
        }
        return false;
    }

    // Get source by ID
    getSource(sourceId) {
        return this.sources.find(s => s.id === sourceId);
    }

    // Update source configuration
    updateSource(sourceId, updates) {
        const source = this.sources.find(s => s.id === sourceId);
        if (source) {
            Object.assign(source, updates);
            this.saveSources();
            return source;
        }
        return null;
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Export scraping results
    exportResults(format = 'json') {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `scraping-results-${timestamp}`;
        
        if (format === 'json') {
            const data = {
                results: this.results,
                errors: this.errors,
                summary: this.generateScrapingSummary(),
                exportedAt: new Date().toISOString()
            };
            this.downloadJSON(data, `${filename}.json`);
        } else if (format === 'csv') {
            this.exportResultsToCSV(`${filename}.csv`);
        }
    }

    // Export results to CSV
    exportResultsToCSV(filename) {
        const headers = ['Title', 'Institute', 'Deadline', 'Source', 'Link', 'Date Added'];
        const csvContent = [
            headers.join(','),
            ...this.results.map(opp => [
                `"${opp.title.replace(/"/g, '""')}"`,
                `"${opp.institute.replace(/"/g, '""')}"`,
                opp.deadline,
                `"${opp.source.replace(/"/g, '""')}"`,
                opp.link,
                opp.dateAdded
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    // Download JSON file
    downloadJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    // Download file utility
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

    // Check if scraping is currently active
    isScrapingInProgress() {
        return this.isScrapingActive;
    }

    // Get recent scraping errors
    getRecentErrors(limit = 10) {
        return this.errors.slice(-limit);
    }

    // Clear old errors
    clearOldErrors(daysOld = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        this.errors = this.errors.filter(error => 
            new Date(error.timestamp) > cutoffDate
        );
    }
}

// Create global instance
window.scraperManager = new ScraperManager();
