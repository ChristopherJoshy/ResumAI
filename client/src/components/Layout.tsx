import React from "react";
import { Link, useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [location] = useLocation();

  return (
    <div className="font-sans min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <span className="text-primary-600 mr-2">
                <i className="fas fa-file-alt text-xl"></i>
              </span>
              <h1 className="text-xl font-bold text-gray-800">
                Resum<span className="text-primary-600">AI</span>
              </h1>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <span className={`transition cursor-pointer ${location === "/" ? "text-primary-600" : "text-gray-600 hover:text-primary-600"}`}>
                Dashboard
              </span>
            </Link>
            <Link href="/upload">
              <span className={`transition cursor-pointer ${location.includes("/upload") ? "text-primary-600" : "text-gray-600 hover:text-primary-600"}`}>
                New Analysis
              </span>
            </Link>
            <span className="text-gray-600 hover:text-primary-600 transition cursor-pointer">
              Resources
            </span>
            <span className="text-gray-600 hover:text-primary-600 transition cursor-pointer">
              Help
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="hidden md:block text-gray-600 hover:text-gray-800">
              <i className="far fa-bell text-lg"></i>
            </button>
            <div className="relative hidden md:block">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <i className="fas fa-user text-gray-600"></i>
              </div>
            </div>
            <button className="md:hidden text-gray-600">
              <i className="fas fa-bars text-lg"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-grow">
        {children}
      </main>

      <footer className="bg-gray-800 text-white py-10 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-primary-400 mr-2">
                  <i className="fas fa-file-alt text-2xl"></i>
                </span>
                <h2 className="text-xl font-bold text-white">
                  Resum<span className="text-primary-400">AI</span>
                </h2>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered resume analysis and career guidance to help you advance your professional journey.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <i className="fab fa-github"></i>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    Career Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    Resume Templates
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    Job Search Guide
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    Interview Preparation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} ResumAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
