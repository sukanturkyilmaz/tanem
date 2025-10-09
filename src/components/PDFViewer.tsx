import { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PDFViewerProps {
  pdfUrl: string;
  onClose: () => void;
  policyNumber?: string;
}

export default function PDFViewer({ pdfUrl, onClose, policyNumber }: PDFViewerProps) {
  const { isAdmin } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `polices_${policyNumber || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF indirme hatası:', error);
      alert('PDF indirilemedi');
    }
  };

  if (!pdfUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600">PDF dosyası bulunamadı</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-lg shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Poliçe Görüntüle</h3>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Download className="w-5 h-5" />
                İndir
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title="PDF Viewer"
            style={{
              border: 'none',
            }}
          />
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            {!isAdmin
              ? 'Poliçenizi görüntüleyebilir ve indirebilirsiniz.'
              : 'Bu belge sadece görüntüleme amaçlıdır.'}
          </p>
        </div>
      </div>
    </div>
  );
}
