import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'agent' | 'client'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingClient, setPendingClient] = useState<any>(null);
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: codeData } = await supabase.rpc('generate_verification_code');
        const verificationCode = codeData;

        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            email,
            full_name: fullName,
            role: 'admin',
            verification_code: verificationCode,
            is_verified: true,
          },
        ]);

        if (profileError) throw profileError;

        setSuccess(
          `Kayıt başarılı! Doğrulama Kodunuz: ${verificationCode}\n\nBu kodu güvenli bir yerde saklayın. Müşterilerinizin sisteme giriş yapabilmesi için bu kodu paylaşmanız gerekecek.`
        );
        setMode('login');
        setPassword('');
        setFullName('');
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!pendingClient) {
        const searchValue = email || fullName;

        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .or(`email.eq.${searchValue},full_name.ilike.%${searchValue}%`)
          .eq('registration_status', 'pending')
          .maybeSingle();

        if (clientError) throw clientError;

        if (!clientData) {
          setError('Bu bilgilerle kayıtlı bekleyen müşteri bulunamadı. Lütfen bilgilerinizi kontrol edin veya acentenizle iletişime geçin.');
          setLoading(false);
          return;
        }

        setPendingClient(clientData);
        setError('');
        setSuccess('Bilgileriniz doğrulandı! Lütfen şifrenizi belirleyin.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Şifre en az 6 karakter olmalıdır');
        setLoading(false);
        return;
      }

      const clientEmail = pendingClient.email || `client_${pendingClient.id}@temp.local`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: clientEmail,
        password,
        options: {
          data: {
            full_name: pendingClient.full_name,
            role: 'client',
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').upsert([
          {
            id: authData.user.id,
            email: clientEmail,
            full_name: pendingClient.full_name,
            role: 'client',
            is_verified: true,
          },
        ], { onConflict: 'id' });

        if (profileError) throw profileError;

        const { error: updateError } = await supabase
          .from('clients')
          .update({
            user_id: authData.user.id,
            registration_status: 'completed',
            registration_completed_at: new Date().toISOString(),
            email: clientEmail,
          })
          .eq('id', pendingClient.id);

        if (updateError) throw updateError;

        setSuccess('Kaydınız başarıyla tamamlandı! Giriş yapabilirsiniz.');
        setMode('login');
        setPendingClient(null);
        setPassword('');
        setEmail('');
        setFullName('');
      }
    } catch (err: any) {
      console.error('Client registration error:', err);
      setError(err.message || 'Kayıt başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError('');
    setSuccess('');
    setPendingClient(null);
    setPassword('');
    if (mode !== 'login') {
      setEmail('');
      setFullName('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 rounded-full p-3 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">STN Türkyılmaz Sigorta</h1>
          <p className="text-gray-600 mt-2">Poliçe Yönetim Sistemi</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('login'); resetForm(); }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition text-sm ${
              mode === 'login'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Giriş
          </button>
          <button
            onClick={() => { setMode('agent'); resetForm(); }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition text-sm ${
              mode === 'agent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Acente Kayıt
          </button>
          <button
            onClick={() => { setMode('client'); resetForm(); }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition text-sm ${
              mode === 'client'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Müşteri Kayıt
          </button>
        </div>

        <form onSubmit={mode === 'agent' ? handleAgentRegister : mode === 'client' ? handleClientRegister : handleLogin} className="space-y-6">
          {mode === 'agent' && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Adınız Soyadınız"
              />
            </div>
          )}

          {mode === 'client' && !pendingClient && (
            <>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Müşteri Kaydı</p>
                <p>Acentenizin size verdiği ad soyad veya e-posta adresini girin.</p>
              </div>
              <div>
                <label htmlFor="clientInfo" className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad veya E-posta
                </label>
                <input
                  id="clientInfo"
                  type="text"
                  value={email || fullName}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.includes('@')) {
                      setEmail(value);
                      setFullName('');
                    } else {
                      setFullName(value);
                      setEmail('');
                    }
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Ali Veli veya ali@example.com"
                />
              </div>
            </>
          )}

          {mode !== 'client' && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="ornek@email.com"
              />
            </div>
          )}

          {(mode !== 'client' || pendingClient) && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Şifre {pendingClient && '(Yeni şifrenizi belirleyin)'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
          )}

          {pendingClient && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium mb-1">✓ Bilgileriniz doğrulandı!</p>
              <p>Müşteri: <span className="font-semibold">{pendingClient.full_name}</span></p>
              <p className="mt-1">Lütfen hesabınız için bir şifre belirleyin.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm whitespace-pre-line">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === 'agent'
                ? 'Kayıt yapılıyor...'
                : mode === 'client'
                ? pendingClient
                  ? 'Hesap oluşturuluyor...'
                  : 'Doğrulanıyor...'
                : 'Giriş yapılıyor...'
              : mode === 'agent'
              ? 'Acente Kaydı Oluştur'
              : mode === 'client'
              ? pendingClient
                ? 'Kaydı Tamamla'
                : 'Bilgileri Doğrula'
              : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
