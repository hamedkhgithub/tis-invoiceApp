import React, { useState, useRef, useEffect } from 'react';
import ImageZoomPopup from './ImageZoomPopup';

// 🎯 تابع کمکی برای پیدا کردن متن سرچ شده و قرار دادن آن داخل تگ استاندارد <mark>
const highlightText = (text, searchWord) => {
  if (!searchWord || !text) return text;
  const stringText = text.toString();
  const regex = new RegExp(`(${searchWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = stringText.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-300 text-black rounded-sm px-0.5 font-bold">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export default function ProductTable({ 
  filteredData, sortConfig, handleSort, editingId, 
  editFormData, handleEditClick, handleInputChange, handleSave, currency, dollarRate, visibleColumns,
  search, appMode // 🎯 دریافت وضعیت نوع سند از کامپوننت پدر
}) {
  const tableContainerRef = useRef(null);
  const [tableZoom, setTableZoom] = useState(1);

   // 💾 خواندن عرض ستون‌ها از localStorage یا استفاده از مقادیر پیش‌فرض شما
   const [widths, setWidths] = useState(() => {
    const savedWidths = localStorage.getItem('table_column_widths');
    return savedWidths ? JSON.parse(savedWidths) : {
      index: 40, image: 85, category: 100, title: 150, model: 120, descEn: 170, descFa: 210, quantity: 65, price: 110, totalPrice: 120
    };
  });
  const [rowHeights, setRowHeights] = useState(() => {
    const savedHeights = localStorage.getItem('table_row_heights');
    return savedHeights ? JSON.parse(savedHeights) : {};
  });


  const resizerRef = useRef({ active: null, startX: 0, startWidth: 0 });
  const isResizingRef = useRef(false);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    if (!tableContainer) return;

    const handleTableWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setTableZoom((prevZoom) => {
          const delta = e.deltaY < 0 ? 0.05 : -0.05;
          const newZoom = prevZoom + delta;
          return Math.min(Math.max(0.7, newZoom), 1.5);
        });
      }
    };
    tableContainer.addEventListener('wheel', handleTableWheel, { passive: false });
    return () => tableContainer.removeEventListener('wheel', handleTableWheel);
  }, []);
  const startRowResize = (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const currentHeight = rowHeights[itemId] || 45;

    const handleRowMouseMove = (moveEvent) => {
      const currentY = moveEvent.clientY;
      const diffY = currentY - startY;
      const newHeight = currentHeight + (diffY / tableZoom);
      
      // حداقل ارتفاع هوشمند: سطر به راحتی کوچک می‌شود تا متون پر شوند
      const finalHeight = Math.max(30, newHeight);
      
      setRowHeights(prev => {
        const updated = { ...prev, [itemId]: finalHeight };
        localStorage.setItem('table_row_heights', JSON.stringify(updated));
        return updated;
      });
    };

    const handleRowMouseUp = () => {
      document.removeEventListener('mousemove', handleRowMouseMove);
      document.removeEventListener('mouseup', handleRowMouseUp);
    };

    document.addEventListener('mousemove', handleRowMouseMove);
    document.addEventListener('mouseup', handleRowMouseUp);
  };


  const startResize = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true; 
    resizerRef.current = { active: columnKey, startX: e.clientX, startWidth: widths[columnKey] };
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e) => {
    const { active, startX, startWidth } = resizerRef.current;
    if (!active) return;
    const currentX = e.clientX;
    const diff = startX - currentX;
    
    const minAllowedWidth = active === 'image' ? 100 : 40;
    const newWidth = Math.max(minAllowedWidth, startWidth + diff);
    
    setWidths(prev => {
      const updated = { ...prev, [active]: newWidth };
      localStorage.setItem('table_column_widths', JSON.stringify(updated));
      return updated;
    });
  };

  const stopResize = () => {
    resizerRef.current = { active: null, startX: 0, startWidth: 0 };
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    setTimeout(() => { isResizingRef.current = false; }, 50);
  };

  const handleProtectedSort = (columnKey) => {
    if (isResizingRef.current) return; 
    handleSort(columnKey);
  };

  const dynamicStyles = `
    ${!visibleColumns.image ? '.col-image { display: none !important; }' : ''}
    ${!visibleColumns.category ? '.col-category { display: none !important; }' : ''}
    ${!visibleColumns.title ? '.col-title { display: none !important; }' : ''}
    ${!visibleColumns.model ? '.col-model { display: none !important; }' : ''}
    ${!visibleColumns.descEn ? '.col-descEn { display: none !important; }' : ''}
    ${!visibleColumns.descFa ? '.col-descFa { display: none !important; }' : ''}
    /* 🎯 حذف فضاهای خالی ستون‌های مالی در حالت لیست فنی اقلام */
    ${appMode !== 'quotation' ? '.col-price, .col-totalPrice { display: none !important; }' : ''}
  `;

  return (
    <div ref={tableContainerRef} 
    className="md:block overflow-x-auto overflow-y-hidden bg-white rounded-xl shadow-md border border-slate-300 w-full print:shadow-none print:border-slate-300 print:rounded-none"
    style={{ fontSize: `${tableZoom * 0.875}rem` }}
    >
      <style>{dynamicStyles}</style>
      
      <table className="text-right border-separate border-spacing-0 table-fixed min-w-full print:w-full border-r border-t border-slate-300" style={{ width: 'max-content' }}>
        <thead>
          <tr className="bg-slate-200 text-slate-800 select-none print:bg-slate-200">
            <th style={{ width: widths.index * tableZoom }} className="p-1 text-center font-bold relative border-l border-b border-slate-300 col-index">
              ردیف
              <div onMouseDown={(e) => startResize(e, 'index')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" />
            </th>
            <th style={{ width: widths.image * tableZoom }} className="p-0 font-bold text-center relative border-l border-b border-slate-300 col-image">
              تصویر
              <div onMouseDown={(e) => startResize(e, 'image')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" />
            </th>
            <th style={{ width: widths.category * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold relative border-l border-b border-slate-300 col-category" onClick={() => handleProtectedSort('category')}>
              دسته‌بندی <span className="print:hidden">{sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
              <div onMouseDown={(e) => startResize(e, 'category')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" onClick={(e) => e.stopPropagation()} />
            </th>
            <th style={{ width: widths.title * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold relative border-l border-b border-slate-300 col-title" onClick={() => handleProtectedSort('title')}>
              عنوان <span className="print:hidden">{sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
              <div onMouseDown={(e) => startResize(e, 'title')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" onClick={(e) => e.stopPropagation()} />
            </th>
            <th style={{ width: widths.model * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold relative border-l border-b border-slate-300 col-model" onClick={() => handleProtectedSort('model')}>
              مدل <span className="print:hidden">{sortConfig.key === 'model' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
              <div onMouseDown={(e) => startResize(e, 'model')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" onClick={(e) => e.stopPropagation()} />
            </th>
            <th style={{ width: widths.descEn * tableZoom }} className="p-1 font-bold relative border-l border-b border-slate-300 col-descEn">
              Product Description
              <div onMouseDown={(e) => startResize(e, 'descEn')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" />
            </th>
            <th style={{ width: widths.descFa * tableZoom }} className="p-1 font-bold relative border-l border-b border-slate-300 col-descFa">
              توضیحات
              <div onMouseDown={(e) => startResize(e, 'descFa')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" />
            </th>
            <th style={{ width: widths.quantity * tableZoom }} className="p-1 font-bold text-center relative border-l border-b border-slate-300 col-quantity">
              تعداد
              <div onMouseDown={(e) => startResize(e, 'quantity')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" />
            </th>
            
            {/* 🎯 پنهان‌سازی هوشمند هدر قیمت واحد */}
            {appMode === 'quotation' && (
              <th style={{ width: widths.price * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold text-left relative border-l border-b border-slate-300 col-price" onClick={() => handleProtectedSort('price')}>
                {currency === "IRR" ? 'قیمت واحد (ریال)' : 'قیمت واحد ($)'} <span className="print:hidden">{sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
                <div onMouseDown={(e) => startResize(e, 'price')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" onClick={(e) => e.stopPropagation()} />
              </th>
            )}
            
            {/* 🎯 پنهان‌سازی هوشمند هدر قیمت کل */}
            {appMode === 'quotation' && (
              <th style={{ width: widths.totalPrice * tableZoom }} className="p-1 font-bold text-left relative border-l border-b border-slate-300 col-totalPrice">
                {currency === "IRR" ? 'قیمت کل (ریال)' : 'قیمت کل ($)'}
                <div onMouseDown={(e) => startResize(e, 'totalPrice')} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden" />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item, index) => (
            <tr key={item.id} style={{ height: `${(rowHeights[item.id] || 45) * tableZoom}px` }} className="odd:bg-slate-100 even:bg-white hover:bg-blue-100/50 transition-colors relative">
<td className="p-1 text-center text-slate-500 font-semibold break-words border-l border-b border-slate-300 col-index relative select-none">
  {index + 1}
  <div onMouseDown={(e) => startRowResize(e, item.id)} className="absolute bottom-0 right-0 w-full h-1.5 cursor-row-resize bg-transparent hover:bg-blue-500/30 z-20 print:hidden" />
</td>
              
              {visibleColumns.image && (
<ImageZoomPopup 
  model={item.model} 
  excelIndex={item.excelIndex} 
  title={item.title} 
  tableZoom={tableZoom} 
  columnWidth={widths.image} 
  currentRowHeight={rowHeights[item.id] || 45} // 🎯 پاس دادن ارتفاع جاری سطر
/>

              )}
              
              <td className="p-1 text-slate-900 font-medium break-words whitespace-normal border-l border-b border-slate-300 col-category">{item.category}</td>
              
              <td style={{ fontSize: '0.95em' }} className="p-1 text-slate-700 font-semibold break-words whitespace-normal border-l border-b border-slate-300 col-title">
                {highlightText(item.title, search)}
              </td>
              
              <td className="p-1 text-slate-600 font-mono text-xs break-all whitespace-normal border-l border-b border-slate-300 col-model">
                {highlightText(item.model, search)}
              </td>
              
              <td style={{ fontSize: '0.8em' }} className="p-1 text-slate-500 font-mono break-words whitespace-normal border-l border-b border-slate-300 col-descEn">
                {highlightText(item.descEn, search)}
              </td>
              
              <td style={{ fontSize: '0.85em' }} className="p-1 text-slate-500 break-words whitespace-normal border-l border-b border-slate-300 col-descFa">
                {highlightText(item.descFa, search)}   
              </td>

              <td className="p-1 text-center cursor-pointer select-none border-l border-b border-slate-300 col-quantity">
                {editingId === item.id ? (
                  <input type="number" min="0" autoFocus value={editFormData.quantity} onChange={(e) => handleInputChange(e, 'quantity')} onBlur={() => handleSave(item.id)} onKeyDown={(e) => e.key === 'Enter' && handleSave(item.id)} className="border border-blue-500 bg-blue-50/20 p-1 rounded-lg w-full text-center outline-none font-bold print:border-transparent print:bg-transparent" />
                ) : (
                  <div onClick={() => handleEditClick(item)} className="font-bold text-slate-800 hover:bg-slate-200 p-1 rounded-lg border border-transparent hover:border-slate-300 transition-all print:hover:bg-transparent">{item.quantity}</div>
                )}
              </td>
              
              {/* 🎯 پنهان‌سازی سلول قیمت واحد هر محصول */}
              {appMode === 'quotation' && (
                <td className="p-1 text-left text-slate-700 font-mono break-all border-l border-b border-slate-300 col-price">
                  {currency === "IRR" ? `${Math.round(item.price * dollarRate).toLocaleString()} ریال` : `$${Math.round(item.price).toLocaleString()}`}
                </td>
              )}
              
              {/* 🎯 پنهان‌سازی سلول قیمت کل هر محصول */}
              {appMode === 'quotation' && (
                <td className="p-1 text-left text-blue-700 font-bold font-mono break-all border-l border-b border-slate-300 col-totalPrice">
                  {currency === "IRR" ? `${Math.round(item.quantity * item.price * dollarRate).toLocaleString()} ریال` : `$${Math.round(item.quantity * item.price).toLocaleString()}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
