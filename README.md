# SKY WARRIOR ONLINE

Farklı evlerdeki arkadaşlarla oynamak için Node.js + WebSocket sunuculu sürüm.

## İnternetten yayınlama (kolay yol)
1. Bu klasörü GitHub'a yükleyin.
2. Render'da **New + Web Service** seçin ve GitHub deposunu bağlayın.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Deploy bitince size `https://....onrender.com` şeklinde bir oyun adresi verilir.
6. Herkes aynı adresi açar. Oyunda **TAKIM KUR** ile kod oluşturun; arkadaşlar **TAKIM KODU YAZ** ile aynı kodu girer.

Sunucu WebSocket'i aynı adres üzerinden otomatik kullanır; ayrıca IP yazmanız gerekmez.

## Bilgisayarda test
```powershell
npm.cmd install
npm.cmd start
```
Sonra `http://localhost:3000` açın.

## Mavi yeniden doğma noktası
- Bir oyuncu ölünce öldüğü yerde **MAVİ** bir daire çıkar (herkes görür).
- Yaşayan bir arkadaş uçağıyla dairenin içinde **5 saniye** kalırsa ölen oyuncu canlanır. Daireden çıkarsa sayaç sıfırlanır.
- Takımdaki **herkes** ölürse (tek oynuyorsan sen ölünce) oyun biter.

## Oyun bitince
**🏠 MENÜYE DÖN (TAKIMDA KAL)** menüye döndürür ama takım bağlantısını/kodunu korur. Maç sırasında sağ üstteki duraklat düğmesiyle istediğin zaman bu menüye dönebilirsin.

## Mobil öğrenme
Menüde **🟢 KOLAY** düğmesine basılı tut (ya da **❓ MOBİL ÖĞRENME** düğmesine bas): hareket, can doldurma ve bomba denemeli anlatılır.
Klavye/mobil seçimi artık herkesin kendi cihazında kalır (kurucunun seçimi arkadaşlara dayatılmaz).
\n\n## Yeni eklenenler\n- İlk açılışta oyuncu adı istenir; adlar uçakların üstünde görünür.\n- Arkadaşının uçağına dokunarak can, dalga, atış ve bomba bilgilerini görürsün.\n- Kurtarılan oyuncunun canlanması ve kontrolleri yeniden etkinleştirilir.\n- Herkes düştüğünde OYUN BİTTİ ekranı gelir.\n- Menüye dönmek takımdan çıkarmaz.\n- MOBİL ÖĞRENME ekranına bu özelliklerin açıklamaları eklendi.\n