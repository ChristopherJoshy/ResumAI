import os
import re
import json
import random
import logging
import time
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("job_scraper")

# Initialize FastAPI app
app = FastAPI(title="Job Scraper API")

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache for job recommendations
# Structure: {cache_key: {"timestamp": datetime, "data": response_data}}
JOB_CACHE = {}
CACHE_DURATION = timedelta(minutes=30)  # Cache results for 30 minutes

# Background job cache refresh
BACKGROUND_REFRESH_RUNNING = False

def get_cache_key(skills: str, experience_level: Optional[str], limit: int) -> str:
    """Generate a cache key from request parameters"""
    return f"{skills}_{experience_level}_{limit}"

def is_cache_valid(cache_key: str) -> bool:
    """Check if cache entry is valid and not expired"""
    if cache_key not in JOB_CACHE:
        return False

    cache_time = JOB_CACHE[cache_key]["timestamp"]
    now = datetime.now()
    return now - cache_time < CACHE_DURATION

def get_cached_jobs(cache_key: str) -> Dict[str, Any]:
    """Get cached job recommendations"""
    if is_cache_valid(cache_key):
        logger.info(f"Using cached job recommendations for key: {cache_key}")
        return JOB_CACHE[cache_key]["data"]
    return None

def set_cached_jobs(cache_key: str, data: Dict[str, Any]) -> None:
    """Cache job recommendations"""
    JOB_CACHE[cache_key] = {
        "timestamp": datetime.now(),
        "data": data
    }
    logger.info(f"Cached job recommendations for key: {cache_key}")

def background_refresh_cache():
    """Background task to refresh cache entries before they expire"""
    global BACKGROUND_REFRESH_RUNNING

    if BACKGROUND_REFRESH_RUNNING:
        return

    BACKGROUND_REFRESH_RUNNING = True

    try:
        logger.info("Starting background cache refresh")

        # Check all cache entries
        for cache_key, cache_entry in list(JOB_CACHE.items()):
            try:
                cache_time = cache_entry["timestamp"]
                now = datetime.now()

                # If cache is about to expire (80% of cache duration), refresh it
                if now - cache_time > CACHE_DURATION * 0.8:
                    logger.info(f"Refreshing cache for key: {cache_key}")

                    # Parse the cache key to get parameters
                    parts = cache_key.split("_")
                    if len(parts) >= 3:
                        skills = parts[0]
                        experience_level = parts[1] if parts[1] != "None" else None
                        limit = int(parts[2])

                        # Start a thread to refresh this cache entry
                        threading.Thread(
                            target=refresh_cache_entry,
                            args=(skills, experience_level, limit, cache_key),
                            daemon=True
                        ).start()
            except Exception as e:
                logger.error(f"Error checking cache entry {cache_key}: {str(e)}")

    except Exception as e:
        logger.error(f"Error in background cache refresh: {str(e)}")
    finally:
        BACKGROUND_REFRESH_RUNNING = False

        # Schedule next run in 5 minutes
        threading.Timer(300, background_refresh_cache).start()

def refresh_cache_entry(skills: str, experience_level: Optional[str], limit: int, cache_key: str):
    """Refresh a specific cache entry"""
    try:
        # Create event loop for async function
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Call the recommendations function
        result = loop.run_until_complete(
            get_job_recommendations_internal(skills, experience_level, limit)
        )

        # Update cache
        set_cached_jobs(cache_key, result)
        logger.info(f"Successfully refreshed cache for key: {cache_key}")
    except Exception as e:
        logger.error(f"Error refreshing cache for key {cache_key}: {str(e)}")

# Start background cache refresh
threading.Timer(60, background_refresh_cache).start()

# User agent list to rotate for requests
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"
]

def get_random_headers():
    """Generate random headers to avoid detection"""
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
    }

@app.get("/")
def read_root():
    return {"status": "Job Scraper API is running"}

async def scrape_simplyhired(query: str, location: Optional[str], limit: int) -> List[Dict[str, Any]]:
    """Scrape SimplyHired for job listings"""
    logger.info(f"Scraping SimplyHired for '{query}' in '{location}'")

    # Format query for URL
    formatted_query = query.replace(" ", "-")
    url_location = "" if not location else f"&l={location.replace(' ', '-')}"

    url = f"https://www.simplyhired.com/search?q={formatted_query}{url_location}"
    logger.info(f"Scraping URL: {url}")

    try:
        # Make the request with random headers
        response = requests.get(url, headers=get_random_headers(), timeout=15)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        job_listings = []

        # Log the HTML structure to help with debugging
        logger.info("Parsing SimplyHired HTML response...")

        # Try multiple selectors for job cards
        job_cards = []
        selectors = [
            'div.SerpJob-jobCard',
            'div.job-card',
            'div.card',
            'div.jobposting-widget',
            'article.job',
            'div.job_listing'
        ]

        for selector in selectors:
            cards = soup.select(selector)
            if cards:
                logger.info(f"Found {len(cards)} job cards using selector: {selector}")
                job_cards = cards[:limit]
                break

        if not job_cards:
            logger.warning("No job cards found on SimplyHired using any of the known selectors")
            # Try a more generic approach
            possible_cards = soup.find_all('div', class_=lambda c: c and ('job' in c.lower() or 'card' in c.lower()))
            if possible_cards:
                logger.info(f"Found {len(possible_cards)} potential job cards using generic approach")
                job_cards = possible_cards[:limit]

        for card in job_cards:
            try:
                # Try multiple selectors for each element

                # Extract job title
                title_selectors = [
                    'h2.jobTitle', 'h3.jobTitle', 'h2.title', 'h3.title',
                    'a.card-link', 'h2.job-title', 'h3.job-title'
                ]
                title_elem = None
                for selector in title_selectors:
                    title_elem = card.select_one(selector)
                    if title_elem:
                        break

                # Extract company name
                company_selectors = [
                    'span.companyName', 'div.company', 'span.company',
                    'div.companyInfo', 'div.company-name', 'span.company-name'
                ]
                company_elem = None
                for selector in company_selectors:
                    company_elem = card.select_one(selector)
                    if company_elem:
                        break

                # Extract location
                location_selectors = [
                    'span.location', 'div.location', 'span.jobLocation',
                    'div.jobLocation', 'div.job-location', 'span.job-location'
                ]
                location_elem = None
                for selector in location_selectors:
                    location_elem = card.select_one(selector)
                    if location_elem:
                        break

                # Extract salary
                salary_selectors = [
                    'div.salary', 'span.salary', 'div.SerpJob-metaInfo div.salary',
                    'div.job-salary', 'span.job-salary'
                ]
                salary_elem = None
                for selector in salary_selectors:
                    salary_elem = card.select_one(selector)
                    if salary_elem:
                        break

                # Extract summary
                summary_selectors = [
                    'p.jobDescription', 'div.jobDescription', 'p.description',
                    'div.description', 'div.job-description', 'p.job-description'
                ]
                summary_elem = None
                for selector in summary_selectors:
                    summary_elem = card.select_one(selector)
                    if summary_elem:
                        break

                # Extract values from elements
                title = title_elem.text.strip() if title_elem else "Unknown Title"
                company = company_elem.text.strip() if company_elem else "Unknown Company"
                job_location = location_elem.text.strip() if location_elem else "Unknown Location"
                salary = salary_elem.text.strip() if salary_elem else "Not specified"
                summary = summary_elem.text.strip() if summary_elem else "No description available"

                # Extract job URL
                job_url = ""
                # Try to find any link in the card
                link_selectors = ['a.card-link', 'a.job-link', 'a.jobTitle', 'a.title', 'a[href*="job"]']
                for selector in link_selectors:
                    job_link = card.select_one(selector)
                    if job_link and 'href' in job_link.attrs:
                        href = job_link['href']
                        if href.startswith('/'):
                            job_url = f"https://www.simplyhired.com{href}"
                        else:
                            job_url = href
                        break

                # If no link found, try to find any link in the card
                if not job_url:
                    any_link = card.select_one('a[href]')
                    if any_link and 'href' in any_link.attrs:
                        href = any_link['href']
                        if href.startswith('/'):
                            job_url = f"https://www.simplyhired.com{href}"
                        else:
                            job_url = href

                # Extract job type
                job_type = "Not specified"
                type_selectors = [
                    'span.jobType', 'div.jobType', 'span.job-type',
                    'div.job-type', 'span.employment-type', 'div.employment-type'
                ]
                for selector in type_selectors:
                    job_type_elem = card.select_one(selector)
                    if job_type_elem:
                        job_type = job_type_elem.text.strip()
                        break

                # Clean up and standardize data
                salary = re.sub(r'\s+', ' ', salary)

                # Create job listing object
                job = {
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "salary": salary,
                    "type": job_type,
                    "summary": summary,
                    "url": job_url,
                    "source": "SimplyHired",
                    "posted": "Recently"
                }

                job_listings.append(job)
                logger.info(f"Successfully parsed job: {title} at {company}")
            except Exception as e:
                logger.warning(f"Error parsing SimplyHired job card: {str(e)}")
                continue

        logger.info(f"Found {len(job_listings)} jobs on SimplyHired")
        return job_listings

    except Exception as e:
        logger.error(f"SimplyHired scraping error: {str(e)}")
        # Return an empty list but don't fail completely
        return []

@app.get("/api/jobs/search")
async def search_jobs(
    query: str,
    location: Optional[str] = None,
    source: Optional[str] = "all",
    limit: int = 10
):
    """
    Search for jobs based on query and location

    Parameters:
    - query: Job title, skills, or keywords
    - location: Location for job search (city, state, country)
    - source: Job site to scrape (indeed, linkedin, simplyhired, all)
    - limit: Maximum number of results to return
    """
    try:
        jobs = []
        source_used = source.lower() if source else "all"

        if source_used == "indeed" or source_used == "all":
            indeed_jobs = await scrape_indeed(query, location, limit)
            jobs.extend(indeed_jobs)
            logger.info(f"Added {len(indeed_jobs)} jobs from Indeed")

        if source_used == "linkedin" or source_used == "all":
            linkedin_jobs = await scrape_linkedin(query, location, limit)
            jobs.extend(linkedin_jobs)
            logger.info(f"Added {len(linkedin_jobs)} jobs from LinkedIn")

        if source_used == "simplyhired" or source_used == "all":
            simplyhired_jobs = await scrape_simplyhired(query, location, limit)
            jobs.extend(simplyhired_jobs)
            logger.info(f"Added {len(simplyhired_jobs)} jobs from SimplyHired")

        # If no jobs found from any source, try to get jobs from any source
        if not jobs and source_used != "all":
            logger.warning(f"No jobs found from {source_used}, trying other sources")
            indeed_jobs = await scrape_indeed(query, location, limit)
            linkedin_jobs = await scrape_linkedin(query, location, limit)
            simplyhired_jobs = await scrape_simplyhired(query, location, limit)

            jobs.extend(indeed_jobs)
            jobs.extend(linkedin_jobs)
            jobs.extend(simplyhired_jobs)

            logger.info(f"Added {len(indeed_jobs)} jobs from Indeed (fallback)")
            logger.info(f"Added {len(linkedin_jobs)} jobs from LinkedIn (fallback)")
            logger.info(f"Added {len(simplyhired_jobs)} jobs from SimplyHired (fallback)")

        # Deduplicate jobs based on title and company
        seen = set()
        unique_jobs = []

        for job in jobs:
            key = f"{job['title']}-{job['company']}"
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)

        # Limit to requested number
        unique_jobs = unique_jobs[:limit]

        return {
            "query": query,
            "location": location,
            "source": source_used,
            "results_count": len(unique_jobs),
            "jobs": unique_jobs
        }
    except Exception as e:
        logger.error(f"Error in search_jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search jobs: {str(e)}")

async def scrape_indeed(query: str, location: Optional[str], limit: int) -> List[Dict[str, Any]]:
    """Scrape Indeed for job listings"""
    logger.info(f"Scraping Indeed for '{query}' in '{location}'")

    # Format query for URL
    formatted_query = query.replace(" ", "+")
    url_location = "" if not location else f"&l={location.replace(' ', '+')}"

    url = f"https://www.indeed.com/jobs?q={formatted_query}{url_location}&sort=date"
    logger.info(f"Scraping URL: {url}")

    try:
        # Make the request with random headers
        response = requests.get(url, headers=get_random_headers(), timeout=15)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        job_listings = []

        # Log the HTML structure to help with debugging
        logger.info("Parsing Indeed HTML response...")

        # Try multiple selectors for job cards as Indeed frequently changes their HTML structure
        job_cards = []
        selectors = [
            'div.job_seen_beacon',
            'div.cardOutline',
            'div.css-1m4cuuf',
            'div.jobsearch-ResultsList > div',
            'div[data-testid="job-card"]',
            'div.tapItem'
        ]

        for selector in selectors:
            cards = soup.select(selector)
            if cards:
                logger.info(f"Found {len(cards)} job cards using selector: {selector}")
                job_cards = cards[:limit]
                break

        if not job_cards:
            logger.warning("No job cards found on Indeed using any of the known selectors")
            # Try a more generic approach
            possible_cards = soup.find_all('div', class_=lambda c: c and ('job' in c.lower() or 'card' in c.lower()))
            if possible_cards:
                logger.info(f"Found {len(possible_cards)} potential job cards using generic approach")
                job_cards = possible_cards[:limit]

        for card in job_cards:
            try:
                # Try multiple selectors for each element as Indeed frequently changes their HTML structure

                # Extract job title
                title_selectors = [
                    'h2.jobTitle span', 'h2.jobTitle', 'h2 span', 'h2 a',
                    'a.jcs-JobTitle', 'h2[data-testid="jobTitle"]',
                    'span[title]', 'a[data-jk]', 'a.jobtitle'
                ]
                title_elem = None
                for selector in title_selectors:
                    title_elem = card.select_one(selector)
                    if title_elem:
                        break

                # Extract company name
                company_selectors = [
                    'span.companyName', 'div.company_location a', 'span.company',
                    'div.companyInfo a', 'span[data-testid="company-name"]',
                    'div.company', 'span.company-name'
                ]
                company_elem = None
                for selector in company_selectors:
                    company_elem = card.select_one(selector)
                    if company_elem:
                        break

                # Extract location
                location_selectors = [
                    'div.companyLocation', 'span.location', 'div.location',
                    'span[data-testid="location"]', 'div.recJobLoc'
                ]
                location_elem = None
                for selector in location_selectors:
                    location_elem = card.select_one(selector)
                    if location_elem:
                        break

                # Extract salary
                salary_selectors = [
                    'div.salary-snippet', 'div.metadata.salary-snippet-container',
                    'span.salaryText', 'div[data-testid="salary-snippet"]',
                    'span.salary'
                ]
                salary_elem = None
                for selector in salary_selectors:
                    salary_elem = card.select_one(selector)
                    if salary_elem:
                        break

                # Extract summary
                summary_selectors = [
                    'div.job-snippet', 'div.summary', 'div[data-testid="job-snippet"]',
                    'div.snippet', 'span.summary'
                ]
                summary_elem = None
                for selector in summary_selectors:
                    summary_elem = card.select_one(selector)
                    if summary_elem:
                        break

                # Extract values from elements
                title = title_elem.text.strip() if title_elem else "Unknown Title"
                company = company_elem.text.strip() if company_elem else "Unknown Company"
                job_location = location_elem.text.strip() if location_elem else "Unknown Location"
                salary = salary_elem.text.strip() if salary_elem else "Not specified"
                summary = summary_elem.text.strip() if summary_elem else "No description available"

                # Extract job URL
                job_url = ""
                # Try multiple selectors for job links
                link_selectors = ['h2.jobTitle a', 'a.jcs-JobTitle', 'a[data-jk]', 'a.jobtitle', 'a[href*="clk"]']
                for selector in link_selectors:
                    job_link = card.select_one(selector)
                    if job_link and 'href' in job_link.attrs:
                        job_url = "https://www.indeed.com" + job_link['href']
                        break

                # Extract job type
                job_type = "Not specified"
                type_selectors = [
                    'div.metadata span.attribute_snippet', 'span.jobType',
                    'div[data-testid="attribute_snippet"]', 'div.job-types'
                ]
                for selector in type_selectors:
                    job_type_elem = card.select_one(selector)
                    if job_type_elem:
                        job_type = job_type_elem.text.strip()
                        break

                # Clean up and standardize data
                salary = re.sub(r'\s+', ' ', salary)

                # Create job listing object
                job = {
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "salary": salary,
                    "type": job_type,
                    "summary": summary,
                    "url": job_url,
                    "source": "Indeed",
                    "posted": "Recently"  # Indeed doesn't always show exact dates
                }

                job_listings.append(job)
                logger.info(f"Successfully parsed job: {title} at {company}")
            except Exception as e:
                logger.warning(f"Error parsing Indeed job card: {str(e)}")
                continue

        logger.info(f"Found {len(job_listings)} jobs on Indeed")
        return job_listings

    except Exception as e:
        logger.error(f"Indeed scraping error: {str(e)}")
        # Return an empty list but don't fail completely
        return []

async def scrape_linkedin(query: str, location: Optional[str], limit: int) -> List[Dict[str, Any]]:
    """Scrape LinkedIn for job listings"""
    logger.info(f"Scraping LinkedIn for '{query}' in '{location}'")

    # Format query for URL
    formatted_query = query.replace(" ", "%20")
    url_location = "" if not location else f"&location={location.replace(' ', '%20')}"

    url = f"https://www.linkedin.com/jobs/search/?keywords={formatted_query}{url_location}&sortBy=DD"
    logger.info(f"Scraping URL: {url}")

    try:
        # Make the request with random headers
        response = requests.get(url, headers=get_random_headers(), timeout=15)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        job_listings = []

        # Log the HTML structure to help with debugging
        logger.info("Parsing LinkedIn HTML response...")

        # Try multiple selectors for job cards as LinkedIn frequently changes their HTML structure
        job_cards = []
        selectors = [
            'div.base-card.relative',
            'li.jobs-search-results__list-item',
            'div.job-search-card',
            'div.base-search-card',
            'li.result-card',
            'div.job-card-container'
        ]

        for selector in selectors:
            cards = soup.select(selector)
            if cards:
                logger.info(f"Found {len(cards)} job cards using selector: {selector}")
                job_cards = cards[:limit]
                break

        if not job_cards:
            logger.warning("No job cards found on LinkedIn using any of the known selectors")
            # Try a more generic approach
            possible_cards = soup.find_all('div', class_=lambda c: c and ('job' in c.lower() or 'card' in c.lower()))
            if possible_cards:
                logger.info(f"Found {len(possible_cards)} potential job cards using generic approach")
                job_cards = possible_cards[:limit]

        for card in job_cards:
            try:
                # Try multiple selectors for each element as LinkedIn frequently changes their HTML structure

                # Extract job title
                title_selectors = [
                    'h3.base-search-card__title', 'h3.job-search-card__title',
                    'h3.result-card__title', 'h3.base-card__title',
                    'span.screen-reader-text', 'a.job-card-container__link'
                ]
                title_elem = None
                for selector in title_selectors:
                    title_elem = card.select_one(selector)
                    if title_elem:
                        break

                # Extract company name
                company_selectors = [
                    'h4.base-search-card__subtitle', 'h4.job-search-card__subtitle',
                    'h4.result-card__subtitle', 'a.job-card-container__company-name',
                    'div.base-search-card__info a', 'span.company-name'
                ]
                company_elem = None
                for selector in company_selectors:
                    company_elem = card.select_one(selector)
                    if company_elem:
                        break

                # Extract location
                location_selectors = [
                    'span.job-search-card__location', 'div.job-search-card__location',
                    'span.job-result-card__location', 'span.location',
                    'div.base-search-card__metadata span.job-search-card__location'
                ]
                location_elem = None
                for selector in location_selectors:
                    location_elem = card.select_one(selector)
                    if location_elem:
                        break

                # Extract values from elements
                title = title_elem.text.strip() if title_elem else "Unknown Title"
                company = company_elem.text.strip() if company_elem else "Unknown Company"
                job_location = location_elem.text.strip() if location_elem else "Unknown Location"

                # Extract job URL
                job_url = ""
                # Try multiple selectors for job links
                link_selectors = [
                    'a.base-card__full-link', 'a.job-card-container__link',
                    'a.result-card__full-card-link', 'a.job-search-card__link'
                ]
                for selector in link_selectors:
                    job_link = card.select_one(selector)
                    if job_link and 'href' in job_link.attrs:
                        job_url = job_link['href']
                        break

                # If no link found, try to find any link in the card
                if not job_url:
                    any_link = card.select_one('a[href]')
                    if any_link and 'href' in any_link.attrs:
                        job_url = any_link['href']

                # Extract time posted
                posted = "Recently"
                time_selectors = [
                    'time.job-search-card__listdate', 'time.job-result-card__listdate',
                    'div.base-search-card__metadata time', 'span.job-search-card__listdate'
                ]
                for selector in time_selectors:
                    time_elem = card.select_one(selector)
                    if time_elem and 'datetime' in time_elem.attrs:
                        posted = time_elem['datetime']
                        break

                # Create job listing object
                job = {
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "salary": "Not specified",  # LinkedIn rarely shows salary
                    "type": "Not specified",
                    "summary": "Visit LinkedIn for details",
                    "url": job_url,
                    "source": "LinkedIn",
                    "posted": posted
                }

                job_listings.append(job)
                logger.info(f"Successfully parsed job: {title} at {company}")
            except Exception as e:
                logger.warning(f"Error parsing LinkedIn job card: {str(e)}")
                continue

        logger.info(f"Found {len(job_listings)} jobs on LinkedIn")
        return job_listings

    except Exception as e:
        logger.error(f"LinkedIn scraping error: {str(e)}")
        # Return an empty list but don't fail completely
        return []

@app.get("/api/jobs/skills/{skill}")
async def get_jobs_by_skill(skill: str, location: Optional[str] = None, limit: int = 10):
    """Get job listings for a specific skill"""
    return await search_jobs(query=skill, location=location, limit=limit)

async def get_job_recommendations_internal(skills: str, experience_level: Optional[str] = None, limit: int = 5):
    """
    Internal function to get job recommendations based on skills and experience level
    """
    skill_list = [skill.strip() for skill in skills.split(",")]
    logger.info(f"Getting job recommendations for skills: {skill_list} with experience level: {experience_level}")

    # Create skill-specific queries
    results = []

    # Process each skill in parallel for faster results
    async def process_skill(skill):
        try:
            # Modify query based on experience level
            query = skill
            if experience_level:
                query = f"{experience_level} {skill}"

            # Get results from all sources for better coverage
            skill_results = await search_jobs(
                query=query,
                source="all",  # Use all sources for better coverage
                limit=max(5, limit//len(skill_list))  # Get more results per skill for better filtering
            )

            if "jobs" in skill_results and skill_results["jobs"]:
                logger.info(f"Found {len(skill_results['jobs'])} jobs for skill: {skill}")
                return skill_results["jobs"]
            else:
                logger.warning(f"No jobs found for skill: {skill}")
                return []
        except Exception as skill_error:
            logger.error(f"Error processing skill {skill}: {str(skill_error)}")
            return []

    # Process skills in parallel
    import asyncio
    skill_results = await asyncio.gather(*[process_skill(skill) for skill in skill_list])

    # Flatten results
    for result in skill_results:
        results.extend(result)

    logger.info(f"Total jobs found before deduplication: {len(results)}")

    # Deduplicate results based on job title and company
    seen = set()
    unique_results = []

    for job in results:
        key = f"{job['title']}-{job['company']}"
        if key not in seen:
            seen.add(key)
            unique_results.append(job)

    logger.info(f"Unique jobs after deduplication: {len(unique_results)}")

    # Sort results by relevance (if a job matches multiple skills, it's more relevant)
    # Count how many skills are mentioned in each job title or summary
    for job in unique_results:
        job_text = f"{job['title']} {job.get('summary', '')}".lower()
        skill_matches = sum(1 for skill in skill_list if skill.lower() in job_text)
        job['relevance_score'] = skill_matches

    # Sort by relevance score (descending)
    unique_results.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)

    # Limit to requested number
    unique_results = unique_results[:limit]

    # Remove the temporary relevance score field
    for job in unique_results:
        if 'relevance_score' in job:
            del job['relevance_score']

    logger.info(f"Returning {len(unique_results)} job recommendations")

    return {
        "skills": skill_list,
        "experience_level": experience_level,
        "results_count": len(unique_results),
        "jobs": unique_results
    }

@app.get("/api/jobs/recommendations")
async def get_job_recommendations(skills: str, experience_level: Optional[str] = None, limit: int = 5):
    """
    Get job recommendations based on skills and experience level

    Parameters:
    - skills: Comma-separated list of skills
    - experience_level: Junior, Mid, Senior, etc.
    - limit: Maximum number of results to return
    """
    try:
        # Check cache first
        cache_key = get_cache_key(skills, experience_level, limit)
        cached_data = get_cached_jobs(cache_key)

        if cached_data:
            # Return cached data
            return cached_data

        # No cache hit, get fresh data
        logger.info(f"No cache hit for key: {cache_key}, fetching fresh data")

        # Get job recommendations
        result = await get_job_recommendations_internal(skills, experience_level, limit)

        # Cache the result
        set_cached_jobs(cache_key, result)

        return result

    except Exception as e:
        logger.error(f"Error in get_job_recommendations: {str(e)}")

        # Try a simpler approach if the main processing fails
        try:
            logger.info("Trying fallback approach for job recommendations")

            # Parse skills
            skill_list = [skill.strip() for skill in skills.split(",")]
            results = []

            # Process each skill sequentially
            for skill in skill_list:
                # Modify query based on experience level
                query = skill
                if experience_level:
                    query = f"{experience_level} {skill}"

                # Get results from LinkedIn only for simplicity (since it's working better)
                skill_results = await search_jobs(
                    query=query,
                    source="linkedin",  # Use LinkedIn only for simplicity
                    limit=max(3, limit//len(skill_list))
                )

                if "jobs" in skill_results and skill_results["jobs"]:
                    results.extend(skill_results["jobs"])

            # Deduplicate and limit results
            seen = set()
            unique_results = []

            for job in results:
                key = f"{job['title']}-{job['company']}"
                if key not in seen:
                    seen.add(key)
                    unique_results.append(job)

            # Limit to requested number
            unique_results = unique_results[:limit]

            logger.info(f"Returning {len(unique_results)} job recommendations from fallback approach")

            result = {
                "skills": skill_list,
                "experience_level": experience_level,
                "results_count": len(unique_results),
                "jobs": unique_results
            }

            # Cache the fallback result too
            set_cached_jobs(cache_key, result)

            return result
        except Exception as fallback_error:
            logger.error(f"Fallback approach also failed: {str(fallback_error)}")
            raise HTTPException(status_code=500, detail=f"Failed to get job recommendations: {str(e)}")

def run_server():
    """Run the FastAPI server"""
    try:
        logger.info("Starting FastAPI server on port 8000")
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except OSError as e:
        if "address already in use" in str(e).lower() or "10048" in str(e):
            logger.warning("Port 8000 is already in use. Another instance of the job scraper may be running.")
            # Try to check if the server is responding
            try:
                import requests
                response = requests.get("http://localhost:8000")
                if response.status_code == 200:
                    logger.info("Job scraper API is already running and responding correctly.")
                    # Exit with success code since the service is available
                    import sys
                    sys.exit(0)
            except Exception as check_error:
                logger.error(f"Error checking existing job scraper: {check_error}")
        logger.error(f"Failed to start server: {e}")
        raise

if __name__ == "__main__":
    try:
        run_server()
    except Exception as e:
        logger.error(f"Unhandled exception in job scraper: {e}")
        # Exit with error code
        import sys
        sys.exit(1)