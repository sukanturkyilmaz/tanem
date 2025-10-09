# 🚀 STN Sigorta - cPanel Yükleme

## ⚡ HIZLI BAŞLANGIÇ

### 1️⃣ Gereken Dosya

Bu zip içinden şu dosyayı kullanacaksınız:

```
public/PUBLIC-HTML-READY.tar.gz  (289 KB)
```

> ⚠️ **ÖNEMLİ:** Dosya boyutu **289 KB** olmalı. 20KB ise HATALI!

---

## 📋 ADIMLAR

### ADIM 1: cPanel'de Eski Dosyaları Silin

cPanel → File Manager → `public_html` klasörüne gidin ve şunları **SİLİN:**

- ✅ `index.html` (eski)
- ✅ `assets/` klasörü (eski)
- ✅ `.htaccess` (eski - varsa)
- ✅ Diğer eski .js ve .css dosyaları

❌ **SİLMEYİN:**
- `cgi-bin/`
- `.well-known/`

---

### ADIM 2: Yeni Paketi Yükleyin

1. **Upload** butonuna tıklayın
2. `PUBLIC-HTML-READY.tar.gz` dosyasını yükleyin
3. Dosyaya **sağ tıklayın** → **Extract**
4. Bitince tar.gz dosyasını silebilirsiniz

---

### ADIM 3: Kontrol Edin

`public_html` içinde şunlar olmalı:
```
public_html/
├── .htaccess
├── index.html
└── assets/
    ├── index-CbrOWOiA.css
    └── index-D-eNjOcn.js
```

---

### ADIM 4: Test Edin

https://stnsigorta.com adresini açın ve kontrol edin:
- ✅ Login ekranı görünüyor mu?
- ✅ Logo ve stiller yükleniyor mu?
- ✅ F12 Console'da hata var mı?

---

## 📝 Detaylı Talimatlar

Daha detaylı bilgi için:
- `CPANEL-YUKLEME-TALIMATLARI.txt` - Adım adım rehber
- `DEPLOYMENT-GUIDE.md` - Teknik detaylar ve sorun giderme

---

## 🆘 Sorun mu var?

**Beyaz ekran görünüyorsa:**
- F12'ye basın, Console'daki hataları kontrol edin
- `assets/` klasörünün var olduğunu doğrulayın

**CSS/JS yüklenmiyorsa:**
- Browser cache'ini temizleyin (Ctrl+F5)
- Dosya izinlerini kontrol edin

**404 hatası alıyorsanız:**
- `.htaccess` dosyasının `public_html` içinde olduğunu kontrol edin

---

## 🎯 Özet

1. Eski dosyaları sil
2. `public/PUBLIC-HTML-READY.tar.gz` yükle
3. Extract et
4. Test et

**Kolay gelsin!** 🎉
