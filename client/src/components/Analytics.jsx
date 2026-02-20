import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordersRes, menuRes] = await Promise.all([
                axios.get('/api/orders/all?ignoreReset=true'), // analytics always needs full history
                axios.get('/api/menu')
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
                const start = new Date(customDateRange.start);
                const end = new Date(customDateRange.end);
                end.setHours(23, 59, 59, 999);
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
                    const dayBefore = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
                    return orderDate >= dayBefore && orderDate < yesterday;
                case 'week':
                    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return orderDate >= twoWeeksAgo && orderDate < weekAgo;
                case 'month':
                    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
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
        const paidOrders = orders.filter(o => o.paid).length;
        const paymentRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;

        return {
            totalRevenue,
            totalTips,
            totalOrders,
            avgOrderValue,
            completionRate,
            paymentRate,
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
            order.items.forEach(itemString => {
                const itemName = parseItemName(itemString);
                itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
                // Calculate revenue using actual price including extra options
                itemRevenue[itemName] = (itemRevenue[itemName] || 0) + calculateItemPrice(itemString);
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
            order.items.forEach(itemString => {
                const itemName = parseItemName(itemString);
                const menuItem = menuItems.find(m => m.name === itemName);
                
                if (menuItem && menuItem.category) {
                    const category = menuItem.category;
                    categorySales[category] = (categorySales[category] || 0) + calculateItemPrice(itemString);
                    categoryCount[category] = (categoryCount[category] || 0) + 1;
                }
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
            const key = d.toISOString().split('T')[0]; // "2025-08-29" — year-aware, sorts correctly
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
                intensity: (data.count / maxOrders) * 100,
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

    // Generate Monthly Tax Report
    const generateMonthlyTaxReport = () => {
        const monthStart = new Date(reportYear, reportMonth, 1);
        const monthEnd = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);
        
        const monthOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= monthStart && orderDate <= monthEnd;
        });

        // Tax report only covers completed (paid/served) orders — cancelled orders are excluded
        const completedOrders = monthOrders.filter(o => o.status === 'Completed');

        // Gross sales = completed order subtotals (pre-tax/fee/tip)
        const grossSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
        // Tax collected from stored taxAmount (Stripe orders only; cash = $0)
        const totalTax = completedOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
        // Tips
        const totalTips = completedOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
        // Total collected = actual money received (stripeTotal for online, subtotal+tip for counter)
        const totalCollected = completedOrders.reduce((sum, o) => sum + orderRevenue(o), 0);
        // Processing fees (Stripe 2.9%+$0.30; cash = $0)
        const totalFees = completedOrders.reduce((sum, o) => sum + (o.convenienceFee || 0), 0);
        // Net total = what you keep after processing fees
        const netTotal = totalCollected - totalFees;
        // Taxable revenue = subtotals of completed Stripe orders only
        const onlinePayments = completedOrders.filter(o => o.paid && o.paymentId);
        const taxableRevenue = onlinePayments.reduce((sum, o) => sum + o.total, 0);
        // Payment breakdown
        const onlineRevenue = onlinePayments.reduce((sum, o) => sum + orderRevenue(o), 0);
        const counterRevenue = totalCollected - onlineRevenue;

        const monthName = new Date(reportYear, reportMonth).toLocaleString('en-US', { month: 'long' });
        const dateRange = `${monthName} 1-${monthEnd.getDate()}, ${reportYear}`;

        const csvContent = `Monthly Sales Summary - Tax Report\n` +
            `${dateRange}\n` +
            `Generated: ${new Date().toLocaleString()}\n\n` +
            `SALES SUMMARY\n` +
            `=================================================\n\n` +
            `Total Sales,"$${grossSales.toFixed(2)}"\n\n` +
            `DETAILED BREAKDOWN\n` +
            `Summary,All day (12:00 AM-11:59 PM ET),,\n` +
            `Gross sales,${completedOrders.length} transactions,"$${grossSales.toFixed(2)}"\n` +
            `  Items,${completedOrders.length} transactions,"$${grossSales.toFixed(2)}"\n` +
            `  Service charges,,"$0.00"\n` +
            `Discounts & comps,,"$0.00"\n\n` +
            `Taxes,${onlinePayments.length} transactions,"$${totalTax.toFixed(2)}"\n` +
            `Tips,${completedOrders.filter(o => o.tip > 0).length} transactions,"$${totalTips.toFixed(2)}"\n\n` +
            `Total sales,${completedOrders.length} transactions,"$${totalCollected.toFixed(2)}"\n\n` +
            `Total payments collected,${completedOrders.length} transactions,"$${totalCollected.toFixed(2)}"\n` +
            `  Card,"$${onlineRevenue.toFixed(2)}"\n` +
            `  Cash/Counter,"$${counterRevenue.toFixed(2)}"\n\n` +
            `FEES\n` +
            `Total fees,,"($${totalFees.toFixed(2)})"\n\n` +
            `NET TOTAL,,"$${netTotal.toFixed(2)}"\n\n` +
            `=================================================\n` +
            `TAX INFORMATION (North Carolina)\n` +
            `Tax Rate: 8.25%\n` +
            `Taxable Sales: "$${taxableRevenue.toFixed(2)}"\n` +
            `Tax Collected: "$${totalTax.toFixed(2)}"\n\n` +
            `PAYMENT METHODS\n` +
            `Online Payments: ${onlinePayments.length} orders\n` +
            `Counter Payments: ${completedOrders.length - onlinePayments.length} orders\n\n` +
            `Completed Orders: ${completedOrders.length}`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Monthly-Tax-Report-${monthName}-${reportYear}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Generate Monthly Tax Report as PDF
    const generateMonthlyTaxReportPDF = () => {
        const monthStart = new Date(reportYear, reportMonth, 1);
        const monthEnd = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);
        
        const monthOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= monthStart && orderDate <= monthEnd;
        });

        // Tax report only covers completed (paid/served) orders — cancelled orders excluded
        const completedOrders = monthOrders.filter(o => o.status === 'Completed');

        // Gross sales = completed order subtotals (pre-tax/fee/tip)
        const grossSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
        // Tax and tips from stored fields
        const totalTax = completedOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
        const totalTips = completedOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
        // Total collected = actual money received (stripeTotal for online, subtotal+tip for counter)
        const totalCollected = completedOrders.reduce((sum, o) => sum + orderRevenue(o), 0);
        // Fees from stored convenienceFee (Stripe 2.9%+$0.30; cash = $0)
        const totalFees = completedOrders.reduce((sum, o) => sum + (o.convenienceFee || 0), 0);
        const netTotal = totalCollected - totalFees;
        // Taxable revenue = subtotals of completed Stripe orders (only orders that had tax applied)
        const onlinePayments = completedOrders.filter(o => o.paid && o.paymentId);
        const taxableRevenue = onlinePayments.reduce((sum, o) => sum + o.total, 0);
        // Payment method breakdown
        const onlineRevenue = onlinePayments.reduce((sum, o) => sum + orderRevenue(o), 0);
        const counterRevenue = totalCollected - onlineRevenue;

        const monthName = new Date(reportYear, reportMonth).toLocaleString('en-US', { month: 'long' });
        const dateRange = `${monthName} 1-${monthEnd.getDate()}, ${reportYear}`;

        // Create PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Header - Date Range
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(dateRange, 20, yPos);
        yPos += 10;

        // Title - Sales summary
        doc.setFontSize(24);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text('Sales summary', 20, yPos);
        yPos += 15;

        // Total Sales - Large prominent
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        doc.text('Total sales', 20, yPos);
        yPos += 12;
        doc.setFontSize(32);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(`$${grossSales.toFixed(2)}`, 20, yPos);
        yPos += 20;

        // Summary Section
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text('Summary', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        doc.text('All day (12:00 AM-11:59 PM ET)', 20, yPos);
        yPos += 8;

        // Helper function to add line items
        const addLineItem = (label, transactions, amount, indent = 0) => {
            doc.setTextColor(0);
            doc.text(label, 20 + indent, yPos);
            if (transactions) {
                doc.setTextColor(100);
                doc.text(transactions, 90, yPos);
            }
            doc.setTextColor(0);
            doc.text(amount, pageWidth - 35, yPos, { align: 'right' });
            yPos += 7;
        };

        // Gross sales (completed orders only — cancelled excluded from tax report)
        doc.setFont(undefined, 'bold');
        addLineItem('Gross sales', `${completedOrders.length} transactions`, `$${grossSales.toFixed(2)}`);
        doc.setFont(undefined, 'normal');
        addLineItem('  Items', `${completedOrders.length} transactions`, `$${grossSales.toFixed(2)}`, 5);
        addLineItem('  Service charges', '', '$0.00', 5);
        addLineItem('Discounts & comps', '', '$0.00');
        yPos += 3;

        // Taxes — only online (Stripe) orders have tax applied
        doc.setFont(undefined, 'bold');
        addLineItem('Taxes', `${onlinePayments.length} transactions`, `$${totalTax.toFixed(2)}`);
        
        // Tips
        const tipsCount = completedOrders.filter(o => o.tip > 0).length;
        addLineItem('Tips', `${tipsCount} transactions`, `$${totalTips.toFixed(2)}`);
        yPos += 3;

        // Total sales = gross + tax + tips
        doc.setFont(undefined, 'bold');
        addLineItem('Total sales', `${completedOrders.length} transactions`, `$${totalCollected.toFixed(2)}`);
        yPos += 5;

        // Total payments collected
        doc.setFont(undefined, 'bold');
        addLineItem('Total payments collected', `${completedOrders.length} transactions`, `$${totalCollected.toFixed(2)}`);
        doc.setFont(undefined, 'normal');
        addLineItem('  Card', '', `$${onlineRevenue.toFixed(2)}`, 5);
        addLineItem('  Counter/Cash', '', `$${counterRevenue.toFixed(2)}`, 5);
        yPos += 5;

        // Fees
        doc.setFont(undefined, 'bold');
        doc.text('Fees', 20, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        addLineItem('  Total fees', '', `($${totalFees.toFixed(2)})`, 5);
        yPos += 3;

        // Net total (bold and larger)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        addLineItem('Net total', '', `$${netTotal.toFixed(2)}`);

        // Add footer with tax info
        yPos += 10;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text('Tax Information: NC Sales Tax 8.25%', 20, yPos);
        yPos += 5;
        doc.text(`Taxable Sales: $${taxableRevenue.toFixed(2)} | Tax Collected: $${totalTax.toFixed(2)}`, 20, yPos);

        // Add page footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Generated by Chaat Mahal Analytics', 20, doc.internal.pageSize.getHeight() - 10);
        doc.text(new Date().toLocaleString(), pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

        // Save PDF
        doc.save(`Monthly-Tax-Report-${monthName}-${reportYear}.pdf`);
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
        <div className="analytics-container">
            <h2 className="analytics-title">📊 Analytics Dashboard</h2>
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
                            📅 Custom
                        </button>
                    </div>
                    <div className="header-controls">
                        <button 
                            className={`control-btn ${compareMode ? 'active' : ''}`}
                            onClick={() => setCompareMode(!compareMode)}
                            title="Compare with previous period"
                        >
                            {compareMode ? '📊 Comparing' : '📊 Compare'}
                        </button>
                        <button 
                            className="control-btn export"
                            onClick={() => exportToCSV(filteredOrders)}
                            title="Export data to CSV"
                        >
                            📥 Export CSV
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
                    <div className="metric-icon">💰</div>
                    <div className="metric-content">
                        <h3>Total Revenue</h3>
                        <p className="metric-value">${metrics.totalRevenue.toFixed(2)}</p>
                        <span className="metric-sublabel">{metrics.totalOrders} orders</span>
                    </div>
                </div>

                <div className="metric-card orders">
                    <div className="metric-icon">📦</div>
                    <div className="metric-content">
                        <h3>Total Orders</h3>
                        <p className="metric-value">{metrics.totalOrders}</p>
                        <span className="metric-sublabel">{metrics.completedOrders} completed</span>
                    </div>
                </div>

                <div className="metric-card average">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                        <h3>Avg Order Value</h3>
                        <p className="metric-value">${metrics.avgOrderValue.toFixed(2)}</p>
                        <span className="metric-sublabel">per order</span>
                    </div>
                </div>

                <div className="metric-card tips">
                    <div className="metric-icon">🎁</div>
                    <div className="metric-content">
                        <h3>Total Tips</h3>
                        <p className="metric-value">${metrics.totalTips.toFixed(2)}</p>
                        <span className="metric-sublabel">from customers</span>
                    </div>
                </div>

                <div className="metric-card wait-time">
                    <div className="metric-icon">⏱️</div>
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

            {/* Payment Breakdown */}
            <div className="analytics-section">
                <h3>💳 Payment Method Breakdown</h3>
                <div className="analytics-payment-breakdown-container">
                    <div className="analytics-payment-breakdown">
                        <div className="analytics-payment-item online">
                            <div className="analytics-payment-header">
                                <span className="analytics-payment-icon">💻</span>
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
                                <span className="analytics-payment-icon">🏪</span>
                                <span className="analytics-payment-label">Counter Payments</span>
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
                                        { name: 'Counter', value: paymentBreakdown.counter.count, revenue: paymentBreakdown.counter.revenue }
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

            <div className="analytics-row">
                {/* Top Selling Items */}
                <div className="analytics-section chart-section">
                    <h3>🏆 Top Selling Items</h3>
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
                    <h3>🍽️ Sales by Category</h3>
                    {categoryData.length > 0 ? (
                        <>
                            <div className="category-pie-chart">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={categoryData.map(cat => ({
                                                name: cat.category,
                                                value: cat.revenue,
                                                count: cat.count
                                            }))}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
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
                    <h3>📈 Revenue Trend</h3>
                    <div className="revenue-trend-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={revenueTrend}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `$${value}`}
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
                    <h3>🕐 Peak Hours</h3>
                    <div className="peak-hours-chart">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={hourlyData.map(hourData => ({
                                    hour: hourData.hour === 0 ? '12 AM' : 
                                          hourData.hour === 12 ? '12 PM' : 
                                          hourData.hour < 12 ? `${hourData.hour} AM` : `${hourData.hour - 12} PM`,
                                    orders: hourData.count
                                }))}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="hour" 
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    label={{ value: 'Orders', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip 
                                    formatter={(value) => [value, 'Orders']}
                                    cursor={{ fill: 'rgba(33, 150, 243, 0.1)' }}
                                />
                                <Bar 
                                    dataKey="orders" 
                                    fill="#4CAF50"
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Heatmap Calendar */}
            <div className="analytics-section">
                <div className="heatmap-header">
                    <h3>📅 Order Activity Heatmap</h3>
                    <div className="heatmap-navigation">
                        <button className="nav-btn" onClick={goToPreviousMonth} title="Previous Month">
                            ← Prev
                        </button>
                        <span className="current-month">
                            {heatmapMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button className="nav-btn" onClick={goToNextMonth} title="Next Month">
                            Next →
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
                                                style={{backgroundColor: color}}
                                                title={`${dayData.date} (${dayData.dayOfWeek})\n${dayData.count} orders\n$${dayData.revenue.toFixed(2)} revenue`}
                                            >
                                                <span className="heatmap-day-number">{dayData.day}</span>
                                                {dayData.count > 0 && (
                                                    <div className="heatmap-details">
                                                        <span className="heatmap-count">{dayData.count}</span>
                                                        <span className="heatmap-revenue">${dayData.revenue.toFixed(0)}</span>
                                                    </div>
                                                )}
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
                <h3>📄 Monthly Tax Report</h3>
                <p style={{color: '#666', marginBottom: '20px', fontSize: '14px'}}>
                    Generate comprehensive monthly sales reports for tax filing and accounting purposes. 
                    Includes gross sales, net sales, tax breakdown, tips, fees, and payment method details.
                </p>
                <div style={{display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
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
                                cursor: 'pointer',
                                transition: 'border-color 0.3s ease'
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
                                cursor: 'pointer',
                                transition: 'border-color 0.3s ease'
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
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                            }}
                        >
                            📊 CSV Report
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
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)'
                            }}
                        >
                            📄 PDF Report
                        </button>
                    </div>
                </div>
            </div>

            {filteredOrders.length === 0 && (
                <div className="no-orders-message">
                    <div className="no-orders-icon">📭</div>
                    <h3>No Orders Yet</h3>
                    <p>Analytics will appear once you start receiving orders.</p>
                </div>
            )}
        </div>
    );
};

export default Analytics;
