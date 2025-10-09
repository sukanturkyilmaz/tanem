import { Download, FileArchive, CheckCircle } from 'lucide-react';

export default function BackupDownloadPage() {
  const handleDownload = async () => {
    try {
      const response = await fetch('/STN-SIGORTA-FINAL.tar.gz');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'STN-SIGORTA-FINAL.tar.gz';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('İndirme başarısız! Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full">
        <div className="text-center">
          <FileArchive className="w-20 h-20 text-purple-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-800 mb-3">STN Sigorta Backup</h1>
          <p className="text-gray-600 mb-8 text-lg">Backup dosyanız hazır!</p>

          <button
            onClick={handleDownload}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-full text-xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto"
          >
            <Download className="w-6 h-6" />
            Backup'ı İndir (341KB)
          </button>

          <div className="mt-8 p-6 bg-blue-50 rounded-xl border-l-4 border-blue-600">
            <div className="text-left space-y-2 text-sm text-gray-700">
              <p><strong>Dosya:</strong> STN-SIGORTA-FINAL.tar.gz</p>
              <p><strong>Boyut:</strong> 341 KB</p>
              <p className="flex items-center gap-2 text-green-600 font-semibold">
                <CheckCircle className="w-4 h-4" />
                Tek dosya - Parçasız
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-xl text-left">
            <h3 className="text-lg font-bold text-purple-600 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Sonraki Adımlar
            </h3>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-purple-600">1.</span>
                <span>Dosyayı indir (butona tıkla)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600">2.</span>
                <span><strong>cPanel File Manager</strong>'a git</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600">3.</span>
                <span><strong>public_html</strong> klasörüne dosyayı yükle</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600">4.</span>
                <span>Dosyaya <strong>sağ tıkla → Extract</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600">5.</span>
                <span><strong>Tamam!</strong></span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
