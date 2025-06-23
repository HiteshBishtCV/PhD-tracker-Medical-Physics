#!/usr/bin/env python3
"""
PhD Medical Physics Opportunities Scraper
Main scraping script for automated data collection
"""

import json
import os
import sys
import time
import logging
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class PhDScraper:
    def __init__(self, config_path: str = "data/sources.json"):
        self.config_path = config_path
        self.sources = []
        self.results = []
        self.errors = []
        self.session = requests.Session()
        self.driver = None
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('scraping.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Setup session headers
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })

    def load_sources(self) -> None:
        """Load scraping sources from configuration file"""
        try:
            with open(self.config_path, 'r') as f:
                self.sources = json.load(f)
            self.logger.info(f"Loaded {len(self.sources)} sources")
        except FileNotFoundError:
            self.logger.warning("Sources file not found, using default sources")
            self.sources = self.get_default_sources()
        except json.JSONDecodeError as e:
            self.logger.error(f"Error parsing sources file: {e}")
            self.sources = self.get_default_sources()

    def get_default_sources(self) -> List[Dict]:
        """Get default sources configuration"""
        return [
            {
                "id": "nature-jobs",
                "name": "Nature Jobs",
                "url": "https://www.nature.com/naturecareers/jobs",
                "type": "academic",
                "active": True,
                "selectors": {
                    "container": ".job-listing",
                    "title": ".job-title a",
                    "institute": ".job-location",
                    "deadline": ".job-deadline",
                    "link": ".job-title a"
                },
                "search_params": {
                    "keywords": "medical physics phd",
                    "category": "academic"
                }
            },
            {
                "id": "ieee-jobs",
                "name": "IEEE Job Site",
                "url": "https://jobs.ieee.org",
                "type": "technical",
                "active": True,
                "selectors": {
                    "container": ".job-item",
                    "title": ".job-title",
                    "institute": ".company-name",
                    "deadline": ".deadline-date",
                    "link": ".job-title a"
                }
            }
        ]

    def setup_selenium_driver(self, headless: bool = True) -> None:
        """Setup Selenium WebDriver for JavaScript-heavy sites"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.implicitly_wait(10)
            self.logger.info("Selenium WebDriver initialized")
        except Exception as e:
            self.logger.error(f"Failed to initialize WebDriver: {e}")
            self.driver = None

    def scrape_all_sources(self) -> Dict[str, Any]:
        """Scrape all active sources"""
        self.logger.info("Starting scraping process")
        
        active_sources = [s for s in self.sources if s.get('active', True)]
        self.logger.info(f"Scraping {len(active_sources)} active sources")
        
        for source in active_sources:
            try:
                self.logger.info(f"Scraping: {source['name']}")
                opportunities = self.scrape_source(source)
                self.results.extend(opportunities)
                
                # Update source metadata
                source['last_scraped'] = datetime.now().isoformat()
                source['success_count'] = source.get('success_count', 0) + 1
                
                self.logger.info(f"Found {len(opportunities)} opportunities from {source['name']}")
                
                # Be respectful - add delay between requests
                time.sleep(2)
                
            except Exception as e:
                self.logger.error(f"Error scraping {source['name']}: {e}")
                self.errors.append({
                    'source': source['name'],
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })
                source['error_count'] = source.get('error_count', 0) + 1

        return self.generate_summary()

    def scrape_source(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scrape opportunities from a single source"""
        opportunities = []
        
        if source.get('type') == 'javascript' or source.get('requires_js', False):
            opportunities = self.scrape_with_selenium(source)
        else:
            opportunities = self.scrape_with_requests(source)
            
        # Clean and validate opportunities
        cleaned_opportunities = []
        for opp in opportunities:
            cleaned_opp = self.clean_opportunity_data(opp, source)
            if self.validate_opportunity(cleaned_opp):
                cleaned_opportunities.append(cleaned_opp)
        
        return cleaned_opportunities

    def scrape_with_requests(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scrape using requests and BeautifulSoup"""
        opportunities = []
        
        try:
            # Check robots.txt
            if not self.check_robots_txt(source['url']):
                self.logger.warning(f"Robots.txt disallows scraping for {source['url']}")
                return opportunities
            
            response = self.session.get(source['url'], timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            selectors = source.get('selectors', {})
            
            # Find job containers
            containers = soup.select(selectors.get('container', '.job'))
            
            for container in containers:
                opportunity = self.extract_opportunity_data(container, selectors, source['url'])
                if opportunity:
                    opportunities.append(opportunity)
                    
        except requests.RequestException as e:
            self.logger.error(f"Request error for {source['name']}: {e}")
        except Exception as e:
            self.logger.error(f"Parsing error for {source['name']}: {e}")
            
        return opportunities

    def scrape_with_selenium(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scrape using Selenium for JavaScript-heavy sites"""
        opportunities = []
        
        if not self.driver:
            self.setup_selenium_driver()
            
        if not self.driver:
            self.logger.error("Selenium driver not available")
            return opportunities
            
        try:
            self.driver.get(source['url'])
            
            # Wait for content to load
            wait = WebDriverWait(self.driver, 15)
            selectors = source.get('selectors', {})
            
            if selectors.get('container'):
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selectors['container'])))
            
            # Find job containers
            containers = self.driver.find_elements(By.CSS_SELECTOR, selectors.get('container', '.job'))
            
            for container in containers:
                opportunity = self.extract_opportunity_data_selenium(container, selectors, source['url'])
                if opportunity:
                    opportunities.append(opportunity)
                    
        except TimeoutException:
            self.logger.error(f"Timeout waiting for content on {source['name']}")
        except Exception as e:
            self.logger.error(f"Selenium error for {source['name']}: {e}")
            
        return opportunities

    def extract_opportunity_data(self, container, selectors: Dict[str, str], base_url: str) -> Optional[Dict[str, Any]]:
        """Extract opportunity data from HTML container"""
        try:
            opportunity = {}
            
            # Extract title
            title_elem = container.select_one(selectors.get('title', '.title'))
            opportunity['title'] = title_elem.get_text(strip=True) if title_elem else 'No title'
            
            # Extract institute
            institute_elem = container.select_one(selectors.get('institute', '.institute'))
            opportunity['institute'] = institute_elem.get_text(strip=True) if institute_elem else 'Unknown'
            
            # Extract deadline
            deadline_elem = container.select_one(selectors.get('deadline', '.deadline'))
            opportunity['deadline'] = self.parse_deadline(deadline_elem.get_text(strip=True) if deadline_elem else '')
            
            # Extract link
            link_elem = container.select_one(selectors.get('link', 'a'))
            if link_elem:
                href = link_elem.get('href', '')
                opportunity['link'] = urljoin(base_url, href)
            else:
                opportunity['link'] = base_url
            
            # Extract description
            desc_elem = container.select_one(selectors.get('description', '.description'))
            opportunity['description'] = desc_elem.get_text(strip=True) if desc_elem else ''
            
            # Filter for medical physics relevance
            if self.is_medical_physics_relevant(opportunity['title'], opportunity['description']):
                return opportunity
                
        except Exception as e:
            self.logger.error(f"Error extracting opportunity data: {e}")
            
        return None

    def extract_opportunity_data_selenium(self, container, selectors: Dict[str, str], base_url: str) -> Optional[Dict[str, Any]]:
        """Extract opportunity data using Selenium WebElement"""
        try:
            opportunity = {}
            
            # Extract title
            try:
                title_elem = container.find_element(By.CSS_SELECTOR, selectors.get('title', '.title'))
                opportunity['title'] = title_elem.text.strip()
            except NoSuchElementException:
                opportunity['title'] = 'No title'
            
            # Extract institute
            try:
                institute_elem = container.find_element(By.CSS_SELECTOR, selectors.get('institute', '.institute'))
                opportunity['institute'] = institute_elem.text.strip()
            except NoSuchElementException:
                opportunity['institute'] = 'Unknown'
            
            # Extract deadline
            try:
                deadline_elem = container.find_element(By.CSS_SELECTOR, selectors.get('deadline', '.deadline'))
                opportunity['deadline'] = self.parse_deadline(deadline_elem.text.strip())
            except NoSuchElementException:
                opportunity['deadline'] = ''
            
            # Extract link
            try:
                link_elem = container.find_element(By.CSS_SELECTOR, selectors.get('link', 'a'))
                href = link_elem.get_attribute('href')
                opportunity['link'] = urljoin(base_url, href) if href else base_url
            except NoSuchElementException:
                opportunity['link'] = base_url
            
            # Extract description
            try:
                desc_elem = container.find_element(By.CSS_SELECTOR, selectors.get('description', '.description'))
                opportunity['description'] = desc_elem.text.strip()
            except NoSuchElementException:
                opportunity['description'] = ''
            
            # Filter for medical physics relevance
            if self.is_medical_physics_relevant(opportunity['title'], opportunity['description']):
                return opportunity
                
        except Exception as e:
            self.logger.error(f"Error extracting opportunity data with Selenium: {e}")
            
        return None

    def is_medical_physics_relevant(self, title: str, description: str) -> bool:
        """Check if opportunity is relevant to medical physics"""
        relevant_keywords = [
            'medical physics', 'radiation oncology', 'medical imaging', 'radiotherapy',
            'nuclear medicine', 'diagnostic imaging', 'radiation therapy', 'medical radiation',
            'imaging physics', 'radiation safety', 'dosimetry', 'radiobiology',
            'proton therapy', 'radiation protection', 'medical dosimetry'
        ]
        
        text = f"{title} {description}".lower()
        return any(keyword in text for keyword in relevant_keywords)

    def parse_deadline(self, deadline_text: str) -> str:
        """Parse deadline text into standardized date format"""
        if not deadline_text:
            # Default to 6 months from now if no deadline found
            default_deadline = datetime.now() + timedelta(days=180)
            return default_deadline.strftime('%Y-%m-%d')
        
        # Common deadline patterns
        deadline_text = deadline_text.lower().strip()
        
        # Try to extract date patterns
        import re
        
        # Pattern: YYYY-MM-DD
        date_pattern = r'(\d{4})-(\d{1,2})-(\d{1,2})'
        match = re.search(date_pattern, deadline_text)
        if match:
            return f"{match.group(1)}-{match.group(2):0>2}-{match.group(3):0>2}"
        
        # Pattern: MM/DD/YYYY
        date_pattern = r'(\d{1,2})/(\d{1,2})/(\d{4})'
        match = re.search(date_pattern, deadline_text)
        if match:
            return f"{match.group(3)}-{match.group(1):0>2}-{match.group(2):0>2}"
        
        # Pattern: DD/MM/YYYY
        date_pattern = r'(\d{1,2})/(\d{1,2})/(\d{4})'
        match = re.search(date_pattern, deadline_text)
        if match:
            return f"{match.group(3)}-{match.group(2):0>2}-{match.group(1):0>2}"
        
        # If no pattern matches, return default
        default_deadline = datetime.now() + timedelta(days=180)
        return default_deadline.strftime('%Y-%m-%d')

    def clean_opportunity_data(self, opportunity: Dict[str, Any], source: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and standardize opportunity data"""
        return {
            'id': self.generate_opportunity_id(opportunity),
            'title': self.clean_text(opportunity.get('title', '')),
            'institute': self.clean_text(opportunity.get('institute', '')),
            'deadline': opportunity.get('deadline', ''),
            'link': opportunity.get('link', ''),
            'description': self.clean_text(opportunity.get('description', '')),
            'source': source['name'],
            'dateAdded': datetime.now().strftime('%Y-%m-%d'),
            'scrapedAt': datetime.now().isoformat()
        }

    def clean_text(self, text: str) -> str:
        """Clean text by removing extra whitespace and normalizing"""
        if not text:
            return ''
        return ' '.join(text.split())

    def generate_opportunity_id(self, opportunity: Dict[str, Any]) -> str:
        """Generate unique ID for opportunity"""
        import hashlib
        content = f"{opportunity.get('title', '')}-{opportunity.get('institute', '')}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def validate_opportunity(self, opportunity: Dict[str, Any]) -> bool:
        """Validate opportunity data"""
        required_fields = ['title', 'institute', 'deadline', 'link']
        return all(opportunity.get(field) for field in required_fields)

    def check_robots_txt(self, url: str) -> bool:
        """Check if robots.txt allows scraping"""
        try:
            parsed_url = urlparse(url)
            robots_url = f"{parsed_url.scheme}://{parsed_url.netloc}/robots.txt"
            
            response = self.session.get(robots_url, timeout=10)
            if response.status_code == 200:
                # Simple check - in production, use robotparser
                robots_content = response.text.lower()
                if 'disallow: /' in robots_content and 'user-agent: *' in robots_content:
                    return False
            return True
        except:
            return True  # If can't check, assume allowed

    def generate_summary(self) -> Dict[str, Any]:
        """Generate scraping summary"""
        return {
            'totalOpportunities': len(self.results),
            'totalErrors': len(self.errors),
            'sourcesScrapped': len(set(opp['source'] for opp in self.results)),
            'scrapingTimestamp': datetime.now().isoformat(),
            'results': self.results,
            'errors': self.errors
        }

    def save_results(self, output_path: str = 'data/opportunities.json') -> None:
        """Save scraping results to file"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Load existing data if available
        existing_opportunities = []
        if os.path.exists(output_path):
            try:
                with open(output_path, 'r') as f:
                    existing_opportunities = json.load(f)
            except json.JSONDecodeError:
                self.logger.warning("Could not parse existing opportunities file")
        
        # Merge with new results (deduplicate)
        all_opportunities = self.deduplicate_opportunities(existing_opportunities + self.results)
        
        # Archive expired opportunities
        active_opportunities, expired_opportunities = self.archive_expired_opportunities(all_opportunities)
        
        # Save active opportunities
        with open(output_path, 'w') as f:
            json.dump(active_opportunities, f, indent=2, ensure_ascii=False)
        
        # Save archived opportunities
        if expired_opportunities:
            archive_path = 'data/archive/archived_opportunities.json'
            os.makedirs(os.path.dirname(archive_path), exist_ok=True)
            
            existing_archived = []
            if os.path.exists(archive_path):
                try:
                    with open(archive_path, 'r') as f:
                        existing_archived = json.load(f)
                except json.JSONDecodeError:
                    pass
            
            with open(archive_path, 'w') as f:
                json.dump(existing_archived + expired_opportunities, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Saved {len(active_opportunities)} active opportunities")
        self.logger.info(f"Archived {len(expired_opportunities)} expired opportunities")

    def deduplicate_opportunities(self, opportunities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate opportunities"""
        seen = set()
        unique_opportunities = []
        
        for opp in opportunities:
            # Create key based on title and institute
            key = f"{opp.get('title', '').lower()}-{opp.get('institute', '').lower()}"
            if key not in seen:
                seen.add(key)
                unique_opportunities.append(opp)
        
        return unique_opportunities

    def archive_expired_opportunities(self, opportunities: List[Dict[str, Any]]) -> tuple:
        """Separate active and expired opportunities"""
        today = datetime.now().date()
        active = []
        expired = []
        
        for opp in opportunities:
            try:
                deadline = datetime.strptime(opp['deadline'], '%Y-%m-%d').date()
                if deadline >= today:
                    active.append(opp)
                else:
                    expired.append({**opp, 'archivedDate': today.isoformat()})
            except (ValueError, KeyError):
                # If deadline parsing fails, keep as active
                active.append(opp)
        
        return active, expired

    def cleanup(self) -> None:
        """Cleanup resources"""
        if self.driver:
            self.driver.quit()
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()


def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='PhD Medical Physics Opportunities Scraper')
    parser.add_argument('--config', default='data/sources.json', help='Path to sources configuration file')
    parser.add_argument('--output', default='data/opportunities.json', help='Output file path')
    parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    with PhDScraper(args.config) as scraper:
        try:
            scraper.load_sources()
            
            if any(source.get('requires_js', False) for source in scraper.sources):
                scraper.setup_selenium_driver(headless=args.headless)
            
            summary = scraper.scrape_all_sources()
            scraper.save_results(args.output)
            
            # Print summary
            print("\n" + "="*50)
            print("SCRAPING SUMMARY")
            print("="*50)
            print(f"Total Opportunities Found: {summary['totalOpportunities']}")
            print(f"Sources Scraped: {summary['sourcesScrapped']}")
            print(f"Errors: {summary['totalErrors']}")
            print(f"Scraping Completed: {summary['scrapingTimestamp']}")
            
            if summary['errors']:
                print("\nErrors encountered:")
                for error in summary['errors']:
                    print(f"  - {error['source']}: {error['error']}")
            
            return 0 if summary['totalErrors'] == 0 else 1
            
        except Exception as e:
            logging.error(f"Fatal error: {e}")
            return 1


if __name__ == "__main__":
    sys.exit(main())
