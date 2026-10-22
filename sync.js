/* ANALICA - Tahap 3: data transaksi + hutang disimpan di Supabase (per akun).
   Dimuat SETELAH auth.js. Tidak mengubah desain: hanya mengganti fungsi
   addTx, delTx, addDebt, payDebt, delDebt, resetAll supaya menyimpan ke Supabase.
   Hanya memakai window.sb (publishable key dari auth.js). Tidak ada secret key di sini.
   user_id TIDAK dikirim dari aplikasi: diisi otomatis oleh database (default auth.uid()). */
(function () {
  'use strict';

  var sb = window.sb;
  if (!sb) {
    console.error('ANALICA sync: window.sb tidak ada. Pastikan auth.js dimuat sebelum sync.js.');
    return;
  }

  /* ---------- Pembantu ---------- */

  /* id dari database (angka) diubah jadi teks 12 digit supaya
     pengurutan b.id.localeCompare di index.html tetap benar. */
  function key(n) { return String(n).padStart(12, '0'); }

  function errText(e) {
    var t = ((e && e.message) || '').toLowerCase();
    if (t.indexOf('fetch') > -1 || t.indexOf('network') > -1) return 'Tidak ada koneksi internet.';
    return (e && e.message) || 'terjadi kesalahan.';
  }

  function toTx(r) {
    return {
      id: key(r.id),
      type: r.type === 'out' ? 'out' : 'in',
      amt: Number(r.amount) || 0,
      cat: r.category || 'Lainnya',
      date: r.transaction_date,
      note: r.description || ''
    };
  }

  function toDebt(r) {
    return {
      id: key(r.id),
      name: r.name,
      total: Number(r.total) || 0,
      cicilan: Number(r.cicilan) || 0,
      due: r.due || '',
      paid: Array.isArray(r.paid) ? r.paid : []
    };
  }

  /* Ambil semua baris (per 1000) supaya tidak terpotong batas bawaan Supabase. */
  function fetchAll(table) {
    var out = [], from = 0, size = 1000;
    function next() {
      return sb.from(table).select('*').order('id', { ascending: true })
        .range(from, from + size - 1).then(function (res) {
          if (res.error) throw res.error;
          var rows = res.data || [];
          out = out.concat(rows);
          if (rows.length === size) { from += size; return next(); }
          return out;
        });
    }
    return next();
  }

  /* ---------- Muat data saat login / bersihkan saat keluar ---------- */

  var currentUid = null;   /* akun yang sedang aktif */
  var ticket = 0;          /* penanda supaya hasil muat yang basi diabaikan */

  function start(user) {
    if (!user || currentUid === user.id) return;
    currentUid = user.id;
    var my = ++ticket;
    msg = 'Memuat data…';
    render();
    Promise.all([fetchAll('transactions'), fetchAll('debts')]).then(function (r) {
      if (my !== ticket) return;
      S = { tx: r[0].map(toTx), debts: r[1].map(toDebt) };
      msg = '';
      render();
    }).catch(function (e) {
      console.error('ANALICA sync: gagal memuat', e);
      if (my !== ticket) return;
      currentUid = null; /* biar bisa dicoba lagi */
      msg = 'Gagal memuat data: ' + errText(e) + ' Muat ulang halaman.';
      render();
    });
  }

  function stop() {
    currentUid = null;
    ticket++;
    S = { tx: [], debts: [] };
    msg = '';
    render();
  }

  /* Kosongkan tampilan di memori dulu (localStorage TIDAK disentuh),
     supaya data lama di perangkat tidak sempat muncul. */
  S = { tx: [], debts: [] };
  msg = '';
  render();

  /* Jangan await panggilan Supabase di dalam callback ini (bisa macet): tunda pakai setTimeout. */
  sb.auth.onAuthStateChange(function (event, session) {
    var user = session && session.user;
    setTimeout(function () { if (user) start(user); else stop(); }, 0);
  });
  sb.auth.getSession().then(function (res) {
    var s = res && res.data && res.data.session;
    if (s && s.user) start(s.user);
  });

  /* ---------- Transaksi ---------- */

  var busyTx = false;

  window.addTx = function () {
    if (busyTx) return;
    var amt = +$('jml').value;
    if (!(amt > 0)) { msg = 'Isi jumlahnya dulu ya.'; render(); return; }
    if (!currentUid) { msg = 'Kamu belum login.'; render(); return; }
    var uid0 = currentUid;
    var row = {
      type: type,
      amount: amt,
      category: $('cat').value,
      transaction_date: $('tgl').value || today(),
      description: $('note').value.trim()
    };
    busyTx = true;
    sb.from('transactions').insert(row).select().single().then(function (res) {
      if (res.error) throw res.error;
      if (currentUid !== uid0) return;
      S.tx.push(toTx(res.data));
      msg = 'Tersimpan ✓';
      render();
    }).catch(function (e) {
      msg = 'Gagal menyimpan: ' + errText(e);
      render();
      /* kembalikan isian supaya tidak perlu ketik ulang */
      if ($('jml')) {
        $('jml').value = row.amount;
        $('cat').value = row.category;
        $('tgl').value = row.transaction_date;
        $('note').value = row.description;
      }
    }).then(function () { busyTx = false; });
  };

  window.delTx = function (id) {
    sb.from('transactions').delete().eq('id', Number(id)).then(function (res) {
      if (res.error) throw res.error;
      S.tx = S.tx.filter(function (t) { return t.id !== id; });
      render();
    }).catch(function (e) { alert('Gagal menghapus: ' + errText(e)); });
  };

  /* ---------- Hutang ---------- */

  var busyDebt = false;

  window.addDebt = function () {
    if (busyDebt) return;
    var n = $('hn').value.trim(), t = +$('ht').value;
    if (!n || !(t > 0)) return;
    if (!currentUid) { alert('Kamu belum login.'); return; }
    var uid0 = currentUid;
    var row = { name: n, total: t, cicilan: +$('hc').value || 0, due: $('hd').value || null, paid: [] };
    busyDebt = true;
    sb.from('debts').insert(row).select().single().then(function (res) {
      if (res.error) throw res.error;
      if (currentUid !== uid0) return;
      S.debts.push(toDebt(res.data));
      render();
    }).catch(function (e) {
      alert('Gagal menyimpan hutang: ' + errText(e));
    }).then(function () { busyDebt = false; });
  };

  var payBusy = {};

  window.payDebt = function (id) {
    if (payBusy[id]) return;
    var v = +$('pay' + id).value;
    if (!(v > 0)) return;
    var d = S.debts.find(function (x) { return x.id === id; });
    if (!d) return;
    var paid = d.paid.concat([{ date: today(), amt: v }]);
    var due = d.due;
    if (due) { /* geser jatuh tempo ke bulan berikutnya (sama seperti aplikasi lama) */
      var x = P(due), day = x.getDate();
      x.setDate(1);
      x.setMonth(x.getMonth() + 1);
      x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
      due = ymd(x);
    }
    payBusy[id] = true;
    sb.from('debts').update({ paid: paid, due: due || null }).eq('id', Number(id)).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        var nd = toDebt(res.data);
        d.paid = nd.paid;
        d.due = nd.due;
        render();
      }).catch(function (e) {
        alert('Gagal mencatat pembayaran: ' + errText(e));
      }).then(function () { delete payBusy[id]; });
  };

  window.delDebt = function (id) {
    sb.from('debts').delete().eq('id', Number(id)).then(function (res) {
      if (res.error) throw res.error;
      S.debts = S.debts.filter(function (d) { return d.id !== id; });
      render();
    }).catch(function (e) { alert('Gagal menghapus hutang: ' + errText(e)); });
  };

  /* ---------- Reset semua data (sekarang menghapus data online akun ini juga) ---------- */

  window.resetAll = function (btn) {
    if (!btn.dataset.s) {
      btn.dataset.s = 1;
      btn.textContent = 'Yakin? Ketuk lagi untuk hapus semua';
      setTimeout(function () {
        if (btn.isConnected) { delete btn.dataset.s; btn.textContent = 'Reset semua data'; }
      }, 4000);
      return;
    }
    if (!currentUid) { alert('Kamu belum login.'); return; }
    btn.disabled = true;
    Promise.all([
      sb.from('transactions').delete().eq('user_id', currentUid),
      sb.from('debts').delete().eq('user_id', currentUid)
    ]).then(function (r) {
      r.forEach(function (res) { if (res.error) throw res.error; });
      S = { tx: [], debts: [] };
      wk = 0;
      render();
    }).catch(function (e) {
      btn.disabled = false;
      alert('Gagal reset: ' + errText(e));
    });
  };
})();
