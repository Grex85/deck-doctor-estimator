'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  BarChart3,
  PieChart,
  Building2,
  Trophy,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

// Types
interface Bid {
  id?: string;
  customerName: string;
  projectType: string;
  projectAddress: string;
  ourBid: number;
  competitorName?: string;
  competitorBid?: number;
  status: 'pending' | 'won' | 'lost';
  bidDate: string;
  closeDate?: string;
  notes?: string;
  lossReason?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface Competitor {
  id?: string;
  name: string;
  bidsAgainst: number;
  winsAgainst: number;
  lossesAgainst: number;
  avgPriceDifference: number;
  notes?: string;
}

// Main Component
export default function CompetitiveTracker() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'bids' | 'analytics' | 'competitors'
  >('bids');
  const [showAddBid, setShowAddBid] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'won' | 'lost'
  >('all');
  const [dateRange, setDateRange] = useState<'30' | '90' | '365' | 'all'>('90');

  // New bid form state
  const [newBid, setNewBid] = useState<Partial<Bid>>({
    customerName: '',
    projectType: '',
    projectAddress: '',
    ourBid: 0,
    competitorName: '',
    competitorBid: 0,
    status: 'pending',
    bidDate: new Date().toISOString().split('T')[0],
    notes: '',
    lossReason: '',
  });

  // Load bids from Firebase
  useEffect(() => {
    loadBids();
  }, []);

  const loadBids = async () => {
    setLoading(true);
    try {
      const bidsQuery = query(
        collection(db, 'bids'),
        orderBy('bidDate', 'desc')
      );
      const snapshot = await getDocs(bidsQuery);
      const loadedBids: Bid[] = [];
      snapshot.forEach((doc) => {
        loadedBids.push({ id: doc.id, ...doc.data() } as Bid);
      });
      setBids(loadedBids);

      // Calculate competitor stats
      const competitorMap = new Map<string, Competitor>();
      loadedBids.forEach((bid) => {
        if (bid.competitorName) {
          const existing = competitorMap.get(bid.competitorName) || {
            name: bid.competitorName,
            bidsAgainst: 0,
            winsAgainst: 0,
            lossesAgainst: 0,
            avgPriceDifference: 0,
          };
          existing.bidsAgainst++;
          if (bid.status === 'won') existing.winsAgainst++;
          if (bid.status === 'lost') existing.lossesAgainst++;
          if (bid.competitorBid && bid.ourBid) {
            const priceDiffs = [
              existing.avgPriceDifference * (existing.bidsAgainst - 1),
              bid.ourBid - bid.competitorBid,
            ];
            existing.avgPriceDifference =
              priceDiffs.reduce((a, b) => a + b, 0) / existing.bidsAgainst;
          }
          competitorMap.set(bid.competitorName, existing);
        }
      });
      setCompetitors(Array.from(competitorMap.values()));
    } catch (_error) {
      console.error('Error loading bids:', error);
    }
    setLoading(false);
  };

  // Save bid to Firebase
  const saveBid = async () => {
    try {
      if (editingBid?.id) {
        await updateDoc(doc(db, 'bids', editingBid.id), {
          ...newBid,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, 'bids'), {
          ...newBid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      loadBids();
      resetForm();
    } catch (_error) {
      console.error('Error saving bid:', error);
      alert('Failed to save bid. Please try again.');
    }
  };

  // Delete bid
  const deleteBid = async (bidId: string) => {
    if (!confirm('Are you sure you want to delete this bid?')) return;
    try {
      await deleteDoc(doc(db, 'bids', bidId));
      loadBids();
    } catch (_error) {
      console.error('Error deleting bid:', error);
      alert('Failed to delete bid. Please try again.');
    }
  };

  // Update bid status
  const updateBidStatus = async (bidId: string, status: Bid['status']) => {
    try {
      await updateDoc(doc(db, 'bids', bidId), {
        status,
        closeDate:
          status !== 'pending' ? new Date().toISOString().split('T')[0] : null,
        updatedAt: Timestamp.now(),
      });
      loadBids();
    } catch (_error) {
      console.error('Error updating bid status:', error);
    }
  };

  const resetForm = () => {
    setNewBid({
      customerName: '',
      projectType: '',
      projectAddress: '',
      ourBid: 0,
      competitorName: '',
      competitorBid: 0,
      status: 'pending',
      bidDate: new Date().toISOString().split('T')[0],
      notes: '',
      lossReason: '',
    });
    setShowAddBid(false);
    setEditingBid(null);
  };

  const startEdit = (bid: Bid) => {
    setNewBid(bid);
    setEditingBid(bid);
    setShowAddBid(true);
  };

  // Filter bids by date range and status
  const filteredBids = useMemo(() => {
    let filtered = [...bids];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((b) => b.status === filterStatus);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter((b) => new Date(b.bidDate) >= cutoff);
    }

    return filtered;
  }, [bids, filterStatus, dateRange]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = filteredBids.length;
    const won = filteredBids.filter((b) => b.status === 'won').length;
    const lost = filteredBids.filter((b) => b.status === 'lost').length;
    const pending = filteredBids.filter((b) => b.status === 'pending').length;
    const winRate = total > 0 ? (won / (won + lost)) * 100 || 0 : 0;

    const totalBidValue = filteredBids.reduce(
      (sum, b) => sum + (b.ourBid || 0),
      0
    );
    const wonValue = filteredBids
      .filter((b) => b.status === 'won')
      .reduce((sum, b) => sum + (b.ourBid || 0), 0);
    const avgBidSize = total > 0 ? totalBidValue / total : 0;

    // Win rate by project type
    const byProjectType: Record<string, { total: number; won: number }> = {};
    filteredBids.forEach((b) => {
      if (!byProjectType[b.projectType]) {
        byProjectType[b.projectType] = { total: 0, won: 0 };
      }
      byProjectType[b.projectType].total++;
      if (b.status === 'won') byProjectType[b.projectType].won++;
    });

    // Loss reasons
    const lossReasons: Record<string, number> = {};
    filteredBids
      .filter((b) => b.status === 'lost' && b.lossReason)
      .forEach((b) => {
        lossReasons[b.lossReason!] = (lossReasons[b.lossReason!] || 0) + 1;
      });

    return {
      total,
      won,
      lost,
      pending,
      winRate,
      totalBidValue,
      wonValue,
      avgBidSize,
      byProjectType,
      lossReasons,
    };
  }, [filteredBids]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Customer',
      'Project Type',
      'Address',
      'Our Bid',
      'Competitor',
      'Competitor Bid',
      'Status',
      'Bid Date',
      'Close Date',
      'Notes',
      'Loss Reason',
    ];
    const rows = filteredBids.map((b) => [
      b.customerName,
      b.projectType,
      b.projectAddress,
      b.ourBid,
      b.competitorName || '',
      b.competitorBid || '',
      b.status,
      b.bidDate,
      b.closeDate || '',
      b.notes || '',
      b.lossReason || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bids-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const projectTypes = [
    'Decks - New Build',
    'Decks - Repair',
    'Decks - Refinishing',
    'Pergola',
    'Hardscaping',
    'Retaining Wall',
    'Painting/Staining',
    'Other',
  ];
  const lossReasons = [
    'Price too high',
    'Competitor lower',
    'Customer chose DIY',
    'Project cancelled',
    'Lost contact',
    'Timing/Schedule',
    'Other',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading competitive data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Competitive Tracker</h1>
                <p className="text-slate-400 text-sm">
                  Track bids, analyze win rates, monitor competitors
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowAddBid(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Log Bid
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-slate-700/50 p-1 rounded-lg w-fit">
            {[
              { id: 'bids', label: 'Bid Log', icon: Building2 },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'competitors', label: 'Competitors', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Bids</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.winRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Won Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(analytics.wonValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Bid Size</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(analytics.avgBidSize)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filters:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </select>

          <div className="ml-auto text-sm text-gray-500">
            Showing {filteredBids.length} of {bids.length} bids
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'bids' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Our Bid
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Competitor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBids.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">No bids found</p>
                        <p className="text-sm">
                          Start logging your bids to track your competitive
                          performance
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredBids.map((bid) => (
                      <tr
                        key={bid.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {bid.customerName}
                            </p>
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">
                              {bid.projectAddress}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                            {bid.projectType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">
                            {formatCurrency(bid.ourBid)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {bid.competitorName ? (
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {bid.competitorName}
                              </p>
                              {bid.competitorBid ? (
                                <p
                                  className={`text-sm ${bid.competitorBid < bid.ourBid ? 'text-red-600' : 'text-green-600'}`}
                                >
                                  {formatCurrency(bid.competitorBid)}
                                  {bid.competitorBid < bid.ourBid
                                    ? ' (lower)'
                                    : ' (higher)'}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                bid.status === 'won'
                                  ? 'bg-green-100 text-green-700'
                                  : bid.status === 'lost'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {bid.status.toUpperCase()}
                            </span>
                            {bid.status === 'pending' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    updateBidStatus(bid.id!, 'won')
                                  }
                                  className="p-1 hover:bg-green-100 rounded text-green-600"
                                  title="Mark as Won"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    updateBidStatus(bid.id!, 'lost')
                                  }
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                  title="Mark as Lost"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {bid.bidDate}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(bid)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBid(bid.id!)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Win/Loss Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-500" />
                  Win/Loss Distribution
                </h3>
                <div className="flex items-center justify-center gap-8">
                  <div className="relative w-40 h-40">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full -rotate-90"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="20"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="20"
                        strokeDasharray={`${analytics.winRate * 2.51} 251`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-800">
                        {analytics.winRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded" />
                      <span className="text-sm text-gray-600">
                        Won: {analytics.won}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded" />
                      <span className="text-sm text-gray-600">
                        Lost: {analytics.lost}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded" />
                      <span className="text-sm text-gray-600">
                        Pending: {analytics.pending}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Loss Reasons
                </h3>
                {Object.keys(analytics.lossReasons).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No loss reasons recorded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.lossReasons)
                      .sort((a, b) => b[1] - a[1])
                      .map(([reason, count]) => (
                        <div key={reason} className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full"
                              style={{
                                width: `${(count / analytics.lost) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 min-w-[120px]">
                            {reason}
                          </span>
                          <span className="text-sm font-medium text-gray-800 min-w-[40px] text-right">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Win Rate by Project Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Win Rate by Project Type
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(analytics.byProjectType).map(([type, data]) => {
                  const winRate =
                    data.total > 0 ? (data.won / data.total) * 100 : 0;
                  return (
                    <div key={type} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {type}
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {winRate.toFixed(0)}%
                        </span>
                        <span className="text-sm text-gray-500 mb-1">
                          ({data.won}/{data.total})
                        </span>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing Insights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Pricing Insights
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Bid Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.totalBidValue)}
                  </p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Won Value</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(analytics.wonValue)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.totalBidValue > 0
                      ? (
                          (analytics.wonValue / analytics.totalBidValue) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitors' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Competitor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Bids Against
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Our Win Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Avg Price Diff
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {competitors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">No competitor data yet</p>
                        <p className="text-sm">
                          Log bids with competitor information to see analysis
                        </p>
                      </td>
                    </tr>
                  ) : (
                    competitors.map((comp) => {
                      const winRate =
                        comp.bidsAgainst > 0
                          ? (comp.winsAgainst / comp.bidsAgainst) * 100
                          : 0;
                      return (
                        <tr
                          key={comp.name}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">
                              {comp.name}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-700">
                              {comp.bidsAgainst}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {winRate.toFixed(0)}%
                              </span>
                              <span className="text-gray-500 text-sm">
                                ({comp.winsAgainst}W / {comp.lossesAgainst}L)
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={
                                comp.avgPriceDifference > 0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }
                            >
                              {comp.avgPriceDifference > 0 ? '+' : ''}
                              {formatCurrency(comp.avgPriceDifference)}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">
                              (
                              {comp.avgPriceDifference > 0
                                ? "we're higher"
                                : "we're lower"}
                              )
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {winRate >= 60 ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <TrendingUp className="w-4 h-4" /> Strong
                              </span>
                            ) : winRate >= 40 ? (
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Target className="w-4 h-4" /> Competitive
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600">
                                <TrendingDown className="w-4 h-4" /> Review
                                Pricing
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Bid Modal */}
      {showAddBid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingBid ? 'Edit Bid' : 'Log New Bid'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newBid.customerName}
                    onChange={(e) =>
                      setNewBid({ ...newBid, customerName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Type *
                  </label>
                  <select
                    value={newBid.projectType}
                    onChange={(e) =>
                      setNewBid({ ...newBid, projectType: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select type...</option>
                    {projectTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Address
                </label>
                <input
                  type="text"
                  value={newBid.projectAddress}
                  onChange={(e) =>
                    setNewBid({ ...newBid, projectAddress: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Main St, Denver, CO"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Our Bid Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={newBid.ourBid || ''}
                      onChange={(e) =>
                        setNewBid({
                          ...newBid,
                          ourBid: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="15000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Date
                  </label>
                  <input
                    type="date"
                    value={newBid.bidDate}
                    onChange={(e) =>
                      setNewBid({ ...newBid, bidDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-medium text-gray-800 mb-3">
                  Competitor Information (Optional)
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Competitor Name
                    </label>
                    <input
                      type="text"
                      value={newBid.competitorName}
                      onChange={(e) =>
                        setNewBid({ ...newBid, competitorName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ABC Decks"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Competitor Bid
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        value={newBid.competitorBid || ''}
                        onChange={(e) =>
                          setNewBid({
                            ...newBid,
                            competitorBid: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="14000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newBid.status}
                    onChange={(e) =>
                      setNewBid({ ...newBid, status: e.target.value as any })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                {newBid.status === 'lost' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loss Reason
                    </label>
                    <select
                      value={newBid.lossReason}
                      onChange={(e) =>
                        setNewBid({ ...newBid, lossReason: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select reason...</option>
                      {lossReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newBid.notes}
                  onChange={(e) =>
                    setNewBid({ ...newBid, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Additional notes about this bid..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBid}
                disabled={
                  !newBid.customerName || !newBid.projectType || !newBid.ourBid
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingBid ? 'Update Bid' : 'Save Bid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
