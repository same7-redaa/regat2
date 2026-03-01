import { Package, TrendingUp, AlertTriangle, Users, DollarSign, Truck, XCircle, RotateCcw, Wallet, Search, CheckCircle2, FileText, BadgeDollarSign, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    // Order Counts
    totalOrders: 0,
    pending: 0,
    shipped: 0,
    delivered: 0,
    canceled: 0, // includes returned

    // Financial Analysis
    totalRevenue: 0,          // Sales from delivered + customer shipping paid
    cogs: 0,                  // Cost of goods sold (purchase price)
    grossProfit: 0,           // totalRevenue - cogs

    // Expenses & Costs
    totalExpensesAndCosts: 0, // actualShippingCosts + returnCosts + generalExpenses
    actualShippingCosts: 0,   // what we paid the courier for successful orders
    returnCosts: 0,           // fees paid for returned/canceled
    generalExpenses: 0,       // from expenses table

    // Net Profit
    netProfit: 0,             // grossProfit - totalExpensesAndCosts

    // Pure Products
    itemsDelivered: 0,
    productsSellingTotal: 0,
    productsProfit: 0,        // productsSellingTotal - cogs
  });

  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    inventoryValue: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [
          { data: productsData },
          { data: ordersData },
          { data: expensesData }
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('orders').select('*'),
          supabase.from('expenses').select('amount') // Catch-all for expenses. Note: table might not exist if user didn't create it
        ]);

        const products = productsData || [];
        const orders = ordersData || [];
        const expenses = expensesData || [];

        // Inventory
        let tProd = 0, invVal = 0;
        products.forEach((p: any) => {
          tProd++;
          invVal += (Number(p.stock) || 0) * (Number(p.purchasePrice) || 0);
        });
        setInventoryStats({ totalProducts: tProd, inventoryValue: invVal });

        // General Expenses 
        const generalExp = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        // Orders processing
        let pending = 0, shipped = 0, delivered = 0, canceled = 0;
        let totalRev = 0, cogsTotal = 0, actualShipCosts = 0, retCosts = 0;
        let itemsDeliveredCount = 0, prodSellTotal = 0;

        orders.forEach((o: any) => {
          const status = o.status;
          if (status === 'قيد المراجعة' || status === 'بالإنتظار') pending++;
          else if (status === 'تم الشحن' || status === 'مؤجل') shipped++;
          else if (status === 'تم التوصيل' || status === 'تسليم جزئي') delivered++;
          else if (status === 'مرتجع' || status === 'ملغي' || status === 'مرفوض') canceled++;

          // calculations ONLY for Delivered
          if (status === 'تم التوصيل' || status === 'تسليم جزئي') {
            const customerShippingPaid = Number(o.shipping?.shippingCost) || 0;
            const companyShippingCost = Number(o.shipping?.actualCost) || 0; // The actual cost WE pay
            const discount = Number(o.discount) || 0;

            // Sum products 
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

            // Revenue = What customer paid (Items after discount + Their shipping cost)
            totalRev += (orderItemsPriceSum - discount) + customerShippingPaid;

            // Actual Shipping Cost
            actualShipCosts += companyShippingCost;
          }

          // calculations ONLY for Returns & Cancels
          if (status === 'مرتجع') {
            retCosts += Number(o.returnFee) || 0;
          } else if (status === 'ملغي' || status === 'مرفوض') {
            retCosts += Number(o.cancellationFee) || 0; // treating cancel fees as return costs conceptually
          }
        });

        const grossProfitVal = totalRev - cogsTotal;
        const totalExpAndCosts = actualShipCosts + retCosts + generalExp;
        const netProfitVal = grossProfitVal - totalExpAndCosts;
        const prodProfitVal = prodSellTotal - cogsTotal;

        setStats({
          totalOrders: orders.length,
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

      } catch (err) {
        console.error("Dashboard error", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Setup Realtime
    const channel = supabase.channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => loadStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">جاري حساب التقارير المالية...</div>;

  return (
    <div className="space-y-6 pb-12 font-cairo">

      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">لوحة التقارير الدقيقة</h1>
          <p className="text-sm text-slate-500 mt-1">نظرة شاملة على الأداء المالي والتشغيلي</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inventory/add" className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 font-bold transition-all shadow-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            منتج جديد
          </Link>
          <Link to="/expenses" className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 font-bold transition-all shadow-sm flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            المصروفات
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. Orders Summary (Right Column equivalent) */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-sky-600" />
            حالة الطلبات
          </h2>

          <div className="bg-white border border-slate-200 shadow-sm p-5 divide-y divide-slate-100">
            <div className="flex justify-between items-center pb-3">
              <span className="text-slate-500 font-medium text-sm">إجمالي الطلبات المسجلة</span>
              <span className="text-xl font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-sm">{stats.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sky-600 font-medium text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> قيد المراجعة والانتظار
              </span>
              <span className="text-lg font-bold text-sky-700">{stats.pending}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-amber-600 font-medium text-sm flex items-center gap-2">
                <Truck className="w-4 h-4" /> قيد الشحن (مع المندوب)
              </span>
              <span className="text-lg font-bold text-amber-700">{stats.shipped}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-emerald-600 font-medium text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> تم التوصيل بنجاح
              </span>
              <span className="text-lg font-bold text-emerald-700">{stats.delivered}</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-rose-600 font-medium text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4" /> مرفوض / لاغي
              </span>
              <span className="text-lg font-bold text-rose-700">{stats.canceled}</span>
            </div>
          </div>

          {/* Inventory Box */}
          <div className="bg-slate-800 p-5 shadow-sm text-white mt-4 border-t-4 border-sky-500 relative overflow-hidden">
            <Package className="w-24 h-24 absolute left-[-20px] bottom-[-20px] text-slate-700 opacity-50 pointer-events-none" />
            <h3 className="text-slate-300 text-sm font-medium mb-1 relative z-10">إجمالي قيمة المخزون</h3>
            <p className="text-3xl font-bold font-tajawal relative z-10">{inventoryStats.inventoryValue.toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span></p>
            <div className="mt-3 text-xs text-sky-200 relative z-10">المنتجات المسجلة: <strong>{inventoryStats.totalProducts}</strong></div>
          </div>
        </div>

        {/* 2. Financial Analysis (Main Columns) */}
        <div className="lg:col-span-9 space-y-6">

          {/* Main Financial Report */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-600" />
              التحليل المالي الدقيق
            </h2>

            <div className="bg-white border border-slate-200 shadow-sm relative">
              <div className="p-6 md:p-8">
                {/* Revenue */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 mb-5">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">إجمالي إيرادات المبيعات</h3>
                    <p className="text-sm text-slate-500 mt-1">من الطلبات المسلمة والجزئية</p>
                  </div>
                  <div className="text-2xl font-black text-slate-800 font-tajawal mt-2 md:mt-0">
                    {stats.totalRevenue.toLocaleString()} <span className="text-base text-slate-500 font-medium">ج.م</span>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 mb-5 border-r-4 border-indigo-500">
                  <div>
                    <h3 className="font-bold text-indigo-900">إجمالي الربح (قبل المصروفات)</h3>
                    <p className="text-sm text-indigo-700/70 mt-1">- تكلفة بضاعة مباعة: {stats.cogs.toLocaleString()} ج.م</p>
                  </div>
                  <div className="text-xl font-bold text-indigo-700 font-tajawal mt-2 md:mt-0">
                    {stats.grossProfit.toLocaleString()} <span className="text-sm">ج.م</span>
                  </div>
                </div>

                {/* Expenses */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-dashed border-slate-200 pb-5 mb-5">
                  <div className="w-full">
                    <h3 className="font-bold text-rose-800 mb-2">إجمالي التكاليف والمصروفات</h3>
                    <div className="space-y-1.5 text-sm text-slate-600 bg-rose-50/50 p-4 rounded-sm border border-rose-100 w-full md:w-2/3">
                      <div className="flex justify-between">
                        <span>- تكلفة الشحن الفعلية (من الطلبات الناجحة):</span>
                        <span className="font-mono font-medium">{stats.actualShippingCosts.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span>- تكلفة المرتجعات والإلغاء:</span>
                        <span className="font-mono font-medium">{stats.returnCosts.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span>- مصروفات إدارية عامة:</span>
                        <span className="font-mono font-medium">{stats.generalExpenses.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-rose-700 font-tajawal mt-4 md:mt-0 self-start md:self-center bg-rose-50 px-4 py-2 border border-rose-100">
                    {stats.totalExpensesAndCosts.toLocaleString()} <span className="text-sm">ج.م</span>
                  </div>
                </div>

                {/* Net Profit */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-emerald-50 border-2 border-emerald-500 p-6 shadow-sm">
                  <div>
                    <h3 className="text-xl font-black text-emerald-900">صافي الربح النهائي المطهر</h3>
                    <p className={`text-sm mt-1 font-bold ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {stats.netProfit >= 0 ? 'أداء إيجابي ومربح ✦' : 'يوجد خسائر بالميزانية !'}
                    </p>
                  </div>
                  <div className="text-4xl font-black text-emerald-700 font-tajawal mt-4 md:mt-0">
                    {stats.netProfit.toLocaleString()} <span className="text-lg">ج.م</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Pure Products Profit */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <BadgeDollarSign className="w-5 h-5 text-sky-600" />
              أرباح المنتجات المباعة (مستقلة عن الشحن والمصروفات)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-white border border-slate-200 shadow-sm divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100">
              <div className="p-6">
                <p className="text-slate-500 mb-1 text-sm font-medium">القطع المسلمة فعلياً</p>
                <p className="text-2xl font-bold text-slate-800 font-tajawal">{stats.itemsDelivered} <span className="text-sm font-normal text-slate-500">قطعة مباعة</span></p>
              </div>

              <div className="p-6">
                <p className="text-slate-500 mb-1 text-sm font-medium">إجمالي البيع (بسعر البيع فقط)</p>
                <p className="text-2xl font-bold text-slate-800 font-tajawal">{stats.productsSellingTotal.toLocaleString()} <span className="text-sm font-normal text-slate-500">ج.م</span></p>
              </div>

              <div className="p-6 bg-sky-50">
                <p className="text-sky-800 mb-1 text-sm font-bold">إجمالي ربح المنتجات</p>
                <p className="text-3xl font-black text-sky-700 font-tajawal drop-shadow-sm">{stats.productsProfit.toLocaleString()} <span className="text-sm font-normal text-sky-800/60">ج.م</span></p>
                <p className="text-[11px] text-sky-600 mt-2">(سعر البيع - سعر الشراء)</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
