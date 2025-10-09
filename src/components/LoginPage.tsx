import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleRegister = async (e: React.FormEvent) => {
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
        setIsRegister(false);
        setPassword('');
        setFullName('');
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız oldu');
    } finally {
      setLoading(false);
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
            onClick={() => {
              setIsRegister(false);
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              !isRegister
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => {
              setIsRegister(true);
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              isRegister
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-6">
          {isRegister && (
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
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
              ? isRegister
                ? 'Kayıt yapılıyor...'
                : 'Giriş yapılıyor...'
              : isRegister
              ? 'Kayıt Ol'
              : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
