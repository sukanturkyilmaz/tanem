# Vercel Deployment Rehberi

## STN Türkyılmaz Sigorta - Production Deployment

Bu rehber, projenizi Vercel'e başarıyla deploy etmek için gereken adımları içerir.

---

## Ön Gereksinimler

1. ✅ Supabase veritabanı kurulumu tamamlanmış olmalı (`SUPABASE_SETUP_INSTRUCTIONS.md` dosyasını takip edin)
2. ✅ Local ortamda uygulama çalışıyor ve test edilmiş olmalı
3. ✅ Vercel hesabınız olmalı (https://vercel.com)
4. ✅ Proje GitHub/GitLab'a push edilmiş olmalı

---

## Adım 1: Vercel Environment Variables Ayarlama

1. Vercel Dashboard'a gidin: https://vercel.com/sukans-projects/tanem/settings/environment-variables

2. Aşağıdaki 2 environment variable'ı ekleyin:

### Variable 1: VITE_SUPABASE_URL

```
Key: VITE_SUPABASE_URL
Value: https://rtswtjgblxhyvlmaspmp.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```

### Variable 2: VITE_SUPABASE_ANON_KEY

```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c3d0amdibHhoeXZsbWFzcG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDMyNjgsImV4cCI6MjA3NTQ3OTI2OH0.rdPp6BFl9PNlBxWhiQzfKjEDz1RHGZVebJfMj1ebdp4
Environments: ✅ Production ✅ Preview ✅ Development
```

3. Her iki variable için de **Production**, **Preview** ve **Development** kutucuklarını seçin

4. **Save** butonuna tıklayın

---

## Adım 2: Mevcut Environment Variables'ları Kontrol Edin

Eğer eski Supabase project'lerine ait environment variables varsa:

1. **Sil** butonuna tıklayarak eski değerleri kaldırın
2. Sadece yukarıdaki 2 variable kalmalı
3. Her ikisi de `rtswtjgblxhyvlmaspmp` project'ine ait olmalı

**ÖNEMLI:** Eski project ID'leri (`azktsinnkthmjizpbaks` veya `ocmofokkokzufivkcafr`) varsa mutlaka silin!

---

## Adım 3: Projeyi Redeploy Edin

### Yöntem 1: Git Push ile Otomatik Deploy

```bash
git add .
git commit -m "Update Supabase configuration to rtswtjgblxhyvlmaspmp"
git push origin main
```

Vercel otomatik olarak yeni deployment başlatacak.

### Yöntem 2: Manuel Redeploy

1. Vercel Dashboard > Deployments sekmesine gidin
2. En son deployment'ın yanındaki **...** menüsüne tıklayın
3. **Redeploy** seçeneğini seçin
4. **Use existing Build Cache** kutucuğunu KALDIRIN
5. **Redeploy** butonuna tıklayın

---

## Adım 4: Build Loglarını Kontrol Edin

1. Vercel Dashboard > Deployments bölümünde yeni deployment'ı açın
2. **Building** aşamasını izleyin
3. Hata mesajı olup olmadığını kontrol edin

### Başarılı Build Örneği:

```
✓ Building...
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### Yaygın Hatalar:

**Hata:** `Missing environment variables`
**Çözüm:** Adım 1'e dönün ve environment variables'ların doğru girildiğini kontrol edin

**Hata:** `Build failed due to type errors`
**Çözüm:** Local'de `npm run build` çalıştırarak hataları görün ve düzeltin

---

## Adım 5: Production Testleri

1. Deployment tamamlandıktan sonra **Visit** butonuna tıklayın
2. Production URL'nizi açın (örn: https://tanem.vercel.app)
3. Aşağıdaki testleri yapın:

### Test Listesi:

- [ ] Login sayfası açılıyor mu?
- [ ] Admin credentials ile giriş yapabiliyorum mu?
- [ ] Dashboard yükleniyor mu?
- [ ] Müşteri listesi görünüyor mu?
- [ ] Poliçe listesi görünüyor mu?
- [ ] PDF yükleme çalışıyor mu?
- [ ] Hasar kaydı oluşturabiliyor muyum?
- [ ] Storage'a erişim var mı?

---

## Adım 6: Domain Ayarları (Opsiyonel)

Eğer özel domain kullanmak istiyorsanız:

1. Vercel Dashboard > Settings > Domains
2. **Add Domain** butonuna tıklayın
3. Domain adınızı girin (örn: `sigorta.turkyilmaz.com`)
4. DNS ayarlarını yapın (Vercel size talimatları gösterecek)
5. SSL sertifikası otomatik olarak ayarlanacak

---

## Sorun Giderme

### Environment Variables Güncellenmiyor

**Semptom:** Eski Supabase project'ine bağlanmaya çalışıyor

**Çözüm:**
1. Vercel Dashboard > Settings > Environment Variables
2. Tüm environment variables'ları silin
3. Sadece Adım 1'deki 2 variable'ı yeniden ekleyin
4. **Use existing Build Cache** olmadan redeploy edin

### Build Başarılı Ama Uygulama Çalışmıyor

**Semptom:** Beyaz sayfa veya 404 hatası

**Çözüm:**
1. Browser Console'u açın (F12)
2. Hata mesajlarını kontrol edin
3. Network tab'inde Supabase API çağrılarına bakın
4. CORS hatası varsa, Supabase RLS policies'i kontrol edin

### Supabase Connection Error

**Semptom:** `Failed to fetch` veya `Network error`

**Çözüm:**
1. Supabase Dashboard'da project'in active olduğunu doğrulayın
2. Project URL'nin doğru olduğunu kontrol edin: `https://rtswtjgblxhyvlmaspmp.supabase.co`
3. Anon Key'in doğru olduğunu kontrol edin
4. Supabase Logs sekmesinde hata var mı bakın

---

## Production Monitoring

### Vercel Analytics (Önerilen)

1. Vercel Dashboard > Analytics sekmesi
2. Page views, ziyaretçi sayısı, performance metrikleri görüntülenir
3. Ücretsiz plan için yeterli olabilir

### Supabase Monitoring

1. Supabase Dashboard > Logs
2. API çağrılarını, hataları, query performansını izleyin
3. Storage kullanımını kontrol edin

---

## Deployment Checklist

Deployment öncesi kontrol listesi:

- [ ] Supabase veritabanı kurulumu tamamlandı
- [ ] Admin kullanıcı profili oluşturuldu
- [ ] Local'de tüm özellikler test edildi
- [ ] `npm run build` başarıyla çalıştı
- [ ] Vercel environment variables doğru ayarlandı
- [ ] Eski project ID'leri kaldırıldı
- [ ] Git'e en son değişiklikler push edildi
- [ ] Vercel'de build başarılı oldu
- [ ] Production'da login testi yapıldı
- [ ] Production'da temel özellikler test edildi

---

## Deployment Sonrası

### Önerilen Adımlar:

1. **Backup Oluşturun**
   - Supabase Dashboard > Database > Backups
   - Manuel backup alın

2. **Test Kullanıcıları Oluşturun**
   - Demo hesapları için test müşterileri ekleyin
   - Test poliçeleri oluşturun

3. **Monitoring Kurun**
   - Vercel Analytics'i aktif edin
   - Supabase email alerts'lerini ayarlayın

4. **Documentation Güncelleyin**
   - Production URL'yi dokümanlarda güncelleyin
   - Deployment tarihi ve versiyonu kaydedin

---

## Hızlı Referans

### Production URL
```
https://tanem.vercel.app
```

### Supabase Dashboard
```
https://supabase.com/dashboard/project/rtswtjgblxhyvlmaspmp
```

### Vercel Dashboard
```
https://vercel.com/sukans-projects/tanem
```

### Environment Variables
```
VITE_SUPABASE_URL=https://rtswtjgblxhyvlmaspmp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c3d0amdibHhoeXZsbWFzcG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDMyNjgsImV4cCI6MjA3NTQ3OTI2OH0.rdPp6BFl9PNlBxWhiQzfKjEDz1RHGZVebJfMj1ebdp4
```

---

**Deployment başarılı!** 🚀
