# 🚀 STN Sigorta - cPanel Deployment Rehberi

Bu rehber, projenizi cPanel'e yüklemek için gereken tüm adımları içerir.

---

## 📦 Deployment Paketi Oluşturma

### Adım 1: Projeyi Build Edin
```bash
npm run build
```

### Adım 2: Deployment Paketi Oluşturun
```bash
# public_html için hazır paket oluşturma
mkdir -p public_html_package
cp .htaccess public_html_package/
cp -r dist/* public_html_package/
tar -czf PUBLIC-HTML-READY.tar.gz -C public_html_package .
rm -rf public_html_package
```

### Paket Kontrolü
```bash
# Dosya boyutunu kontrol edin (yaklaşık 289KB olmalı)
ls -lh PUBLIC-HTML-READY.tar.gz

# İçeriği kontrol edin
tar -tzf PUBLIC-HTML-READY.tar.gz | head -10
```

**Doğru içerik şöyle görünmeli:**
```
./
./.htaccess
./index.html
./assets/
./assets/index-xxxxx.css
./assets/index-xxxxx.js
```

---

## 🗑️ cPanel'de Yüklemeden ÖNCE Yapılacaklar

### Eski Dosyaları Silme Şablonu

cPanel File Manager'da `public_html` klasörüne gidin ve şunları silin:

✅ **Silinmesi Gerekenler:**
- [ ] `index.html` (eski)
- [ ] `assets/` klasörü (eski)
- [ ] `.htaccess` (eski - eğer varsa)
- [ ] Diğer tüm eski React dosyaları
- [ ] `*.js` dosyaları (eski build dosyaları)
- [ ] `*.css` dosyaları (eski build dosyaları)

❌ **SİLMEYİN:**
- [ ] `cgi-bin/` klasörü
- [ ] `.well-known/` klasörü (SSL sertifikaları için)
- [ ] Diğer cPanel sistem klasörleri

### Alternatif: Tam Temizlik
Eğer `public_html` tamamen boşsa, direkt yükleyin.

---

## 📤 cPanel'e Yükleme Adımları

### 1. Dosya Hazırlama
- [ ] `PUBLIC-HTML-READY.tar.gz` dosyasını bilgisayarınıza indirin
- [ ] Dosya boyutunun **~289KB** olduğunu doğrulayın
- [ ] Dosya 20KB ise HATALI! Yeniden build alın

### 2. cPanel File Manager
- [ ] cPanel'e giriş yapın
- [ ] **File Manager** açın
- [ ] `public_html` klasörüne gidin

### 3. Eski Dosyaları Temizleme
- [ ] Yukarıdaki "Silinmesi Gerekenler" listesini kontrol edin
- [ ] Her bir dosya/klasörü tek tek seçip **Delete** ile silin
- [ ] `public_html` klasörü boş veya sadece sistem dosyaları kalsın

### 4. Yeni Dosyaları Yükleme
- [ ] File Manager'da **Upload** butonuna tıklayın
- [ ] `PUBLIC-HTML-READY.tar.gz` dosyasını seçin
- [ ] Upload tamamlanana kadar bekleyin
- [ ] Dosya listesinde `PUBLIC-HTML-READY.tar.gz` görünmeli

### 5. Dosyaları Çıkartma
- [ ] `PUBLIC-HTML-READY.tar.gz` dosyasına **sağ tıklayın**
- [ ] **Extract** seçeneğini seçin
- [ ] Extract tamamlanana kadar bekleyin
- [ ] Başarılı mesajı gelince **Close** yapın

### 6. Temizlik
- [ ] `PUBLIC-HTML-READY.tar.gz` dosyasını silebilirsiniz (artık gereksiz)

### 7. Doğrulama
- [ ] `public_html` içinde şunların olduğunu kontrol edin:
  - `index.html`
  - `assets/` klasörü
  - `.htaccess` dosyası

---

## ✅ Yükleme Sonrası Kontrol Listesi

### Dosya Yapısı Kontrolü
`public_html` içeriği şu şekilde olmalı:
```
public_html/
├── .htaccess
├── index.html
└── assets/
    ├── index-xxxxx.css
    └── index-xxxxx.js
```

### Fonksiyonel Testler
- [ ] https://stnsigorta.com adresini açın
- [ ] Login ekranı görünüyor mu?
- [ ] Logo ve stiller yükleniyor mu?
- [ ] Console'da hata var mı? (F12 ile kontrol edin)
- [ ] Login denemesi yapın
- [ ] Sayfa yönlendirmeleri çalışıyor mu?

---

## 🐛 Yaygın Sorunlar ve Çözümleri

### Sorun 1: "Sayfa Bulunamadı" (404)
**Çözüm:**
- `.htaccess` dosyasının `public_html` içinde olduğunu kontrol edin
- `.htaccess` içeriği:
```apache
RewriteEngine On
RewriteBase /

# Redirect HTTP to HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Handle React Router
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Sorun 2: Sadece Beyaz Ekran Görünüyor
**Çözüm:**
- Browser Console'u açın (F12)
- Hata mesajlarını kontrol edin
- `assets/` klasörünün doğru yüklendiğini kontrol edin
- Dosya izinlerini kontrol edin (644 için dosyalar, 755 için klasörler)

### Sorun 3: CSS/JS Dosyaları Yüklenmiyor
**Çözüm:**
- `assets/` klasörünün var olduğunu kontrol edin
- Dosya izinlerini kontrol edin
- Browser cache'ini temizleyin (Ctrl+F5)

### Sorun 4: "Infinite Redirect" Hatası
**Çözüm:**
- `.htaccess` dosyasındaki HTTPS redirect satırlarını kontrol edin
- Sunucunuzda SSL sertifikasının aktif olduğunu doğrulayın

---

## 🔄 Güncelleme Senaryoları

### Senaryo 1: Küçük Değişiklikler (CSS/JS)
1. Projeyi build edin: `npm run build`
2. Sadece `assets/` klasörünü güncelleyin
3. Eski `assets/` klasörünü silin
4. Yeni `assets/` klasörünü yükleyin

### Senaryo 2: Büyük Değişiklikler (Yeni Özellikler)
1. Tam deployment paketi oluşturun
2. Eski dosyaları silin (yukarıdaki listeye göre)
3. Yeni paketi yükleyin ve extract edin

### Senaryo 3: Acil Geri Alma (Rollback)
1. Önceki `PUBLIC-HTML-READY.tar.gz` yedeğini hazır bulundurun
2. Mevcut dosyaları silin
3. Eski paketi yükleyip extract edin

---

## 📝 Deployment Checklist (Hızlı Kontrol)

### Yüklemeden Önce
- [ ] `npm run build` çalıştırıldı
- [ ] `PUBLIC-HTML-READY.tar.gz` oluşturuldu
- [ ] Dosya boyutu ~289KB (20KB DEĞİL!)
- [ ] Eski dosyalar silinecek liste hazır

### Yükleme Sırasında
- [ ] cPanel File Manager açık
- [ ] `public_html` klasöründeyim
- [ ] Eski dosyalar silindi
- [ ] Yeni paket upload edildi
- [ ] Extract işlemi tamamlandı

### Yükleme Sonrası
- [ ] Site açılıyor
- [ ] Login ekranı görünüyor
- [ ] Console'da kritik hata yok
- [ ] Tüm sayfalar çalışıyor
- [ ] HTTPS redirect çalışıyor

---

## 🎯 Hızlı Komutlar

### Tek Komutta Build ve Paketleme
```bash
npm run build && \
mkdir -p public_html_package && \
cp .htaccess public_html_package/ && \
cp -r dist/* public_html_package/ && \
tar -czf PUBLIC-HTML-READY.tar.gz -C public_html_package . && \
rm -rf public_html_package && \
ls -lh PUBLIC-HTML-READY.tar.gz
```

### Paket İçeriğini Görüntüleme
```bash
tar -tzf PUBLIC-HTML-READY.tar.gz
```

### Paket Doğrulama
```bash
# Boyut kontrolü (289KB civarı olmalı)
ls -lh PUBLIC-HTML-READY.tar.gz

# İçerik kontrolü
tar -tzf PUBLIC-HTML-READY.tar.gz | grep -E "(index.html|.htaccess|assets/)"
```

---

## 📞 Destek

Sorun yaşarsanız:
1. Bu rehberdeki kontrol listelerini takip edin
2. Browser Console'daki hataları kaydedin
3. File Manager'da dosya yapısını screenshot alın
4. Yukarıdaki "Yaygın Sorunlar" bölümünü kontrol edin

---

**Son Güncelleme:** 2025-10-09
**Paket Versiyonu:** PUBLIC-HTML-READY.tar.gz (289KB)
