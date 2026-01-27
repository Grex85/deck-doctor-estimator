"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Calculator, Camera, MapPin, FileText, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  // Auto-redirect to estimator after a brief delay (optional - remove if you want a landing page)
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     router.push('/estimator');
  //   }, 100);
  //   return () => clearTimeout(timer);
  // }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            {/* Logo/Brand */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-2xl shadow-orange-500/30 mb-8">
              <ClipboardList className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Deck Doctor
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                Field Estimator
              </span>
            </h1>

            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
              Professional field estimation tool for deck construction, repair, and renovation projects in Colorado.
            </p>

            {/* CTA Button */}
            <Link
              href="/estimator"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
            >
              Open Estimator
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything You Need in the Field
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:bg-slate-800/70 transition-all">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Calculations</h3>
            <p className="text-slate-400 text-sm">
              Automatic material calculations, labor estimates, and pricing based on your inputs.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:bg-slate-800/70 transition-all">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
              <Camera className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Photo Documentation</h3>
            <p className="text-slate-400 text-sm">
              Capture and annotate site photos with professional drawing tools and measurements.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:bg-slate-800/70 transition-all">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">GPS & Location</h3>
            <p className="text-slate-400 text-sm">
              Auto-capture GPS coordinates and address lookup with Google Maps integration.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:bg-slate-800/70 transition-all">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Estimates</h3>
            <p className="text-slate-400 text-sm">
              Generate professional estimates and send directly to the office via email or cloud sync.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4">Ready to Start?</h3>
          <p className="text-slate-300 mb-6">
            Click the button below to open the full estimator tool. All your data is automatically saved and can be synced to the office.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/estimator"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              <ClipboardList className="w-5 h-5" />
              Start New Estimate
            </Link>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors"
            >
              View Saved Estimates
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            Deck Doctor Field Estimator v3.0.0 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
