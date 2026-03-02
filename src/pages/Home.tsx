import { Package, TrendingUp, AlertTriangle, DollarSign, Truck, XCircle, RotateCcw, Wallet, Search, CheckCircle2, FileText, BadgeDollarSign, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function Home() {
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [rawData, setRawData] = useState<{
    products: any[];
    orders: any[];
    expenses: any[];
  }>({ products: [], orders: [], expenses: [] });

  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    shipped: 0,
    delivered: 0,
    canceled: 0,

    totalRevenue: 0,
    cogs: 0,
    grossProfit: 0,

    totalExpensesAndCosts: 0,
    actualShippingCosts: 0,
    returnCosts: 0,
    generalExpenses: 0,

    netProfit: 0,

    itemsDelivered: 0,
    productsSellingTotal: 0,
    productsProfit: 0,
  });

  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    inventoryValue: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: productsData },
          { data: ordersData },
          { data: expensesData }
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('orders').select('*'),
          supabase.from('expenses').select('*')
        ]);

        setRawData({
          products: productsData || [],
          orders: ordersData || [],
          expenses: expensesData || []
        });
      } catch (err) {
        console.error("Dashboard data fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase.channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (loading && rawData.orders.length === 0 && rawData.products.length === 0) return;

    const { products, orders, expenses } = rawData;

    let start: Date | null = null;
    let end: Date | null = null;
    const now = new Date();

    if (dateFilter === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (dateFilter === 'week') {
      start = startOfWeek(now, { weekStartsOn: 6 });
      end = endOfWeek(now, { weekStartsOn: 6 });
    } else if (dateFilter === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      start = startOfDay(new Date(customStartDate));
      end = endOfDay(new Date(customEndDate));
    }

    const isDateInRange = (dateStr: string) => {
      if (!start || !end || dateFilter === 'all') return true;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      return d >= start && d <= end;
    };

    const filteredOrders = orders.filter(o => isDateInRange(o.date || o.orderDate || o.createdAt || o.created_at));
    const filteredExpenses = expenses.filter(e => isDateInRange(e.date || e.created_at));

    let tProd = 0, invVal = 0;
    products.forEach((p: any) => {
      tProd++;
      invVal += (Number(p.stock) || 0) * (Number(p.purchasePrice) || 0);
    });
    setInventoryStats({ totalProducts: tProd, inventoryValue: invVal });

    const generalExp = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    let pending = 0, shipped = 0, delivered = 0, canceled = 0;
    let totalRev = 0, cogsTotal = 0, actualShipCosts = 0, retCosts = 0;
    let itemsDeliveredCount = 0, prodSellTotal = 0;

    filteredOrders.forEach((o: any) => {
      const status = o.status;
      if (status === 'قيد المراجعة' || status === 'بالإنتظار') pending++;
      else if (status === 'تم الشحن' || status === 'مؤجل') shipped++;
      else if (status === 'تم التوصيل' || status === 'تسليم جزئي') delivered++;
      else if (status === 'مرتجع' || status === 'ملغي' || status === 'مرفوض') canceled++;

      if (status === 'تم التوصيل' || status === 'تسليم جزئي') {
        const customerShippingPaid = Number(o.shipping?.shippingCost) || 0;
        const companyShippingCost = Number(o.shipping?.actualCost) || 0;
        const discount = Number(o.discount) || 0;

        let orderItemsPriceSum = 0;
        let orderItemsCogsSum = 0;
        let orderItemsCount = 0;

        o.products?.forEach((op: any) => {
          const qty = Number(op.quantity) || 0;
          const sellPrice = Number(op.price) || 0;
          const prodDef = products.find((p: any) => p.id === op.productId);
          const purchasePrice = prodDef ? (Number(prodDef.purchasePrice) || 0) : 0;

          orderItemsCount += qty;
          orderItemsPriceSum += (sellPrice * qty);
          orderItemsCogsSum += (purchasePrice * qty);
        });

        itemsDeliveredCount += orderItemsCount;
        prodSellTotal += (orderItemsPriceSum - discount);
        cogsTotal += orderItemsCogsSum;

        totalRev += (orderItemsPriceSum - discount) + customerShippingPaid;
        actualShipCosts += companyShippingCost;
      }

      if (status === 'مرتجع') {
        retCosts += Number(o.returnFee) || 0;
      } else if (status === 'ملغي' || status === 'مرفوض') {
        retCosts += Number(o.cancellationFee) || 0;
      }
    });

    const grossProfitVal = totalRev - cogsTotal;
    const totalExpAndCosts = actualShipCosts + retCosts + generalExp;
    const netProfitVal = grossProfitVal - totalExpAndCosts;
    const prodProfitVal = prodSellTotal - cogsTotal;

    setStats({
      totalOrders: filteredOrders.length,
      pending,
      shipped,
      delivered,
      canceled,

      totalRevenue: totalRev,
      cogs: cogsTotal,
      grossProfit: grossProfitVal,

      actualShippingCosts: actualShipCosts,
      returnCosts: retCosts,
      generalExpenses: generalExp,
      totalExpensesAndCosts: totalExpAndCosts,

      netProfit: netProfitVal,

      itemsDelivered: itemsDeliveredCount,
      productsSellingTotal: prodSellTotal,
      productsProfit: prodProfitVal
    });

  }, [rawData, dateFilter, customStartDate, customEndDate, loading]);

  if (loading && rawData.orders.length === 0) return <div className="p-8 text-center text-slate-500 animate-pulse">جاري حساب التقارير المالية...</div>;

  return (
    <div className="space-y-8 pb-12 font-cairo bg-[#f8fafc] min-h-screen p-4 -mx-4 sm:p-8 sm:-mx-8">

      {/* Page Header & Filters */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between pb-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">التقارير المالية والتشغيلية</h1>
          <p className="text-sm text-slate-500 mt-1">نظرة شاملة ومفصلة مع تصفية احترافية</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-none shadow-sm flex-wrap text-sm">
            <div className="flex items-center gap-2 px-2 text-slate-600 border-l border-slate-200">
              <Calendar className="w-4 h-4" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer py-1"
              >
                <option value="all">كل الأوقات</option>
                <option value="today">اليوم</option>
                <option value="week">هذا الأسبوع</option>
                <option value="month">هذا الشهر</option>
                <option value="custom">تاريخ مخصص</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 px-2" dir="ltr">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="outline-none text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1"
                />
                <span className="text-slate-400">إلى</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="outline-none text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1"
                />
              </div>
            )}
          </div>

          <Link to="/inventory/add" className="bg-white border text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-none font-bold transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-2 text-sm">
            <Package className="w-4 h-4" />
            منتج جديد
          </Link>
          <Link to="/expenses" className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-none font-bold transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-2 text-sm">
            <Wallet className="w-4 h-4" />
            المصروفات
          </Link>
        </div>
      </div>

      {/* 1. Orders Summary Cards (Top Row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

        <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border-t-[3px] border-red-500 flex flex-col items-center justify-center min-h-[130px]">
          <p className="text-slate-500 text-xs font-medium mb-3">مرفوض / لاغي</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-slate-800">{stats.canceled}</p>
            <div className="bg-red-50 p-1.5 rounded-none text-red-400"><XCircle className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border-t-[3px] border-green-500 flex flex-col items-center justify-center min-h-[130px]">
          <p className="text-slate-500 text-xs font-medium mb-3">تم التوصيل بنجاح</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-slate-800">{stats.delivered}</p>
            <div className="bg-green-50 p-1.5 rounded-none text-green-500"><CheckCircle2 className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border-t-[3px] border-blue-500 flex flex-col items-center justify-center min-h-[130px]">
          <p className="text-slate-500 text-xs font-medium mb-3">قيد الشحن (مع المندوب)</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-slate-800">{stats.shipped}</p>
            <div className="bg-blue-50 p-1.5 rounded-none text-blue-500"><Truck className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border-t-[3px] border-amber-400 flex flex-col items-center justify-center min-h-[130px]">
          <p className="text-slate-500 text-xs font-medium mb-3">قيد المراجعة والانتظار</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-slate-800">{stats.pending}</p>
            <div className="bg-amber-50 p-1.5 rounded-none text-amber-500"><RotateCcw className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border-t-[3px] border-slate-800 flex flex-col items-center justify-center min-h-[130px]">
          <p className="text-slate-500 text-xs font-medium mb-3">إجمالي الطلبات المسجلة</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-slate-800">{stats.totalOrders}</p>
            <div className="bg-slate-100 p-1.5 rounded-none text-slate-700"><FileText className="w-5 h-5" /></div>
          </div>
        </div>

      </div>

      {/* 2. Financial Analysis (Main Columns) */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">التحليل المالي الدقيق</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Net Profit */}
          <div className="bg-green-50/40 rounded-none p-8 flex border border-green-100/50 flex-col items-center justify-center min-h-[180px]">
            <h3 className="text-slate-600 text-xs font-bold mb-3">صافي الربح النهائي المطهر</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl font-black text-green-700 font-tajawal">{stats.netProfit.toLocaleString()} <span className="text-base font-medium">ج.م</span></div>
              <div className="bg-green-100/80 p-1.5 rounded-none text-green-600 hidden"><DollarSign className="w-5 h-5" /></div>
            </div>
            <p className={`text-xs font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {stats.netProfit >= 0 ? 'أداء إيجابي ومربح' : 'يوجد خسائر !'}
            </p>
          </div>

          {/* Total Costs & Expenses */}
          <div className="bg-purple-50/40 rounded-none p-6 flex border border-purple-100/50 flex-col items-center justify-center min-h-[180px]">
            <h3 className="text-slate-600 text-xs font-bold mb-2">إجمالي التكاليف والمصروفات</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl font-bold text-purple-600 font-tajawal">{stats.totalExpensesAndCosts.toLocaleString()} <span className="text-base font-medium">ج.م</span></div>
            </div>
            <div className="space-y-1 text-[11px] text-slate-500 w-full px-4 text-center opacity-80">
              <p>- تكلفة شحن (ناجح): <strong>{stats.actualShippingCosts.toLocaleString()} ج.م</strong></p>
              <p>- تكلفة مرتجعات: <strong>{stats.returnCosts.toLocaleString()} ج.م</strong></p>
              <p>- مصروفات عامة: <strong>{stats.generalExpenses.toLocaleString()} ج.م</strong></p>
            </div>
          </div>

          {/* Gross Profit & Revenue */}
          <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col min-h-[180px]">

            {/* Bottom section: Gross Profit */}
            <div className="p-4 flex-1 bg-emerald-50/40 flex flex-col justify-center items-center rounded-none">
              <h3 className="text-slate-600 text-xs font-bold mb-1">إجمالي الربح (قبل المصروفات)</h3>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-2xl font-bold text-emerald-600 font-tajawal">{stats.grossProfit.toLocaleString()} <span className="text-sm font-medium">ج.م</span></div>
              </div>
              <p className="text-[10px] text-slate-500 opacity-80">- بضاعة مباعة: {stats.cogs.toLocaleString()} ج.م</p>
            </div>

            {/* Top section: Revenue */}
            <div className="p-4 flex-1 flex flex-col justify-center items-center border-t border-slate-100 relative rounded-none">
              <h3 className="text-slate-600 text-xs font-bold mb-1">إجمالي إيرادات المبيعات</h3>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-2xl font-bold text-blue-600 font-tajawal">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-medium">ج.م</span></div>
              </div>
              <p className="text-[10px] text-slate-400">من الطلبات المسلمة والجزئية</p>
            </div>

          </div>

        </div>
      </div>

      {/* Pure Products Profit */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">ربح المنتجات المباعة (مستقل عن الشحن والمصروفات)</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 border-t-[3px] border-slate-300 text-center min-h-[120px] flex flex-col justify-center items-center">
            <p className="text-slate-500 text-xs font-bold mb-2">القطع المسلمة فعلياً</p>
            <p className="text-3xl font-black text-slate-800">{stats.itemsDelivered}</p>
          </div>

          <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 border-t-[3px] border-slate-300 text-center min-h-[120px] flex flex-col justify-center items-center">
            <p className="text-slate-500 text-xs font-bold mb-2">إجمالي البيع (بسعر البيع فقط)</p>
            <p className="text-3xl font-black text-slate-800 font-tajawal">{stats.productsSellingTotal.toLocaleString()} <span className="text-base font-medium">ج.م</span></p>
          </div>

          <div className="bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 border-t-[3px] border-green-600 text-center min-h-[120px] flex flex-col justify-center items-center">
            <p className="text-slate-500 text-xs font-bold mb-2">إجمالي ربح المنتجات</p>
            <p className="text-4xl font-black text-green-600 font-tajawal">{stats.productsProfit.toLocaleString()} <span className="text-base font-medium">ج.م</span></p>
            <p className="text-[10px] text-slate-400 mt-1">(سعر البيع - سعر الشراء)</p>
          </div>

        </div>
      </div>

    </div>
  );
}
