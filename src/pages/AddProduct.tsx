import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/Skeleton';

export default function AddProduct() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const editId = searchParams.get('edit');

  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [lowStockWarning, setLowStockWarning] = useState('5');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      // Load existing product from Supabase
      supabase.from('products').select('*').eq('id', editId).single().then(({ data }) => {
        if (data) {
          setProductCode(data.id);
          setProductName(data.productName);
          setCategoryName(data.categoryName);
          setPurchasePrice(data.purchasePrice?.toString() || '');
          setSellingPrice(data.sellingPrice?.toString() || '');
          setStock(data.stock?.toString() || '0');
          setLowStockWarning(data.lowStockWarning?.toString() || '5');
        }
      });
    } else {
      // Auto-generate next ID from Supabase
      supabase.from('products').select('id').then(({ data }) => {
        if (data && data.length > 0) {
          const ids = data.map((p: any) => parseInt(p.id) || 0);
          const nextId = Math.max(...ids) + 1;
          setProductCode(nextId.toString());
        } else {
          setProductCode('1');
        }
      });
    }
  }, [editId]);

  const handleSave = async () => {
    if (!productName || !categoryName || !purchasePrice || !sellingPrice) {
      alert('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setSaving(true);

    const productData = {
      id: productCode,
      productName,
      categoryName,
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      lowStockWarning: Number(lowStockWarning) || 5,
      stock: Number(stock) || 0,
      status: 'متوفر',
    };

    const { error } = await supabase.from('products').upsert(productData, { onConflict: 'id' });

    if (error) {
      alert('حدث خطأ أثناء الحفظ: ' + error.message);
      setSaving(false);
      return;
    }

    navigate('/inventory');
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/inventory" className="p-2 hover:bg-slate-100 transition-colors text-slate-500">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{editId ? 'تعديل المنتج' : 'إضافة منتج'}</h1>
        </div>
      </div>

      <div className="bg-white p-6 shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">اسم المنتج</label>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="أدخل اسم المنتج" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">اسم الفئة</label>
            <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="أدخل اسم الفئة" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">سعر الشراء (ج.م)</label>
            <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">سعر البيع (ج.م)</label>
            <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">حد التنبيه بنقص المخزون</label>
            <input type="number" value={lowStockWarning} onChange={(e) => setLowStockWarning(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="5" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">الكمية الحالية (المخزون)</label>
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="0" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">الباركود (رقم المنتج)</label>
            <input type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="1" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={() => navigate('/inventory')}
          className="px-6 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors">
          إلغاء
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors disabled:opacity-60">
          {saving ? <><Spinner size="sm" color="white" /> جاري الحفظ...</> : <><Save className="w-4 h-4" /> حفظ</>}
        </button>
      </div>
    </div>
  );
}
