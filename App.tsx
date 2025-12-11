import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Users, Package, Settings as SettingsIcon, ShieldCheck, Upload, Download, Plus, X, Search, MapPin, Mail, Phone, Tag, AlertCircle, Menu } from 'lucide-react';
import { InvoiceManager } from './components/InvoiceManager';
import { InvoicePDF } from './components/InvoicePDF';
import { Settings } from './components/Settings';
import { PermissionsManager } from './components/PermissionsManager';
import { storage } from './services/storage';
import { analyzeSales } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Invoice, Client, Product } from './types';

// Standardized Units of Measure (common in LATAM/Mexico e.g., SAT Catalog)
const UNIT_TYPES = [
  { code: 'H87', label: 'Pieza (H87)' },
  { code: 'E48', label: 'Unidad de servicio (E48)' },
  { code: 'KGM', label: 'Kilogramo (KGM)' },
  { code: 'LTR', label: 'Litro (LTR)' },
  { code: 'MTR', label: 'Metro (MTR)' },
  { code: 'MTK', label: 'Metro Cuadrado (MTK)' },
  { code: 'XBX', label: 'Caja (XBX)' },
  { code: 'HUR', label: 'Hora (HUR)' },
  { code: 'ZZ', label: 'Otro (Definir)' }
];

const COUNTRIES = [
  "México", "Argentina", "Bolivia", "Chile", "Colombia", "Costa Rica", "Cuba", 
  "Ecuador", "El Salvador", "España", "Estados Unidos", "Guatemala", "Honduras", 
  "Nicaragua", "Panamá", "Paraguay", "Perú", "República Dominicana", "Uruguay", "Venezuela"
];

// Helper for currency formatting
const formatCurrency = (amount: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    return `$${amount.toFixed(2)} ${currencyCode}`;
  }
};

const getCurrencySymbol = (currencyCode: string) => {
   try {
     const parts = new Intl.NumberFormat('es-MX', { style: 'currency', currency: currencyCode }).formatToParts(0);
     const symbol = parts.find(part => part.type === 'currency')?.value;
     return symbol || '$';
   } catch (e) {
     return '$';
   }
};

// Client Management Component with Modal Form
const ClientManager = () => {
  const [clients, setClients] = useState<Client[]>(storage.getClients());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({});

  const handleInputChange = (field: keyof Client, value: string) => {
    // Auto-uppercase Tax ID for standardization
    if (field === 'taxId') value = value.toUpperCase();
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const addClient = () => {
    // Strict Validation
    if(!formData.name?.trim()) {
      alert("El nombre o razón social es obligatorio.");
      return;
    }
    if(!formData.taxId?.trim()) {
      alert("El RFC / Identificación Fiscal es obligatorio para la facturación.");
      return;
    }
    if(!formData.email?.trim()) {
      alert("El correo electrónico es necesario para enviar la factura.");
      return;
    }
    if(!formData.address?.trim()) {
      alert("La dirección fiscal es obligatoria.");
      return;
    }
    if(!formData.zip?.trim()) {
       alert("El código postal es requerido para la validación fiscal.");
       return;
    }

    const newClient: Client = { 
      id: Date.now().toString(), 
      name: formData.name, 
      taxId: formData.taxId, 
      email: formData.email, 
      address: formData.address,
      city: formData.city || '',
      zip: formData.zip || '',
      phone: formData.phone || '',
      country: formData.country || 'México'
    };

    const updated = [...clients, newClient];
    setClients(updated);
    storage.saveClients(updated);
    setFormData({});
    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const newClients: Client[] = lines.slice(1).map((line): Client | null => {
          const cols = line.split(',');
          if (cols.length < 1 || !cols[0].trim()) return null;
          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: cols[0].trim(),
            taxId: cols[1]?.trim() || 'XAXX010101000',
            email: cols[2]?.trim() || '',
            address: cols[3]?.trim() || '',
            country: 'México' // Default for import
          };
        }).filter((c): c is Client => c !== null);

        if (newClients.length > 0) {
          const updated = [...clients, ...newClients];
          setClients(updated);
          storage.saveClients(updated);
          alert(`${newClients.length} clientes importados correctamente.`);
        }
      } catch (error) {
        alert('Error al leer el archivo CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.taxId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       {/* Actions Header */}
       <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-center gap-4">
         <h2 className="text-xl font-bold flex items-center"><Users className="mr-2" /> Gestión de Clientes</h2>
         <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <label className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition text-sm font-medium shadow-sm whitespace-nowrap">
                <Upload size={16} className="mr-2" /> Importar CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm font-medium shadow-sm whitespace-nowrap"
            >
              <Plus size={16} className="mr-2" /> Nuevo Cliente
            </button>
         </div>
       </div>

       {/* Search Bar */}
       <div className="relative">
         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
         <input 
           className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
           placeholder="Buscar por Nombre o RFC..."
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
         />
       </div>

       {/* Client List */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {filteredClients.map(c => (
           <div key={c.id} className="bg-white p-5 rounded-lg shadow hover:shadow-md transition border border-gray-100">
             <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-800 truncate max-w-[70%]">{c.name}</h3>
                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded whitespace-nowrap">{c.taxId}</span>
             </div>
             <div className="text-sm text-gray-600 space-y-1">
                <p className="flex items-center truncate"><Mail size={14} className="mr-2 opacity-50 flex-shrink-0"/> {c.email}</p>
                <p className="flex items-center truncate"><MapPin size={14} className="mr-2 opacity-50 flex-shrink-0"/> {c.city ? `${c.address}, ${c.city}` : c.address}</p>
                {c.phone && <p className="flex items-center"><Phone size={14} className="mr-2 opacity-50 flex-shrink-0"/> {c.phone}</p>}
             </div>
           </div>
         ))}
       </div>

       {/* Add Client Modal */}
       {isModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up flex flex-col">
             <div className="flex justify-between items-center p-4 border-b bg-gray-50 sticky top-0 z-10">
               <h3 className="text-lg font-bold text-gray-800">Registrar Nuevo Cliente</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social / Nombre Completo *</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} placeholder="Ej. Empresa SA de CV" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Identificación Fiscal (RFC/NIT) *</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.taxId || ''} onChange={e => handleInputChange('taxId', e.target.value)} placeholder="XAXX010101000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                    <input type="email" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.email || ''} onChange={e => handleInputChange('email', e.target.value)} placeholder="contacto@empresa.com" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Fiscal (Calle y Número) *</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.address || ''} onChange={e => handleInputChange('address', e.target.value)} placeholder="Av. Reforma 123" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Estado</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.city || ''} onChange={e => handleInputChange('city', e.target.value)} placeholder="Ciudad de México" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                    <select 
                      className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" 
                      value={formData.country || 'México'} 
                      onChange={e => handleInputChange('country', e.target.value)}
                    >
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal *</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.zip || ''} onChange={e => handleInputChange('zip', e.target.value)} placeholder="06600" />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} placeholder="55 1234 5678" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-right mt-2">* Campos Obligatorios</p>
             </div>

             <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0 bg-white">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-white border rounded hover:bg-gray-50">Cancelar</button>
               <button onClick={addClient} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Guardar</button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
};

// Product Management Component with Modal Form
const ProductManager = () => {
  const [products, setProducts] = useState<Product[]>(storage.getProducts());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currency, setCurrency] = useState('MXN');

  useEffect(() => {
    setCurrency(storage.getCompanyProfile().currency || 'MXN');
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({ price: 0, unit: 'H87' });

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const addProduct = () => {
    // Robust Validation
    if(!formData.name?.trim()) {
      alert("El nombre del producto es obligatorio.");
      return;
    }
    // Validation for region specific codes (e.g., SAT ID)
    if(!formData.code?.trim()) {
      alert("El campo 'Código' (SKU o SAT) es obligatorio y no puede estar vacío.");
      return;
    }
    
    // Strict positive number validation (greater than 0)
    // Parse to ensure we are checking a number, handling string inputs from forms
    const priceValue = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    if (priceValue === undefined || isNaN(priceValue) || priceValue <= 0) {
      alert("El precio debe ser un número positivo mayor a 0.");
      return;
    }

    const newProduct: Product = { 
      id: Date.now().toString(), 
      name: formData.name, 
      code: formData.code,
      price: priceValue,
      unit: formData.unit || 'H87', // Default to Pieza if somehow empty
      description: formData.description || ''
    };

    const updated = [...products, newProduct];
    setProducts(updated);
    storage.saveProducts(updated);
    setFormData({ price: 0, unit: 'H87' });
    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const newProducts: Product[] = lines.slice(1).map((line): Product | null => {
          const cols = line.split(',');
          if (cols.length < 2 || !cols[0].trim()) return null;
          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: cols[0].trim(),
            price: parseFloat(cols[1]?.trim()) || 0,
            code: cols[2]?.trim() || 'CSV-IMP',
            unit: 'H87'
          };
        }).filter((p): p is Product => p !== null);

        if (newProducts.length > 0) {
          const updated = [...products, ...newProducts];
          setProducts(updated);
          storage.saveProducts(updated);
          alert(`${newProducts.length} productos importados correctamente.`);
        }
      } catch (error) {
        alert('Error al leer el archivo CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       {/* Actions Header */}
       <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-center gap-4">
         <h2 className="text-xl font-bold flex items-center"><Package className="mr-2" /> Gestión de Productos</h2>
         <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <label className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition text-sm font-medium shadow-sm whitespace-nowrap">
                <Upload size={16} className="mr-2" /> Importar CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm font-medium shadow-sm whitespace-nowrap"
            >
              <Plus size={16} className="mr-2" /> Nuevo Producto
            </button>
         </div>
       </div>

       {/* Search Bar */}
       <div className="relative">
         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
         <input 
           className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
           placeholder="Buscar producto por Nombre o Código..."
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
         />
       </div>

       {/* Product List */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {filteredProducts.map(p => (
           <div key={p.id} className="bg-white p-5 rounded-lg shadow hover:shadow-md transition border border-gray-100 flex flex-col justify-between">
             <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800 break-words max-w-[70%]">{p.name}</h3>
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 whitespace-nowrap">{p.code}</span>
                </div>
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">{p.description || "Sin descripción"}</p>
             </div>
             <div className="flex justify-between items-end border-t pt-3 mt-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center">
                   <Tag size={12} className="mr-1"/>
                   {UNIT_TYPES.find(u => u.code === p.unit)?.label || p.unit || 'Pieza'}
                </span>
                <span className="font-bold text-xl text-green-700">{formatCurrency(p.price, currency)}</span>
             </div>
           </div>
         ))}
       </div>

       {/* Add Product Modal */}
       {isModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up flex flex-col">
             <div className="flex justify-between items-center p-4 border-b bg-gray-50 sticky top-0 z-10">
               <h3 className="text-lg font-bold text-gray-800">Registrar Producto / Servicio</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-4 sm:p-6 space-y-4">
                {/* Warning / Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 flex items-start">
                   <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                   <p>Asegúrese de usar las Claves de Unidad y Producto Servicio correspondientes al catálogo oficial de su región (ej. SAT en México).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto *</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} placeholder="Ej. Licencia de Software" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clave Prod/Serv (SKU) *</label>
                    <input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.code || ''} onChange={e => handleInputChange('code', e.target.value)} placeholder="Ej. 81112200" />
                    <span className="text-[10px] text-gray-500">Código interno o Fiscal (SAT)</span>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario ({currency}) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">{getCurrencySymbol(currency)}</span>
                      <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2 pl-7 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.price} onChange={e => handleInputChange('price', e.target.value)} />
                    </div>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clave de Unidad *</label>
                    <select className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" value={formData.unit || 'H87'} onChange={e => handleInputChange('unit', e.target.value)}>
                        {UNIT_TYPES.map(unit => (
                          <option key={unit.code} value={unit.code}>{unit.label}</option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada</label>
                    <textarea className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 h-20" value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value)} placeholder="Detalles adicionales del producto..." />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-right mt-2">* Campos Obligatorios</p>
             </div>

             <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0 bg-white">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-white border rounded hover:bg-gray-50">Cancelar</button>
               <button onClick={addProduct} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Guardar</button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
};

// Dashboard Component
const Dashboard = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('MXN');

  useEffect(() => {
    setInvoices(storage.getInvoices());
    setCurrency(storage.getCompanyProfile().currency || 'MXN');
  }, []);

  const chartData = invoices.map(i => ({ name: i.date, total: i.total }));

  const handleAnalysis = async () => {
    setLoading(true);
    const result = await analyzeSales(invoices);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">Ventas Totales</h3>
          <p className="text-3xl font-bold text-gray-800">{formatCurrency(invoices.reduce((acc, curr) => acc + curr.total, 0), currency)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Facturas Emitidas</h3>
          <p className="text-3xl font-bold text-gray-800">{invoices.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
           <h3 className="text-gray-500 text-sm font-medium">Ticket Promedio</h3>
           <p className="text-3xl font-bold text-gray-800">
             {formatCurrency(invoices.length ? (invoices.reduce((a,c) => a+c.total,0) / invoices.length) : 0, currency)}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Tendencia de Ventas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-lg shadow border border-indigo-100 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center">
              <SettingsIcon className="mr-2 text-indigo-600" size={20} />
              Inteligencia de Negocio
            </h3>
            <button 
              onClick={handleAnalysis} 
              disabled={loading}
              className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Analizando...' : 'Analizar Ventas'}
            </button>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto min-h-[150px] max-h-[300px]">
             {analysis || "Haga clic en 'Analizar Ventas' para obtener insights de Gemini sobre su rendimiento financiero."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'clients' | 'products' | 'permissions' | 'settings'>('dashboard');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handlePrint = (invoice: Invoice) => {
    setPrintInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleNavClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close mobile menu on selection
  };

  useEffect(() => {
    const handleAfterPrint = () => setPrintInvoice(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      {/* Print View (Hidden unless printing) */}
      <InvoicePDF invoice={printInvoice} />

      {/* Main App (Hidden when printing) */}
      <div className={`flex h-screen overflow-hidden no-print ${printInvoice ? 'hidden' : 'flex'}`}>
        
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar (Responsive) */}
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-transform transform 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0
        `}>
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
             <div className="flex items-center">
                <img src="/favicon.svg" className="w-8 h-8 mr-2" alt="Logo" />
                <h1 className="text-xl font-bold tracking-tight text-white">FacturaPro<span className="text-blue-400">AI</span></h1>
             </div>
             {/* Close button for mobile */}
             <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
               <X size={20} />
             </button>
          </div>
          <div className="p-4 md:hidden bg-slate-800/50">
             <p className="text-xs text-slate-400">Menú Principal</p>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <LayoutDashboard size={20} className="mr-3" /> Dashboard
            </button>
            <button onClick={() => handleNavClick('invoices')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'invoices' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <FileText size={20} className="mr-3" /> Facturas
            </button>
            <button onClick={() => handleNavClick('clients')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Users size={20} className="mr-3" /> Clientes
            </button>
            <button onClick={() => handleNavClick('products')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Package size={20} className="mr-3" /> Productos
            </button>
            <button onClick={() => handleNavClick('permissions')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'permissions' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <ShieldCheck size={20} className="mr-3" /> Permisos
            </button>
             <button onClick={() => handleNavClick('settings')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <SettingsIcon size={20} className="mr-3" /> Configuración
            </button>
          </nav>
          <div className="p-4 bg-slate-800 text-xs text-slate-400">
            v1.5.0 | Gemini Integrated
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 w-full relative">
           <header className="flex justify-between items-center mb-6 sm:mb-8">
             <div className="flex items-center">
               <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="mr-3 text-gray-600 hover:text-gray-900 md:hidden bg-white p-2 rounded shadow-sm"
               >
                 <Menu size={24} />
               </button>
               <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 capitalize truncate max-w-[200px] sm:max-w-none">
                 {activeTab === 'settings' ? 'Configuración' : activeTab === 'permissions' ? 'Seguridad' : activeTab}
               </h2>
             </div>
             
             <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <p className="font-medium text-gray-900">Admin Usuario</p>
                  <p className="text-xs text-gray-500">admin@empresa.com</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm">
                  AU
                </div>
             </div>
           </header>
           
           <div className="animate-fade-in-up pb-10">
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'invoices' && <InvoiceManager onPrint={handlePrint} />}
              {activeTab === 'clients' && <ClientManager />}
              {activeTab === 'products' && <ProductManager />}
              {activeTab === 'permissions' && <PermissionsManager />}
              {activeTab === 'settings' && <Settings />}
           </div>
        </main>
      </div>
    </div>
  );
}