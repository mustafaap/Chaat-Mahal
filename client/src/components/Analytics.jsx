import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCheck, FiX, FiClock, FiCreditCard, FiCheckCircle, FiDollarSign, FiChevronLeft, FiChevronRight, FiCalendar, FiPackage, FiTrendingUp, FiGift, FiUsers, FiRefreshCw, FiShoppingCart, FiDownload, FiAward, FiPieChart, FiFileText, FiBarChart2, FiMonitor } from 'react-icons/fi';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import '../styles/Analytics.css';

const Analytics = () => {
    const [orders, setOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('month');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [heatmapMonth, setHeatmapMonth] = useState(new Date());
    const [reportMonth, setReportMonth] = useState(new Date().getMonth());
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [reportType, setReportType] = useState('card');
    const [ordersPage, setOrdersPage] = useState(1);
    const ORDERS_PER_PAGE = 10;
    const [rcPage, setRcPage] = useState(1);
    const RC_PER_PAGE = 8;
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    // Reset orders page when filter changes
    useEffect(() => {
        setOrdersPage(1);
        setRcPage(1);
    }, [timeFilter, customDateRange]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordersRes, menuRes] = await Promise.all([
                axios.get('/api/orders/all?ignoreReset=true'), // analytics always needs full history
                axios.get('/api/menu?includeInactive=true')
            ]);
            setOrders(ordersRes.data);
            setMenuItems(menuRes.data);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter orders based on time period
    const getFilteredOrders = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        return orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            
            // Custom date range
            if (timeFilter === 'custom' && customDateRange.start && customDateRange.end) {
                const [sy, sm, sd] = customDateRange.start.split('-').map(Number);
                const [ey, em, ed] = customDateRange.end.split('-').map(Number);
                const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
                const end   = new Date(ey, em - 1, ed, 23, 59, 59, 999);
                return orderDate >= start && orderDate <= end;
            }
            
            switch(timeFilter) {
                case 'today':
                    return orderDate >= today;
                case 'week':
                    return orderDate >= weekAgo;
                case 'month':
                    return orderDate >= monthStart;
                default:
                    return true;
            }
        });
    };

    // Get previous period orders for comparison
    const getPreviousPeriodOrders = () => {
        if (!compareMode) return [];
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            
            switch(timeFilter) {
                case 'today':
                    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                    return orderDate >= yesterday && orderDate < today;
                case 'week':
                    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return orderDate >= twoWeeksAgo && orderDate < weekAgo;
                case 'month':
                    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                    return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
                default:
                    return false;
            }
        });
    };

    // Actual money collected for an order:
    // Stripe orders → stripeTotal (subtotal + tax + fee + tip)
    // Cash/counter orders → total (subtotal) + tip
    const orderRevenue = (order) =>
        order.stripeTotal != null ? order.stripeTotal : (order.total + (order.tip || 0));

    // Calculate key metrics
    const calculateMetrics = (orders) => {
        const completedOrders = orders.filter(o => o.status === 'Completed');
        // Exclude cancelled orders so revenue/tips/avg only reflect real/active orders
        const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled');
        const totalRevenue = nonCancelledOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
        const totalTips = nonCancelledOrders.reduce((sum, order) => sum + (order.tip || 0), 0);
        const totalOrders = orders.length;
        const avgOrderValue = nonCancelledOrders.length > 0 ? totalRevenue / nonCancelledOrders.length : 0;
        const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;
        // Exclude cancelled orders from paid count — cancelled paid = money not kept
        const paidOrders = orders.filter(o => o.paid && o.status !== 'Cancelled').length;
        const paymentRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;
        // Net subtotal = pure food sales (revenue minus tips, tax, and convenience fees)
        // Mirrors effectiveGross logic from report helpers
        const netSubtotal = nonCancelledOrders.reduce((sum, o) => {
            if (!o.paymentId) return sum + o.total;        // cash: total IS gross
            if (o.taxAmount > 0) return sum + o.total;     // modern: total is pure subtotal
            if (o.stripeTotal) return sum + o.total;       // stripeTotal era: total is pure subtotal
            return sum + +(o.total / 1.0825).toFixed(2);   // old card: tax embedded, back-calc
        }, 0);

        return {
            totalRevenue,
            totalTips,
            totalOrders,
            avgOrderValue,
            completionRate,
            paymentRate,
            netSubtotal,
            completedOrders: completedOrders.length,
            pendingOrders: orders.filter(o => o.status === 'Pending').length,
            cancelledOrders: orders.filter(o => o.status === 'Cancelled').length
        };
    };

    // Parse item name from formatted string (e.g., "Panipuri (Mild, No Onions)")
    const parseItemName = (itemString) => {
        return itemString.split(' (')[0];
    };

    // Calculate actual price of an item string including extra option costs
    const calculateItemPrice = (itemString) => {
        const parts = itemString.split(' (');
        const itemName = parts[0];
        const options = parts[1] ? parts[1].replace(')', '').split(', ') : [];
        const menuItem = menuItems.find(m => m.name === itemName);
        if (!menuItem) return 0;
        let price = menuItem.price;
        if (menuItem.extraOptions && options.length > 0) {
            options.forEach(option => {
                if (menuItem.extraOptions[option]) {
                    price += menuItem.extraOptions[option];
                } else {
                    const baseOptionName = option.replace(/\s*\(\+\$\d+(\.\d+)?\)/, '');
                    if (menuItem.extraOptions[baseOptionName]) {
                        price += menuItem.extraOptions[baseOptionName];
                    }
                }
            });
        }
        return price;
    };

    // Get top selling items (exclude cancelled — those were never served)
    const getTopSellingItems = (orders) => {
        const itemCounts = {};
        const itemRevenue = {};

        orders.filter(o => o.status !== 'Cancelled').forEach(order => {
            const fallbackPerItem = order.total / (order.items.length || 1);
            order.items.forEach(itemString => {
                const itemName = parseItemName(itemString);
                itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
                const calcPrice = calculateItemPrice(itemString);
                itemRevenue[itemName] = (itemRevenue[itemName] || 0) + (calcPrice > 0 ? calcPrice : fallbackPerItem);
            });
        });

        return Object.entries(itemCounts)
            .map(([name, count]) => ({
                name,
                count,
                revenue: itemRevenue[name] || 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    };

    // Get sales by category (exclude cancelled orders)
    const getSalesByCategory = (orders) => {
        const categorySales = {};
        const categoryCount = {};

        orders.filter(o => o.status !== 'Cancelled').forEach(order => {
            const fallbackPerItem = order.total / (order.items.length || 1);
            order.items.forEach(itemString => {
                const itemName = parseItemName(itemString);
                const menuItem = menuItems.find(m => m.name === itemName);
                const category = (menuItem && menuItem.category) ? menuItem.category : 'Other';
                const calcPrice = calculateItemPrice(itemString);
                const price = calcPrice > 0 ? calcPrice : fallbackPerItem;
                categorySales[category] = (categorySales[category] || 0) + price;
                categoryCount[category] = (categoryCount[category] || 0) + 1;
            });
        });

        const maxRevenue = Math.max(...Object.values(categorySales), 1);

        return Object.entries(categorySales)
            .map(([category, revenue]) => ({
                category,
                revenue,
                count: categoryCount[category],
                percentage: (revenue / maxRevenue) * 100
            }))
            .sort((a, b) => b.revenue - a.revenue);
    };

    // Get orders by hour of day (exclude cancelled)
    const getOrdersByHour = (orders) => {
        const hourCounts = Array(24).fill(0);
        
        orders.filter(o => o.status !== 'Cancelled').forEach(order => {
            const hour = new Date(order.createdAt).getHours();
            hourCounts[hour]++;
        });

        const maxCount = Math.max(...hourCounts, 1);
        
        return hourCounts.map((count, hour) => ({
            hour,
            count,
            percentage: (count / maxCount) * 100
        })).filter(h => h.count > 0);
    };

    // Get revenue trend by day (last 7 days or within filter, exclude cancelled)
    const getRevenueTrend = (orders) => {
        // Key by full ISO date (YYYY-MM-DD) for correct sorting, display as "Feb 3"
        const dailyRevenue = {};
        const dailyLabel = {};

        orders.filter(o => o.status !== 'Cancelled').forEach(order => {
            const d = new Date(order.createdAt);
            // Use local date components so late-night orders (11 PM local = next day UTC)
            // are grouped by the correct local calendar date, not the UTC date
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyRevenue[key] = (dailyRevenue[key] || 0) + orderRevenue(order);
            dailyLabel[key] = label;
        });

        return Object.keys(dailyRevenue)
            .sort() // ISO strings sort lexicographically = chronologically
            .map(key => ({ date: dailyLabel[key], revenue: dailyRevenue[key] }));
        // No slice — filteredOrders is already scoped to the selected time period
    };

    // Payment method breakdown (completed orders only)
    const getPaymentBreakdown = (orders) => {
        const completedOrders = orders.filter(o => o.status === 'Completed');
        const paidOnline = completedOrders.filter(o => o.paid && o.paymentId).length;
        const paidCounter = completedOrders.filter(o => o.paid && !o.paymentId).length;
        const paidTotal = paidOnline + paidCounter || 1;

        return {
            online: {
                count: paidOnline,
                percentage: (paidOnline / paidTotal) * 100,
                revenue: completedOrders.filter(o => o.paid && o.paymentId).reduce((sum, o) => sum + orderRevenue(o), 0)
            },
            counter: {
                count: paidCounter,
                percentage: (paidCounter / paidTotal) * 100,
                revenue: completedOrders.filter(o => o.paid && !o.paymentId).reduce((sum, o) => sum + orderRevenue(o), 0)
            },
            unpaid: {
                count: orders.filter(o => o.status === 'Pending' && !o.paid).length,
                percentage: 0,
                revenue: 0
            }
        };
    };

    // Repeat customer stats
    const getRepeatCustomerStats = (orders) => {
        const nonCancelled = orders.filter(o => o.status !== 'Cancelled');
        const customerMap = {};

        nonCancelled.forEach(order => {
            const key = (order.customerEmail || order.customerName).toLowerCase().trim();
            if (!customerMap[key]) {
                customerMap[key] = {
                    name: order.customerName,
                    email: order.customerEmail || '',
                    orders: 0,
                    revenue: 0,
                    lastOrder: null
                };
            }
            customerMap[key].orders++;
            customerMap[key].revenue += orderRevenue(order);
            const d = new Date(order.createdAt);
            if (!customerMap[key].lastOrder || d > customerMap[key].lastOrder) {
                customerMap[key].lastOrder = d;
            }
        });

        const customers = Object.values(customerMap);
        const uniqueCount = customers.length;
        const repeatCustomers = customers.filter(c => c.orders > 1);
        const repeatCount = repeatCustomers.length;
        const repeatRate = uniqueCount > 0 ? (repeatCount / uniqueCount) * 100 : 0;
        const avgOrdersPerRepeat = repeatCount > 0
            ? repeatCustomers.reduce((s, c) => s + c.orders, 0) / repeatCount
            : 0;
        const topRepeatCustomers = [...repeatCustomers]
            .sort((a, b) => b.orders - a.orders);

        return { uniqueCount, repeatCount, repeatRate, avgOrdersPerRepeat, topRepeatCustomers };
    };

    // Average wait time (from order creation to completion)
    const getAverageWaitTime = (orders) => {
        const completedOrders = orders.filter(o => 
            o.status === 'Completed' && o.createdAt && o.updatedAt
        );

        if (completedOrders.length === 0) return { minutes: 0, orders: 0 };

        const totalWaitTime = completedOrders.reduce((sum, order) => {
            const created = new Date(order.createdAt);
            const updated = new Date(order.updatedAt);
            const diffMinutes = (updated - created) / (1000 * 60);
            return sum + diffMinutes;
        }, 0);

        return {
            minutes: Math.round(totalWaitTime / completedOrders.length),
            orders: completedOrders.length
        };
    };

    // Heatmap data - order volume and revenue by day
    const getHeatmapData = (orders, targetDate) => {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        
        const dayData = Array(daysInMonth).fill(null).map(() => ({ count: 0, revenue: 0 }));
        const monthOrders = [];

        // Exclude cancelled orders from heatmap counts and revenue
        orders.filter(o => o.status !== 'Cancelled').forEach(order => {
            const orderDate = new Date(order.createdAt);
            if (orderDate.getMonth() === month && orderDate.getFullYear() === year) {
                const day = orderDate.getDate() - 1;
                dayData[day].count++;
                dayData[day].revenue += orderRevenue(order);
                monthOrders.push(order);
            }
        });

        const maxOrders = Math.max(...dayData.map(d => d.count), 1);
        const maxRevenue = Math.max(...dayData.map(d => d.revenue), 1);
        const totalOrders = monthOrders.length;
        const totalRevenue = monthOrders.reduce((sum, o) => sum + orderRevenue(o), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const totalTips = monthOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
        
        // Calculate avg wait time for completed orders in this month
        const completedOrders = monthOrders.filter(o => 
            o.status === 'Completed' && o.createdAt && o.updatedAt
        );
        let avgWaitTime = 0;
        if (completedOrders.length > 0) {
            const totalWaitTime = completedOrders.reduce((sum, order) => {
                const created = new Date(order.createdAt);
                const updated = new Date(order.updatedAt);
                const diffMinutes = (updated - created) / (1000 * 60);
                return sum + diffMinutes;
            }, 0);
            avgWaitTime = Math.round(totalWaitTime / completedOrders.length);
        }

        // Create weekly grid structure
        const weeks = [];
        let week = Array(7).fill(null);
        
        // Fill first week with empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            week[i] = { isEmpty: true };
        }
        
        // Fill in the days
        dayData.forEach((data, index) => {
            const dayOfWeek = (firstDay + index) % 7;
            const date = new Date(year, month, index + 1);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            week[dayOfWeek] = {
                day: index + 1,
                dayOfWeek: dayNames[dayOfWeek],
                count: data.count,
                revenue: data.revenue,
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                intensity: ((data.count / maxOrders) * 0.5 + (data.revenue / maxRevenue) * 0.5) * 100,
                isEmpty: false
            };
            
            if (dayOfWeek === 6 || index === daysInMonth - 1) {
                weeks.push([...week]);
                week = Array(7).fill(null).map(() => ({ isEmpty: true }));
            }
        });

        return { weeks, maxOrders, totalOrders, totalRevenue, avgOrderValue, totalTips, avgWaitTime };
    };

    // Comparison metrics
    const getComparisonMetrics = () => {
        if (!compareMode) return null;

        const currentOrders = filteredOrders;
        const previousOrders = getPreviousPeriodOrders();

        const currentRevenue = currentOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + orderRevenue(o), 0);
        const previousRevenue = previousOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + orderRevenue(o), 0);

        const currentCount = currentOrders.length;
        const previousCount = previousOrders.length;

        const revenueChange = previousRevenue > 0 
            ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
            : 0;
        const orderChange = previousCount > 0 
            ? ((currentCount - previousCount) / previousCount) * 100 
            : 0;

        return {
            revenueChange,
            orderChange,
            currentRevenue,
            previousRevenue,
            currentCount,
            previousCount
        };
    };

    // Export to CSV
    const exportToCSV = (orders) => {
        const headers = ['Order Number', 'Customer', 'Date', 'Items', 'Total', 'Status', 'Paid'];
        const rows = orders.map(order => [
            order.orderNumber,
            order.customerName,
            new Date(order.createdAt).toLocaleString(),
            order.items.join('; '),
            `$${orderRevenue(order).toFixed(2)}`,
            order.status,
            order.paid ? 'Yes' : 'No'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeFilter}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Tax/fee helpers for reports.
    // Modern orders (stripeTotal stored): derive exact values.
    // Old card orders (no stripeTotal): tax was embedded in `total`, back-calculate it.
    //   gross = total / 1.0825  →  tax = total − gross
    //   This ensures: gross + tax + tips = total + tips = exactly what was collected.
    // Cash orders: no tax or fee ever.
    const effectiveGross = (o) => {
        if (!o.paymentId) return o.total; // cash: total IS gross
        if (o.taxAmount > 0) return o.total; // modern: total is already pure subtotal
        if (o.stripeTotal) return o.total;   // stripeTotal era: total is pure subtotal
        // Old card orders: tax embedded in total
        return +(o.total / 1.0825).toFixed(2);
    };
    const effectiveTax = (o) => {
        if (!o.paymentId) return 0;
        if (o.taxAmount > 0) return o.taxAmount;
        if (o.stripeTotal) return +(o.total * 0.0825).toFixed(2);
        // Old card orders: tax = total − gross
        return +(o.total - effectiveGross(o)).toFixed(2);
    };
    const effectiveFee = (o) => {
        if (!o.paymentId) return 0;
        if (o.convenienceFee > 0) return o.convenienceFee;
        if (o.stripeTotal) {
            const tax = effectiveTax(o);
            return +(o.stripeTotal - o.total - tax - (o.tip || 0)).toFixed(2);
        }
        // Old card orders: fee was charged but never stored.
        // Derive from the same formula: 2.9% of (subtotal+tax+tip) + $0.30
        // For old orders total = subtotal+tax, so basis = total + tip
        return +((o.total + (o.tip || 0)) * 0.029 + 0.30).toFixed(2);
    };
    // Total actually collected.
    const reportRevenue = (o) => {
        if (o.stripeTotal != null) return o.stripeTotal;
        return o.total + (o.tip || 0); // cash or old card: total + tip = full collected amount
    };

    // Generate Monthly Sales Report (CSV)
    const generateMonthlyTaxReport = () => {
        const monthStart = new Date(reportYear, reportMonth, 1);
        const monthEnd = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);
        const monthOrders = orders.filter(o => {
            const d = new Date(o.createdAt);
            return d >= monthStart && d <= monthEnd;
        });
        const completedOrders = monthOrders.filter(o => o.status === 'Completed');
        const isCard = reportType === 'card';
        const isCash = reportType === 'cash';
        const reportOrders = isCard
            ? completedOrders.filter(o => o.paid && o.paymentId)
            : isCash
            ? completedOrders.filter(o => !o.paymentId)
            : completedOrders;

        const grossSales = reportOrders.reduce((sum, o) => sum + effectiveGross(o), 0);
        const totalTax = reportOrders.reduce((sum, o) => sum + effectiveTax(o), 0);
        const totalTips = reportOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
        const totalCollected = reportOrders.reduce((sum, o) => sum + reportRevenue(o), 0);
        const totalFees = reportOrders.reduce((sum, o) => sum + effectiveFee(o), 0);
        const netTotal = totalCollected - totalFees;
        const tipsCount = reportOrders.filter(o => o.tip > 0).length;

        const monthName = new Date(reportYear, reportMonth).toLocaleString('en-US', { month: 'long' });
        const dateRange = `${monthName} 1-${monthEnd.getDate()}, ${reportYear}`;
        const typeLabel = isCard ? 'Card Payments' : isCash ? 'Cash Payments' : 'All Payments';
        const typeSlug = isCard ? 'Card' : isCash ? 'Cash' : 'All';

        const grossWithFees = grossSales + totalFees;

        let csvContent =
            `Sales summary - ${typeLabel}\n` +
            `${dateRange}\n` +
            `Generated: ${new Date().toLocaleString()}\n\n` +
            `Total sales,"$${totalCollected.toFixed(2)}"\n\n` +
            `Summary,All day (12:00 AM-11:59 PM ET)\n` +
            `Gross sales,${reportOrders.length} transactions,"$${grossWithFees.toFixed(2)}"\n` +
            `Items,${reportOrders.length} transactions,"$${grossSales.toFixed(2)}"\n`;

        if (!isCash) {
            csvContent += `Processing fees,${reportOrders.length} transactions,"$${totalFees.toFixed(2)}"\n`;
        }

        if (!isCash) {
            csvContent += `Taxes,${reportOrders.length} transactions,"$${totalTax.toFixed(2)}"\n`;
        }
        csvContent +=
            `Tips,${tipsCount} transactions,"$${totalTips.toFixed(2)}"\n` +
            `Total sales,${reportOrders.length} transactions,"$${totalCollected.toFixed(2)}"\n\n` +
            `Total payments collected,${reportOrders.length} transactions,"$${totalCollected.toFixed(2)}"\n`;

        if (isCard) {
            csvContent += `Card,"$${totalCollected.toFixed(2)}"\n`;
        } else if (isCash) {
            csvContent += `Cash,"$${totalCollected.toFixed(2)}"\n`;
        } else {
            const cardRev = completedOrders.filter(o => o.paid && o.paymentId).reduce((s, o) => s + reportRevenue(o), 0);
            const cashRev = totalCollected - cardRev;
            csvContent += `Card,"$${cardRev.toFixed(2)}"\nCash,"$${cashRev.toFixed(2)}"\n`;
        }

        if (!isCash) {
            csvContent +=
                `\nFees\n` +
                `Processing fees,"($${totalFees.toFixed(2)})"\n`;
        }
        csvContent += `\nNet total,"$${netTotal.toFixed(2)}"\n`;

        if (!isCash) {
            csvContent +=
                `\nTax Information (NC 8.25%)\n` +
                `Taxable Sales,"$${grossSales.toFixed(2)}"\n` +
                `Tax Collected,"$${totalTax.toFixed(2)}"\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sales-Summary-${typeSlug}-${monthName}-${reportYear}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Generate Monthly Tax Report as PDF
    const generateMonthlyTaxReportPDF = () => {
        const monthStart = new Date(reportYear, reportMonth, 1);
        const monthEnd = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);
        const monthOrders = orders.filter(o => {
            const d = new Date(o.createdAt);
            return d >= monthStart && d <= monthEnd;
        });
        const completedOrders = monthOrders.filter(o => o.status === 'Completed');
        const isCard = reportType === 'card';
        const isCash = reportType === 'cash';
        const reportOrders = isCard
            ? completedOrders.filter(o => o.paid && o.paymentId)
            : isCash
            ? completedOrders.filter(o => !o.paymentId)
            : completedOrders;

        const grossSales = reportOrders.reduce((sum, o) => sum + effectiveGross(o), 0);
        const totalTax = reportOrders.reduce((sum, o) => sum + effectiveTax(o), 0);
        const totalTips = reportOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
        const totalCollected = reportOrders.reduce((sum, o) => sum + reportRevenue(o), 0);
        const totalFees = reportOrders.reduce((sum, o) => sum + effectiveFee(o), 0);
        const netTotal = totalCollected - totalFees;
        const tipsCount = reportOrders.filter(o => o.tip > 0).length;

        const monthName = new Date(reportYear, reportMonth).toLocaleString('en-US', { month: 'long' });
        const dateRange = `${monthName} 1-${monthEnd.getDate()}, ${reportYear}`;
        const typeLabel = isCard ? 'Card Payments' : isCash ? 'Cash Payments' : 'All Payments';
        const typeSlug = isCard ? 'Card' : isCash ? 'Cash' : 'All';

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Thin top border line
        doc.setDrawColor(220);
        doc.setLineWidth(0.3);
        doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);

        // Date range
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text(dateRange, 20, yPos);
        yPos += 9;

        // Title
        doc.setFontSize(22);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(`Sales summary`, 20, yPos);
        yPos += 7;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        doc.text(typeLabel, 20, yPos);
        yPos += 12;

        // Horizontal rule
        doc.setDrawColor(220);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 8;

        // Total sales label + big number
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text('Total sales', 20, yPos);
        yPos += 10;
        doc.setFontSize(28);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(`$${totalCollected.toFixed(2)}`, 20, yPos);
        yPos += 14;

        // Horizontal rule
        doc.setDrawColor(220);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 8;

        // Summary header
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text('Summary', 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120);
        doc.text('All day (12:00 AM-11:59 PM ET)', 20, yPos);
        yPos += 8;

        // Row helper: bold label left, gray tx count center, amount right
        const row = (label, txCount, amount, bold = false, indent = 0) => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.setFont(undefined, bold ? 'bold' : 'normal');
            doc.text(label, 20 + indent, yPos);
            if (txCount) {
                doc.setTextColor(130);
                doc.setFont(undefined, 'normal');
                doc.text(txCount, 105, yPos, { align: 'center' });
            }
            doc.setTextColor(0);
            doc.setFont(undefined, bold ? 'bold' : 'normal');
            doc.text(amount, pageWidth - 20, yPos, { align: 'right' });
            yPos += 7;
        };

        const divider = () => {
            doc.setDrawColor(230);
            doc.setLineWidth(0.2);
            doc.line(20, yPos - 1, pageWidth - 20, yPos - 1);
            yPos += 3;
        };

        // Gross sales (includes processing fees so that Gross + Tax + Tips = Total sales)
        const grossWithFees = grossSales + totalFees;
        row('Gross sales', `${reportOrders.length} transactions`, `$${grossWithFees.toFixed(2)}`, true);
        row('Items', `${reportOrders.length} transactions`, `$${grossSales.toFixed(2)}`, false, 5);
        if (!isCash) {
            row('Processing fees', `${reportOrders.length} transactions`, `$${totalFees.toFixed(2)}`, false, 5);
        }
        divider();

        // Taxes — card only
        if (!isCash) {
            row('Taxes', `${reportOrders.length} transactions`, `$${totalTax.toFixed(2)}`, true);
        }

        // Tips
        row('Tips', `${tipsCount} transactions`, `$${totalTips.toFixed(2)}`, true);
        divider();

        // Total sales
        row('Total sales', `${reportOrders.length} transactions`, `$${totalCollected.toFixed(2)}`, true);
        yPos += 3;
        divider();

        // Total payments collected
        row('Total payments collected', `${reportOrders.length} transactions`, `$${totalCollected.toFixed(2)}`, true);
        if (isCard) {
            row('Card', '', `$${totalCollected.toFixed(2)}`, false, 5);
        } else if (isCash) {
            row('Cash', '', `$${totalCollected.toFixed(2)}`, false, 5);
        } else {
            const cardRev = completedOrders.filter(o => o.paid && o.paymentId).reduce((s, o) => s + reportRevenue(o), 0);
            const cashRev = totalCollected - cardRev;
            row('Card', '', `$${cardRev.toFixed(2)}`, false, 5);
            row('Cash', '', `$${cashRev.toFixed(2)}`, false, 5);
        }
        divider();

        // Fees — card only
        if (!isCash) {
            row('Fees', '', '', true);
            row('Processing fees', '', `($${totalFees.toFixed(2)})`, false, 5);
            divider();
        }

        // Net total
        doc.setFontSize(11);
        row('Net total', '', `$${netTotal.toFixed(2)}`, true);

        // Tax footnote — card only
        if (!isCash) {
            yPos += 6;
            doc.setDrawColor(220);
            doc.setLineWidth(0.3);
            doc.line(20, yPos, pageWidth - 20, yPos);
            yPos += 6;
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont(undefined, 'normal');
            doc.text(`NC Sales Tax 8.25% — Taxable Sales: $${grossSales.toFixed(2)}  |  Tax Collected: $${totalTax.toFixed(2)}`, 20, yPos);
        }

        // Page footer
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text('Generated by Chaat Mahal Analytics', 20, doc.internal.pageSize.getHeight() - 10);
        doc.text(new Date().toLocaleString(), pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

        doc.save(`Sales-Summary-${typeSlug}-${monthName}-${reportYear}.pdf`);
    };

    const filteredOrders = getFilteredOrders();
    const previousOrders = getPreviousPeriodOrders();
    const metrics = calculateMetrics(filteredOrders);
    const topItems = getTopSellingItems(filteredOrders);
    const categoryData = getSalesByCategory(filteredOrders);
    const hourlyData = getOrdersByHour(filteredOrders);
    const revenueTrend = getRevenueTrend(filteredOrders);
    const paymentBreakdown = getPaymentBreakdown(filteredOrders);
    const waitTime = getAverageWaitTime(filteredOrders);
    const repeatStats = getRepeatCustomerStats(filteredOrders);
    const heatmapData = getHeatmapData(orders, heatmapMonth); // Use all orders, not filtered

    // Heatmap month navigation
    const goToPreviousMonth = () => {
        setHeatmapMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const goToNextMonth = () => {
        setHeatmapMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    const goToCurrentMonth = () => {
        setHeatmapMonth(new Date());
    };

    const isCurrentMonth = () => {
        const now = new Date();
        return heatmapMonth.getMonth() === now.getMonth() && 
               heatmapMonth.getFullYear() === now.getFullYear();
    };
    const comparisonData = getComparisonMetrics();

    if (loading) {
        return (
            <div className="analytics-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="analytics-container">
            <h2 className="analytics-title"><FiBarChart2 /> Analytics Dashboard</h2>
            <div className="analytics-header">
                <div className="header-actions">
                    <div className="time-filter">
                        <button 
                            className={timeFilter === 'today' ? 'active' : ''} 
                            onClick={() => { setTimeFilter('today'); setShowDatePicker(false); }}
                        >
                            Today
                        </button>
                        <button 
                            className={timeFilter === 'week' ? 'active' : ''} 
                            onClick={() => { setTimeFilter('week'); setShowDatePicker(false); }}
                        >
                            Last 7 Days
                        </button>
                        <button 
                            className={timeFilter === 'month' ? 'active' : ''} 
                            onClick={() => { setTimeFilter('month'); setShowDatePicker(false); }}
                        >
                            This Month
                        </button>
                        <button 
                            className={timeFilter === 'all' ? 'active' : ''} 
                            onClick={() => { setTimeFilter('all'); setShowDatePicker(false); }}
                        >
                            All Time
                        </button>
                        <button 
                            className={timeFilter === 'custom' ? 'active' : ''} 
                            onClick={() => { setShowDatePicker(!showDatePicker); setTimeFilter('custom'); }}
                        >
                            <FiCalendar /> Custom
                        </button>
                    </div>
                    <div className="header-controls">
                        <button 
                            className={`control-btn ${compareMode ? 'active' : ''}`}
                            onClick={() => setCompareMode(!compareMode)}
                            title="Compare with previous period"
                        >
                            {compareMode ? <><FiBarChart2 /> Comparing</> : <><FiBarChart2 /> Compare</>}
                        </button>
                        <button 
                            className="control-btn export"
                            onClick={() => exportToCSV(filteredOrders)}
                            title="Export data to CSV"
                        >
                            <FiDownload /> Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Date Picker */}
            {showDatePicker && (
                <div className="custom-date-picker">
                    <div className="date-inputs">
                        <div className="date-input-group">
                            <label>Start Date:</label>
                            <input 
                                type="date" 
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                            />
                        </div>
                        <div className="date-input-group">
                            <label>End Date:</label>
                            <input 
                                type="date" 
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Comparison Banner */}
            {compareMode && comparisonData && (
                <div className="comparison-banner">
                    <div className="comparison-item">
                        <span className="comparison-label">Revenue Change:</span>
                        <span className={`comparison-value ${comparisonData.revenueChange >= 0 ? 'positive' : 'negative'}`}>
                            {comparisonData.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(comparisonData.revenueChange).toFixed(1)}%
                        </span>
                        <span className="comparison-detail">
                            (${comparisonData.currentRevenue.toFixed(2)} vs ${comparisonData.previousRevenue.toFixed(2)})
                        </span>
                    </div>
                    <div className="comparison-item">
                        <span className="comparison-label">Order Change:</span>
                        <span className={`comparison-value ${comparisonData.orderChange >= 0 ? 'positive' : 'negative'}`}>
                            {comparisonData.orderChange >= 0 ? '↑' : '↓'} {Math.abs(comparisonData.orderChange).toFixed(1)}%
                        </span>
                        <span className="comparison-detail">
                            ({comparisonData.currentCount} vs {comparisonData.previousCount} orders)
                        </span>
                    </div>
                </div>
            )}

            {/* Key Metrics Cards */}
            <div className="metrics-grid">
                <div className="metric-card revenue">
                    <div className="metric-icon"><FiDollarSign /></div>
                    <div className="metric-content">
                        <h3>Total Revenue</h3>
                        <p className="metric-value">${metrics.totalRevenue.toFixed(2)}</p>
                        <span className="metric-sublabel">{metrics.totalOrders} orders</span>
                    </div>
                </div>

                <div className="metric-card orders">
                    <div className="metric-icon"><FiPackage /></div>
                    <div className="metric-content">
                        <h3>Total Orders</h3>
                        <p className="metric-value">{metrics.totalOrders}</p>
                        <span className="metric-sublabel">{metrics.completedOrders} completed</span>
                    </div>
                </div>

                <div className="metric-card average">
                    <div className="metric-icon"><FiTrendingUp /></div>
                    <div className="metric-content">
                        <h3>Avg Order Value</h3>
                        <p className="metric-value">${metrics.avgOrderValue.toFixed(2)}</p>
                        <span className="metric-sublabel">per order</span>
                    </div>
                </div>

                <div className="metric-card tips">
                    <div className="metric-icon"><FiGift /></div>
                    <div className="metric-content">
                        <h3>Total Tips</h3>
                        <p className="metric-value">${metrics.totalTips.toFixed(2)}</p>
                        <span className="metric-sublabel">{metrics.netSubtotal > 0 ? ((metrics.totalTips / metrics.netSubtotal) * 100).toFixed(1) : '0.0'}% of food sales</span>
                    </div>
                </div>

                <div className="metric-card wait-time">
                    <div className="metric-icon"><FiClock /></div>
                    <div className="metric-content">
                        <h3>Avg Wait Time</h3>
                        <p className="metric-value">{waitTime.minutes} min</p>
                        <span className="metric-sublabel">{waitTime.orders} completed orders</span>
                    </div>
                </div>
            </div>

            {/* Order Status Overview */}
            <div className="analytics-section">
                <h3>Order Status Overview</h3>
                <div className="status-grid">
                    <div className="status-card completed">
                        <div className="status-number">{metrics.completedOrders}</div>
                        <div className="status-label">Completed</div>
                        <div className="status-bar">
                            <div 
                                className="status-fill" 
                                style={{width: `${metrics.completionRate}%`}}
                            ></div>
                        </div>
                        <div className="status-percentage">{metrics.completionRate.toFixed(1)}%</div>
                    </div>

                    <div className="status-card pending">
                        <div className="status-number">{metrics.pendingOrders}</div>
                        <div className="status-label">Pending</div>
                        <div className="status-bar">
                            <div 
                                className="status-fill" 
                                style={{width: `${(metrics.pendingOrders / (metrics.totalOrders || 1)) * 100}%`}}
                            ></div>
                        </div>
                        <div className="status-percentage">
                            {metrics.totalOrders > 0 ? ((metrics.pendingOrders / metrics.totalOrders) * 100).toFixed(1) : 0}%
                        </div>
                    </div>

                    <div className="status-card cancelled">
                        <div className="status-number">{metrics.cancelledOrders}</div>
                        <div className="status-label">Cancelled</div>
                        <div className="status-bar">
                            <div 
                                className="status-fill" 
                                style={{width: `${(metrics.cancelledOrders / (metrics.totalOrders || 1)) * 100}%`}}
                            ></div>
                        </div>
                        <div className="status-percentage">
                            {metrics.totalOrders > 0 ? ((metrics.cancelledOrders / metrics.totalOrders) * 100).toFixed(1) : 0}%
                        </div>
                    </div>

                    <div className="status-card paid">
                        <div className="status-number">{filteredOrders.filter(o => o.paid).length}</div>
                        <div className="status-label">Paid</div>
                        <div className="status-bar">
                            <div 
                                className="status-fill" 
                                style={{width: `${metrics.paymentRate}%`}}
                            ></div>
                        </div>
                        <div className="status-percentage">{metrics.paymentRate.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            {/* Orders for selected period */}
            {filteredOrders.length > 0 && (
                <div className="analytics-section">
                    <div className="orders-section-header">
                        <h3><FiFileText /> Orders
                            <span className="orders-period-label">
                                {timeFilter === 'today' ? 'Today'
                                : timeFilter === 'week' ? 'Last 7 Days'
                                : timeFilter === 'month' ? 'This Month'
                                : timeFilter === 'custom' ? 'Custom Range'
                                : 'All Time'}
                            </span>
                        </h3>
                        <div className="orders-summary-chips">
                            <span className="orders-chip total">{filteredOrders.length} Orders</span>
                            <span className="orders-chip completed">{filteredOrders.filter(o => o.status === 'Completed').length} Completed</span>
                            <span className="orders-chip revenue">${filteredOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + orderRevenue(o), 0).toFixed(2)} Revenue</span>
                        </div>
                    </div>
                    <div className="analytics-orders-table-wrapper">
                        <table className="analytics-orders-table">
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Customer</th>
                                    <th>Total</th>
                                    <th>Tip</th>
                                    <th>Payment</th>
                                    <th>Status</th>
                                    <th>Date &amp; Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...filteredOrders]
                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                    .slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE)
                                    .map((order, idx) => (
                                        <tr key={order._id} className={`analytics-order-row ${idx % 2 === 0 ? 'aot-row-even' : 'aot-row-odd'} aot-row-clickable`} onClick={() => setSelectedOrder(order)}>
                                            <td className="aot-num">#{order.orderNumber}</td>
                                            <td className="aot-customer">{order.customerName}</td>
                                            <td className="aot-total">${orderRevenue(order).toFixed(2)}</td>
                                            <td className="aot-tip">{order.tip > 0 ? `$${order.tip.toFixed(2)}` : <span className="aot-tip-none">—</span>}</td>
                                            <td>
                                                <span className={`aot-payment-badge ${order.paid ? (order.paymentId ? 'card' : 'paid') : 'unpaid'}`}>
                                                    {order.paid ? (order.paymentId ? <><FiCreditCard /> Card</> : <><FiCheckCircle /> Cash Paid</>) : <><FiDollarSign /> Cash</>}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`aot-status-badge aot-badge-${order.status.toLowerCase()}`}>
                                                    {order.status === 'Completed' ? <FiCheck /> : order.status === 'Cancelled' ? <FiX /> : <FiClock />}{' '}{order.status}
                                                </span>
                                            </td>
                                            <td className="aot-date">
                                                <span className="aot-date-main">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="aot-time">{new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    {filteredOrders.length > ORDERS_PER_PAGE && (
                        <div className="analytics-pagination">
                            <button className="aot-page-btn" disabled={ordersPage === 1} onClick={() => setOrdersPage(p => p - 1)}><FiChevronLeft /> Previous</button>
                            <div className="aot-page-dots">
                                {Array.from({ length: Math.min(5, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)) }, (_, i) => {
                                    const total = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
                                    let page;
                                    if (total <= 5) {
                                        page = i + 1;
                                    } else if (ordersPage <= 3) {
                                        page = i + 1;
                                    } else if (ordersPage >= total - 2) {
                                        page = total - 4 + i;
                                    } else {
                                        page = ordersPage - 2 + i;
                                    }
                                    return (
                                        <button key={page} className={`aot-page-dot ${ordersPage === page ? 'active' : ''}`} onClick={() => setOrdersPage(page)}>{page}</button>
                                    );
                                })}
                            </div>
                            <button className="aot-page-btn" disabled={ordersPage >= Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)} onClick={() => setOrdersPage(p => p + 1)}>Next <FiChevronRight /></button>
                        </div>
                    )}
                    <div className="aot-pagination-count">Showing {Math.min((ordersPage - 1) * ORDERS_PER_PAGE + 1, filteredOrders.length)}–{Math.min(ordersPage * ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders</div>
                </div>
            )}

            {/* Payment Breakdown */}
            <div className="analytics-section">
                <h3><FiCreditCard /> Payment Method Breakdown</h3>
                <div className="analytics-payment-breakdown-container">
                    <div className="analytics-payment-breakdown">
                        <div className="analytics-payment-item online">
                            <div className="analytics-payment-header">
                                <span className="analytics-payment-icon"><FiMonitor /></span>
                                <span className="analytics-payment-label">Online Payments</span>
                            </div>
                            <div className="analytics-payment-stats">
                                <span className="analytics-payment-count">{paymentBreakdown.online.count} orders</span>
                                <span className="analytics-payment-revenue">${paymentBreakdown.online.revenue.toFixed(2)}</span>
                            </div>
                            <div className="analytics-payment-bar-container">
                                <div className="analytics-payment-bar" style={{width: `${paymentBreakdown.online.percentage}%`}}></div>
                            </div>
                            <span className="analytics-payment-percentage">{paymentBreakdown.online.percentage.toFixed(1)}%</span>
                        </div>

                        <div className="analytics-payment-item counter">
                            <div className="analytics-payment-header">
                                <span className="analytics-payment-icon"><FiDollarSign /></span>
                                <span className="analytics-payment-label">Cash Payments</span>
                            </div>
                            <div className="analytics-payment-stats">
                                <span className="analytics-payment-count">{paymentBreakdown.counter.count} orders</span>
                                <span className="analytics-payment-revenue">${paymentBreakdown.counter.revenue.toFixed(2)}</span>
                            </div>
                            <div className="analytics-payment-bar-container">
                                <div className="analytics-payment-bar" style={{width: `${paymentBreakdown.counter.percentage}%`}}></div>
                            </div>
                            <span className="analytics-payment-percentage">{paymentBreakdown.counter.percentage.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Donut Chart for Payment Methods */}
                    <div className="donut-chart">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Online', value: paymentBreakdown.online.count, revenue: paymentBreakdown.online.revenue },
                                        { name: 'Cash', value: paymentBreakdown.counter.count, revenue: paymentBreakdown.counter.revenue }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#4CAF50" />
                                    <Cell fill="#2196F3" />
                                </Pie>
                                <Tooltip 
                                    formatter={(value, name, props) => [`${value} orders ($${props.payload.revenue.toFixed(2)})`, name]}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    formatter={(value, entry) => `${value}: ${entry.payload.value} orders`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Repeat Customers */}
            <div className="analytics-section">
                <h3><FiRefreshCw /> Repeat Customer Stats</h3>
                <div className="rc-stats-grid">
                    <div className="rc-stat-card">
                        <div className="rc-stat-icon"><FiUsers /></div>
                        <div className="rc-stat-text">
                            <div className="rc-stat-value">{repeatStats.uniqueCount}</div>
                            <div className="rc-stat-label">Unique Customers</div>
                        </div>
                    </div>
                    <div className="rc-stat-card">
                        <div className="rc-stat-icon"><FiRefreshCw /></div>
                        <div className="rc-stat-text">
                            <div className="rc-stat-value">{repeatStats.repeatCount}</div>
                            <div className="rc-stat-label">Repeat Customers</div>
                        </div>
                    </div>
                    <div className="rc-stat-card highlight">
                        <div className="rc-stat-icon"><FiTrendingUp /></div>
                        <div className="rc-stat-text">
                            <div className="rc-stat-value">{repeatStats.repeatRate.toFixed(1)}%</div>
                            <div className="rc-stat-label">Repeat Rate</div>
                        </div>
                    </div>
                    <div className="rc-stat-card">
                        <div className="rc-stat-icon"><FiShoppingCart /></div>
                        <div className="rc-stat-text">
                            <div className="rc-stat-value">{repeatStats.avgOrdersPerRepeat.toFixed(1)}</div>
                            <div className="rc-stat-label">Avg Orders / Repeat</div>
                        </div>
                    </div>
                </div>

                {repeatStats.topRepeatCustomers.length > 0 && (
                    <div className="rc-top-customers">
                        <div className="rc-top-title">Top Returning Customers</div>
                        <div className="rc-table-wrapper">
                        <table className="rc-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Customer</th>
                                    <th>Orders</th>
                                    <th>Total Spent</th>
                                    <th>Last Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {repeatStats.topRepeatCustomers
                                    .slice((rcPage - 1) * RC_PER_PAGE, rcPage * RC_PER_PAGE)
                                    .map((c, i) => {
                                        const globalIdx = (rcPage - 1) * RC_PER_PAGE + i;
                                        return (
                                            <tr key={i} className={globalIdx % 2 === 0 ? 'rc-row-even' : 'rc-row-odd'}>
                                                <td className="rc-rank">{globalIdx + 1}</td>
                                                <td className="rc-name">
                                                    <div>{c.name}</div>
                                                    {c.email && <div className="rc-email">{c.email}</div>}
                                                </td>
                                                <td><span className="rc-order-count">{c.orders}×</span></td>
                                                <td className="rc-spent">${c.revenue.toFixed(2)}</td>
                                                <td className="rc-last">{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                                            </tr>
                                        );
                                    })
                                }
                            </tbody>
                        </table>
                        </div>
                        {repeatStats.topRepeatCustomers.length > RC_PER_PAGE && (
                            <div className="analytics-pagination">
                                <button className="aot-page-btn" disabled={rcPage === 1} onClick={() => setRcPage(p => p - 1)}><FiChevronLeft /> Previous</button>
                                <div className="aot-page-dots">
                                    {Array.from({ length: Math.min(5, Math.ceil(repeatStats.topRepeatCustomers.length / RC_PER_PAGE)) }, (_, i) => {
                                        const total = Math.ceil(repeatStats.topRepeatCustomers.length / RC_PER_PAGE);
                                        let page;
                                        if (total <= 5) page = i + 1;
                                        else if (rcPage <= 3) page = i + 1;
                                        else if (rcPage >= total - 2) page = total - 4 + i;
                                        else page = rcPage - 2 + i;
                                        return (
                                            <button key={page} className={`aot-page-dot ${rcPage === page ? 'active' : ''}`} onClick={() => setRcPage(page)}>{page}</button>
                                        );
                                    })}
                                </div>
                                <button className="aot-page-btn" disabled={rcPage >= Math.ceil(repeatStats.topRepeatCustomers.length / RC_PER_PAGE)} onClick={() => setRcPage(p => p + 1)}>Next <FiChevronRight /></button>
                            </div>
                        )}
                        <div className="aot-pagination-count">Showing {Math.min((rcPage - 1) * RC_PER_PAGE + 1, repeatStats.topRepeatCustomers.length)}–{Math.min(rcPage * RC_PER_PAGE, repeatStats.topRepeatCustomers.length)} of {repeatStats.topRepeatCustomers.length} repeat customers</div>
                    </div>
                )}
            </div>

            <div className="analytics-row">
                {/* Top Selling Items */}
                <div className="analytics-section chart-section">
                    <h3><FiAward /> Top Selling Items</h3>
                    {topItems.length > 0 ? (
                        <div className="chart-container">
                            {topItems.map((item, index) => (
                                <div key={item.name} className="chart-item">
                                    <div className="chart-rank">#{index + 1}</div>
                                    <div className="chart-info">
                                        <div className="chart-label">{item.name}</div>
                                        <div className="chart-stats">
                                            <span className="chart-count">{item.count} sold</span>
                                            <span className="chart-revenue">${item.revenue.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="chart-bar-container">
                                        <div 
                                            className="chart-bar" 
                                            style={{width: `${(item.count / topItems[0].count) * 100}%`}}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">No items data available</p>
                    )}
                </div>

                {/* Sales by Category with Pie Chart */}
                <div className="analytics-section chart-section">
                    <h3><FiPieChart /> Sales by Category</h3>
                    {categoryData.length > 0 ? (
                        <>
                            <div className="category-pie-chart">
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                        <Pie
                                            data={categoryData.map(cat => ({
                                                name: cat.category,
                                                value: cat.revenue,
                                                count: cat.count
                                            }))}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                if (percent < 0.05) return null;
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                return (
                                                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
                                                        {`${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                );
                                            }}
                                            outerRadius={100}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => {
                                                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
                                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                            })}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value, name, props) => [
                                                `$${value.toFixed(2)} (${props.payload.count} items)`,
                                                name
                                            ]}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-container">
                                {categoryData.map((cat, i) => {
                                    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
                                    return (
                                        <div key={cat.category} className="chart-item">
                                            <div className="category-color" style={{backgroundColor: colors[i % colors.length]}}></div>
                                            <div className="chart-info">
                                                <div className="chart-label">{cat.category}</div>
                                                <div className="chart-stats">
                                                    <span className="chart-count">{cat.count} items</span>
                                                    <span className="chart-revenue">${cat.revenue.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <p className="no-data">No category data available</p>
                    )}
                </div>
            </div>

            {/* Revenue Trend with Line Chart */}
            {revenueTrend.length > 0 && (
                <div className="analytics-section">
                    <h3><FiTrendingUp /> Revenue Trend</h3>
                    <div className="revenue-trend-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={revenueTrend}
                                margin={{ top: 20, right: 10, left: -5, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `$${value}`}
                                    width={53}
                                />
                                <Tooltip 
                                    formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
                                    labelStyle={{ color: '#333', fontWeight: 'bold' }}
                                />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#2196F3" 
                                    strokeWidth={3}
                                    dot={{ fill: '#2196F3', strokeWidth: 2, r: 5 }}
                                    activeDot={{ r: 8 }}
                                    name="Revenue"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Peak Hours */}
            {hourlyData.length > 0 && (
                <div className="analytics-section">
                    <h3><FiClock /> Peak Hours</h3>
                    <div className="peak-hours-chart">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={hourlyData.map(hourData => ({
                                    hour: hourData.hour === 0 ? '12 AM' : 
                                          hourData.hour === 12 ? '12 PM' : 
                                          hourData.hour < 12 ? `${hourData.hour} AM` : `${hourData.hour - 12} PM`,
                                    orders: hourData.count
                                }))}
                                margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="hour" 
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    width={35}
                                />
                                <Tooltip 
                                    formatter={(value) => [value, 'Orders']}
                                    cursor={{ fill: 'rgba(33, 150, 243, 0.1)' }}
                                />
                                <Legend />
                                <Bar 
                                    dataKey="orders" 
                                    fill="#4CAF50"
                                    radius={[8, 8, 0, 0]}
                                    name="Orders"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Heatmap Calendar */}
            <div className="analytics-section">
                <div className="heatmap-header">
                    <h3><FiCalendar /> Order Activity Heatmap</h3>
                    <div className="heatmap-navigation">
                        <button className="nav-btn" onClick={goToPreviousMonth} title="Previous Month">
                            <FiChevronLeft /> Prev
                        </button>
                        <span className="current-month">
                            {heatmapMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button className="nav-btn" onClick={goToNextMonth} title="Next Month">
                            Next <FiChevronRight />
                        </button>
                        {!isCurrentMonth() && (
                            <button className="nav-btn today-btn" onClick={goToCurrentMonth}>
                                Today
                            </button>
                        )}
                    </div>
                </div>
                    <div className="heatmap-stats">
                        <div className="heatmap-stat">
                            <span className="stat-label">Total Revenue</span>
                            <span className="stat-value">${heatmapData.totalRevenue.toFixed(2)}</span>
                        </div>
                        <div className="heatmap-stat">
                            <span className="stat-label">Total Orders</span>
                            <span className="stat-value">{heatmapData.totalOrders}</span>
                        </div>
                        <div className="heatmap-stat">
                            <span className="stat-label">Avg Order Value</span>
                            <span className="stat-value">${heatmapData.avgOrderValue.toFixed(2)}</span>
                        </div>
                        <div className="heatmap-stat">
                            <span className="stat-label">Total Tips</span>
                            <span className="stat-value">${heatmapData.totalTips.toFixed(2)}</span>
                        </div>
                        <div className="heatmap-stat">
                            <span className="stat-label">Avg Wait Time</span>
                            <span className="stat-value">{heatmapData.avgWaitTime} min</span>
                        </div>
                        <div className="heatmap-stat">
                            <span className="stat-label">Peak Day</span>
                            <span className="stat-value">{heatmapData.maxOrders} orders</span>
                        </div>
                    </div>
                    <div className="heatmap-days-labels">
                        <div className="day-label">Sun</div>
                        <div className="day-label">Mon</div>
                        <div className="day-label">Tue</div>
                        <div className="day-label">Wed</div>
                        <div className="day-label">Thu</div>
                        <div className="day-label">Fri</div>
                        <div className="day-label">Sat</div>
                    </div>
                    <div className="heatmap-calendar">
                        {heatmapData.weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="heatmap-week">
                                    {week.map((dayData, dayIndex) => {
                                        if (!dayData || dayData.isEmpty) {
                                            return <div key={dayIndex} className="heatmap-day empty"></div>;
                                        }
                                        
                                        const intensity = dayData.intensity;
                                        const color = intensity === 0 ? '#f0f0f0' :
                                                     intensity < 20 ? '#d4edda' :
                                                     intensity < 40 ? '#9fdf9f' :
                                                     intensity < 60 ? '#4CAF50' :
                                                     intensity < 80 ? '#388E3C' : '#1B5E20';
                                        
                                        return (
                                            <div
                                                key={dayIndex}
                                                className="heatmap-day"
                                                data-col={dayIndex}
                                                style={{backgroundColor: color}}
                                            >
                                                <span className="heatmap-day-number">{dayData.day}</span>
                                                {dayData.count > 0 && (
                                                    <div className="heatmap-details">
                                                        <span className="heatmap-count">{dayData.count}</span>
                                                        <span className="heatmap-revenue">${dayData.revenue.toFixed(0)}</span>
                                                    </div>
                                                )}
                                                <div className="heatmap-tooltip">
                                                    <div className="heatmap-tooltip-date">{dayData.date}</div>
                                                    <div className="heatmap-tooltip-day">{dayData.dayOfWeek}</div>
                                                    <div className="heatmap-tooltip-divider"></div>
                                                    <div className="heatmap-tooltip-row">
                                                        <span>Orders</span>
                                                        <span className="heatmap-tooltip-val">{dayData.count}</span>
                                                    </div>
                                                    <div className="heatmap-tooltip-row">
                                                        <span>Revenue</span>
                                                        <span className="heatmap-tooltip-val">${dayData.revenue.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                    </div>
                    <div className="heatmap-legend">
                        <span>Less Activity</span>
                        <div className="legend-colors">
                            <div className="legend-box" style={{backgroundColor: '#f0f0f0'}} title="No orders"></div>
                            <div className="legend-box" style={{backgroundColor: '#d4edda'}} title="Low"></div>
                            <div className="legend-box" style={{backgroundColor: '#9fdf9f'}} title="Medium-Low"></div>
                            <div className="legend-box" style={{backgroundColor: '#4CAF50'}} title="Medium"></div>
                            <div className="legend-box" style={{backgroundColor: '#388E3C'}} title="Medium-High"></div>
                            <div className="legend-box" style={{backgroundColor: '#1B5E20'}} title="High"></div>
                        </div>
                        <span>More Activity</span>
                    </div>
            </div>

            {/* Monthly Tax Report */}
            <div className="analytics-section">
                <h3><FiFileText /> Monthly Sales Report</h3>
                <p style={{color: '#666', marginBottom: '20px', fontSize: '14px'}}>
                    Generate a sales summary report for tax filing. Select the payment type, month, and year, then download as PDF or CSV.
                </p>
                <div className="tax-report-controls" style={{display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <label style={{fontWeight: '600', color: '#333', fontSize: '14px'}}>Report Type:</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '2px solid #e0e0e0',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#333',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="card">Card Payments</option>
                            <option value="cash">Cash Payments</option>
                            <option value="all">All Payments</option>
                        </select>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <label style={{fontWeight: '600', color: '#333', fontSize: '14px'}}>Month:</label>
                        <select
                            value={reportMonth}
                            onChange={(e) => setReportMonth(parseInt(e.target.value))}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '2px solid #e0e0e0',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#333',
                                cursor: 'pointer'
                            }}
                        >
                            <option value={0}>January</option>
                            <option value={1}>February</option>
                            <option value={2}>March</option>
                            <option value={3}>April</option>
                            <option value={4}>May</option>
                            <option value={5}>June</option>
                            <option value={6}>July</option>
                            <option value={7}>August</option>
                            <option value={8}>September</option>
                            <option value={9}>October</option>
                            <option value={10}>November</option>
                            <option value={11}>December</option>
                        </select>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <label style={{fontWeight: '600', color: '#333', fontSize: '14px'}}>Year:</label>
                        <select
                            value={reportYear}
                            onChange={(e) => setReportYear(parseInt(e.target.value))}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '2px solid #e0e0e0',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#333',
                                cursor: 'pointer'
                            }}
                        >
                            {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button
                            onClick={generateMonthlyTaxReport}
                            className="control-btn export"
                            style={{
                                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <FiBarChart2 /> CSV
                        </button>
                        <button
                            onClick={generateMonthlyTaxReportPDF}
                            className="control-btn export"
                            style={{
                                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <FiFileText /> PDF
                        </button>
                    </div>
                </div>
            </div>

            {filteredOrders.length === 0 && (
                <div className="no-orders-message">
                    <div className="no-orders-icon"><FiPackage /></div>
                    <h3>No Orders Yet</h3>
                    <p>Analytics will appear once you start receiving orders.</p>
                </div>
            )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
            <div className="aot-modal-overlay" onClick={() => setSelectedOrder(null)}>
                <div className="aot-modal" onClick={e => e.stopPropagation()}>
                    <div className="aot-modal-header">
                        <div>
                            <span className="aot-modal-order-num">Order #{selectedOrder.orderNumber}</span>
                            <span className={`aot-status-badge aot-badge-${selectedOrder.status.toLowerCase()} aot-modal-status`}>
                                {selectedOrder.status === 'Completed' ? <FiCheck /> : selectedOrder.status === 'Cancelled' ? <FiX /> : <FiClock />}{' '}{selectedOrder.status}
                            </span>
                        </div>
                        <button className="aot-modal-close" onClick={() => setSelectedOrder(null)}><FiX /></button>
                    </div>

                    <div className="aot-modal-body">
                        {/* Customer & Date */}
                        <div className="aot-modal-section">
                            <div className="aot-modal-row">
                                <span className="aot-modal-label">Customer</span>
                                <span className="aot-modal-value">{selectedOrder.customerName}</span>
                            </div>
                            <div className="aot-modal-row">
                                <span className="aot-modal-label">Email</span>
                                <span className="aot-modal-value" style={!selectedOrder.customerEmail ? { color: '#aaa', fontStyle: 'italic' } : {}}>
                                    {selectedOrder.customerEmail || 'Not provided'}
                                </span>
                            </div>
                            <div className="aot-modal-row">
                                <span className="aot-modal-label">Date &amp; Time</span>
                                <span className="aot-modal-value">
                                    {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                    {' · '}
                                    {new Date(selectedOrder.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </span>
                            </div>
                            {(() => {
                                if (selectedOrder.status === 'Completed' && selectedOrder.updatedAt) {
                                    const created = new Date(selectedOrder.createdAt);
                                    const completed = new Date(selectedOrder.updatedAt);
                                    const diffMs = completed - created;
                                    const diffMins = Math.floor(diffMs / 60000);
                                    const diffHrs = Math.floor(diffMins / 60);
                                    const remMins = diffMins % 60;
                                    const duration = diffHrs > 0
                                        ? `${diffHrs}h ${remMins}m`
                                        : diffMins > 0 ? `${diffMins}m` : 'under a minute';
                                    return (
                                        <div className="aot-modal-row">
                                            <span className="aot-modal-label">Completed Time</span>
                                            <span className="aot-modal-value">
                                                {completed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                <span style={{ color: '#888', fontSize: '0.85em', marginLeft: '6px' }}>({duration})</span>
                                            </span>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="aot-modal-row">
                                        <span className="aot-modal-label">Completed Time</span>
                                        <span className="aot-modal-value" style={{ color: '#aaa', fontStyle: 'italic' }}>Not completed</span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Items */}
                        <div className="aot-modal-section">
                            <div className="aot-modal-section-title">Items Ordered</div>
                            <div className="aot-modal-items">
                                {(() => {
                                    const counts = {};
                                    selectedOrder.items.forEach(i => { counts[i] = (counts[i] || 0) + 1; });
                                    return Object.entries(counts).map(([item, qty]) => (
                                        <div key={item} className="aot-modal-item">
                                            <span className="aot-modal-item-qty">{qty}×</span>
                                            <span className="aot-modal-item-name">{item.split(' (')[0]}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="aot-modal-section">
                            <div className="aot-modal-section-title">Payment Summary</div>
                            <div className="aot-modal-row">
                                <span className="aot-modal-label">Subtotal</span>
                                <span className="aot-modal-value">${selectedOrder.total.toFixed(2)}</span>
                            </div>
                            {selectedOrder.taxAmount > 0 && (
                                <div className="aot-modal-row">
                                    <span className="aot-modal-label">Tax</span>
                                    <span className="aot-modal-value">${selectedOrder.taxAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {selectedOrder.convenienceFee > 0 && (
                                <div className="aot-modal-row">
                                    <span className="aot-modal-label">Convenience Fee</span>
                                    <span className="aot-modal-value">${selectedOrder.convenienceFee.toFixed(2)}</span>
                                </div>
                            )}
                            {selectedOrder.tip > 0 && (
                                <div className="aot-modal-row">
                                    <span className="aot-modal-label">Tip</span>
                                    <span className="aot-modal-value aot-modal-tip">${selectedOrder.tip.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="aot-modal-row aot-modal-total-row">
                                <span className="aot-modal-label">Total Charged</span>
                                <span className="aot-modal-value aot-modal-grand-total">${orderRevenue(selectedOrder).toFixed(2)}</span>
                            </div>
                            <div className="aot-modal-row">
                                <span className="aot-modal-label">Payment Method</span>
                                <span className="aot-modal-value">
                                    <span className={`aot-payment-badge ${selectedOrder.paid ? (selectedOrder.paymentId ? 'card' : 'paid') : 'unpaid'}`}>
                                        {selectedOrder.paid ? (selectedOrder.paymentId ? <><FiCreditCard /> Card</> : <><FiCheckCircle /> Cash Paid</>) : <><FiDollarSign /> Cash</>}
                                    </span>
                                </span>
                            </div>
                            {selectedOrder.paymentId && (
                                <div className="aot-modal-row aot-modal-row-stack">
                                    <span className="aot-modal-label">Payment ID</span>
                                    <span className="aot-modal-value aot-modal-payment-id">{selectedOrder.paymentId}</span>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {selectedOrder.notes && (
                            <div className="aot-modal-section">
                                <div className="aot-modal-section-title">Special Notes</div>
                                <div className="aot-modal-notes">{selectedOrder.notes}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default Analytics;
