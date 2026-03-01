import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Eye, X, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageSkeleton } from '../components/Skeleton';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('id');
    if (!error && data) {
      setProducts(data);
      // Keep localStorage in sync so Orders/Home can still read quickly
      localStorage.setItem('ma5zon_products', JSON.stringify(data));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();

    // Real-time subscription
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteSelectedClick = () => {
    setProductToDelete(null);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      // Optimistic UI
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      await supabase.from('products').delete().eq('id', productToDelete);
    } else {
      // Optimistic UI for bulk
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      await supabase.from('products').delete().in('id', selectedIds);
      setSelectedIds([]);
    }
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const uniqueCategories = Array.from(new Set(products.map(p => p.categoryName).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());

    let simulatedStatus = 'متوفر';
    if (p.stock === 0) {
      simulatedStatus = 'نفذ';
    } else if (p.stock <= (Number(p.lowStockWarning) || 5)) {
      simulatedStatus = 'منخفض';
    }

    const matchesStatus = filterStatus === 'all' || simulatedStatus === filterStatus;
    const matchesCategory = filterCategory === 'all' || p.categoryName === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
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

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">إدارة المخزون</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`border px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${showFilters ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Filter className="w-4 h-4" />
            <span>تصفية</span>
          </button>
          <Link to="/inventory/add" className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>إضافة منتج</span>
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Filters Pane */}
        {showFilters && (
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">حالة المخزون</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 bg-white text-sm outline-none cursor-pointer">
                <option value="all">جميع الحالات</option>
                <option value="متوفر">متوفر بشكل كافي</option>
                <option value="منخفض">مخزون منخفض</option>
                <option value="نفذ">نفذ من المخزون</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">الفئة</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 bg-white text-sm outline-none cursor-pointer">
                <option value="all">جميع الفئات</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilterStatus('all'); setFilterCategory('all'); setSearchTerm(''); }}
                className="w-full sm:w-auto px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold transition-colors h-[38px]">
                إزالة الفلاتر
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input type="text"
              className="block w-full pr-10 pl-4 py-2.5 border border-slate-300 bg-slate-50 text-sm outline-none transition-colors"
              placeholder="ابحث عن منتج بالاسم، الرمز، أو الفئة..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteSelectedClick}
              className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
              <Trash2 className="w-4 h-4" />
              حذف المحدد ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <PageSkeleton rows={8} cols={6} />
          ) : (
            <table className="w-full text-center">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input type="checkbox"
                      className="w-4 h-4 text-sky-600 bg-white border-slate-300 rounded cursor-pointer"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                      onChange={handleSelectAll} />
                  </th>
                  <th className="px-6 py-4 font-medium">رمز المنتج</th>
                  <th className="px-6 py-4 font-medium">اسم المنتج</th>
                  <th className="px-6 py-4 font-medium">الفئة</th>
                  <th className="px-6 py-4 font-medium">السعر</th>
                  <th className="px-6 py-4 font-medium">الكمية</th>
                  <th className="px-6 py-4 font-medium text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  let statusCls = 'hover:bg-slate-50';
                  if (product.stock === 0) statusCls = 'bg-rose-50/40 hover:bg-rose-50/80';
                  else if (product.stock <= (Number(product.lowStockWarning) || 5)) statusCls = 'bg-amber-50/40 hover:bg-amber-50/80';
                  else statusCls = 'bg-emerald-50/40 hover:bg-emerald-50/80';

                  return (
                    <tr key={product.id} className={`transition-colors ${statusCls} ${selectedIds.includes(product.id) ? 'bg-sky-50/50' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox"
                          className="w-4 h-4 text-sky-600 bg-white border-slate-300 rounded cursor-pointer"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => handleSelectRow(product.id)} />
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs">{product.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{product.productName}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="bg-white/60 text-slate-600 px-2.5 py-1 text-xs border border-slate-200/50">
                          {product.categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">{product.sellingPrice} ج.م</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-700">{product.stock || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setQuickViewProduct(product)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-100 rounded"
                            title="معاينة التفاصيل">
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link to={`/inventory/add?edit=${product.id}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100 rounded"
                            title="تعديل">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button className="p-1.5 text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                            title="حذف" onClick={() => handleDeleteClick(product.id)}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-slate-500 text-center">
                      لا توجد منتجات مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-sm text-slate-500">عرض {filteredProducts.length} من {products.length} منتج</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-rose-100 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-800 mb-2">تأكيد الحذف</h3>
              <p className="text-slate-500 text-center text-sm mb-6">
                {productToDelete ? 'هل أنت متأكد من حذف هذا المنتج نهائياً من قاعدة البيانات؟' : `هل أنت متأكد من حذف ${selectedIds.length} منتج؟`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors">
                  إلغاء
                </button>
                <button onClick={confirmDelete}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors">
                  حذف نهائي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md border border-slate-200 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-sky-100 p-2 rounded-full text-sky-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{quickViewProduct.productName}</h3>
                  <p className="text-slate-500 font-mono text-xs mt-0.5">رمز: {quickViewProduct.id}</p>
                </div>
              </div>
              <button onClick={() => setQuickViewProduct(null)}
                className="text-slate-400 hover:text-slate-600 outline-none p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
              <div className={`p-4 border text-center flex flex-col items-center justify-center gap-1
                ${quickViewProduct.stock === 0 ? 'bg-rose-50 border-rose-100 text-rose-700' :
                  quickViewProduct.stock <= (Number(quickViewProduct.lowStockWarning) || 5) ? 'bg-amber-50 border-amber-100 text-amber-700' :
                    'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">الكمية الحالية في المخزون</span>
                <span className="text-3xl font-black">{quickViewProduct.stock || 0}</span>
                {quickViewProduct.stock <= (Number(quickViewProduct.lowStockWarning) || 5) && quickViewProduct.stock > 0 && (
                  <span className="text-xs font-bold mt-1 opacity-90 text-amber-800">تنبيه: المخزون قارب على النفاد</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">فئة المنتج</p>
                  <p className="font-bold text-slate-700 text-sm overflow-hidden text-ellipsis whitespace-nowrap">{quickViewProduct.categoryName}</p>
                </div>
                <div className="bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">حد المخزون المنخفض</p>
                  <p className="font-bold text-slate-700 font-mono text-sm">{quickViewProduct.lowStockWarning || 5}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">التفاصيل المالية</h4>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-500 font-medium">سعر الشراء (التكلفة)</span>
                  <span className="font-mono text-slate-700 font-bold">{quickViewProduct.purchasePrice || 0} <span className="text-xs text-slate-400">ج.م</span></span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-500 font-medium">سعر البيع للعميل</span>
                  <span className="font-mono text-sky-600 font-bold">{quickViewProduct.sellingPrice || 0} <span className="text-xs text-sky-400">ج.م</span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-slate-100 mt-2">
                  <span className="text-sm text-slate-800 font-bold">هامش الربح لكل قطعة</span>
                  <span className="font-mono text-emerald-600 font-black">
                    {(Number(quickViewProduct.sellingPrice || 0) - Number(quickViewProduct.purchasePrice || 0))} <span className="text-xs text-emerald-500/70">ج.م</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
              <Link to={`/inventory/add?edit=${quickViewProduct.id}`}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-center py-2.5 font-bold transition-colors flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" />
                تعديل بيانات المنتج
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
