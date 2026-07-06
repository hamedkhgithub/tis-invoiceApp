import React, { useState, useRef, useEffect } from 'react';

export default function ImageZoomPopup({
  model,
  excelIndex,
  title,
  tableZoom = 1,
  columnWidth = 85,
  currentRowHeight = 85 // 🎯 اینجاست که ورودی را تحویل می‌گیریم

}) {
  const [zoomScale, setZoomScale] = useState(1);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);

  const [confirmedSrc, setConfirmedSrc] = useState('');
  const [isSearching, setIsSearching] = useState(true);
  const [imageSize, setImageSize] = useState({
    width: 100,
    height: 100
  });


  const paddingSize = 0;
  const columnW = columnWidth * tableZoom;
  const rowH = currentRowHeight * tableZoom; // 📐 ارتفاع زنده و زوم‌شده سطر جاری
  
  const maxScale = 0.5;
  const isRowDragged = currentRowHeight !== 45;
  const minScale = isRowDragged ? 0.125 : 0.2;

  
  // 🎯 اعمال فرمول پیشنهادی شما: مقایسه نسبت فیت شدن عرضی و ارتفاعی
  const fitWidthScale = (columnW - paddingSize) / imageSize.width;
  const fitHeightScale = (rowH - paddingSize) / imageSize.height;
  
  // انتخاب کوچک‌ترین ضریب مقیاس جهت فیت شدن کامل دوطرفه در کادر بدون دفرمه شدن
  const scale =Math.max(Math.min(fitWidthScale, fitHeightScale),minScale);
  // 🎯 وضعیت جدید برای رصد لحظه‌ای نگه‌داشتن کلید Shift
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  // 🎯 شنود کلیدهای کیبورد برای فعال یا غیرفعال کردن وضعیت شفت
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Shift') setIsShiftPressed(true); };
    const handleKeyUp = (e) => { if (e.key === 'Shift') setIsShiftPressed(false); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);


  useEffect(() => {
    if (excelIndex === undefined) return;

    const cleanModel = model ? model.toString().trim() : "no-model";
    const idxStr = excelIndex.toString().trim();

    const potentialPaths = [
      `/pics/${cleanModel}.png`,
      `/pics/${cleanModel}.jpeg`,
      `/pics/${cleanModel}.jpg`,
      `/pics/${cleanModel}.PNG`,
      `/pics/${cleanModel}.JPEG`,
      `/pics/${cleanModel}.JPG`,
      `/pics/${idxStr}.png`,
      `/pics/${idxStr}.jpeg`,
      `/pics/${idxStr}.jpg`,
      `/pics/${idxStr}.PNG`,
      `/pics/${idxStr}.JPEG`,
      `/pics/${idxStr}.JPG`
    ];

    setIsSearching(true);

    const checkPath = (index) => {
      if (index >= potentialPaths.length) {
        setConfirmedSrc('');
        setIsSearching(false);
        return;
      }

      const img = new Image();
      img.src = potentialPaths[index];

      img.onload = () => {
        setConfirmedSrc(potentialPaths[index]);

        setImageSize({
            width: img.naturalWidth,
            height: img.naturalHeight
          });

        setIsSearching(false);
      };

      img.onerror = () => {
        checkPath(index + 1);
      };
    };

    checkPath(0);
  }, [model, excelIndex]);

  const handleMouseEnter = () => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    setPopupPos({
      top: rect.top + rect.height / 2,
      left: rect.left - 10
    });
  };

  const handleWheelZoom = (e) => {
    if (e.ctrlKey) return;

    e.preventDefault();

    setZoomScale((prevScale) => {
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      return Math.min(Math.max(1, prevScale + delta), 3);
    });
  };

  if (!model && excelIndex === undefined) {
    return (
      <td className="p-1 text-center text-slate-400 font-medium text-2xs border-l border-b border-slate-300 col-image">
        بدون عکس
      </td>
    );
  }

  return (
    <td
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className="p-1 text-center relative group border-l border-b border-slate-300 col-image"
    >
      {/* تصویر بدون باکس و پس‌زمینه */}
      <div
  style={{
    width: `${imageSize.width * scale}px`,
    height: `${imageSize.height * scale}px`,
    maxHeight: '100%',
    maxWidth: '100%'
  }}
  className="mx-auto flex items-center justify-center transition-all"
>

        {isSearching ? (
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
        ) : confirmedSrc ? (
          <img
            src={confirmedSrc}
            alt={model || excelIndex}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <span className="text-2xs text-slate-400">
            بدون عکس
          </span>
        )}
      </div>

      {confirmedSrc && (
   <div
     onWheel={handleWheelZoom}
     style={{
       position: 'fixed',
       top: `${popupPos.top}px`,
       left: `${popupPos.left}px`,
       transform: 'translate(-100%, -50%)',
       zIndex: 99999,
       width: `${Math.min(imageSize.width, window.innerWidth * 0.5)}px`,
       height: `${Math.min(imageSize.height, window.innerHeight * 0.5)}px`
     }}
     /* 🎯 اصلاح هوشمند کلاس: پاپ‌آپ فقط در صورت فعال بودن hover گروهی و نگه‌داشتن هم‌زمان کلید Shift مرئی می‌شود */
     className={`invisible opacity-0 bg-transparent flex items-center justify-center pointer-events-auto transition-opacity duration-150 ${
       isShiftPressed ? 'group-hover:visible group-hover:opacity-100' : ''
     }`}
   >

            <div className="w-full h-full overflow-hidden flex items-center justify-center">            
            <img
              src={confirmedSrc}
              alt={model || excelIndex}
              style={{
                transform: `scale(${zoomScale})`
              }}
              className="w-full h-full object-contain transition-transform duration-100 ease-out"
              draggable={false}
            />
          </div>
        </div>
      )}
    </td>
  );
}