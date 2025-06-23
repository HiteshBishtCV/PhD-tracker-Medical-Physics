# PhD Medical Physics Opportunities Tracker

A fully automated web application that scrapes and displays PhD opportunities in Medical Physics from multiple sources. The system runs daily via GitHub Actions and hosts a responsive website on GitHub Pages.

## 🌟 Features

- **Automated Daily Scraping**: Runs every day at 6:00 AM UTC via GitHub Actions
- **Multiple Data Sources**: Scrapes from academic job boards, university websites, and professional networks
- **Responsive Web Interface**: Clean, professional design that works on all devices
- **Smart Filtering**: Search and filter by institute, source, deadline, or keywords
- **Manual Source Addition**: Add new websites to scrape directly from the web interface
- **Export Functionality**: Export filtered results to CSV
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Deadline Tracking**: Highlight opportunities expiring soon
- **Automatic Archiving**: Move expired opportunities to archive automatically

## 🚀 Quick Start

### 1. Enable GitHub Pages

1. Go to your repository Settings → Pages
2. Set Source to **"GitHub Actions"**
3. Your site will be available at: `https://YOUR-USERNAME.github.io/phd-opportunities`

### 2. Configure Repository Permissions

1. Go to Settings → Actions → General
2. Set "Workflow permissions" to **"Read and write permissions"**
3. Enable **"Allow GitHub Actions to create and approve pull requests"**

### 3. Run Initial Scraping

1. Go to **Actions** tab in your repository
2. Click **"Daily PhD Opportunities Scraper"**
3. Click **"Run workflow"** to trigger manually
4. Wait for completion and visit your GitHub Pages site

## 📊 Current Data

The system currently tracks **8 sample opportunities** from major institutions including:

- Stanford University (Radiation Oncology)
- Mayo Clinic (Medical Imaging)
- Johns Hopkins University (Nuclear Medicine)
- MD Anderson Cancer Center (Proton Therapy)
- University of Wisconsin-Madison (Radiation Dosimetry)
- Duke University (Adaptive Radiotherapy)
- University of Pennsylvania (Brachytherapy)
- Massachusetts General Hospital (MRI-Guided Therapy)

## 🎯 Supported Sources

The scraper monitors these job boards and institutions:

- **Nature Jobs** - Academic positions
- **IEEE Job Site** - Technical positions
- **Physics Today Jobs** - Academic opportunities
- **AAPM Career Center** - Professional medical physics jobs
- **Science Careers** - Research positions
- **Academic Jobs Online** - University positions
- **Indeed Academic** - General academic jobs
- **NSF Graduate Research Fellowship** - Funding opportunities

## 🔧 Technical Architecture

### Frontend
- **HTML/CSS/JavaScript**: Modern responsive design
- **GitHub Pages**: Free hosting

### Backend
- **Python Scraper**: BeautifulSoup + Selenium for web scraping
- **GitHub Actions**: Serverless automation platform
- **JSON Storage**