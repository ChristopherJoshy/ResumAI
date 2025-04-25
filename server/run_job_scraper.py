#!/usr/bin/env python3
import os
import sys
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("job_scraper_runner")

def run_job_scraper():
    """Run the job scraper service"""
    try:
        logger.info("Starting job scraper service...")
        
        # Use the correct Python executable
        python_path = sys.executable
        
        # Run the FastAPI server
        process = subprocess.Popen([python_path, "server/job_scraper.py"],
                          stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE,
                          text=True)
        
        logger.info(f"Job scraper service started with PID: {process.pid}")
        
        # Output logs from the process
        for line in process.stdout:
            print(f"Job Scraper: {line.strip()}")
        
        # If we reach here, the process has terminated
        return_code = process.wait()
        logger.info(f"Job scraper service exited with code: {return_code}")
        
    except Exception as e:
        logger.error(f"Failed to start job scraper service: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_job_scraper()