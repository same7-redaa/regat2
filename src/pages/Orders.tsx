import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, FileText, Check, ChevronRight, ChevronLeft, X, Trash2, Printer, Upload, Download, AlertTriangle, Link2Off, Plus, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { OrderRowSkeleton, Spinner } from '../components/Skeleton';
import { ToastContainer, useToast } from '../components/Toast';

export default function Orders() {
    const { toasts, addToast, removeToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [shippingCompanies, setShippingCompanies] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingStatus, setSavingStatus] = useState<string | null>(null); // orderId being updated

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
    const [cancelFee, setCancelFee] = useState(0);

    const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
    const [returnTargetStatus, setReturnTargetStatus] = useState<string>('مرتجع');
    const [returnFee, setReturnFee] = useState(0);
    const [returnQuantities, setReturnQuantities] = useState<{ [key: string]: number }>({});

    const [confirmRestoreOrderId, setConfirmRestoreOrderId] = useState<string | null>(null);
    const [confirmRestoreTargetStatus, setConfirmRestoreTargetStatus] = useState<string>('');

    const [quickViewOrder, setQuickViewOrder] = useState<any | null>(null);

    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    useEffect(() => {
        const fetchOrders = async () => {
            const { data } = await supabase.from('orders').select('*').order('createdAt', { ascending: false });
            if (data) setOrders(data);
            setLoading(false);
        };

        fetchOrders();
        supabase.from('products').select('*').then(({ data }) => { if (data) setProducts(data); });
        supabase.from('shipping_companies').select('*').then(({ data }) => { if (data) setShippingCompanies(data); });

        const channel = supabase.channel('orders-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
                supabase.from('products').select('*').then(({ data }) => { if (data) setProducts(data); });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const { data: prodData } = await supabase.from('products').select('*');
        let products = prodData || [];
        const { data: compData } = await supabase.from('shipping_companies').select('*');
        let companies = compData || [];

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                const newOrdersToInsert: any[] = [];
                const stockUpdates: { id: string, stock: number }[] = [];
                const localProducts = [...products];

                const normalizeAr = (s: string) => {
                    if (!s) return '';
                    let cleanStr = s.replace(/[\u064B-\u065F]/g, '');
                    cleanStr = cleanStr.replace(/[\t\n\r]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                    cleanStr = cleanStr.replace(/[أإآٱ]/g, 'ا');
                    cleanStr = cleanStr.replace(/ة/g, 'ه');
                    cleanStr = cleanStr.replace(/[ىي]/g, 'ي');
                    cleanStr = cleanStr.replace(/ؤ/g, 'و');
                    cleanStr = cleanStr.replace(/ئ/g, 'ي');
                    return cleanStr;
                };

                data.forEach((row: any) => {
                    const customerName = row['اسم العميل'];
                    if (!customerName) return;

                    const phone = row['الهاتف']?.toString() || '';
                    const altPhone = row['رقم إضافي']?.toString() || '';
                    const locationName = row['المحافظة']?.toString().trim();
                    const address = row['العنوان'] || '';
                    const companyName = row['شركة الشحن']?.toString().trim();
                    const notes = row['ملاحظات'] || '';
                    const alertDuration = parseInt(row['مدة التنبيه (يوم)'] || row['مدة التنبيه']) || 0;

                    let shippingCost = 0, actualCost = 0, companyId = '', locationId = '';
                    let matchedCompanyName = companyName || 'غير محدد';
                    let matchedLocationName = locationName || 'غير محدد';
                    let hasUnlinkedItems = false;
                    const unlinkedDetails: string[] = [];

                    if (companyName) {
                        const normCompName = normalizeAr(companyName);
                        const mc = companies.find((c: any) => normalizeAr(c.name).includes(normCompName) || normCompName.includes(normalizeAr(c.name)));
                        if (mc) {
                            companyId = mc.id; matchedCompanyName = mc.name;
                            if (locationName) {
                                const normLocName = normalizeAr(locationName);
                                const ml = mc.locations?.find((l: any) => normalizeAr(l.name).includes(normLocName) || normLocName.includes(normalizeAr(l.name)) || normalizeAr(l.name) === normLocName);
                                if (ml) { locationId = ml.id; matchedLocationName = ml.name; shippingCost = Number(ml.customerCost) || 0; actualCost = Number(ml.actualCost) || 0; }
                                else { hasUnlinkedItems = true; unlinkedDetails.push(`المحافظة '​${locationName}' غير مسجلة لشركة ${matchedCompanyName}`); }
                            }
                        } else { hasUnlinkedItems = true; unlinkedDetails.push(`شركة الشحن '​${companyName}' غير مسجلة`); }
                    }

                    const orderProducts: any[] = [];
                    let subtotal = 0;
                    const tempStockChanges: { idx: number, qty: number }[] = [];

                    for (let i = 1; i <= 50; i++) {
                        const prodName = (row[`منتج ${i}`] || row[`منتج${i}`])?.toString().trim();
                        const qty = parseInt(row[`كمية ${i}`] || row[`كمية${i}`]) || 0;
                        if (!prodName || qty <= 0) continue;

                        const mpIdx = localProducts.findIndex((p: any) => normalizeAr(p.productName) === normalizeAr(prodName));
                        if (mpIdx > -1) {
                            const pData = localProducts[mpIdx];
                            orderProducts.push({ productId: pData.id, name: pData.productName, price: Number(pData.sellingPrice), quantity: qty });
                            subtotal += Number(pData.sellingPrice) * qty;
                            tempStockChanges.push({ idx: mpIdx, qty });
                        } else {
                            hasUnlinkedItems = true;
                            unlinkedDetails.push(`المنتج '​${prodName}' غير مسجل بالمخزون`);
                            orderProducts.push({ productId: `import-${Date.now()}-${i}`, name: prodName, price: 0, quantity: qty });
                        }
                    }

                    if (!hasUnlinkedItems) {
                        tempStockChanges.forEach(change => {
                            const pData = localProducts[change.idx];
                            pData.stock = Math.max(0, (Number(pData.stock) || 0) - change.qty);
                            stockUpdates.push({ id: pData.id, stock: pData.stock });
                        });
                    }

                    newOrdersToInsert.push({
                        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
                        customerName, primaryPhone: phone, secondaryPhone: altPhone,
                        orderDate: new Date().toISOString().split('T')[0],
                        orderTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
                        products: orderProducts,
                        shipping: { companyId, companyName: matchedCompanyName, locationId, locationName: matchedLocationName, detailedAddress: address, shippingCost, actualCost },
                        discount: 0, subtotal, total: subtotal + shippingCost,
                        status: hasUnlinkedItems ? 'قيد المراجعة' : 'تم التوصيل', alertDurationDays: alertDuration,
                        hasUnlinkedItems, unlinkedDetails, notes,
                        createdAt: new Date().toISOString()
                    });
                });

                if (newOrdersToInsert.length > 0) {
                    await supabase.from('orders').insert(newOrdersToInsert);
                }
                // Update stock for each modified product
                for (const su of stockUpdates) {
                    await supabase.from('products').update({ stock: su.stock }).eq('id', su.id);
                }

                setOrders(prev => [...newOrdersToInsert, ...prev]);
                addToast(`تم استيراد ${newOrdersToInsert.length} طلب بنجاح!`);
            } catch (err) {
                console.error(err);
                addToast('حدث خطأ أثناء قراءة الملف.', 'error');
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'اسم العميل': 'محمد أحمد',
                'الهاتف': '01001234567',
                'رقم إضافي': '01009876543',
                'المحافظة': 'القاهرة',
                'العنوان': 'شارع التحرير، أمام مسجد النور، الدور الثاني',
                'شركة الشحن': 'بوسطة',
                'مدة التنبيه (يوم)': 5,
                'ملاحظات': 'يفضل التغليف الجيد',
                'منتج 1': 'ساعة فضي',
                'كمية 1': 1,
                'منتج 2': 'ساعة ذهبي',
                'كمية 2': 2,
                'منتج 3': '',
                'كمية 3': ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wscols = [
            { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 },
            { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
            { wch: 10 }, { wch: 20 }, { wch: 10 }
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
        XLSX.writeFile(wb, "قالب_استيراد_الطلبات.xlsx");
    };

    const updateOrderStatus = async (orderId: string, newStatus: string, extraData?: any) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;

        const oldStatus = order.status;

        const stockChanges: { id: string, stock: number }[] = [];
        const { data: productsData } = await supabase.from('products').select('*');
        const localProducts = [...(productsData || [])];

        // 1. Calculate how many items this order CURRENTLY holds from the warehouse 
        // (Only Shipped, Delivered, or Partially Delivered statuses actually hold stock)
        const activeStatuses = ['تم الشحن', 'تم التوصيل', 'تسليم جزئي', 'مرتجع جزئي'];

        const getOrderHeldStock = (statusToCheck: string, orderProducts: any[]) => {
            if (!activeStatuses.includes(statusToCheck)) return {};
            const held: { [id: string]: number } = {};
            orderProducts?.forEach((p: any) => {
                held[p.productId] = Math.max(0, p.quantity - (p.returnedQuantity || 0));
            });
            return held;
        };

        const oldHeldStock = getOrderHeldStock(oldStatus, order.products || []);

        // 2. Build the NEW updatedOrder object to determine future state
        const updatedOrder: any = { ...order, status: newStatus };
        if (newStatus !== 'ملغي') { updatedOrder.cancellationFee = 0; }
        if (newStatus !== 'مرتجع') { updatedOrder.returnFee = 0; }

        if (newStatus === 'ملغي' && extraData) {
            updatedOrder.cancellationFee = extraData.fee;
            updatedOrder.cancellationDate = new Date().toISOString();
        }

        if ((newStatus === 'مرتجع' || newStatus === 'تسليم جزئي' || newStatus === 'مرتجع جزئي') && extraData) {
            updatedOrder.returnFee = extraData.fee;
            updatedOrder.returnDate = new Date().toISOString();
            updatedOrder.products = order.products?.map((p: any) => ({
                ...p,
                returnedQuantity: extraData.quantities[p.productId] || 0
            }));
        }

        // If recovering from a return back to an active state, clear out return data
        if (['قيد المراجعة', 'تم الشحن', 'تم التوصيل'].includes(newStatus)) {
            updatedOrder.returnFee = 0;
            updatedOrder.returnDate = null;
            updatedOrder.products = order.products?.map((p: any) => ({
                ...p,
                returnedQuantity: 0
            }));
        }

        // 3. Calculate how many items the order SHOULD hold after this update
        const newHeldStock = getOrderHeldStock(newStatus, updatedOrder.products || []);

        // 4. Calculate the net difference and explicitly update localProducts
        const allProductIds = new Set([...Object.keys(oldHeldStock), ...Object.keys(newHeldStock)]);
        allProductIds.forEach(productId => {
            const oldQty = oldHeldStock[productId] || 0;
            const newQty = newHeldStock[productId] || 0;
            const quantityToReturnToWarehouse = oldQty - newQty; // Positive means we return to warehouse, negative means we take *more* from warehouse

            if (quantityToReturnToWarehouse !== 0) {
                const idx = localProducts.findIndex(p => p.id === productId);
                if (idx > -1) {
                    const currentDBStock = Number(localProducts[idx].stock) || 0;
                    localProducts[idx].stock = currentDBStock + quantityToReturnToWarehouse;
                    stockChanges.push({ id: productId, stock: localProducts[idx].stock });
                }
            }
        });

        // Optimistic UI update
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));

        // Persist to Supabase
        await supabase.from('orders').update(updatedOrder).eq('id', orderId);
        for (const s of stockChanges) {
            await supabase.from('products').update({ stock: s.stock }).eq('id', s.id);
        }
    };

    const statusCycleArray = ['قيد المراجعة', 'تم الشحن', 'تم التوصيل', 'تسليم جزئي', 'مرتجع', 'ملغي'];

    const handleStatusChange = (order: any, nextStatus: string) => {
        if (order.status === nextStatus) return;

        if (nextStatus === 'ملغي') {
            setCancelOrderId(order.id);
            setCancelFee(0);
        } else if (nextStatus === 'مرتجع') {
            const fullQty: any = {};
            order.products?.forEach((p: any) => {
                const alreadyReturned = p.returnedQuantity || 0;
                fullQty[p.productId] = Math.max(0, p.quantity - alreadyReturned);
            });
            // Full return means everything comes back, so update immediately
            // Fee can be set later or we can prompt a smaller modal just for fee, 
            // but for smooth UX, we auto-return everything with 0 fee.
            // If they want to add a return fee, they can edit the order.
            updateOrderStatus(order.id, nextStatus, { fee: 0, quantities: fullQty });
        } else if (nextStatus === 'تسليم جزئي' || nextStatus === 'مرتجع جزئي') {
            setReturnOrderId(order.id);
            setReturnFee(0);
            const initialQty: any = {};
            order.products?.forEach((p: any) => {
                initialQty[p.productId] = 0; // Default to 0, let user explicitly select what is returned
            });
            setReturnTargetStatus(nextStatus);
            setReturnQuantities(initialQty);
        } else if ((order.status === 'ملغي' || order.status === 'مرتجع' || order.status === 'تسليم جزئي') && ['قيد المراجعة', 'تم الشحن', 'تم التوصيل'].includes(nextStatus)) {
            setConfirmRestoreOrderId(order.id);
            setConfirmRestoreTargetStatus(nextStatus);
        } else {
            updateOrderStatus(order.id, nextStatus);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'مكتمل':
            case 'تم التوصيل': return 'bg-emerald-100 text-emerald-700';
            case 'تم الشحن': return 'bg-sky-100 text-sky-700';
            case 'قيد المراجعة':
            case 'جاري المعالجة': return 'bg-amber-100 text-amber-700';
            case 'ملغي':
            case 'لاغي':
            case 'مرفوض': return 'bg-rose-100 text-rose-700';
            case 'مرتجع': return 'bg-purple-100 text-purple-700';
            case 'تسليم جزئي':
            case 'مرتجع جزئي': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const isOrderDelayed = (order: any) => {
        if (order.status !== 'تم الشحن' || !order.alertDurationDays || order.alertDurationDays <= 0) return false;
        const dateStr = order.date || order.orderDate || order.createdAt;
        if (!dateStr) return false;

        const date = new Date(dateStr);
        const today = new Date();
        const diffTime = today.getTime() - date.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > order.alertDurationDays;
    };

    const getOrderStockIssues = (order: any) => {
        if (!['قيد المراجعة', 'بالإنتظار'].includes(order.status) || !order.products) return [];
        const issues: string[] = [];
        order.products.forEach((op: any) => {
            const dbProduct = products.find(p => p.id === op.productId);
            if (dbProduct && Number(op.quantity) > Number(dbProduct.stock)) {
                issues.push(`«${op.productName || op.name}»: مطلوب ${op.quantity} والمتاح ${dbProduct.stock || 0}`);
            }
        });
        return issues;
    };

    const getRowColor = (order: any) => {
        if (order.hasUnlinkedItems) {
            return 'bg-amber-50 hover:bg-amber-100 border-b-2 border-amber-300';
        }
        if (isOrderDelayed(order)) {
            return 'bg-rose-50 hover:bg-rose-100 border-b-2 border-rose-400 font-bold';
        }

        const stockIssues = getOrderStockIssues(order);
        if (stockIssues.length > 0) {
            return 'bg-red-50 hover:bg-red-100 border-r-[3px] border-r-red-500';
        }

        switch (order.status) {
            case 'مكتمل':
            case 'تم التوصيل': return 'bg-emerald-50/40 hover:bg-emerald-50/80';
            case 'تم الشحن': return 'bg-sky-50/40 hover:bg-sky-50/80';
            case 'قيد المراجعة':
            case 'جاري المعالجة': return 'bg-amber-50/40 hover:bg-amber-50/80';
            case 'ملغي':
            case 'لاغي':
            case 'مرفوض': return 'bg-rose-50/40 hover:bg-rose-50/80';
            case 'مرتجع': return 'bg-purple-50/40 hover:bg-purple-50/80';
            default: return 'hover:bg-slate-50';
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customer && order.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

        const loc = order.shipping?.locationName || 'غير محدد';
        const matchesLocation = filterLocation === 'all' || loc === filterLocation;

        let matchesDate = true;
        const orderDateStr = order.date || order.orderDate;
        if (orderDateStr) {
            if (filterStartDate && orderDateStr < filterStartDate) matchesDate = false;
            if (filterEndDate && orderDateStr > filterEndDate) matchesDate = false;
        }

        return matchesSearch && matchesStatus && matchesLocation && matchesDate;
    });

    const uniqueLocations = Array.from(new Set(orders.map(o => o.shipping?.locationName || 'غير محدد'))).filter(Boolean);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredOrders.map(o => o.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const confirmDelete = async () => {
        const deletedOrders = orders.filter(o => selectedIds.includes(o.id));
        setOrders(prev => prev.filter(o => !selectedIds.includes(o.id)));
        setSelectedIds([]);
        setDeleteModalOpen(false);

        // Restore stock for deleted orders that were shipped, delivered or partially delivered
        const stockChanges: { [id: string]: number } = {};
        for (const order of deletedOrders) {
            if (['تم الشحن', 'تم التوصيل', 'تسليم جزئي'].includes(order.status)) {
                order.products?.forEach((p: any) => {
                    const id = p.productId;
                    const netQty = Math.max(0, p.quantity - (p.returnedQuantity || 0));
                    stockChanges[id] = (stockChanges[id] || 0) + netQty;
                });
            }
        }

        // Apply stock changes
        if (Object.keys(stockChanges).length > 0) {
            const { data: dbProducts } = await supabase.from('products').select('id, stock').in('id', Object.keys(stockChanges));
            if (dbProducts) {
                for (const dbP of dbProducts) {
                    const newStock = (Number(dbP.stock) || 0) + (stockChanges[dbP.id] || 0);
                    await supabase.from('products').update({ stock: newStock }).eq('id', dbP.id);
                }
            }
        }

        await supabase.from('orders').delete().in('id', selectedIds);
    };

    const handlePrintSelected = () => {
        if (selectedIds.length > 0) {
            const printData = orders.filter(o => selectedIds.includes(o.id));
            localStorage.setItem('ma5zon_print_queue', JSON.stringify(printData));
            navigate('/orders/print-bulk');
        }
    };

    // Calculate pagination right before render
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when search/filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterStartDate, filterEndDate]);

    return (
        <div className="w-full space-y-4">
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">إدارة الطلبات</h1>
                    <p className="text-sm text-slate-500 mt-1">عرض وتتبع جميع طلبات العملاء وحالتها</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 border px-4 py-2 font-medium transition-colors ${showFilters ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                        <Filter className="w-4 h-4" />
                        <span>تصفية والتاريخ</span>
                    </button>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        className="hidden"
                    />
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>تحميل القالب</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        <span>استيراد </span>
                    </button>
                    <Link
                        to="/orders/add" // Assuming you will add this page soon
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 font-medium transition-colors"
                    >
                        <span>إنشاء طلب جديد</span>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white shadow-sm border border-slate-100 flex flex-col">
                {/* Filters Pane */}
                {showFilters && (
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1 font-tajawal">الحالة</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 bg-white focus:ring-sky-500 focus:border-sky-500 text-sm outline-none font-tajawal cursor-pointer"
                            >
                                <option value="all">جميع الحالات</option>
                                <option value="قيد المراجعة">قيد المراجعة / جاري المعالجة</option>
                                <option value="تم الشحن">تم الشحن</option>
                                <option value="تم التوصيل">تم التوصيل / مكتمل</option>
                                <option value="مرتجع">مرتجع</option>
                                <option value="ملغي">ملغي / لاغي</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1 font-tajawal">المحافظة</label>
                            <select
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 bg-white focus:ring-sky-500 focus:border-sky-500 text-sm outline-none font-tajawal cursor-pointer"
                            >
                                <option value="all">جميع المحافظات</option>
                                {uniqueLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1 font-tajawal">من تاريخ</label>
                            <input
                                type="date"
                                value={filterStartDate}
                                onChange={(e) => setFilterStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 bg-white focus:ring-sky-500 focus:border-sky-500 text-sm outline-none font-sans cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1 font-tajawal">إلى تاريخ</label>
                            <input
                                type="date"
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 bg-white focus:ring-sky-500 focus:border-sky-500 text-sm outline-none font-sans cursor-pointer"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => { setFilterStatus('all'); setFilterLocation('all'); setFilterStartDate(''); setFilterEndDate(''); setSearchTerm(''); }}
                                className="w-full sm:w-auto px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold transition-colors font-tajawal h-[38px]"
                            >
                                إزالة الفلاتر
                            </button>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <Search className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pr-10 pl-4 py-2.5 border border-slate-300 bg-white focus:ring-sky-500 focus:border-sky-500 text-sm outline-none transition-colors"
                            placeholder="ابحث برقم الطلب أو اسم العميل..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setDeleteModalOpen(true)}
                                className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors flex-1 sm:flex-none"
                            >
                                <Trash2 className="w-4 h-4" />
                                حذف ({selectedIds.length})
                            </button>
                            <button
                                onClick={handlePrintSelected}
                                className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors flex-1 sm:flex-none"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة ({selectedIds.length})
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-center whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-sky-600 bg-white border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                                        checked={selectedIds.length > 0 && selectedIds.length === filteredOrders.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 font-medium">رقم الطلب</th>
                                <th className="px-6 py-4 font-medium">العميل</th>
                                <th className="px-6 py-4 font-medium">الهاتف</th>
                                <th className="px-6 py-4 font-medium">التاريخ</th>
                                <th className="px-6 py-4 font-medium max-w-[200px]">المنتجات</th>
                                <th className="px-6 py-4 font-medium">الإجمالي</th>
                                <th className="px-6 py-4 font-medium">الحالة</th>
                                <th className="px-6 py-4 font-medium text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 7 }).map((_, i) => (
                                    <React.Fragment key={i}><OrderRowSkeleton /></React.Fragment>
                                ))
                            ) : paginatedOrders.map((order) => (
                                <tr key={order.id} className={`transition-colors ${getRowColor(order)} ${selectedIds.includes(order.id) ? 'bg-sky-50/50' : ''}`}>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-sky-600 bg-white border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                                            checked={selectedIds.includes(order.id)}
                                            onChange={() => handleSelectRow(order.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600 text-xs font-tajawal font-bold relative flex items-center justify-center gap-1">
                                        {order.id}
                                        {isOrderDelayed(order) && <AlertTriangle className="w-5 h-5 text-rose-500 drop-shadow-sm" title={`تجاوز مدة التنبيه المحددة (${order.alertDurationDays} أيام)`} />}
                                        {order.hasUnlinkedItems && <Link2Off className="w-5 h-5 text-amber-500 drop-shadow-sm" title="يحتوي على بيانات غير مرتبطة بالنظام (منتج أو شحن)" />}
                                        {(() => {
                                            const stockIssues = getOrderStockIssues(order);
                                            return stockIssues.length > 0 && (
                                                <AlertTriangle className="w-5 h-5 text-red-600 drop-shadow-sm" title={`المخزون غير كافي!\n${stockIssues.join('\n')}`} />
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{order.customer || order.customerName}</td>
                                    <td className="px-6 py-4 font-mono text-slate-600 text-xs" dir="ltr">{order.phone || order.primaryPhone || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500 font-tajawal text-xs">{order.date || order.orderDate || order.createdAt?.split('T')[0]}</td>
                                    <td className="px-6 py-4 text-slate-600 font-tajawal max-w-[200px] truncate" title={order.products?.map((p: any) => p.productName || p.name).join('، ')}>
                                        {order.products?.map((p: any) => p.productName || p.name).join('، ') || (order.itemsCount ? `${order.itemsCount} منتج` : 'لا يوجد')}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700 font-tajawal">{order.total} ج.م</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order, e.target.value)}
                                                className={`px-2 py-1.5 w-[140px] text-center text-xs font-bold rounded-none outline-none cursor-pointer appearance-none border-b-2 ${order.status === 'تم التوصيل' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                                    order.status === 'تم الشحن' ? 'bg-sky-50 text-sky-700 border-sky-300' :
                                                        order.status === 'ملغي' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                                            order.status === 'مرتجع' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                                                                order.status === 'تسليم جزئي' || order.status === 'مرتجع جزئي' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' :
                                                                    'bg-amber-50 text-amber-700 border-amber-300'
                                                    }`}
                                            >
                                                {statusCycleArray.map((sts) => (
                                                    <option key={sts} value={sts} className="bg-white text-slate-800">{sts}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setQuickViewOrder(order)}
                                                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-100 rounded"
                                                title="المعاينة السريعة"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            <Link
                                                to={`/orders/invoice/${order.id}`}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100 rounded"
                                                title="طباعة مباشر"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </Link>

                                            <Link
                                                to={`/orders/add?edit=${order.id}`}
                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-100"
                                                title="تعديل الطلب"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-slate-500 text-center">
                                        لا توجد طلبات مطابقة للبحث
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                    <span className="text-sm text-slate-500 font-tajawal">
                        عرض {filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                        {Math.min(currentPage * itemsPerPage, filteredOrders.length)} من {filteredOrders.length} طلب
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || filteredOrders.length === 0}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                            السابق
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || filteredOrders.length === 0}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                            التالي
                        </button>
                    </div>
                </div>
            </div>

            {/* Cancel Modal */}
            {cancelOrderId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md border border-slate-200 shadow-xl rounded-none">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg font-tajawal">إلغاء الطلب ({cancelOrderId})</h3>
                            <button onClick={() => setCancelOrderId(null)} className="text-slate-400 hover:text-slate-600 outline-none"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600 text-sm leading-relaxed">هل أنت متأكد من تغيير حالة هذا الطلب إلى <strong className="text-rose-600">ملغي</strong>؟ سيتم إرجاع جميع كميات المنتجات الخاصة بهذا الطلب إلى المخزون تلقائياً.</p>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 font-tajawal">رسوم الشحن للإلغاء (ج.م) <span className="text-xs text-slate-400 font-normal">- لتسويات الحسابات</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    value={cancelFee || ''}
                                    onChange={(e) => setCancelFee(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors font-mono"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100 bg-slate-50 font-tajawal">
                            <button onClick={() => { updateOrderStatus(cancelOrderId, 'ملغي', { fee: cancelFee }); setCancelOrderId(null); }} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 font-bold transition-colors">تأكيد الإلغاء</button>
                            <button onClick={() => setCancelOrderId(null)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 font-bold transition-colors">تراجع</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {returnOrderId && (() => {
                const rOrder = orders.find(o => o.id === returnOrderId);
                if (!rOrder) return null;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-xl border border-slate-200 shadow-xl max-h-[90vh] flex flex-col rounded-none">
                            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                                <h3 className="font-bold text-slate-800 text-lg font-tajawal">{returnTargetStatus === 'مرتجع' ? 'مرتجع كلي للطلب' : 'مرتجع وتسليم جزئي للطلب'} ({returnOrderId})</h3>
                                <button onClick={() => setReturnOrderId(null)} className="text-slate-400 hover:text-slate-600 outline-none"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-6 overflow-y-auto">
                                <div className="bg-sky-50 p-4 border border-sky-100 text-sm text-sky-800 leading-relaxed">
                                    أدخل الكميات التي تم <strong>استرجاعها فعلياً</strong>. أي كمية تدخلها هنا سيتم ردها واسترجاعها إلى المخزون.
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-3 font-tajawal">المنتجات المطلوبة</h4>
                                    <table className="w-full text-sm text-center border-collapse">
                                        <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="py-2.5 px-3 text-right">المنتج</th>
                                                <th className="py-2.5 px-3">الكمية الأساسية</th>
                                                <th className="py-2.5 px-3">مرتجع مسبقاً</th>
                                                <th className="py-2.5 px-3">كمية الإرجاع الآن</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rOrder.products?.map((p: any) => {
                                                const alreadyReturned = p.returnedQuantity || 0;
                                                const maxReturn = p.quantity - alreadyReturned;
                                                return (
                                                    <tr key={p.productId} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                                        <td className="py-3 px-3 text-right font-medium text-slate-800 truncate max-w-[150px]">{p.productName || p.name}</td>
                                                        <td className="py-3 px-3 text-slate-600 font-mono">{p.quantity}</td>
                                                        <td className="py-3 px-3 text-rose-500 font-mono">{alreadyReturned}</td>
                                                        <td className="py-3 px-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={maxReturn}
                                                                value={returnQuantities[p.productId] ?? 0}
                                                                onChange={(e) => setReturnQuantities({ ...returnQuantities, [p.productId]: Math.min(maxReturn, Math.max(0, Number(e.target.value))) })}
                                                                className="w-20 px-2 py-1.5 border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-center font-mono outline-none"
                                                                disabled={maxReturn === 0}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700 font-tajawal">رسوم الشحن للارتجاع (ج.م) <span className="text-xs text-slate-400 font-normal">- لتسويات الحسابات</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={returnFee || ''}
                                        onChange={(e) => setReturnFee(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors font-mono"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 p-4 border-t border-slate-100 bg-slate-50 shrink-0 font-tajawal">
                                <button onClick={() => { updateOrderStatus(returnOrderId, returnTargetStatus, { fee: returnFee, quantities: returnQuantities }); setReturnOrderId(null); }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 font-bold transition-colors shadow-sm shadow-purple-200">تأكيد العملية</button>
                                <button onClick={() => setReturnOrderId(null)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2.5 font-bold transition-colors">إغلاق</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Bulk Delete Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-rose-100 flex items-center justify-center mb-4 mx-auto border border-rose-200">
                                <Trash2 className="w-6 h-6 text-rose-600" />
                            </div>
                            <h3 className="text-lg font-bold text-center text-slate-800 mb-2 font-tajawal">تأكيد الحذف</h3>
                            <p className="text-slate-500 text-center text-sm mb-4 font-tajawal">
                                هل أنت متأكد من رغبتك في حذف {selectedIds.length} طلب؟ سيمسح ذلك الطلبات نهائياً من النظام.
                            </p>
                            <p className="text-slate-600 text-center text-xs font-bold bg-amber-50 p-3 mb-6 font-tajawal rounded border border-amber-200">
                                <strong className="text-amber-700">ملاحظة هامة:</strong> إذا كانت بعض الطلبات في حالة (تم الشحن، تم التوصيل، أو تسليم جزئي)، فسيتم إرجاع منتجاتها إلى رصيد المخزون تلقائياً قبل الحذف.
                            </p>
                            <div className="flex gap-3 font-tajawal">
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    className="flex-1 py-2 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm shadow-rose-200"
                                >
                                    حذف نهائي
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Restore Modal */}
            {confirmRestoreOrderId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md border border-slate-200 shadow-xl rounded-none">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg font-tajawal">تأكيد استعادة الطلب</h3>
                            <button onClick={() => setConfirmRestoreOrderId(null)} className="text-slate-400 hover:text-slate-600 outline-none"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm leading-relaxed">
                                هذا الطلب حالياً <strong className="font-bold mx-1">{orders.find(o => o.id === confirmRestoreOrderId)?.status}</strong>. تحويله إلى حالة <strong className="font-bold text-sky-600 mx-1">{confirmRestoreTargetStatus}</strong> سيؤدي إلى إلغاء الارتجاع وإعادة خصم كميات المنتجات من المخزون (إذا كانت الحالة تستدعي ذلك) ومسح أي رسوم إرجاع أو إلغاء مسجلة مسبقاً.
                            </div>
                            <p className="text-slate-700 text-center font-bold font-tajawal pt-2">هل أنت متأكد من رغبتك في المتابعة؟</p>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-slate-100 bg-slate-50 font-tajawal">
                            <button onClick={() => { updateOrderStatus(confirmRestoreOrderId, confirmRestoreTargetStatus); setConfirmRestoreOrderId(null); }} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 font-bold transition-colors shadow-sm shadow-sky-200">نعم، متأكد</button>
                            <button onClick={() => setConfirmRestoreOrderId(null)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 font-bold transition-colors">إلغاء المتابعة</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick View Modal */}
            {
                quickViewOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-2xl border border-slate-200 shadow-xl max-h-[90vh] flex flex-col rounded-none">
                            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg font-tajawal">تفاصيل الطلب</h3>
                                    <p className="text-slate-500 font-mono text-sm mt-0.5">{quickViewOrder.id}</p>
                                </div>
                                <button onClick={() => setQuickViewOrder(null)} className="text-slate-400 hover:text-slate-600 outline-none p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {/* Alerts Banner */}
                                {quickViewOrder.hasUnlinkedItems && (
                                    <div className="bg-amber-50 p-4 border border-amber-300 text-amber-800 text-sm font-bold flex flex-col gap-2 rounded shadow-sm shadow-amber-100/50">
                                        <div className="flex items-center gap-2">
                                            <Link2Off className="w-6 h-6 text-amber-600" />
                                            <span>تنبيه: هذا الطلب يحتوي على بيانات تم استيرادها ولكنها غير مسجلة في النظام:</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs font-normal pr-8 space-y-1">
                                            {quickViewOrder.unlinkedDetails?.map((detail: string, i: number) => (
                                                <li key={i}>{detail}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {isOrderDelayed(quickViewOrder) && (
                                    <div className="bg-rose-50 p-4 border border-rose-300 text-rose-800 text-sm font-bold flex items-center gap-2 rounded shadow-sm shadow-rose-100/50">
                                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                                        تنبيه: لقد تجاوز هذا الطلب مدة التنبيه المحددة ({quickViewOrder.alertDurationDays} أيام) وهو لا يزال قيد الشحن!
                                    </div>
                                )}
                                <div className={`p-4 font-bold text-center text-sm ${getStatusColor(quickViewOrder.status)}`}>
                                    الحالة الحالية: {quickViewOrder.status}
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">العميل</p>
                                            <p className="font-bold text-slate-800">{quickViewOrder.customer || quickViewOrder.customerName}</p>
                                            <p className="text-slate-600 font-mono text-sm mt-1" dir="ltr">{quickViewOrder.primaryPhone}</p>
                                            {quickViewOrder.secondaryPhone && <p className="text-slate-600 font-mono text-sm" dir="ltr">{quickViewOrder.secondaryPhone}</p>}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">التاريخ والوقت</p>
                                            <p className="text-slate-800 text-sm">{quickViewOrder.date || quickViewOrder.orderDate} {quickViewOrder.orderTime}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">الشحن</p>
                                            <p className="font-bold text-slate-800">{quickViewOrder.shipping?.companyName || 'غير محدد'}</p>
                                            <p className="text-slate-600 text-sm mt-1">{quickViewOrder.shipping?.locationName}</p>
                                            {quickViewOrder.shipping?.detailedAddress && <p className="text-slate-500 text-sm mt-1 line-clamp-2" title={quickViewOrder.shipping.detailedAddress}>{quickViewOrder.shipping.detailedAddress}</p>}
                                        </div>
                                        {quickViewOrder.notes && (
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">ملاحظات</p>
                                                <p className="text-slate-700 text-sm bg-amber-50 p-2 rounded border border-amber-100">{quickViewOrder.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Products Table */}
                                <div>
                                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">المنتجات [{quickViewOrder.products?.length || 0}]</p>
                                    <div className="border border-slate-200 rounded overflow-hidden">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                                <tr>
                                                    <th className="py-2 px-3 font-bold">المنتج</th>
                                                    <th className="py-2 px-3 font-bold text-center">الكمية</th>
                                                    <th className="py-2 px-3 font-bold">السعر</th>
                                                    <th className="py-2 px-3 font-bold">المجموع</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {quickViewOrder.products?.map((p: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-2 px-3 text-slate-800 font-medium">{p.name}</td>
                                                        <td className="py-2 px-3 text-slate-600 font-mono text-center">
                                                            {p.quantity}
                                                            {p.returnedQuantity > 0 && <span className="text-rose-500 text-xs mr-1" title="كمية مرتجعة">({p.returnedQuantity}-)</span>}
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-slate-600">{p.price} <span className="text-[10px] text-slate-400">ج.م</span></td>
                                                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{(p.price * p.quantity).toFixed(0)} <span className="text-[10px] text-slate-400">ج.م</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div className="bg-slate-50 p-4 border border-slate-200 space-y-2 rounded">
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>إجمالي المنتجات</span>
                                        <span className="font-mono">{quickViewOrder.subtotal?.toFixed(0) || quickViewOrder.total} ج.م</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>الشحن</span>
                                        <span className="font-mono">{quickViewOrder.shipping?.shippingCost > 0 ? `${quickViewOrder.shipping.shippingCost} ج.م` : 'مجاناً'}</span>
                                    </div>
                                    {quickViewOrder.discount > 0 && (
                                        <div className="flex justify-between text-sm text-rose-600">
                                            <span>خصم إضافي</span>
                                            <span className="font-mono">- {quickViewOrder.discount} ج.م</span>
                                        </div>
                                    )}
                                    {(Number(quickViewOrder.cancellationFee) > 0 || Number(quickViewOrder.returnFee) > 0) && (
                                        <div className="flex justify-between text-sm text-rose-600">
                                            <span>رسوم إلغاء/إرجاع</span>
                                            <span className="font-mono">{quickViewOrder.cancellationFee || quickViewOrder.returnFee} ج.م</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-300 pt-2 mt-2">
                                        <span>المطلوب تحصيله</span>
                                        <span className="font-mono">{quickViewOrder.total} ج.م</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                                <Link to={`/orders/add?edit=${quickViewOrder.id}`} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-center py-2.5 font-bold transition-colors flex items-center justify-center gap-2">
                                    <Edit className="w-4 h-4" />
                                    تعديل الطلب
                                </Link>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}
