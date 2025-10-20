# Supabase Veritabanı Kurulum Talimatları

## STN Türkyılmaz Sigorta - Temiz Kurulum

Bu adımları **SIRAYLA** takip ederek veritabanınızı sıfırdan kurun.

---

## ⚠️ ÖNEMLİ UYARI

**Bu işlem veritabanınızdaki tüm mevcut veriyi SİLECEKTİR!**

Önemli verileriniz varsa, önce Supabase Dashboard > Storage üzerinden yedekleyin.

---

## Adım 1: Supabase SQL Editor'e Erişim

1. https://supabase.com/dashboard adresine gidin
2. Projenizi seçin: `rtswtjgblxhyvlmaspmp`
3. Sol menüden **SQL Editor** seçeneğine tıklayın
4. **New query** butonuna tıklayın

---

## Adım 2: Tam Migration'ı Çalıştırın

1. Bu projedeki `COMPLETE_MIGRATION.sql` dosyasını açın
2. Dosyanın **TÜM içeriğini** kopyalayın
3. Supabase SQL Editor'e **yapıştırın**
4. **RUN** butonuna tıklayın (veya Ctrl+Enter / Cmd+Enter tuşlarına basın)
5. Script'in tamamlanmasını bekleyin (10-20 saniye sürer)
6. Alt paneldeki çıktıda **hata kontrolü** yapın

### Beklenen Başarı Mesajı:

```
SUCCESS: All tables created | table_count: 13
```

### Bu Script Ne Yapar:

- ✅ Tüm mevcut tabloları siler (temiz başlangıç)
- ✅ Doğru yapıyla 13 yeni tablo oluşturur
- ✅ Row Level Security (RLS) politikalarını ayarlar
- ✅ RLS ile 5 storage bucket oluşturur
- ✅ Trigger'ları ve fonksiyonları ekler
- ✅ Türk sigorta şirketlerini ekler
- ✅ Varsayılan ayarları ekler

---

## Adım 3: Tabloların Oluşturulduğunu Doğrulayın

SQL Editor'de bu sorguyu çalıştırarak doğrulayın:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Beklenen Tablolar (13 adet):

1. ✅ agency_info
2. ✅ announcement_reads
3. ✅ announcements
4. ✅ claims
5. ✅ client_documents
6. ✅ clients
7. ✅ customer_messages
8. ✅ dashboard_visibility_settings
9. ✅ insurance_companies
10. ✅ notifications
11. ✅ policies
12. ✅ policy_renewal_requests
13. ✅ profiles
14. ✅ settings

---

## Adım 4: Admin Kullanıcı Profili Oluşturun

**ÖNEMLİ:** Mevcut auth kullanıcı bilgilerinizi kullanın.

SQL editor'de bu sorguyu çalıştırın (kendi bilgilerinizle güncelleyin):

```sql
-- Mevcut kullanıcı için admin profili ekle
INSERT INTO profiles (id, email, full_name, role, company_name, phone)
VALUES (
  'YOUR-USER-ID-HERE',  -- Supabase Auth > Users bölümünden User ID'nizi alın
  'sukan@turkyilmazigorta.com',
  'Sukan Türkyılmaz',
  'admin',
  'STN Türkyılmaz Sigorta',
  '+90 555 123 4567'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name,
  phone = EXCLUDED.phone,
  updated_at = now();

-- Admin'in oluşturulduğunu doğrula
SELECT id, email, full_name, role, created_at
FROM profiles
WHERE role = 'admin';
```

### Beklenen Çıktı:

```
id: [your-user-id]
email: sukan@turkyilmazigorta.com
full_name: Sukan Türkyılmaz
role: admin
created_at: [timestamp]
```

---

## Adım 5: Storage Bucket'larını Doğrulayın

1. Sol menüden **Storage** seçeneğine tıklayın
2. 5 bucket görmelisiniz:
   - ✅ policies (Public)
   - ✅ policy-documents (Public)
   - ✅ client-documents (Public)
   - ✅ settings (Public)
   - ✅ project-backups (Private)

---

## Adım 6: Sigorta Şirketlerini Doğrulayın

Bu sorguyu çalıştırın:

```sql
SELECT name FROM insurance_companies ORDER BY name;
```

19 Türk sigorta şirketi görmelisiniz:
- Anadolu Sigorta
- Allianz Sigorta
- Aksigorta
- Ve 16 tane daha...

---

## Adım 7: Veritabanı Bağlantısını Test Edin

`.env` dosyanızda şu değerler olmalı:

```env
VITE_SUPABASE_URL=https://rtswtjgblxhyvlmaspmp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c3d0amdibHhoeXZsbWFzcG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDMyNjgsImV4cCI6MjA3NTQ3OTI2OH0.rdPp6BFl9PNlBxWhiQzfKjEDz1RHGZVebJfMj1ebdp4
```

**Değişiklik gerekmez** - bunlar zaten doğru!

---

## Adım 8: Giriş Testi

1. Local development ortamınızda çalıştırın: `npm run dev`
2. http://localhost:8080 adresine gidin
3. Şu bilgilerle giriş yapın:
   - Email: `sukan@turkyilmazigorta.com`
   - Şifre: [mevcut şifreniz]
4. Admin dashboard'u görmelisiniz

---

## Sorun Giderme

### Hata: "duplicate key value violates unique constraint"

Bu, tablo veya verinin zaten var olduğu anlamına gelir. Çözüm:
1. COMPLETE_MIGRATION.sql script'ini tekrar çalıştırın
2. Önce tüm tabloları SILINECEK, sonra yeniden oluşturulacak

### Hata: "relation does not exist"

Bu, bir tablonun düzgün oluşturulmadığı anlamına gelir. Çözüm:
1. SQL Editor çıktısında belirli hataları kontrol edin
2. Adım 3'teki doğrulama sorgusunu çalıştırın
3. Tablolar eksikse, COMPLETE_MIGRATION.sql'i tekrar çalıştırın

### Hata: "permission denied for table"

Bu, RLS politikalarının doğru ayarlanmadığı anlamına gelir. Çözüm:
1. Admin olarak giriş yaptığınızı doğrulayın
2. COMPLETE_MIGRATION.sql'i tekrar çalıştırın

### Migration Sonrası Giriş Yapamıyorum

Auth kullanıcınızın var olduğunu kontrol edin:

```sql
-- SQL Editor'de bunu çalıştırın
SELECT id, email, created_at
FROM auth.users
WHERE email = 'sukan@turkyilmazigorta.com';
```

Kullanıcı yoksa, Supabase Auth Dashboard üzerinden yeni bir tane oluşturmanız gerekecek.

---

## Sonraki Adımlar

Başarılı veritabanı kurulumundan sonra:

1. ✅ Local `.env` dosyanızı güncelleyin (zaten tamamlandı!)
2. ✅ Uygulamayı local'de test edin
3. ✅ Test müşterileri ve poliçeler ekleyin
4. ✅ Tüm özellikleri test edin (PDF yükleme, hasar kaydı oluşturma, vb.)
5. ✅ Güncellenmiş environment variable'larla Vercel'e deploy edin

---

## Veritabanı Şeması Özeti

### Temel Tablolar:
- **profiles** - Kullanıcı hesapları (admin, agent, müşteri)
- **clients** - Müşteri kayıtları
- **insurance_companies** - Sigorta şirketi listesi
- **policies** - Sigorta poliçeleri (Kasko, Trafik, İşyeri, vb.)
- **claims** - Sigorta hasarları
- **settings** - Uygulama ayarları

### Müşteri İletişim Tabloları:
- **announcements** - Acente duyuruları
- **announcement_reads** - Okunmuş duyuruların takibi
- **agency_info** - Acente iletişim bilgileri
- **customer_messages** - Müşterilerden destek mesajları
- **notifications** - Kullanıcı bildirimleri

### Yönetim Tabloları:
- **policy_renewal_requests** - Poliçe yenileme takibi
- **client_documents** - Döküman yönetimi
- **dashboard_visibility_settings** - Dashboard widget'larını özelleştirme

---

## Destek

Herhangi bir sorunla karşılaşırsanız:
1. Supabase Logs sekmesini kontrol edin
2. RLS politikalarının etkin olduğunu doğrulayın
3. Admin profilinizin var olduğunu onaylayın
4. Storage bucket'larının oluşturulduğunu kontrol edin

---

**Veritabanı kurulumu tamamlandı!** 🎉
