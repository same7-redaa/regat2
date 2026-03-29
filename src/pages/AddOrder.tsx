import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Plus, Trash2, Save, MapPin, Package, User, FileText, Search, ChevronDown, Calculator } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/Skeleton';

// Custom Searchable Select Component
function SearchableSelect({ options, value, onChange, placeholder, disabled = false }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) => o.id === value);
    const filteredOptions = options.filter((o: any) => {
        const nameMatch = o.name?.toLowerCase().includes(search.toLowerCase());
        const secondaryMatch = o.secondaryLabel?.toLowerCase().includes(search.toLowerCase());
        return nameMatch || secondaryMatch;
    });

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className={`flex items-center justify-between w-full px-4 py-2.5 border ${disabled ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400' : 'bg-white border-slate-300 cursor-pointer'} transition-colors`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className={`truncate ${selectedOption ? "text-slate-800" : "text-slate-400"}`}>
                    {selectedOption ? (
                        <div className="flex justify-between items-center w-full">
                            <span>{selectedOption.name}</span>
                            {selectedOption.secondaryLabel && <span className="text-xs text-slate-400 pr-2">{selectedOption.secondaryLabel}</span>}
                        </div>
                    ) : placeholder}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 shadow-xl max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pr-9 pl-3 py-2 border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                                placeholder="بحث..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500 text-center">لا توجد نتائج مطابقة</div>
                    ) : (
                        <div className="py-1">
                            {filteredOptions.map((option: any) => (
                                <div
                                    key={option.id}
                                    className={`px-4 py-2.5 cursor-pointer text-sm hover:bg-sky-50 flex justify-between items-center ${value === option.id ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700'}`}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <span>{option.name}</span>
                                    {option.secondaryLabel && <span className={`text-xs ${value === option.id ? 'text-sky-600' : 'text-slate-400'}`}>{option.secondaryLabel}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AddOrder() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const [isEditing, setIsEditing] = useState(false);
    const [existingStatus, setExistingStatus] = useState('تم التوصيل');
    const [saving, setSaving] = useState(false);

    // Data from local storage
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

    useEffect(() => {
        // Load products and companies from Supabase
        supabase.from('products').select('*').then(({ data }) => { if (data) setAvailableProducts(data); });
        supabase.from('shipping_companies').select('*').then(({ data }) => { if (data) setAvailableCompanies(data); });

        if (editId) {
            supabase.from('orders').select('*').eq('id', editId).single().then(({ data: existingOrder }) => {
                if (!existingOrder) return;
                setIsEditing(true);
                setExistingStatus(existingOrder.status);
                setCustomerName(existingOrder.customerName || existingOrder.customer || '');
                setPrimaryPhone(existingOrder.primaryPhone || '');
                setSecondaryPhone(existingOrder.secondaryPhone || '');
                setOrderDate(existingOrder.orderDate || existingOrder.date || '');
                setOrderTime(existingOrder.orderTime || '');
                setCompanyId(existingOrder.shipping?.companyId || '');
                setLocationId(existingOrder.shipping?.locationId || '');
                setDetailedAddress(existingOrder.shipping?.detailedAddress || '');
                setDiscount(existingOrder.discount || 0);
                setAlertDurationDays(existingOrder.alertDurationDays || 0);
                setNotes(existingOrder.notes || '');

                if (existingOrder.products?.length > 0) {
                    setOrderProducts(existingOrder.products.map((p: any, idx: number) => ({
                        id: `edit-${idx}-${Date.now()}`,
                        productId: p.productId,
                        quantity: p.quantity
                    })));
                }
            });
        } else {
            // Default time for new order
            const now = new Date();
            setOrderDate(now.toISOString().split('T')[0]);
            setOrderTime(now.toTimeString().split(' ')[0].slice(0, 5));
        }
    }, [editId]);

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [primaryPhone, setPrimaryPhone] = useState('');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [orderDate, setOrderDate] = useState('');
    const [orderTime, setOrderTime] = useState('');

    // Ordered Products
    const [orderProducts, setOrderProducts] = useState([{ id: Date.now().toString(), productId: '', quantity: 1 }]);

    // Shipping & Calculation
    const [companyId, setCompanyId] = useState('');
    const [locationId, setLocationId] = useState('');
    const [detailedAddress, setDetailedAddress] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [alertDurationDays, setAlertDurationDays] = useState<number>(0);
    const [notes, setNotes] = useState('');

    // Handlers for products
    const addProductRow = () => {
        setOrderProducts([...orderProducts, { id: Date.now().toString(), productId: '', quantity: 1 }]);
    };

    const removeProductRow = (id: string) => {
        setOrderProducts(orderProducts.filter(p => p.id !== id));
    };

    const handleProductChange = (id: string, field: 'productId' | 'quantity', value: any) => {
        setOrderProducts(orderProducts.map(p => {
            if (p.id === id) {
                return { ...p, [field]: value };
            }
            return p;
        }));
    };

    // Computations
    const selectedCompany = availableCompanies.find(c => c.id === companyId);
    const availableLocations = selectedCompany ? selectedCompany.locations : [];
    const selectedLocation = availableLocations.find((l: any) => l.id === locationId);

    // Filter available products for dropdown mapping
    const productOptions = availableProducts.map(p => ({
        id: p.id,
        name: p.productName,
        secondaryLabel: `${p.sellingPrice} ج.م | متاح: ${p.stock}`
    }));

    const companyOptions = availableCompanies.map(c => ({
        id: c.id,
        name: c.name
    }));

    const locationOptions = availableLocations.map((l: any) => ({
        id: l.id,
        name: l.name,
        secondaryLabel: `${l.customerCost} ج.م`
    }));

    // Calculations
    const subtotal = orderProducts.reduce((sum, p) => {
        const prodDef = availableProducts.find(ap => ap.id === p.productId);
        if (prodDef) {
            return sum + (Number(prodDef.sellingPrice) * Number(p.quantity || 1));
        }
        return sum;
    }, 0);

    const shippingCost = selectedLocation ? Number(selectedLocation.customerCost) : 0;
    const finalTotal = subtotal + shippingCost - Number(discount || 0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        if (!customerName || !primaryPhone || !orderDate || !orderTime) {
            alert('يرجى ملء جميع البيانات الأساسية المطلوبة');
            return;
        }

        const validProducts = orderProducts.filter(p => p.productId && p.quantity > 0);
        if (validProducts.length === 0) {
            alert('يرجى اختيار منتج واحد على الأقل مع تحديد الكمية');
            return;
        }

        // Async save logic:
        let oldOrderCreatedAt = new Date().toISOString();
        let oldOrderProducts: any[] | null = null;

        // If editing, save OLD order data BEFORE upsert for stock diff calculation
        if (isEditing && editId) {
            const { data: oldOrder } = await supabase.from('orders').select('createdAt, products, status').eq('id', editId).single();
            if (oldOrder?.createdAt) oldOrderCreatedAt = oldOrder.createdAt;
            if (oldOrder?.products) oldOrderProducts = oldOrder.products;
        }

        const orderPayload = {
            id: isEditing ? editId! : `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            customerName, primaryPhone, secondaryPhone, orderDate, orderTime,
            products: validProducts.map(p => {
                const prodDef = availableProducts.find((ap: any) => ap.id === p.productId);
                return { productId: p.productId, name: prodDef?.productName, price: prodDef?.sellingPrice, quantity: p.quantity };
            }),
            shipping: {
                companyId, companyName: selectedCompany?.name || '', locationId,
                locationName: selectedLocation?.name || '', detailedAddress,
                shippingCost, actualCost: selectedLocation?.actualCost || 0
            },
            discount: Number(discount || 0), subtotal, total: finalTotal,
            status: isEditing ? existingStatus : 'تم التوصيل',
            alertDurationDays: Number(alertDurationDays || 0),
            notes,
            createdAt: oldOrderCreatedAt
        };

        const { error } = await supabase.from('orders').upsert(orderPayload, { onConflict: 'id' });
        if (error) { setSaving(false); alert('حدث خطأ أثناء حفظ الطلب: ' + error.message); return; }

        // Stock management: always read FRESH stock from DB before modifying
        const activeStatuses = ['تم الشحن', 'تم التوصيل', 'تسليم جزئي', 'مرتجع جزئي'];
        const orderIsActive = activeStatuses.includes(orderPayload.status);

        if (isEditing && editId) {
            // When editing: calculate the difference between old and new products
            // oldOrderProducts was saved BEFORE the upsert to get the original data
            const oldWasActive = activeStatuses.includes(existingStatus);

            // Build stock adjustment map: { productId: netChange }
            // Positive = need to ADD to stock (return), Negative = need to SUBTRACT from stock (deduct)
            const stockAdjustments: { [id: string]: number } = {};

            // If old order was active, its products were deducted → we "return" them
            if (oldWasActive && oldOrderProducts) {
                for (const p of oldOrderProducts) {
                    const netHeld = Math.max(0, (p.quantity || 0) - (p.returnedQuantity || 0));
                    stockAdjustments[p.productId] = (stockAdjustments[p.productId] || 0) + netHeld;
                }
            }

            // If new order is active, its products need to be deducted
            if (orderIsActive) {
                for (const p of validProducts) {
                    stockAdjustments[p.productId] = (stockAdjustments[p.productId] || 0) - p.quantity;
                }
            }

            // Apply adjustments using fresh DB values
            const productIds = Object.keys(stockAdjustments).filter(id => stockAdjustments[id] !== 0);
            if (productIds.length > 0) {
                const { data: freshProducts } = await supabase.from('products').select('id, stock').in('id', productIds);
                if (freshProducts) {
                    for (const fp of freshProducts) {
                        const adjustment = stockAdjustments[fp.id] || 0;
                        const newStock = Math.max(0, (Number(fp.stock) || 0) + adjustment);
                        await supabase.from('products').update({ stock: newStock }).eq('id', fp.id);
                    }
                }
            }
        } else if (!isEditing && orderIsActive) {
            // New order with active status: deduct stock using FRESH DB values
            const productIds = validProducts.map(p => p.productId);
            const { data: freshProducts } = await supabase.from('products').select('id, stock').in('id', productIds);
            if (freshProducts) {
                // Build quantity map for the order
                const orderQtyMap: { [id: string]: number } = {};
                for (const p of validProducts) {
                    orderQtyMap[p.productId] = (orderQtyMap[p.productId] || 0) + p.quantity;
                }
                for (const fp of freshProducts) {
                    const qtyToDeduct = orderQtyMap[fp.id] || 0;
                    const newStock = Math.max(0, (Number(fp.stock) || 0) - qtyToDeduct);
                    await supabase.from('products').update({ stock: newStock }).eq('id', fp.id);
                }
            }
        }

        navigate('/orders');
    };

    return (
        <div className="w-full space-y-6 pb-12">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <Link to="/orders" className="p-2 hover:bg-slate-100 transition-colors text-slate-500">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{isEditing ? `تعديل الطلب ${editId}` : 'إنشاء طلب جديد'}</h1>
                    <p className="text-sm text-slate-500 mt-1">{isEditing ? 'تعديل بيانات العميل أو المنتجات المطلوبة' : 'قم بتعبئة بيانات العميل، اختيار المنتجات، وتحديد شركة الشحن'}</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Info Card */}
                    <div className="bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <User className="w-5 h-5 text-sky-600" />
                            بيانات العميل
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">اسم العميل <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors"
                                    placeholder="أدخل اسم العميل ثلاثي أو رباعي"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">رقم الهاتف <span className="text-rose-500">*</span></label>
                                <input
                                    type="tel"
                                    value={primaryPhone}
                                    onChange={(e) => setPrimaryPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors font-mono"
                                    placeholder="010..."
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">تليفون إضافي للتواصل</label>
                                <input
                                    type="tel"
                                    value={secondaryPhone}
                                    onChange={(e) => setSecondaryPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors font-mono"
                                    placeholder="اختياري"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">تاريخ الطلب</label>
                                <input
                                    type="date"
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">وقت الطلب</label>
                                <input
                                    type="time"
                                    value={orderTime}
                                    onChange={(e) => setOrderTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Products Selection Card */}
                    <div className="bg-white p-6 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Package className="w-5 h-5 text-sky-600" />
                                المنتجات المطلوبة <span className="text-rose-500">*</span>
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {/* Header for desktop */}
                            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-bold text-slate-600 px-2">
                                <div className="col-span-8">المنتج</div>
                                <div className="col-span-3 text-center">الكمية</div>
                                <div className="col-span-1 border-r"></div>
                            </div>

                            {orderProducts.map((p, index) => (
                                <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 md:bg-transparent p-4 md:p-0 border border-slate-200 md:border-transparent">
                                    <div className="md:col-span-8">
                                        <label className="block md:hidden text-sm font-medium text-slate-700 mb-1">المنتج</label>
                                        <SearchableSelect
                                            options={productOptions}
                                            value={p.productId}
                                            onChange={(val: string) => handleProductChange(p.id, 'productId', val)}
                                            placeholder="ابحث عن منتج بالاسم..."
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block md:hidden text-sm font-medium text-slate-700 mb-1">الكمية</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={p.quantity}
                                            onChange={(e) => handleProductChange(p.id, 'quantity', parseInt(e.target.value) || 1)}
                                            className="w-full px-4 py-2 border border-slate-300 bg-white focus:outline-none focus:border-sky-500 text-center font-mono font-bold text-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeProductRow(p.id)}
                                            disabled={orderProducts.length === 1}
                                            className="p-2 text-rose-500 hover:bg-rose-50 transition-colors border border-transparent disabled:opacity-30"
                                            title="حذف المنتج"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addProductRow}
                            className="mt-6 flex items-center justify-center gap-2 w-full py-3 border border-dashed border-sky-300 text-sky-600 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-400 font-bold transition-all text-sm"
                        >
                            <Plus className="w-5 h-5" />
                            إضافة منتج آخر
                        </button>
                    </div>

                    {/* Shipping Card */}
                    <div className="bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <MapPin className="w-5 h-5 text-sky-600" />
                            الشحن والتوصيل
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">شركة الشحن</label>
                                <SearchableSelect
                                    options={companyOptions}
                                    value={companyId}
                                    onChange={(val: string) => {
                                        setCompanyId(val);
                                        setLocationId(''); // reset location when company changes
                                    }}
                                    placeholder="اختر شركة الشحن..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">المحافظة</label>
                                <SearchableSelect
                                    options={locationOptions}
                                    value={locationId}
                                    onChange={setLocationId}
                                    placeholder="اختر المحافظة..."
                                    disabled={!companyId || availableLocations.length === 0}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">العنوان التفصيلي</label>
                                <textarea
                                    value={detailedAddress}
                                    onChange={(e) => setDetailedAddress(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors resize-none"
                                    rows={3}
                                    placeholder="أدخل العنوان بالتفصيل: الحي، الشارع، رقم العمارة/المنزل، الشقة..."
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {/* Financial Summary */}
                    <div className="bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Calculator className="w-5 h-5 text-sky-600" />
                            ملخص مالي وإضافات
                        </h2>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">خصم إضافي للعميل (ج.م)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={discount || ''}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors font-mono"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">مدة التنبيه (يوم)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={alertDurationDays || ''}
                                    onChange={(e) => setAlertDurationDays(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors font-mono"
                                    placeholder="اختياري: التنبيه بعد عدة أيام في حالة الشحن"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">ملاحظات إضافية على الطلب</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-colors resize-none text-sm"
                                    rows={3}
                                    placeholder="أي ملاحظات للمندوب أو البائع..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 border border-slate-200 space-y-3">
                            <div className="flex justify-between items-center text-slate-600 text-sm">
                                <span>إجمالي المنتجات</span>
                                <span className="font-bold font-mono text-slate-800">{subtotal.toFixed(0)} ج.م</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 text-sm">
                                <span>تكلفة الشحن</span>
                                <span className="font-bold font-mono text-slate-800">{shippingCost > 0 ? `${shippingCost.toFixed(0)} ج.م` : '-'}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between items-center text-rose-600 text-sm font-medium">
                                    <span>الخصم المطبق</span>
                                    <span className="font-bold font-mono">- {discount.toFixed(0)} ج.م</span>
                                </div>
                            )}

                            <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between items-center">
                                <span className="font-bold text-slate-800">الإجمالي النهائي</span>
                                <span className="text-xl font-bold font-mono text-sky-600">{Math.max(0, finalTotal).toFixed(0)} ج.م</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3.5 font-bold transition-colors shadow-sm shadow-sky-200 disabled:opacity-60"
                            >
                                {saving ? <><Spinner size="md" color="white" /> جاري الحفظ...</> : <><Save className="w-5 h-5" /> {isEditing ? 'حفظ التعديلات' : 'حفظ وإنشاء الطلب'}</>}
                            </button>
                            <Link
                                to="/orders"
                                className="w-full text-center px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                            >
                                إلغاء
                            </Link>
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );
}
